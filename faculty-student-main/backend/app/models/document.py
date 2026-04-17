from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    content_hash = Column(String, nullable=False)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    doc_metadata = Column(JSON, nullable=True)
    
    # Relationship with user
    user = relationship("User", backref="documents")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding_id = Column(String, nullable=True)  # ChromaDB ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship with document
    document = relationship("Document", backref="chunks")
