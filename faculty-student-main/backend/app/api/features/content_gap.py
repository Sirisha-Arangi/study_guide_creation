from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...database import get_db
from ...models import User, Document
from ...schemas import ContentGapRequest, FeatureResponse
from ...core.dependencies import get_current_active_user
from ...services import rag_service, llm_service, web_search_service

router = APIRouter()


@router.post("/detect", response_model=FeatureResponse)
async def detect_content_gaps(
    request: ContentGapRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Detect content gaps between document and reference syllabus.
    Uses both document content and web search for comprehensive analysis.
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

        # 2. Get document content using RAG
        print(f"Document ID: {request.document_id}")  # Debug log
        
        relevant_chunks = await rag_service.retrieve_relevant_chunks(
            query="document content summary",
            document_id=request.document_id,
            n_results=5
        )
        
        if not relevant_chunks:
            print("RAG failed, using document raw content as fallback")  # Debug log
            # Fallback: Use document's raw content if available
            if hasattr(document, 'content') and document.content:
                document_content = document.content[:3000]  # Token safety
                print(f"Using raw document content, length: {len(document_content)}")  # Debug log
            else:
                print("No document content available, returning empty analysis")  # Debug log
                return FeatureResponse(
                    success=True,
                    data={
                        "content_analysis": {
                            "summary": "No content found in document for analysis",
                            "coverage_score": "0%",
                            "topics": {
                                "well_covered": [],
                                "weakly_covered": [],
                                "missing": []
                            },
                            "recommendations": ["Document appears to be empty or inaccessible"],
                            "sources_used": {
                                "document": False,
                                "web": False
                            }
                        },
                        "reference_syllabus": request.reference_syllabus
                    }
                )
        else:
            # Build document content
            document_content = "\n\n".join(
                chunk["content"] for chunk in relevant_chunks
            )
            document_content = document_content[:3000]  # Token safety
            print(f"Document content length: {len(document_content)}")  # Debug log

        # 3. Web search for additional content
        web_content = ""
        try:
            web_content = await web_search_service.search_academic_content(
                topic=request.reference_syllabus,  # Use syllabus as search query
                max_results=5
            )
            print(f"Web search completed, length: {len(web_content)}")  # Debug log
        except Exception as e:
            print("Web search failed:", e)

        # 4. Generate content gap analysis using both document and web
        print("Calling LLM for content gap analysis...")  # Debug log
        content_analysis = await llm_service.detect_content_gaps(
            document_content=document_content,
            web_content=web_content,
            reference_syllabus=request.reference_syllabus,
            difficulty=request.difficulty
        )
        print(f"LLM analysis completed")  # Debug log

        # 5. Return response
        return FeatureResponse(
            success=True,
            data={
                "content_analysis": content_analysis,
                "reference_syllabus": request.reference_syllabus,
                "difficulty": request.difficulty,
                "sources_used": {
                    "document": True,
                    "web": bool(web_content)
                }
            }
        )
    except Exception as e:
        return FeatureResponse(
            success=False,
            error=f"Error detecting content gaps: {str(e)}"
        )
