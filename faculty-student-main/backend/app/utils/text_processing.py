import re
from typing import List, Optional


class TextProcessor:
    """Utility class for text processing operations."""
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize text."""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s\.\,\!\?\;\:\-\(\)\[\]\{\}\"\'\/\\]', '', text)
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text
    
    @staticmethod
    def split_into_sentences(text: str) -> List[str]:
        """Split text into sentences."""
        if not text:
            return []
        
        # Simple sentence splitting using regex
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        # Filter out empty sentences and strip whitespace
        sentences = [s.strip() for s in sentences if s.strip()]
        
        return sentences
    
    @staticmethod
    def split_into_paragraphs(text: str) -> List[str]:
        """Split text into paragraphs."""
        if not text:
            return []
        
        # Split by double newlines or multiple newlines
        paragraphs = re.split(r'\n\s*\n|\n{2,}', text)
        
        # Filter out empty paragraphs and strip whitespace
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        
        return paragraphs
    
    @staticmethod
    def extract_keywords(text: str, min_length: int = 3, max_keywords: int = 10) -> List[str]:
        """Extract keywords from text."""
        if not text:
            return []
        
        # Simple keyword extraction - remove common stop words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
            'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
            'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'so',
            'than', 'too', 'very', 'just', 'now', 'also', 'back', 'after', 'again'
        }
        
        # Convert to lowercase and split into words
        words = re.findall(r'\b[a-zA-Z]{' + str(min_length) + ',}\b', text.lower())
        
        # Filter out stop words and count frequency
        word_freq = {}
        for word in words:
            if word not in stop_words:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Sort by frequency and return top keywords
        keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in keywords[:max_keywords]]
    
    @staticmethod
    def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
        """Truncate text to maximum length."""
        if not text or len(text) <= max_length:
            return text
        
        return text[:max_length - len(suffix)] + suffix
    
    @staticmethod
    def count_words(text: str) -> int:
        """Count words in text."""
        if not text:
            return 0
        
        words = re.findall(r'\b\w+\b', text)
        return len(words)
    
    @staticmethod
    def estimate_reading_time(text: str, words_per_minute: int = 200) -> int:
        """Estimate reading time in minutes."""
        word_count = TextProcessor.count_words(text)
        return max(1, round(word_count / words_per_minute))
