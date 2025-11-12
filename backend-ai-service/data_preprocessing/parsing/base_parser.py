"""
Base Parser Abstract Class

Defines the common interface that all document parsers must implement.
This ensures consistency and makes it easy to add new parser types.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from enum import Enum


class DocumentType(Enum):
    """Supported document types"""
    PDF = "pdf"
    DOCX = "docx"
    PPTX = "pptx"
    HTML = "html"
    MARKDOWN = "markdown"
    TXT = "txt"
    IMAGE = "image"
    UNKNOWN = "unknown"


@dataclass
class ParsingResult:
    """
    Standardized result from document parsing.
    
    Attributes:
        text: The extracted plain text content
        metadata: Document metadata (file name, size, type, etc.)
        paragraphs: List of paragraphs (structured text)
        headings: List of headings/sections (for structured documents)
        tables: Extracted tables (if any)
        images: Image references (if any)
        raw_data: Raw parser-specific data for advanced use cases
        success: Whether parsing succeeded
        error: Error message if parsing failed
    """
    text: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    paragraphs: List[str] = field(default_factory=list)
    headings: List[Dict[str, Any]] = field(default_factory=list)
    tables: List[Dict[str, Any]] = field(default_factory=list)
    images: List[Dict[str, Any]] = field(default_factory=list)
    raw_data: Optional[Any] = None
    success: bool = True
    error: Optional[str] = None
    
    def __post_init__(self):
        """Validate the result after initialization"""
        if not self.success and not self.error:
            self.error = "Parsing failed with unknown error"
        
        # Ensure text is always a string
        if self.text is None:
            self.text = ""


class BaseParser(ABC):
    """
    Abstract base class for all document parsers.
    
    All concrete parsers must implement the parse() method and
    follow the standardized ParsingResult format.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the parser with configuration.
        
        Args:
            config: Configuration dictionary from config.yml
        """
        self.config = config
        self.encoding = config.get("parsing", {}).get("encoding", "utf-8")
        self.preprocessing = config.get("parsing", {}).get("preprocessing", {})
    
    @abstractmethod
    def parse(self, source: Union[str, Path, bytes]) -> ParsingResult:
        """
        Parse a document from various sources.
        
        Args:
            source: Can be:
                - str: File path or raw text/markdown content
                - Path: File path object
                - bytes: Raw file content
        
        Returns:
            ParsingResult: Standardized parsing result
        
        Raises:
            ValueError: If source is invalid
            FileNotFoundError: If file doesn't exist
            Exception: For other parsing errors
        """
        pass
    
    @abstractmethod
    def supports(self, source: Union[str, Path]) -> bool:
        """
        Check if this parser supports the given source.
        
        Args:
            source: File path or content to check
        
        Returns:
            bool: True if this parser can handle the source
        """
        pass
    
    def _apply_preprocessing(self, text: str) -> str:
        """
        Apply preprocessing steps to text based on configuration.
        
        Args:
            text: Raw text to preprocess
        
        Returns:
            str: Preprocessed text
        """
        if not text:
            return text
        
        # Remove URLs if configured
        if self.preprocessing.get("remove_urls", False):
            import re
            text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        
        # Remove emails if configured
        if self.preprocessing.get("remove_emails", False):
            import re
            text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', text)
        
        # Convert to lowercase if configured
        if self.preprocessing.get("lowercase", False):
            text = text.lower()
        
        # Remove stopwords if configured (requires underthesea for Vietnamese)
        if self.preprocessing.get("remove_stopwords", False):
            text = self._remove_stopwords(text)
        
        return text.strip()
    
    def _remove_stopwords(self, text: str) -> str:
        """
        Remove Vietnamese and English stopwords from text.
        
        Args:
            text: Text to process
        
        Returns:
            str: Text with stopwords removed
        """
        try:
            # Vietnamese stopwords
            from underthesea import word_tokenize
            
            vietnamese_stopwords = {
                'của', 'và', 'trong', 'có', 'được', 'này', 'cho', 'không',
                'các', 'là', 'với', 'một', 'để', 'từ', 'những', 'đã', 'được',
                'tại', 'như', 'ra', 'theo', 'đến', 'về', 'đó', 'bị', 'thì',
                'nếu', 'mà', 'khi', 'đây', 'sẽ', 'rằng', 'còn', 'hay', 'vì'
            }
            
            # English stopwords
            english_stopwords = {
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
                'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are',
                'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did'
            }
            
            stopwords = vietnamese_stopwords | english_stopwords
            
            # Tokenize and remove stopwords
            words = word_tokenize(text)
            filtered_words = [w for w in words if w.lower() not in stopwords]
            
            return ' '.join(filtered_words)
        except ImportError:
            # If underthesea is not available, skip stopword removal
            return text
    
    def _validate_file_size(self, file_path: Union[str, Path], max_size_mb: int = 50) -> bool:
        """
        Validate that file size is within acceptable limits.
        
        Args:
            file_path: Path to file
            max_size_mb: Maximum allowed size in MB
        
        Returns:
            bool: True if file size is acceptable
        
        Raises:
            ValueError: If file is too large
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        size_mb = path.stat().st_size / (1024 * 1024)
        max_allowed = self.config.get("parsing", {}).get("docling", {}).get("max_file_size_mb", max_size_mb)
        
        if size_mb > max_allowed:
            raise ValueError(
                f"File size ({size_mb:.2f}MB) exceeds maximum allowed size ({max_allowed}MB)"
            )
        
        return True
    
    def _get_document_type(self, source: Union[str, Path]) -> DocumentType:
        """
        Determine document type from file extension or content.
        
        Args:
            source: File path or content
        
        Returns:
            DocumentType: The detected document type
        """
        if isinstance(source, (str, Path)):
            path = Path(source)
            if path.exists():
                ext = path.suffix.lower().lstrip('.')
                try:
                    return DocumentType(ext)
                except ValueError:
                    pass
        
        return DocumentType.UNKNOWN
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(encoding={self.encoding})"
