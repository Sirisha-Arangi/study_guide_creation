from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import User, Document
from ...schemas import QARequest, FeatureResponse
from ...core.dependencies import get_current_active_user
from ...services import rag_service, llm_service, web_search_service

router = APIRouter()


@router.post("/generate", response_model=FeatureResponse)
async def generate_questions(
    request: QARequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate academic Q&A using:
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
                    "questions": [],
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
        web_content = None
        try:
            web_content = await web_search_service.search_academic_content(
                topic=request.topic,
                max_results=3
            )
            web_content = web_content[:1200]
        except Exception as e:
            print("⚠️ Web search skipped:", e)
            web_content = None


        # --------------------------------------------------
        # 5️⃣ Generate Questions (DOC + WEB)
        # --------------------------------------------------
        questions = await llm_service.generate_questions(
            document_content=document_content,
            web_content=web_content,
            topic=request.topic,
            difficulty=request.difficulty,
            number_of_questions=request.number_of_questions
        )

        # --------------------------------------------------
        # 6️⃣ Return response
        # --------------------------------------------------
        return FeatureResponse(
            success=True,
            data={
                "questions": questions,
                "number_generated": len(questions),
                "topic": request.topic,
                "difficulty": request.difficulty,
                "sources_used": {
                    "document": True,
                    "web_search": bool(web_content)
                }
            }
        )

    except Exception as e:
        return FeatureResponse(
            success=False,
            error=f"Error generating questions: {str(e)}"
        )
