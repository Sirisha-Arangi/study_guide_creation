from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...database import get_db
from ...models import User
from ...schemas import AssignmentRequest, FeatureResponse
from ...core.dependencies import get_current_active_user
from ...services import rag_service, llm_service

router = APIRouter()


@router.post("/assignment", response_model=FeatureResponse)
async def generate_assignment(
    request: AssignmentRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate assignment questions from document."""
    try:
        # Get relevant content
        result = await rag_service.answer_question(
            f"Generate comprehensive material for assignment creation with {', '.join(request.question_types)} questions",
            request.document_id
        )
        
        # Generate assignment
        assignment = await llm_service.generate_assignment(
            result["answer"],
            request.number_of_questions,
            request.difficulty_levels,
            request.question_types
        )
        
        return FeatureResponse(
            success=True,
            data={
                "assignment": assignment,
                "number_of_questions": request.number_of_questions,
                "difficulty_levels": request.difficulty_levels,
                "question_types": request.question_types
            }
        )
    except Exception as e:
        return FeatureResponse(
            success=False,
            error=f"Error generating assignment: {str(e)}"
        )
