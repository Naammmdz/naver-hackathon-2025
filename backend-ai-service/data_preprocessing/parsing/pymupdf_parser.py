"""
PyMuPDF Parser

Fast PDF parsing using PyMuPDF (fitz) library.
Lightweight alternative to Docling for simple PDF text extraction.
"""

from pathlib import Path
from typing import Union, Dict, Any
import tempfile
import sys

# Add parent directory to path
if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

try:
    import fitz  # PyMuPDF
except ImportError:
    raise ImportError(
        "PyMuPDF not installed. Install with: pip install pymupdf"
    )

from .base_parser import BaseParser, ParsingResult
from utils.logger import get_logger

logger = get_logger(__name__)


class PyMuPDFParser(BaseParser):
    """
    PDF parser using PyMuPDF (fitz) library.
    
    Features:
    - Fast PDF text extraction
    - Page-by-page processing
    - Image extraction capability
    - Metadata extraction
    - Lightweight compared to Docling
    
    Limitations:
    - Only supports PDF files
    - No advanced table extraction
    - No OCR support
    - Basic text layout preservation
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        """
        Initialize PyMuPDF parser.
        
        Args:
            config: Configuration dictionary from config.yml
        """
        super().__init__(config)
        self.parser_config = self.config.get('data_preprocessing', {}).get('parsing', {}).get('pymupdf', {})
        
        # Configuration options
        self.extract_images = self.parser_config.get('extract_images', False)
        self.preserve_layout = self.parser_config.get('preserve_layout', True)
        self.max_file_size_mb = self.parser_config.get('max_file_size_mb', 50)
        
        logger.info(f"Initialized PyMuPDFParser with config: {self.parser_config}")
    
    def parse(self, source: Union[str, Path, bytes]) -> ParsingResult:
        """
        Parse a PDF document using PyMuPDF.
        
        Args:
            source: File path (str or Path) or raw bytes
        
        Returns:
            ParsingResult: Parsed document with text and metadata
        """
        try:
            # Handle different source types
            if isinstance(source, bytes):
                return self._parse_bytes(source)
            
            file_path = Path(source)
            
            if not file_path.exists():
                error_msg = f"File not found: {file_path}"
                logger.error(error_msg)
                return ParsingResult(
                    text="",
                    metadata={'error_type': 'FileNotFoundError'},
                    success=False,
                    error=error_msg
                )
            
            # Check file size
            file_size_mb = file_path.stat().st_size / (1024 * 1024)
            if file_size_mb > self.max_file_size_mb:
                error_msg = f"File too large: {file_size_mb:.2f}MB (max: {self.max_file_size_mb}MB)"
                logger.warning(error_msg)
                return ParsingResult(
                    text="",
                    metadata={'error_type': 'FileTooLarge', 'file_size_mb': file_size_mb},
                    success=False,
                    error=error_msg
                )
            
            # Parse PDF
            logger.info(f"Parsing PDF with PyMuPDF: {file_path.name} ({file_size_mb:.2f}MB)")
            
            doc = fitz.open(str(file_path))
            return self._extract_content(doc, str(file_path))
            
        except Exception as e:
            logger.error(f"Error parsing PDF: {e}", exc_info=True)
            return ParsingResult(
                text="",
                metadata={'error_type': type(e).__name__},
                success=False,
                error=f"Failed to parse PDF: {str(e)}"
            )
    
    def _parse_bytes(self, data: bytes) -> ParsingResult:
        """
        Parse PDF from bytes.
        
        Args:
            data: PDF file bytes
        
        Returns:
            ParsingResult: Parsing result
        """
        try:
            # Create temp file for bytes
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                tmp.write(data)
                tmp_path = Path(tmp.name)
            
            try:
                # Open from bytes directly
                doc = fitz.open(stream=data, filetype="pdf")
                result = self._extract_content(doc, "uploaded_file.pdf")
                return result
            finally:
                # Clean up temp file
                if tmp_path.exists():
                    tmp_path.unlink()
                    
        except Exception as e:
            logger.error(f"Error parsing PDF from bytes: {e}", exc_info=True)
            return ParsingResult(
                text="",
                metadata={'error_type': type(e).__name__},
                success=False,
                error=f"Failed to parse PDF bytes: {str(e)}"
            )
    
    def _extract_content(self, doc: fitz.Document, filename: str) -> ParsingResult:
        """
        Extract content from PyMuPDF document.
        
        Args:
            doc: PyMuPDF document object
            filename: Original filename
        
        Returns:
            ParsingResult: Extracted content and metadata
        """
        try:
            # Extract text from all pages
            text_parts = []
            images = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Extract text
                if self.preserve_layout:
                    page_text = page.get_text("text")  # Simple text extraction
                else:
                    page_text = page.get_text("text", sort=True)  # Sorted by position
                
                text_parts.append(page_text)
                
                # Extract images if requested
                if self.extract_images:
                    image_list = page.get_images()
                    for img_index, img in enumerate(image_list):
                        images.append({
                            'page': page_num + 1,
                            'index': img_index,
                            'xref': img[0]
                        })
            
            # Combine text from all pages
            full_text = "\n\n".join(text_parts)
            
            # Extract metadata
            metadata = {
                'filename': filename,
                'pages': len(doc),
                'format': 'PDF',
                'parser': 'pymupdf',
                'file_metadata': doc.metadata,
                'images_count': len(images),
                'text_length': len(full_text),
            }
            
            # Add PDF metadata
            if doc.metadata:
                metadata['title'] = doc.metadata.get('title', '')
                metadata['author'] = doc.metadata.get('author', '')
                metadata['subject'] = doc.metadata.get('subject', '')
                metadata['creator'] = doc.metadata.get('creator', '')
            
            page_count = len(doc)
            doc.close()
            
            logger.info(f"✅ Extracted {len(full_text)} chars from {page_count} pages ({len(images)} images)")
            
            return ParsingResult(
                text=full_text,
                metadata=metadata,
                images=images if self.extract_images else [],
                success=True
            )
            
        except Exception as e:
            logger.error(f"Error extracting content: {e}", exc_info=True)
            return ParsingResult(
                text="",
                metadata={'error_type': type(e).__name__},
                success=False,
                error=f"Failed to extract content: {str(e)}"
            )
    
    def supports(self, source: Union[str, Path]) -> bool:
        """
        Check if this parser supports the given source.
        
        Args:
            source: File path to check
        
        Returns:
            bool: True if source is a PDF file
        """
        if isinstance(source, (str, Path)):
            path = Path(source)
            return path.suffix.lower() == '.pdf'
        return False
    
    def __repr__(self) -> str:
        return "PyMuPDFParser(format=PDF, features=fast+lightweight)"
