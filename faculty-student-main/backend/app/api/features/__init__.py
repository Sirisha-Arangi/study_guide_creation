from fastapi import APIRouter

from .summarization import router as summarization_router
from .qa import router as qa_router
from .flashcards import router as flashcards_router
from .lecture_plan import router as lecture_plan_router
from .content_gap import router as content_gap_router
from .document_comparison import router as document_comparison_router
from .assignment_generator import router as assignment_generator_router

router = APIRouter()

router.include_router(summarization_router, prefix="/summarization", tags=["Summarization"])
router.include_router(qa_router, prefix="/qa", tags=["Q&A"])
router.include_router(flashcards_router, prefix="/flashcards", tags=["Flashcards"])
router.include_router(lecture_plan_router, prefix="/lecture-plan", tags=["Lecture Plan"])
router.include_router(content_gap_router, prefix="/content-gap", tags=["Content Gap"])
router.include_router(document_comparison_router, prefix="/document-comparison", tags=["Document Comparison"])
router.include_router(assignment_generator_router, prefix="/assignment-generator", tags=["Assignment Generator"])
