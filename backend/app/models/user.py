from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, nullable=True)
    # Student-only fields (optional for teachers).
    branch = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    section = Column(String, nullable=True)
    roll_number = Column(String, nullable=True)
    role = Column(String, nullable=False, default="teacher")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
