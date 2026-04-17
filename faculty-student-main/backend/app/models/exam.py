from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    assignment_data = Column(JSON, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False)
    # Optional targeting fields. If null, exam is open for all students.
    target_branch = Column(String, nullable=True, index=True)
    target_year = Column(Integer, nullable=True, index=True)
    target_section = Column(String, nullable=True, index=True)
    status = Column(String, nullable=False, default="scheduled")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    teacher = relationship("User", backref="published_exams")


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False, default="in_progress")
    answers = Column(JSON, nullable=False, default=dict)
    auto_score = Column(Integer, nullable=False, default=0)
    manual_score = Column(Integer, nullable=False, default=0)
    total_score = Column(Integer, nullable=False, default=0)
    max_score = Column(Integer, nullable=False, default=0)
    grading_status = Column(String, nullable=False, default="not_submitted")
    result_published = Column(Boolean, nullable=False, default=False)
    evaluation = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    exam = relationship("Exam", backref="attempts")
    student = relationship("User", backref="exam_attempts")
