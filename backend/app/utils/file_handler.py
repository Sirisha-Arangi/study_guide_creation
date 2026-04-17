import os
import shutil
from typing import List, Optional
from pathlib import Path


class FileHandler:
    """Utility class for file operations."""
    
    @staticmethod
    def ensure_directory_exists(directory_path: str) -> None:
        """Ensure directory exists, create if it doesn't."""
        Path(directory_path).mkdir(parents=True, exist_ok=True)
    
    @staticmethod
    def delete_file(file_path: str) -> bool:
        """Delete a file if it exists."""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception:
            return False
    
    @staticmethod
    def get_file_size(file_path: str) -> int:
        """Get file size in bytes."""
        try:
            return os.path.getsize(file_path)
        except Exception:
            return 0
    
    @staticmethod
    def get_file_extension(filename: str) -> str:
        """Get file extension without the dot."""
        return filename.split('.')[-1].lower() if '.' in filename else ''
    
    @staticmethod
    def is_allowed_file_type(filename: str, allowed_types: List[str]) -> bool:
        """Check if file type is allowed."""
        file_extension = FileHandler.get_file_extension(filename)
        return file_extension in [ft.lower() for ft in allowed_types]
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for safe storage."""
        # Remove or replace unsafe characters
        unsafe_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
        safe_filename = filename
        for char in unsafe_chars:
            safe_filename = safe_filename.replace(char, '_')
        return safe_filename
