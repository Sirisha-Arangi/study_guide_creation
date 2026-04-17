from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import uuid

from ..database import get_db
from ..models import User, Document, DocumentChunk
from ..schemas import DocumentResponse, DocumentChunkResponse
from ..core.dependencies import get_current_active_user
from ..services import document_processor, rag_service

router = APIRouter()

# Upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# =========================
# Upload Document
# =========================
@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        file_type = file.filename.split(".")[-1] if "." in file.filename else ""
        file_content = await file.read()
        file_size = len(file_content)

        # Validate file
        document_processor.validate_file(file.filename, file_size, file_type)

        # Calculate hash (used only for reference, NOT blocking duplicates)
        content_hash = document_processor.calculate_file_hash(file_content)

        # Save file with unique name
        unique_id = str(uuid.uuid4())
        stored_filename = f"{unique_id}.{file_type}"
        file_path = os.path.join(UPLOAD_DIR, stored_filename)

        with open(file_path, "wb") as f:
            f.write(file_content)

        # Process document
        processed = document_processor.process_document(file_path, file_type)

        # Save document record
        db_document = Document(
            user_id=current_user.id,
            filename=file.filename,
            file_type=file_type,
            file_size=file_size,
            content_hash=content_hash,
            metadata={
                "file_path": file_path,
                "total_text_length": len(processed["text"]),
                "num_chunks": processed["num_chunks"],
            },
        )

        db.add(db_document)
        db.commit()
        db.refresh(db_document)

        # Save chunks
        for idx, chunk_text in enumerate(processed["chunks"]):
            chunk = DocumentChunk(
                document_id=db_document.id,
                chunk_index=idx,
                content=chunk_text,
                embedding_id=f"doc_{db_document.id}_chunk_{idx}",
            )
            db.add(chunk)

        db.commit()

        # Ingest into vector DB
        await rag_service.ingest_document(db, db_document.id)

        return db_document

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading document: {str(e)}",
        )


# =========================
# List Documents (FIXED)
# =========================
@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all documents for the current user.
    """
    try:
        documents = (
            db.query(Document)
            .filter(Document.user_id == current_user.id)
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        # CRITICAL FIX: manual serialization to handle 422 errors
        result = []
        for doc in documents:
            try:
                result.append({
                    "id": doc.id,
                    "user_id": doc.user_id,
                    "filename": doc.filename,
                    "file_type": doc.file_type,
                    "file_size": doc.file_size,
                    "upload_date": doc.upload_date,
                    "metadata": doc.metadata if isinstance(doc.metadata, dict) else {},
                })
            except Exception as e:
                print(f" Error serializing document {doc.id}: {e}")
                continue  # Skip problematic document but continue processing others
        
        return result
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving documents: {str(e)}"
        )


# =========================
# Get Single Document
# =========================
@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": document.id,
        "user_id": document.user_id,
        "filename": document.filename,
        "file_type": document.file_type,
        "file_size": document.file_size,
        "upload_date": document.upload_date,
        "metadata": document.metadata if isinstance(document.metadata, dict) else {},
    }


# =========================
# Get Document Chunks
# =========================
@router.get("/{document_id}/chunks", response_model=List[DocumentChunkResponse])
async def get_document_chunks(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
        .all()
    )

    return chunks


# =========================
# Delete Document
# =========================
@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Delete embeddings
        chunks = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == document_id)
            .all()
        )

        embedding_ids = [c.embedding_id for c in chunks if c.embedding_id]
        if embedding_ids:
            from ..services import vector_store
            vector_store.delete_documents(embedding_ids)

        # Delete file
        if document.metadata and "file_path" in document.metadata:
            if os.path.exists(document.metadata["file_path"]):
                os.remove(document.metadata["file_path"])

        db.delete(document)
        db.commit()

        return {"message": "Document deleted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting document: {str(e)}",
        )
