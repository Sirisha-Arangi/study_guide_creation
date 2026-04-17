from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...database import get_db
from ...models import User, Document
from ...schemas import LecturePlanRequest, FeatureResponse
from ...core.dependencies import get_current_active_user
from ...services import rag_service, llm_service, web_search_service

router = APIRouter()


@router.post("/generate", response_model=FeatureResponse)
async def generate_lecture_plan(
    request: LecturePlanRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate academic lecture plan using:
    - Document content (PRIMARY via RAG)
    - Tavily Web Search (SECONDARY via Web-RAG)
    Token-safe and hallucination-safe.
    """
    
    try:
        # --------------------------------------------------
        # 1️⃣ Verify document ownership
        # --------------------------------------------------
        document = db.query(Document).filter(
            Document.id == request.document_id,
            Document.user_id == current_user.id
        ).first()

        if not document:
            return FeatureResponse(
                success=False,
                error="Document not found or access denied"
            )

        # --------------------------------------------------
        # 2️⃣ RAG: Retrieve ONLY relevant chunks (SAFE)
        # 🔥 IMPORTANT: query MUST be topic (NOT question)
        # --------------------------------------------------
        relevant_chunks = await rag_service.retrieve_relevant_chunks(
            query=request.topic,
            document_id=request.document_id,
            n_results=5
        )

        if not relevant_chunks:
            return FeatureResponse(
                success=True,
                data={
                    "lecture_plan": {
                        "title": f"Lecture Plan for {request.topic}",
                        "learning_objectives": ["Basic understanding of the topic"],
                        "prerequisites": ["General knowledge"],
                        "sessions": [{
                            "session_number": 1,
                            "title": f"Introduction to {request.topic}",
                            "duration_minutes": request.duration_minutes,
                            "topics": [request.topic],
                            "activities": ["Lecture"],
                            "key_points": ["Overview"]
                        }],
                        "teaching_methodology": "Interactive lecture",
                        "student_activities": ["Active listening"],
                        "assignments": ["Review materials"],
                        "references": {
                            "document": False,
                            "web": False
                        }
                    },
                    "confidence": "low",
                    "message": "No relevant information found in document."
                }
            )

        # --------------------------------------------------
        # 3️⃣ Build DOCUMENT context (TOKEN-LIMITED)
        # --------------------------------------------------
        document_content = "\n\n".join(
            chunk["content"] for chunk in relevant_chunks
        )

        # 🔒 HARD TOKEN SAFETY
        document_content = document_content[:3000]

        # --------------------------------------------------
        # 4️⃣ Web-RAG using Tavily (LIMITED)
        # --------------------------------------------------
        web_content = ""
        try:
            web_content = await web_search_service.search_academic_content(
                topic=request.topic,
                max_results=3
            )
            web_content = web_content[:1500]  # 🔒 TOKEN SAFETY
        except Exception as e:
            print("Web search failed:", e)
            web_content = ""

        # --------------------------------------------------
        # 5️⃣ Generate Lecture Plan (DOC + WEB)
        # --------------------------------------------------
        lecture_plan = await llm_service.generate_lecture_plan(
            document_content=document_content,
            web_content=web_content,
            topic=request.topic,
            difficulty=request.difficulty,
            target_audience=request.target_audience,
            duration_minutes=request.duration_minutes,
            number_of_sessions=request.number_of_sessions
        )

        # --------------------------------------------------
        # 6️⃣ Return response
        # --------------------------------------------------
        return FeatureResponse(
            success=True,
            data={
                "lecture_plan": lecture_plan,
                "topic": request.topic,
                "difficulty": request.difficulty,
                "target_audience": request.target_audience,
                "duration_minutes": request.duration_minutes,
                "number_of_sessions": request.number_of_sessions,
                "sources_used": {
                    "document": True,
                    "web_search": bool(web_content)
                }
            }
        )
    except Exception as e:
        return FeatureResponse(
            success=False,
            error=f"Error generating lecture plan: {str(e)}"
        )
