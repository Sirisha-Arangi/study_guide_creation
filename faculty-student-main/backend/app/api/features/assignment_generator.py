from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...database import get_db
from ...models import User, Document, DocumentChunk, Exam, ExamAttempt
from ...schemas import (
    AssignmentGeneratorRequest, FeatureResponse, ExamPublishRequest,
    SaveAnswerRequest, ManualSubmitRequest, GradeAnswerRequest
)
from ...core.dependencies import require_teacher, require_student
from ...services import rag_service, llm_service, web_search_service

router = APIRouter()

VALID_BRANCHES = {"CSC", "CSM", "ECE", "EEE", "IT", "Civil", "Mechanical"}
VALID_SECTIONS = {"A", "B", "C", "D"}

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def normalize_question_id(value) -> str:
    return str(value)


def compute_exam_ends_at(started_at: datetime, duration_minutes: int) -> datetime:
    return ensure_aware_utc(started_at) + timedelta(minutes=duration_minutes)


def auto_submit_if_expired(attempt: ExamAttempt, exam: Exam, db: Session) -> bool:
    if attempt.status != "in_progress":
        return False
    if utc_now() >= compute_exam_ends_at(attempt.started_at, exam.duration_minutes):
        attempt.status = "auto_submitted"
        attempt.submitted_at = utc_now()
        auto_score, max_score, evaluation = compute_auto_grading(exam, attempt.answers or {})
        attempt.auto_score = auto_score
        attempt.manual_score = 0
        attempt.total_score = auto_score
        attempt.max_score = max_score
        attempt.grading_status = evaluation.get("grading_status", "pending_manual_review")
        attempt.result_published = False
        attempt.evaluation = evaluation
        db.commit()
        db.refresh(attempt)
        return True
    return False


def normalize_targeting(
    branch: str | None, year: int | None, section: str | None
) -> tuple[str | None, int | None, str | None]:
    normalized_branch = branch.strip() if isinstance(branch, str) and branch.strip() else None
    normalized_section = section.strip().upper() if isinstance(section, str) and section.strip() else None
    normalized_year = year if year is not None else None

    if normalized_branch and normalized_branch not in VALID_BRANCHES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid target_branch. Must be one of: {', '.join(sorted(VALID_BRANCHES))}",
        )
    if normalized_year is not None and (normalized_year < 1 or normalized_year > 4):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="target_year must be between 1 and 4")
    if normalized_section and normalized_section not in VALID_SECTIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="target_section must be one of: A, B, C, D")

    return normalized_branch, normalized_year, normalized_section


def student_matches_exam_target(student: User, exam: Exam) -> bool:
    if exam.target_branch and student.branch != exam.target_branch:
        return False
    if exam.target_year and student.year != exam.target_year:
        return False
    if exam.target_section:
        student_section = student.section.strip().upper() if isinstance(student.section, str) else None
        if student_section != exam.target_section:
            return False
    return True


def is_result_published(value) -> bool:
    """
    Guard against legacy DB values (e.g. 'no'/'yes') that may still exist
    from earlier versions where result_published was stored as a string.
    Only an actual boolean True (or integer 1) counts as published.
    """
    return value is True or value == 1


def flatten_exam_questions(assignment: dict) -> list[dict]:
    questions = assignment.get("questions", {}) if isinstance(assignment, dict) else {}
    flat: list[dict] = []
    for q_type, q_list in questions.items():
        if not isinstance(q_list, list):
            continue
        for item in q_list:
            if not isinstance(item, dict):
                continue
            q = dict(item)
            q["type"] = q.get("type") or q_type
            flat.append(q)
    return flat


def normalize_answer_value(value):
    if isinstance(value, str):
        return value.strip().lower()
    if isinstance(value, bool):
        return str(value).lower()
    return str(value).strip().lower()


