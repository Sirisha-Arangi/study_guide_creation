from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...database import get_db
from ...models import User, DocumentChunk
from ...schemas import SummarizationRequest, FeatureResponse
from ...core.dependencies import get_current_active_user
from ...services import rag_service, llm_service

router = APIRouter()


@router.post("/summarize", response_model=FeatureResponse)
async def summarize_document(
    request: SummarizationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate summary of a document."""
    try:
        # Verify document ownership
        from ...models import Document
        document = db.query(Document).filter(
            Document.id == request.document_id,
            Document.user_id == current_user.id
        ).first()
        
        if not document:
            return FeatureResponse(
                success=False,
                error="Document not found"
            )
        
        # Generate summary
        if request.topic_name or request.page_number:
            # Use RAG for targeted summarization
            query = request.topic_name or f"content from page {request.page_number}"
            result = await rag_service.answer_question(
                f"Provide a comprehensive summary of: {query}",
                request.document_id
            )
            
            return FeatureResponse(
                success=True,
                data={
                    "summary": result["answer"],
                    "sources": result["sources"],
                    "confidence": result["confidence"],
                    "topic": request.topic_name,
                    "page_number": request.page_number
                }
            )
        else:
            # Get document content for full summarization
            from ...services import document_processor
            chunks = db.query(DocumentChunk).filter(
                DocumentChunk.document_id == request.document_id
            ).all()
            
            if chunks:
                content = "\n\n".join([chunk.content for chunk in chunks])
                summary = await llm_service.generate_summary(content, request.topic_name)
            else:
                summary = "No content available for summarization"
            
            return FeatureResponse(
                success=True,
                data={
                    "summary": summary,
                    "topic": request.topic_name,
                    "page_number": request.page_number
                }
            )
            
    except Exception as e:
        return FeatureResponse(
            success=False,
            error=f"Error generating summary: {str(e)}"
        )
