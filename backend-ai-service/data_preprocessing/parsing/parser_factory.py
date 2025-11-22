"""
Parser Factory

Factory pattern for creating the appropriate parser based on:
- File extension
- Content type
- Explicit parser type specification
"""

from pathlib import Path
from typing import Any, Dict, Optional, Union
import sys

# Add parent directory to path for utils import
if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from .base_parser import BaseParser
from .docling_parser import DoclingParser
from .markdown_parser import MarkdownParser
from utils.logger import get_logger

logger = get_logger(__name__)

try:
    from .pymupdf_parser import PyMuPDFParser
    PYMUPDF_AVAILABLE = True
except ImportError:
    logger.warning("PyMuPDF not available. Install with: pip install pymupdf")
    PYMUPDF_AVAILABLE = False


class ParserFactory:
    """
    Factory class for creating document parsers.
    
    Automatically selects the appropriate parser based on:
    - Explicit parser_type parameter
    - File extension
    - Content analysis
    
    Example:
        >>> config = {...}
        >>> 
        >>> # Auto-detect from file extension
        >>> parser = ParserFactory.create_parser(config=config)
        >>> result = parser.parse('document.pdf')
        >>> 
        >>> # Explicit parser type
        >>> parser = ParserFactory.create_parser(parser_type='markdown', config=config)
        >>> result = parser.parse(markdown_content)
    """
    
    # Registry of available parsers
    _PARSERS = {
        'docling': DoclingParser,
        'markdown': MarkdownParser,
    }
    
    # Add PyMuPDF if available
    if PYMUPDF_AVAILABLE:
        _PARSERS['pymupdf'] = PyMuPDFParser
    
    # Mapping of file extensions to parser types
    # Note: PDF mapping is determined by config (default_parser)
    _EXTENSION_MAP = {
        # PDF - will be determined by config default_parser
        'pdf': None,  # Dynamically determined
        
        # Docling-supported formats (non-PDF)
        'docx': 'docling',
        'doc': 'docling',
        'pptx': 'docling',
        'ppt': 'docling',
        'xlsx': 'docling',
        'xls': 'docling',
        'html': 'docling',
        'htm': 'docling',
        'jpg': 'docling',
        'jpeg': 'docling',
        'png': 'docling',
        
        # Markdown formats
        'md': 'markdown',
        'markdown': 'markdown',
        'mdown': 'markdown',
        'mkd': 'markdown',
        
        # Plain text (use markdown parser as it handles plain text well)
        'txt': 'markdown',
    }
    
    @classmethod
    def create_parser(
        cls,
        parser_type: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
        source: Optional[Union[str, Path]] = None
    ) -> BaseParser:
        """
        Create a parser instance.
        
        Args:
            parser_type: Explicit parser type ('docling', 'markdown')
                        If None, will auto-detect from source
            config: Configuration dictionary from config.yml
                   If None, will use empty config
            source: Source file path or content for auto-detection
                   Only used if parser_type is None
        
        Returns:
            BaseParser: Instance of the appropriate parser
        
        Raises:
            ValueError: If parser_type is invalid or cannot be determined
        
        Examples:
            >>> # Explicit parser
            >>> parser = ParserFactory.create_parser('docling', config)
            >>> 
            >>> # Auto-detect from file
            >>> parser = ParserFactory.create_parser(config=config, source='doc.pdf')
            >>> 
            >>> # Auto-detect from content
            >>> parser = ParserFactory.create_parser(config=config, source='# Markdown content')
        """
        # Use empty config if none provided
        if config is None:
            config = {}
            logger.warning("No config provided, using empty config")
        
        # Determine parser type
        if parser_type is None:
            if source is None:
                # Default to markdown for general text content
                parser_type = 'markdown'
                logger.info("No parser_type or source specified, defaulting to markdown")
            else:
                parser_type = cls._detect_parser_type(source, config)
                logger.info(f"Auto-detected parser type: {parser_type}")
        
        # Validate parser type
        parser_type = parser_type.lower()
        if parser_type not in cls._PARSERS:
            available = ', '.join(cls._PARSERS.keys())
            raise ValueError(
                f"Unknown parser type: '{parser_type}'. "
                f"Available: {available}"
            )
        
        # Create parser instance
        parser_class = cls._PARSERS[parser_type]
        parser = parser_class(config)
        
        logger.info(f"Created parser: {parser}")
        return parser
    
    @classmethod
    def _detect_parser_type(cls, source: Union[str, Path], config: Dict[str, Any] = None) -> str:
        """
        Auto-detect parser type from source.
        
        Args:
            source: File path or content string
            config: Configuration to determine default PDF parser
        
        Returns:
            str: Detected parser type
        """
        # If it's a path-like object or existing file
        if isinstance(source, Path) or (isinstance(source, str) and Path(source).exists()):
            path = Path(source)
            ext = path.suffix.lower().lstrip('.')
            
            if ext in cls._EXTENSION_MAP:
                parser_type = cls._EXTENSION_MAP[ext]
                
                # Handle PDF - use config to determine parser
                if parser_type is None and ext == 'pdf':
                    default_parser = 'pymupdf'  # Default fallback
                    if config:
                        default_parser = config.get('data_preprocessing', {}).get('parsing', {}).get('default_parser', 'pymupdf')
                    
                    # Validate parser is available
                    if default_parser == 'pymupdf' and not PYMUPDF_AVAILABLE:
                        logger.warning("PyMuPDF not available, falling back to docling")
                        parser_type = 'docling'
                    else:
                        parser_type = default_parser
                    
                    logger.debug(f"Detected PDF, using configured parser: {parser_type}")
                else:
                    logger.debug(f"Detected parser from extension '.{ext}': {parser_type}")
                
                return parser_type
        
        # If it's a string, try to detect from content
        if isinstance(source, str):
            # Check for markdown patterns
            markdown_indicators = [
                source.startswith('#'),  # Heading
                '```' in source,  # Code block
                source.startswith('*') or source.startswith('-'),  # List
                '[' in source and '](' in source,  # Link
                '|' in source and source.count('|') >= 3,  # Table
            ]
            
            if any(markdown_indicators):
                logger.debug("Detected markdown from content patterns")
                return 'markdown'
            
            # If no clear indicators, assume it's plain text → use markdown parser
            logger.debug("No clear indicators, defaulting to markdown for text content")
            return 'markdown'
        
        # Default fallback
        logger.debug("Could not detect parser type, defaulting to markdown")
        return 'markdown'
    
    @classmethod
    def get_parser_for_file(cls, file_path: Union[str, Path], config: Dict[str, Any]) -> BaseParser:
        """
        Convenience method to get parser for a specific file.
        
        Args:
            file_path: Path to the file
            config: Configuration dictionary
        
        Returns:
            BaseParser: Appropriate parser for the file
        
        Example:
            >>> parser = ParserFactory.get_parser_for_file('document.pdf', config)
            >>> result = parser.parse('document.pdf')
        """
        return cls.create_parser(config=config, source=file_path)
    
    @classmethod
    def get_supported_extensions(cls) -> set[str]:
        """
        Get all supported file extensions.
        
        Returns:
            set[str]: Set of supported extensions (without dots)
        """
        return set(cls._EXTENSION_MAP.keys())
    
    @classmethod
    def is_supported(cls, source: Union[str, Path]) -> bool:
        """
        Check if a file is supported by any parser.
        
        Args:
            source: File path to check
        
        Returns:
            bool: True if file is supported
        """
        if isinstance(source, (str, Path)):
            path = Path(source)
            if path.exists():
                ext = path.suffix.lower().lstrip('.')
                return ext in cls._EXTENSION_MAP
        
        # For content strings, assume supported (markdown can handle most text)
        return True
    
    @classmethod
    def register_parser(cls, parser_type: str, parser_class: type[BaseParser]) -> None:
        """
        Register a custom parser type.
        
        Args:
            parser_type: Name for the parser type
            parser_class: Parser class (must inherit from BaseParser)
        
        Raises:
            ValueError: If parser_class doesn't inherit from BaseParser
        
        Example:
            >>> class CustomParser(BaseParser):
            ...     def parse(self, source): ...
            ...     def supports(self, source): ...
            >>> 
            >>> ParserFactory.register_parser('custom', CustomParser)
        """
        if not issubclass(parser_class, BaseParser):
            raise ValueError(
                f"Parser class must inherit from BaseParser, got {parser_class}"
            )
        
        cls._PARSERS[parser_type] = parser_class
        logger.info(f"Registered custom parser: {parser_type} -> {parser_class.__name__}")
    
    @classmethod
    def get_available_parsers(cls) -> list[str]:
        """
        Get list of available parser types.
        
        Returns:
            list[str]: List of parser type names
        """
        return list(cls._PARSERS.keys())
    
    def __repr__(self) -> str:
        parsers = ', '.join(self._PARSERS.keys())
        return f"ParserFactory(parsers=[{parsers}])"