def compute_auto_grading(exam: Exam, answers: dict) -> tuple[int, int, dict]:
    questions = flatten_exam_questions(exam.assignment_data or {})
    detail = {}
    auto_score = 0
    max_score = 0

    for q in questions:
        qid = normalize_question_id(q.get("id"))
        qtype = str(q.get("type", "")).lower()
        question_key = f"{qtype}:{qid}"
        marks = int(float(q.get("marks", 0) or 0))
        if marks < 0:
            marks = 0
        max_score += marks

        student_answer = answers.get(question_key)
        entry = {
            "question_id": question_key,
            "question_type": qtype,
            "question_text": q.get("question", ""),
            "max_marks": marks,
            "awarded_marks": 0,
            "mode": "pending_manual",
            "feedback": None,
            "correct_answer": q.get("correct_answer"),
            "student_answer": student_answer,
        }

        if qtype in {"multiple_choice", "true_false"}:
            correct_answer = q.get("correct_answer")
            if normalize_answer_value(student_answer) == normalize_answer_value(correct_answer):
                entry["awarded_marks"] = marks
                entry["feedback"] = "Correct! Well done."
            else:
                entry["feedback"] = f"Incorrect. The correct answer is: {correct_answer}"
            entry["mode"] = "auto"
            auto_score += int(entry["awarded_marks"])

        detail[question_key] = entry

    requires_manual = any(v.get("mode") == "pending_manual" for v in detail.values())
    grading_status = "pending_manual_review" if requires_manual else "graded"

    return auto_score, max_score, {
        "question_scores": detail,
        "graded_at": utc_now().isoformat(),
        "grading_status": grading_status,
    }


def recompute_totals(attempt: ExamAttempt) -> None:
    evaluation = attempt.evaluation or {}
    question_scores = evaluation.get("question_scores", {}) if isinstance(evaluation, dict) else {}
    auto_total = 0
    manual_total = 0
    has_pending = False
    for q in question_scores.values():
        awarded = float(q.get("awarded_marks", 0) or 0)
        mode = q.get("mode")
        if mode == "auto":
            auto_total += awarded
        elif mode in {"manual", "pending_manual"}:
            manual_total += awarded
        if mode == "pending_manual":
            has_pending = True

    attempt.auto_score = int(round(auto_total))
    attempt.manual_score = int(round(manual_total))
    attempt.total_score = int(round(auto_total + manual_total))
    evaluation["grading_status"] = "pending_manual_review" if has_pending else "graded"
    attempt.grading_status = evaluation["grading_status"]
    attempt.evaluation = evaluation


