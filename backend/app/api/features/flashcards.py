from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import User, Document
from ...schemas import FlashcardsRequest, FeatureResponse
from ...core.dependencies import get_current_active_user
from ...services import rag_service, llm_service, web_search_service

router = APIRouter()


@router.post("/generate", response_model=FeatureResponse)
async def generate_flashcards(
    request: FlashcardsRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        document = db.query(Document).filter(
            Document.id == request.document_id,
            Document.user_id == current_user.id
        ).first()

        if not document:
            return FeatureResponse(
                success=False,
                error="Document not found or access denied"
            )

        # Retrieve chunks
        relevant_chunks = await rag_service.retrieve_relevant_chunks(
            query=request.topic,
            document_id=request.document_id,
            n_results=5
        )

        if not relevant_chunks:
            return FeatureResponse(
                success=False,
                error="No relevant content found for this topic"
            )

        document_content = "\n\n".join(
            chunk["content"] for chunk in relevant_chunks
        )

        # Web search
        web_content = ""
        try:
            web_content = await web_search_service.search_academic_content(
                topic=request.topic,
                max_results=5
            )
        except Exception as e:
            print("Web search failed:", e)

        # Generate flashcards
        flashcards = await llm_service.generate_flashcards(
            document_content=document_content,
            web_content=web_content,
            topic=request.topic,
            difficulty=request.difficulty,
            number_of_flashcards=request.number_of_flashcards
        )

        return FeatureResponse(
            success=True,
            data={
                "flashcards": flashcards,
                "number_generated": len(flashcards),
                "topic": request.topic,
                "difficulty": request.difficulty,
            }
        )

    except Exception as e:
        import traceback
        print("FLASHCARD ERROR:", e)
        traceback.print_exc()

        return FeatureResponse(
            success=False,
            error=str(e)
        )