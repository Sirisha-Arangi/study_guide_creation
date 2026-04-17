import hashlib
import os
from typing import List, Dict, Any, Optional
from pathlib import Path
import PyPDF2
import pdfplumber
import docx
from sentence_transformers import SentenceTransformer
from ..config import settings


class DocumentProcessor:
    """Service for processing and chunking documents."""
    
    def __init__(self):
        # Initialize sentence transformer model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.chunk_size = 1000  # Characters per chunk
        self.chunk_overlap = 200  # Characters overlap between chunks
    
    def calculate_file_hash(self, file_content: bytes) -> str:
        """Calculate SHA-256 hash of file content."""
        return hashlib.sha256(file_content).hexdigest()
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file."""
        text = ""
        try:
            # Try pdfplumber first (better for tables and formatting)
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception:
            # Fallback to PyPDF2
            try:
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page in pdf_reader.pages:
                        text += page.extract_text() + "\n"
            except Exception as e:
                raise Exception(f"Error extracting text from PDF: {str(e)}")
        
        return text
    
    def extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file."""
        try:
            doc = docx.Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except Exception as e:
            raise Exception(f"Error extracting text from DOCX: {str(e)}")
    
    def extract_text_from_txt(self, file_path: str) -> str:
        """Extract text from TXT file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except UnicodeDecodeError:
            # Try with different encoding
            try:
                with open(file_path, 'r', encoding='latin-1') as file:
                    return file.read()
            except Exception as e:
                raise Exception(f"Error extracting text from TXT: {str(e)}")
        except Exception as e:
            raise Exception(f"Error extracting text from TXT: {str(e)}")
    
    def extract_text_from_json(self, file_path: str) -> str:
        """Extract text from JSON file."""
        try:
            import json
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
            
            # Convert JSON to readable text
            def json_to_text(obj, indent=0):
                text = ""
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        text += "  " * indent + f"{key}:\n"
                        text += json_to_text(value, indent + 1)
                elif isinstance(obj, list):
                    for item in obj:
                        text += json_to_text(item, indent + 1)
                else:
                    text += "  " * indent + f"{str(obj)}\n"
                return text
            
            return json_to_text(data)
        except Exception as e:
            raise Exception(f"Error extracting text from JSON: {str(e)}")
    
    def extract_text(self, file_path: str, file_type: str) -> str:
        """Extract text from various file types."""
        file_type = file_type.lower()
        
        if file_type == 'pdf':
            return self.extract_text_from_pdf(file_path)
        elif file_type == 'docx':
            return self.extract_text_from_docx(file_path)
        elif file_type == 'txt':
            return self.extract_text_from_txt(file_path)
        elif file_type == 'json':
            return self.extract_text_from_json(file_path)
        else:
            raise Exception(f"Unsupported file type: {file_type}")
    
    def chunk_text(self, text: str) -> List[str]:
        """Split text into chunks with overlap."""
        if not text:
            return []
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + self.chunk_size
            
            if end >= len(text):
                # Last chunk
                chunks.append(text[start:])
                break
            
            # Try to break at sentence or paragraph boundary
            chunk = text[start:end]
            
            # Look for sentence endings near the end of chunk
            sentence_endings = ['.', '!', '?', '\n\n']
            best_break = -1
            
            for i in range(len(chunk) - 1, max(0, len(chunk) - 200), -1):
                if chunk[i] in sentence_endings:
                    best_break = i + 1
                    break
            
            if best_break > 0:
                chunks.append(chunk[:best_break])
                start = start + best_break - self.chunk_overlap
            else:
                chunks.append(chunk)
                start = end - self.chunk_overlap
        
        # Remove empty chunks and strip whitespace
        chunks = [chunk.strip() for chunk in chunks if chunk.strip()]
        
        return chunks
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        try:
            embeddings = self.model.encode(texts)
            return embeddings.tolist()
        except Exception as e:
            raise Exception(f"Error generating embeddings: {str(e)}")
    
    def process_document(self, file_path: str, file_type: str) -> Dict[str, Any]:
        """Process a document and return chunks and embeddings."""
        # Extract text
        text = self.extract_text(file_path, file_type)
        
        if not text.strip():
            raise Exception("No text could be extracted from the document")
        
        # Chunk text
        chunks = self.chunk_text(text)
        
        if not chunks:
            raise Exception("Document could not be chunked")
        
        # Generate embeddings
        embeddings = self.generate_embeddings(chunks)
        
        return {
            "text": text,
            "chunks": chunks,
            "embeddings": embeddings,
            "num_chunks": len(chunks)
        }
    
    def validate_file(self, filename: str, file_size: int, file_type: str) -> bool:
        """Validate file based on configured constraints."""
        # Check file type
        allowed_types = settings.allowed_file_types_list
        if file_type.lower() not in allowed_types:
            raise Exception(f"File type '{file_type}' not allowed. Allowed types: {', '.join(allowed_types)}")
        
        # Check file size
        max_size_str = settings.max_file_size.upper()
        if max_size_str.endswith('MB'):
            max_size_mb = int(max_size_str[:-2])
            max_size_bytes = max_size_mb * 1024 * 1024
        elif max_size_str.endswith('KB'):
            max_size_kb = int(max_size_str[:-2])
            max_size_bytes = max_size_kb * 1024
        else:
            max_size_bytes = int(max_size_str)
        
        if file_size > max_size_bytes:
            raise Exception(f"File size exceeds maximum allowed size of {max_size_str}")
        
        return True


# Global document processor instance
document_processor = DocumentProcessor()
