"""
Docling Parser

Universal document parser using IBM's Docling library.
Supports PDF, DOCX, PPTX, images, HTML, and more with advanced features like:
- OCR for scanned documents
- Table extraction
- Structure preservation
- Metadata extraction
"""

from pathlib import Path
from typing import Any, Dict, List, Union
import sys

# Add parent directory to path for utils import
if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from .base_parser import BaseParser, DocumentType, ParsingResult
from utils.logger import get_logger

logger = get_logger(__name__)


class DoclingParser(BaseParser):
    """
    Universal document parser using Docling library.
    
    Supports multiple document formats with advanced features:
    - PDF (with OCR support)
    - DOCX, PPTX
    - Images (JPG, PNG, etc.)
    - HTML
    - And more...
    
    Example:
        >>> config = {'parsing': {'docling': {'ocr_enabled': True}}}
        >>> parser = DoclingParser(config)
        >>> result = parser.parse('document.pdf')
        >>> print(result.text)
    """
    
    SUPPORTED_EXTENSIONS = {
        'pdf', 'docx', 'pptx', 'jpg', 'jpeg', 'png', 
        'html', 'htm', 'xlsx', 'doc', 'ppt'
    }
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Docling parser.
        
        Args:
            config: Configuration dictionary from config.yml
        """
        super().__init__(config)
        
        # Get Docling-specific config
        self.docling_config = config.get("parsing", {}).get("docling", {})
        self.ocr_enabled = self.docling_config.get("ocr_enabled", True)
        self.table_extraction = self.docling_config.get("table_extraction", True)
        self.output_format = self.docling_config.get("output_format", "markdown")
        self.max_file_size_mb = self.docling_config.get("max_file_size_mb", 50)
        
        # Initialize Docling converter lazily
        self._converter = None
        
        logger.info(
            f"DoclingParser initialized: ocr={self.ocr_enabled}, "
            f"tables={self.table_extraction}, format={self.output_format}"
        )
    
    @property
    def converter(self):
        """Lazy initialization of DocumentConverter to avoid import issues"""
        if self._converter is None:
            try:
                from docling.document_converter import DocumentConverter, PdfFormatOption
                from docling.datamodel.base_models import InputFormat
                from docling.datamodel.pipeline_options import PdfPipelineOptions
                
                # Configure PDF pipeline options
                pipeline_options = PdfPipelineOptions()
                pipeline_options.do_ocr = False  # Disable OCR to avoid easyocr dependency
                pipeline_options.do_table_structure = False  # Disable table structure to avoid torchvision dependency
                
                # Create format options with pipeline settings
                format_options = {
                    InputFormat.PDF: PdfFormatOption(
                        pipeline_options=pipeline_options
                    )
                }
                
                # Initialize converter with format-specific options
                self._converter = DocumentConverter(
                    allowed_formats=[InputFormat.PDF, InputFormat.DOCX, InputFormat.PPTX],
                    format_options=format_options
                )
                logger.info("Docling DocumentConverter initialized successfully (OCR disabled)")
                    
            except ImportError as e:
                logger.error(f"Failed to import Docling: {e}")
                raise ImportError(
                    "Docling library not found. Install with: pip install docling docling-core"
                ) from e
        
        return self._converter
    
    def supports(self, source: Union[str, Path]) -> bool:
        """
        Check if this parser supports the given file.
        
        Args:
            source: File path to check
        
        Returns:
            bool: True if file extension is supported
        """
        if isinstance(source, bytes):
            return False
        
        path = Path(source)
        if not path.exists():
            return False
        
        ext = path.suffix.lower().lstrip('.')
        return ext in self.SUPPORTED_EXTENSIONS
    
    def parse(self, source: Union[str, Path, bytes]) -> ParsingResult:
        """
        Parse a document using Docling.
        
        Args:
            source: File path (str or Path) or raw bytes
        
        Returns:
            ParsingResult: Parsed document with text, metadata, and structure
        
        Raises:
            ValueError: If source is invalid
            FileNotFoundError: If file doesn't exist
            Exception: For other parsing errors
        """
        try:
            # Handle different source types
            if isinstance(source, bytes):
                return self._parse_bytes(source)
            
            file_path = Path(source)
            
            # Validate file
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {source}")
            
            if not self.supports(file_path):
                ext = file_path.suffix
                raise ValueError(
                    f"Unsupported file type: {ext}. "
                    f"Supported: {', '.join(sorted(self.SUPPORTED_EXTENSIONS))}"
                )
            
            # Validate file size
            self._validate_file_size(file_path, self.max_file_size_mb)
            
            logger.info(f"Parsing document: {file_path}")
            
            # Convert document using Docling
            conversion_result = self.converter.convert(str(file_path))
            
            # Extract text based on output format
            if self.output_format == "markdown":
                text = conversion_result.document.export_to_markdown()
            elif self.output_format == "text":
                text = conversion_result.document.export_to_text()
            else:
                # Default to markdown
                text = conversion_result.document.export_to_markdown()
            
            # Apply preprocessing
            processed_text = self._apply_preprocessing(text)
            
            # Check minimum text length
            min_length = self.preprocessing.get("min_text_length", 50)
            if len(processed_text) < min_length:
                logger.warning(
                    f"Parsed text is too short ({len(processed_text)} chars). "
                    f"Minimum: {min_length} chars"
                )
            
            # Extract structured data
            paragraphs = self._extract_paragraphs(conversion_result.document)
            headings = self._extract_headings(conversion_result.document)
            tables = self._extract_tables(conversion_result.document)
            images = self._extract_images(conversion_result.document)
            
            # Build metadata
            metadata = {
                'file_name': file_path.name,
                'file_path': str(file_path.absolute()),
                'file_size_bytes': file_path.stat().st_size,
                'file_type': file_path.suffix.lstrip('.'),
                'pages': len(conversion_result.document.pages) if hasattr(conversion_result.document, 'pages') else 0,
                'paragraphs_count': len(paragraphs),
                'headings_count': len(headings),
                'tables_count': len(tables),
                'images_count': len(images),
                'ocr_enabled': self.ocr_enabled,
                'output_format': self.output_format,
            }
            
            # Get document-level metadata from Docling
            if hasattr(conversion_result.document, 'metadata'):
                doc_meta = conversion_result.document.metadata
                if hasattr(doc_meta, 'title') and doc_meta.title:
                    metadata['title'] = doc_meta.title
                if hasattr(doc_meta, 'author') and doc_meta.author:
                    metadata['author'] = doc_meta.author
                if hasattr(doc_meta, 'creation_date') and doc_meta.creation_date:
                    metadata['creation_date'] = str(doc_meta.creation_date)
            
            logger.info(
                f"Successfully parsed {file_path.name}: "
                f"{len(processed_text)} chars, {metadata['pages']} pages, "
                f"{metadata['tables_count']} tables"
            )
            
            return ParsingResult(
                text=processed_text,
                metadata=metadata,
                paragraphs=paragraphs,
                headings=headings,
                tables=tables,
                images=images,
                raw_data=conversion_result,
                success=True,
                error=None
            )
            
        except FileNotFoundError as e:
            logger.error(f"File not found: {e}")
            return ParsingResult(
                text="",
                metadata={'error_type': 'FileNotFoundError'},
                success=False,
                error=str(e)
            )
        
        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return ParsingResult(
                text="",
                metadata={'error_type': 'ValueError'},
                success=False,
                error=str(e)
            )
        
        except Exception as e:
            logger.error(f"Unexpected error parsing document: {e}", exc_info=True)
            return ParsingResult(
                text="",
                metadata={'error_type': type(e).__name__},
                success=False,
                error=f"Failed to parse document: {str(e)}"
            )
    
    def _parse_bytes(self, content: bytes) -> ParsingResult:
        """
        Parse document from raw bytes.
        
        Args:
            content: Raw file content
        
        Returns:
            ParsingResult: Parsed result
        """
        import tempfile
        
        # Save bytes to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.tmp') as tmp_file:
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            result = self.parse(tmp_path)
            # Update metadata to indicate it was from bytes
            result.metadata['source_type'] = 'bytes'
            result.metadata.pop('file_path', None)
            return result
        finally:
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)
    
    def _extract_paragraphs(self, document) -> List[str]:
        """
        Extract paragraphs from Docling document.
        
        Args:
            document: Docling document object
        
        Returns:
            List[str]: List of paragraph texts
        """
        paragraphs = []
        
        try:
            # Docling documents have a hierarchical structure
            # We iterate through pages and extract text blocks
            if hasattr(document, 'pages'):
                for page in document.pages:
                    if hasattr(page, 'text_blocks'):
                        for block in page.text_blocks:
                            if hasattr(block, 'text') and block.text.strip():
                                paragraphs.append(block.text.strip())
            
            # Alternative: parse from markdown output
            if not paragraphs and hasattr(document, 'export_to_markdown'):
                text = document.export_to_markdown()
                paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        except Exception as e:
            logger.warning(f"Failed to extract paragraphs: {e}")
        
        return paragraphs
    
    def _extract_headings(self, document) -> List[Dict[str, Any]]:
        """
        Extract headings/sections from document.
        
        Args:
            document: Docling document object
        
        Returns:
            List[Dict]: List of headings with level and text
        """
        headings = []
        
        try:
            # Extract headings from markdown format
            if hasattr(document, 'export_to_markdown'):
                text = document.export_to_markdown()
                for line in text.split('\n'):
                    if line.startswith('#'):
                        level = len(line) - len(line.lstrip('#'))
                        heading_text = line.lstrip('#').strip()
                        if heading_text:
                            headings.append({
                                'level': level,
                                'text': heading_text
                            })
        
        except Exception as e:
            logger.warning(f"Failed to extract headings: {e}")
        
        return headings
    
    def _extract_tables(self, document) -> List[Dict[str, Any]]:
        """
        Extract tables from document.
        
        Args:
            document: Docling document object
        
        Returns:
            List[Dict]: List of tables with data and metadata
        """
        tables = []
        
        try:
            if hasattr(document, 'tables'):
                for idx, table in enumerate(document.tables):
                    table_data = {
                        'index': idx,
                        'rows': getattr(table, 'num_rows', 0),
                        'cols': getattr(table, 'num_cols', 0),
                    }
                    
                    # Try to export table data
                    if hasattr(table, 'export_to_dataframe'):
                        try:
                            # Pass doc argument to avoid deprecation warning
                            df = table.export_to_dataframe(doc=document)
                            table_data['data'] = df.to_dict('records')
                        except Exception:
                            pass
                    
                    tables.append(table_data)
        
        except Exception as e:
            logger.warning(f"Failed to extract tables: {e}")
        
        return tables
    
    def _extract_images(self, document) -> List[Dict[str, Any]]:
        """
        Extract image references from document.
        
        Args:
            document: Docling document object
        
        Returns:
            List[Dict]: List of image metadata
        """
        images = []
        
        try:
            if hasattr(document, 'pictures'):
                for idx, picture in enumerate(document.pictures):
                    image_data = {
                        'index': idx,
                    }
                    
                    # Extract available attributes
                    if hasattr(picture, 'size'):
                        image_data['size'] = picture.size
                    if hasattr(picture, 'format'):
                        image_data['format'] = picture.format
                    
                    images.append(image_data)
        
        except Exception as e:
            logger.warning(f"Failed to extract images: {e}")
        
        return images
    
    def __repr__(self) -> str:
        return (
            f"DoclingParser(ocr={self.ocr_enabled}, "
            f"tables={self.table_extraction}, "
            f"format={self.output_format})"
        )