def ensure_teacher_owns_attempt(db: Session, current_user: User, attempt_id: int) -> tuple[ExamAttempt, Exam]:
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    exam = db.query(Exam).filter(Exam.id == attempt.exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    if exam.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to grade this exam")
    return attempt, exam


@router.post("/generate", response_model=FeatureResponse)
async def generate_assignment(
    request: AssignmentGeneratorRequest,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Generate assignment based on uploaded document using both document and web search.
    """
    
    try:
        # 1. Verify document ownership
        document = db.query(Document).filter(
            Document.id == request.document_id,
            Document.user_id == current_user.id
        ).first()

        if not document:
            return FeatureResponse(
                success=False,
                error="Document not found or access denied"
            )

        # 2. Get content from document using RAG
        print(f"Assignment Generator - Document ID: {request.document_id}")  # Debug log
        
        chunks = await rag_service.retrieve_relevant_chunks(
            query="main topics concepts content summary",
            document_id=request.document_id,
            n_results=10
        )
        
        print(f"Assignment Generator - RAG Chunks: {len(chunks)}")  # Debug log
        
        # Fallback to database chunks if RAG fails
        if not chunks:
            print("RAG failed, trying database chunks")  # Debug log
            db_chunks = db.query(DocumentChunk).filter(
                DocumentChunk.document_id == request.document_id
            ).limit(15).all()
            
            if db_chunks:
                print(f"Found {len(db_chunks)} database chunks")  # Debug log
                content = "\n\n".join(chunk.content for chunk in db_chunks)[:3000]
            else:
                print("No content found in database either")  # Debug log
                return FeatureResponse(
                    success=False,
                    error="Unable to extract content from document"
                )
        else:
            content = "\n\n".join(chunk["content"] for chunk in chunks)[:3000]

        print(f"Final content length: {len(content)}")  # Debug log

        # 3. Web search for additional content
        web_content = ""
        try:
            # Use topics from request to search web
            search_query = ", ".join(request.topics) if request.topics else "assignment content"
            web_content = await web_search_service.search_academic_content(
                topic=search_query,
                max_results=3
            )
            print(f"Web search completed, length: {len(web_content)}")  # Debug log
        except Exception as e:
            print("Web search failed:", e)

        # 4. Generate assignment using both document and web content
        print("Calling LLM for assignment generation...")  # Debug log
        assignment = await llm_service.generate_assignment(
            document_content=content,
            web_content=web_content,
            topic=", ".join(request.topics) if request.topics else "assignment topic",
            assignment_type="mixed",  # We'll handle multiple types
            difficulty=request.difficulty_level,
            duration_hours=request.duration_hours,
            number_of_questions=request.number_of_questions,
            total_marks=request.total_marks,
            question_types=request.question_types,
            topics=request.topics
        )
        print("Assignment generation completed")  # Debug log

        # 5. Return response
        return FeatureResponse(
            success=True,
            data={
                "assignment": assignment,
                "document_info": {
                    "id": document.id,
                    "filename": document.filename,
                    "file_type": document.file_type
                },
                "generation_params": {
                    "number_of_questions": request.number_of_questions,
                    "total_marks": request.total_marks,
                    "difficulty_level": request.difficulty_level,
                    "question_types": request.question_types,
                    "topics": request.topics
                },
                "sources_used": {
                    "document": True,
                    "web": bool(web_content)
                }
            }
        )
    except Exception as e:
        print(f"Assignment Generator Error: {e}")  # Debug log
        return FeatureResponse(
            success=False,
            error=f"Error generating assignment: {str(e)}"
        )


@router.post("/publish", response_model=FeatureResponse)
async def publish_exam(
    request: ExamPublishRequest,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    if request.duration_minutes <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="duration_minutes must be positive")

    # Validate that assignment contains only MCQ questions
    questions = flatten_exam_questions(request.assignment or {})
    non_mcq_questions = [q for q in questions if str(q.get("type", "")).lower() not in {"multiple_choice", "true_false"}]
    
    if non_mcq_questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only MCQ (Multiple Choice) and True/False questions can be published for automatic evaluation"
        )

    target_branch, target_year, target_section = normalize_targeting(
        request.target_branch, request.target_year, request.target_section
    )

    exam = Exam(
        teacher_id=current_user.id,
        title=request.title,
        assignment_data=request.assignment,
        start_time=request.start_time,
        duration_minutes=request.duration_minutes,
        target_branch=target_branch,
        target_year=target_year,
        target_section=target_section,
        status="scheduled",
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)

    return FeatureResponse(
        success=True,
        data={
            "exam_id": exam.id,
            "title": exam.title,
            "start_time": exam.start_time.isoformat(),
            "duration_minutes": exam.duration_minutes,
            "status": exam.status,
            "target_branch": exam.target_branch,
            "target_year": exam.target_year,
            "target_section": exam.target_section,
        },
    )


@router.get("/published", response_model=FeatureResponse)
async def list_teacher_exams(
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    exams = db.query(Exam).filter(Exam.teacher_id == current_user.id).order_by(Exam.start_time.desc()).all()
    return FeatureResponse(
        success=True,
        data={
            "exams": [
                {
                    "id": e.id,
                    "title": e.title,
                    "start_time": e.start_time.isoformat(),
                    "duration_minutes": e.duration_minutes,
                    "status": e.status,
                    "target_branch": e.target_branch,
                    "target_year": e.target_year,
                    "target_section": e.target_section,
                }
                for e in exams
            ]
        },
    )


@router.get("/student/exams", response_model=FeatureResponse)
async def list_student_exams(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    attempts = db.query(ExamAttempt).filter(ExamAttempt.student_id == current_user.id).all()
    attempt_by_exam = {a.exam_id: a for a in attempts}

    exams = db.query(Exam).order_by(Exam.start_time.asc()).all()
    now = utc_now()
    payload = []
    for exam in exams:
        if not student_matches_exam_target(current_user, exam):
            continue
        start_time = ensure_aware_utc(exam.start_time)
        end_time = start_time + timedelta(minutes=exam.duration_minutes)
        if now < start_time:
            exam_state = "scheduled"
        elif now > end_time:
            exam_state = "closed"
        else:
            exam_state = "active"

        attempt = attempt_by_exam.get(exam.id)
        payload.append(
            {
                "id": exam.id,
                "title": exam.title,
                "start_time": exam.start_time.isoformat(),
                "duration_minutes": exam.duration_minutes,
                "status": exam_state,
                "target_branch": exam.target_branch,
                "target_year": exam.target_year,
                "target_section": exam.target_section,
                "attempt": (
                    {
                        "id": attempt.id,
                        "status": attempt.status,
                        "started_at": attempt.started_at.isoformat(),
                        "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
                        "total_score": attempt.total_score,
                        "max_score": attempt.max_score,
                        "result_published": is_result_published(attempt.result_published),
                    }
                    if attempt
                    else None
                ),
            }
        )

    return FeatureResponse(success=True, data={"exams": payload})


@router.post("/student/exams/{exam_id}/start", response_model=FeatureResponse)
async def start_exam(
    exam_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    if not student_matches_exam_target(current_user, exam):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not eligible to take this exam.",
        )

    now = utc_now()
    start_time = ensure_aware_utc(exam.start_time)
    if now < start_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exam has not started yet")

    existing_attempt = db.query(ExamAttempt).filter(
        ExamAttempt.exam_id == exam.id, ExamAttempt.student_id == current_user.id
    ).first()
    if existing_attempt:
        auto_submit_if_expired(existing_attempt, exam, db)
        ends_at = compute_exam_ends_at(existing_attempt.started_at, exam.duration_minutes)
        return FeatureResponse(
            success=True,
            data={
                "attempt_id": existing_attempt.id,
                "exam_id": exam.id,
                "title": exam.title,
                "started_at": existing_attempt.started_at.isoformat(),
                "ends_at": ends_at.isoformat(),
                "status": existing_attempt.status,
            },
        )

    attempt = ExamAttempt(
        exam_id=exam.id,
        student_id=current_user.id,
        started_at=now,
        status="in_progress",
        answers={},
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return FeatureResponse(
        success=True,
        data={
            "attempt_id": attempt.id,
            "exam_id": exam.id,
            "title": exam.title,
            "started_at": attempt.started_at.isoformat(),
            "ends_at": compute_exam_ends_at(attempt.started_at, exam.duration_minutes).isoformat(),
            "status": attempt.status,
        },
    )


@router.get("/student/attempts/{attempt_id}", response_model=FeatureResponse)
async def get_attempt(
    attempt_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.student_id == current_user.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    exam = db.query(Exam).filter(Exam.id == attempt.exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    auto_submit_if_expired(attempt, exam, db)
    ends_at = compute_exam_ends_at(attempt.started_at, exam.duration_minutes)
    remaining_seconds = max(0, int((ends_at - utc_now()).total_seconds()))

    return FeatureResponse(
        success=True,
        data={
            "attempt_id": attempt.id,
            "exam_id": exam.id,
            "title": exam.title,
            "assignment": exam.assignment_data,
            "status": attempt.status,
            "answers": attempt.answers or {},
            "started_at": attempt.started_at.isoformat(),
            "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            "ends_at": ends_at.isoformat(),
            "remaining_seconds": remaining_seconds,
            "grading_status": attempt.grading_status,
            "result_published": is_result_published(attempt.result_published),
            "total_score": attempt.total_score,
            "max_score": attempt.max_score,
        },
    )


@router.post("/student/attempts/{attempt_id}/answer", response_model=FeatureResponse)
async def save_answer(
    attempt_id: int,
    request: SaveAnswerRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.student_id == current_user.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    exam = db.query(Exam).filter(Exam.id == attempt.exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    if auto_submit_if_expired(attempt, exam, db):
        return FeatureResponse(success=False, error="Time is over. Attempt was auto-submitted.")

    if attempt.status != "in_progress":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt is not active")

    answers = attempt.answers or {}
    answers[normalize_question_id(request.question_id)] = request.answer
    attempt.answers = answers
    db.commit()
    db.refresh(attempt)

    return FeatureResponse(success=True, data={"saved": True})


@router.post("/student/attempts/{attempt_id}/submit", response_model=FeatureResponse)
async def submit_attempt(
    attempt_id: int,
    request: ManualSubmitRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.student_id == current_user.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    exam = db.query(Exam).filter(Exam.id == attempt.exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    if attempt.status != "in_progress":
        return FeatureResponse(success=True, data={"status": attempt.status, "attempt_id": attempt.id})

    if request.final_answers:
        answers = attempt.answers or {}
        answers.update({normalize_question_id(k): v for k, v in request.final_answers.items()})
        attempt.answers = answers

    attempt.status = "submitted"
    attempt.submitted_at = utc_now()
    auto_score, max_score, evaluation = compute_auto_grading(exam, attempt.answers or {})
    attempt.auto_score = auto_score
    attempt.manual_score = 0
    attempt.total_score = auto_score
    attempt.max_score = max_score
    attempt.grading_status = evaluation.get("grading_status", "pending_manual_review")
    
    # Auto-publish results for MCQ-only exams
    questions = flatten_exam_questions(exam.assignment_data or {})
    is_mcq_only_exam = all(str(q.get("type", "")).lower() in {"multiple_choice", "true_false"} for q in questions)
    attempt.result_published = is_mcq_only_exam
    
    attempt.evaluation = evaluation
    db.commit()
    db.refresh(attempt)

    return FeatureResponse(
        success=True,
        data={
            "attempt_id": attempt.id,
            "status": attempt.status,
            "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            "auto_score": attempt.auto_score,
            "total_score": attempt.total_score,
            "max_score": attempt.max_score,
            "grading_status": attempt.grading_status,
        },
    )


@router.get("/teacher/exams/{exam_id}/attempts", response_model=FeatureResponse)
async def list_exam_attempts_for_teacher(
    exam_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == exam_id, Exam.teacher_id == current_user.id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    attempts = db.query(ExamAttempt).filter(ExamAttempt.exam_id == exam.id).order_by(ExamAttempt.created_at.desc()).all()
    data = []
    for a in attempts:
        student = db.query(User).filter(User.id == a.student_id).first()
        data.append({
            "attempt_id": a.id,
            "student_id": a.student_id,
            "student_name": student.name if student else f"Student {a.student_id}",
            "student_email": student.email if student else None,
            "student_roll_number": student.roll_number if student else None,
            "status": a.status,
            "grading_status": a.grading_status,
            "result_published": is_result_published(a.result_published),
            "total_score": a.total_score,
            "max_score": a.max_score,
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
        })

    return FeatureResponse(success=True, data={"exam_id": exam.id, "exam_title": exam.title, "attempts": data})


@router.get("/teacher/attempts/{attempt_id}", response_model=FeatureResponse)
async def get_attempt_for_teacher(
    attempt_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    attempt, exam = ensure_teacher_owns_attempt(db, current_user, attempt_id)
    student = db.query(User).filter(User.id == attempt.student_id).first()
    return FeatureResponse(
        success=True,
        data={
            "attempt_id": attempt.id,
            "exam_id": exam.id,
            "exam_title": exam.title,
            "student": {
                "id": attempt.student_id,
                "name": student.name if student else None,
                "email": student.email if student else None,
                "roll_number": student.roll_number if student else None,
            },
            "assignment": exam.assignment_data,
            "answers": attempt.answers or {},
            "evaluation": attempt.evaluation or {},
            "status": attempt.status,
            "grading_status": attempt.grading_status,
            "result_published": is_result_published(attempt.result_published),
            "auto_score": attempt.auto_score,
            "manual_score": attempt.manual_score,
            "total_score": attempt.total_score,
            "max_score": attempt.max_score,
            "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        },
    )


@router.post("/teacher/attempts/{attempt_id}/grade", response_model=FeatureResponse)
async def grade_attempt_answer(
    attempt_id: int,
    request: GradeAnswerRequest,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    attempt, exam = ensure_teacher_owns_attempt(db, current_user, attempt_id)
    if attempt.status not in {"submitted", "auto_submitted"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt is not submitted yet")

    questions = flatten_exam_questions(exam.assignment_data or {})
    question_map = {}
    for q in questions:
        qid = normalize_question_id(q.get("id"))
        qtype = str(q.get("type", "")).lower()
        question_key = f"{qtype}:{qid}"
        question_map[question_key] = q

    qid = normalize_question_id(request.question_id)  # question_key from the client
    question = question_map.get(qid)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found in exam")

    qtype = str(question.get("type", "")).lower()
    if qtype in {"multiple_choice", "true_false"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Objective questions are auto-graded")

    max_marks = float(question.get("marks", 0) or 0)
    if request.awarded_marks < 0 or request.awarded_marks > max_marks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"awarded_marks must be between 0 and {max_marks}")

    evaluation = attempt.evaluation or {"question_scores": {}}
    question_scores = evaluation.get("question_scores") or {}
    current_entry = question_scores.get(qid) or {
        "question_id": qid,
        "question_type": qtype,
        "max_marks": max_marks,
        "awarded_marks": 0,
        "mode": "pending_manual",
        "feedback": None,
    }
    current_entry["max_marks"] = max_marks
    current_entry["awarded_marks"] = float(request.awarded_marks)
    current_entry["mode"] = "manual"
    current_entry["feedback"] = request.feedback
    question_scores[qid] = current_entry
    evaluation["question_scores"] = question_scores
    evaluation["graded_at"] = utc_now().isoformat()
    attempt.evaluation = evaluation

    recompute_totals(attempt)
    db.commit()
    db.refresh(attempt)

    return FeatureResponse(
        success=True,
        data={
            "attempt_id": attempt.id,
            "grading_status": attempt.grading_status,
            "total_score": attempt.total_score,
            "max_score": attempt.max_score,
        },
    )


@router.post("/teacher/attempts/{attempt_id}/publish-result", response_model=FeatureResponse)
async def publish_attempt_result(
    attempt_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    attempt, _ = ensure_teacher_owns_attempt(db, current_user, attempt_id)
    if attempt.status not in {"submitted", "auto_submitted"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt is not submitted yet")

    attempt.result_published = True
    db.commit()
    db.refresh(attempt)
    return FeatureResponse(success=True, data={"attempt_id": attempt.id, "result_published": True})


@router.get("/student/attempts/{attempt_id}/result", response_model=FeatureResponse)
async def get_student_result(
    attempt_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id, ExamAttempt.student_id == current_user.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    if attempt.status not in {"submitted", "auto_submitted"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt not submitted yet")
    if not is_result_published(attempt.result_published):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Result not published yet")

    return FeatureResponse(
        success=True,
        data={
            "attempt_id": attempt.id,
            "total_score": attempt.total_score,
            "max_score": attempt.max_score,
            "auto_score": attempt.auto_score,
            "manual_score": attempt.manual_score,
            "grading_status": attempt.grading_status,
            "evaluation": attempt.evaluation or {},
            "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        },
    )


@router.get("/student/results", response_model=FeatureResponse)
async def list_student_results(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    attempts = (
        db.query(ExamAttempt)
        .filter(ExamAttempt.student_id == current_user.id)
        .order_by(ExamAttempt.submitted_at.desc().nullslast(), ExamAttempt.created_at.desc())
        .all()
    )
    results = []
    for a in attempts:
        if not is_result_published(a.result_published):
            continue
        exam = db.query(Exam).filter(Exam.id == a.exam_id).first()
        results.append(
            {
                "attempt_id": a.id,
                "exam_id": a.exam_id,
                "exam_title": exam.title if exam else f"Exam {a.exam_id}",
                "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
                "total_score": a.total_score,
                "max_score": a.max_score,
                "auto_score": a.auto_score,
                "manual_score": a.manual_score,
                "grading_status": a.grading_status,
            }
        )

    return FeatureResponse(success=True, data={"results": results})


@router.get("/teacher/exams/{exam_id}/results", response_model=FeatureResponse)
async def get_exam_student_results(
    exam_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == exam_id, Exam.teacher_id == current_user.id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    attempts = db.query(ExamAttempt).filter(ExamAttempt.exam_id == exam.id).all()
    student_results = []
    
    for attempt in attempts:
        student = db.query(User).filter(User.id == attempt.student_id).first()
        if not student:
            continue
            
        # Only show results if they are published (for MCQ exams, this should be auto-published)
        if not is_result_published(attempt.result_published):
            continue
            
        student_results.append({
            "attempt_id": attempt.id,
            "student_id": student.id,
            "student_name": student.name,
            "student_email": student.email,
            "student_roll_number": student.roll_number,
            "student_branch": student.branch,
            "student_year": student.year,
            "student_section": student.section,
            "total_score": attempt.total_score,
            "max_score": attempt.max_score,
            "auto_score": attempt.auto_score,
            "manual_score": attempt.manual_score,
            "grading_status": attempt.grading_status,
            "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            "evaluation": attempt.evaluation or {}
        })

    # Sort by branch, section, then name
    student_results.sort(key=lambda x: (
        x.get("student_branch", ""),
        x.get("student_section", ""), 
        x.get("student_year", ""),
        x.get("student_name", "")
    ))

    return FeatureResponse(
        success=True, 
        data={
            "exam_id": exam.id,
            "exam_title": exam.title,
            "student_results": student_results,
            "total_students": len(student_results),
            "target_branch": exam.target_branch,
            "target_year": exam.target_year,
            "target_section": exam.target_section
        }
    )
