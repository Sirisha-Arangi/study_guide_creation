from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...database import get_db
from ...models import User, Document, DocumentChunk
from ...schemas import DocumentComparisonRequest, FeatureResponse
from ...core.dependencies import get_current_active_user
from ...services import rag_service, llm_service

router = APIRouter()


@router.post("/compare", response_model=FeatureResponse)
async def compare_documents(
    request: DocumentComparisonRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Compare two documents to identify similarities, differences, and content relationships.
    """
    
    try:
        # 1. Verify document ownership for both documents
        doc_a = db.query(Document).filter(
            Document.id == request.document_a_id,
            Document.user_id == current_user.id
        ).first()

        doc_b = db.query(Document).filter(
            Document.id == request.document_b_id,
            Document.user_id == current_user.id
        ).first()

        if not doc_a or not doc_b:
            return FeatureResponse(
                success=False,
                error="One or both documents not found or access denied"
            )

        # 2. Get content from both documents using RAG
        print(f"Document A ID: {request.document_a_id}")  # Debug log
        print(f"Document B ID: {request.document_b_id}")  # Debug log
        
        chunks_a = await rag_service.retrieve_relevant_chunks(
            query="content summary main topics",
            document_id=request.document_a_id,
            n_results=5
        )
        
        chunks_b = await rag_service.retrieve_relevant_chunks(
            query="content summary main topics", 
            document_id=request.document_b_id,
            n_results=5
        )
        
        print(f"Chunks A: {len(chunks_a)}")  # Debug log
        print(f"Chunks B: {len(chunks_b)}")  # Debug log

        # Fallback to database chunks if RAG fails
        if not chunks_a:
            print("RAG failed for Document A, trying database chunks")  # Debug log
            db_chunks_a = db.query(DocumentChunk).filter(
                DocumentChunk.document_id == request.document_a_id
            ).limit(10).all()
            
            if db_chunks_a:
                print(f"Found {len(db_chunks_a)} database chunks for Document A")  # Debug log
                content_a = "\n\n".join(chunk.content for chunk in db_chunks_a)[:2000]
            else:
                print("No database chunks found for Document A")  # Debug log
                content_a = ""
        else:
            content_a = "\n\n".join(chunk["content"] for chunk in chunks_a)[:2000]

        if not chunks_b:
            print("RAG failed for Document B, trying database chunks")  # Debug log
            db_chunks_b = db.query(DocumentChunk).filter(
                DocumentChunk.document_id == request.document_b_id
            ).limit(10).all()
            
            if db_chunks_b:
                print(f"Found {len(db_chunks_b)} database chunks for Document B")  # Debug log
                content_b = "\n\n".join(chunk.content for chunk in db_chunks_b)[:2000]
            else:
                print("No database chunks found for Document B")  # Debug log
                content_b = ""
        else:
            content_b = "\n\n".join(chunk["content"] for chunk in chunks_b)[:2000]

        print(f"Final content A length: {len(content_a)}")  # Debug log
        print(f"Final content B length: {len(content_b)}")  # Debug log

        if not content_a.strip() or not content_b.strip():
            return FeatureResponse(
                success=False,
                error="Unable to extract content from one or both documents"
            )

        # 3. Generate document comparison
        comparison = await llm_service.compare_documents(
            document_a_content=content_a,
            document_b_content=content_b,
            document_a_title=doc_a.filename,
            document_b_title=doc_b.filename,
            focus_areas=request.focus_areas
        )

        # 4. Return response
        return FeatureResponse(
            success=True,
            data={
                "comparison": comparison,
                "document_a_info": {
                    "id": doc_a.id,
                    "filename": doc_a.filename,
                    "file_type": doc_a.file_type
                },
                "document_b_info": {
                    "id": doc_b.id,
                    "filename": doc_b.filename,
                    "file_type": doc_b.file_type
                }
            }
        )
    except Exception as e:
        return FeatureResponse(
            success=False,
            error=f"Error comparing documents: {str(e)}"
        )
