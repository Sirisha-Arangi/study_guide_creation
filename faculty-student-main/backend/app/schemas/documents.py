from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class DocumentBase(BaseModel):
    filename: str
    file_type: str
    file_size: int


class DocumentCreate(DocumentBase):
    content_hash: str
    metadata: Optional[Dict[str, Any]] = None


class DocumentResponse(DocumentBase):
    id: int
    user_id: int
    upload_date: datetime
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


class DocumentChunkBase(BaseModel):
    chunk_index: int
    content: str


class DocumentChunkCreate(DocumentChunkBase):
    document_id: int
    embedding_id: Optional[str] = None


class DocumentChunkResponse(DocumentChunkBase):
    id: int
    document_id: int
    embedding_id: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class FeatureRequest(BaseModel):
    document_id: int
    parameters: Dict[str, Any]


class FeatureResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# Feature-specific schemas
class SummarizationRequest(FeatureRequest):
    topic_name: Optional[str] = None
    page_number: Optional[int] = None


class FlashcardsRequest(FeatureRequest):
    topic: str
    difficulty: str  # Easy, Moderate, Hard
    number_of_flashcards: int


class QARequest(FeatureRequest):
    topic: str
    difficulty: str  # Easy, Moderate, Hard
    number_of_questions: int


class LecturePlanRequest(FeatureRequest):
    topic: str
    difficulty: str  # Beginner, Intermediate, Advanced
    target_audience: Optional[str] = None
    duration_minutes: int  # 30, 60, 90
    number_of_sessions: int


class ContentGapRequest(FeatureRequest):
    reference_syllabus: str
    difficulty: Optional[str] = None  # Beginner, Intermediate, Advanced


class DocumentComparisonRequest(BaseModel):
    document_a_id: int
    document_b_id: int
    focus_areas: Optional[List[str]] = None


class AssignmentGeneratorRequest(BaseModel):
    document_id: int
    number_of_questions: int
    total_marks: int
    difficulty_level: str  # "beginner", "intermediate", "advanced"
    question_types: List[str]  # ["multiple_choice", "short_answer", "essay", "true_false"]
    topics: List[str]  # Specific topics to focus on
    duration_hours: Optional[int] = None


class ExamPublishRequest(BaseModel):
    title: str
    assignment: Dict[str, Any]
    start_time: datetime
    duration_minutes: int
    target_branch: Optional[str] = None
    target_year: Optional[int] = None
    target_section: Optional[str] = None


class ExamListItem(BaseModel):
    id: int
    title: str
    start_time: datetime
    duration_minutes: int
    status: str


class StartExamResponse(BaseModel):
    attempt_id: int
    exam_id: int
    title: str
    started_at: datetime
    ends_at: datetime
    status: str


class SaveAnswerRequest(BaseModel):
    question_id: str
    answer: Any


class ManualSubmitRequest(BaseModel):
    final_answers: Optional[Dict[str, Any]] = None


class GradeAnswerRequest(BaseModel):
    question_id: str
    awarded_marks: float
    feedback: Optional[str] = None
