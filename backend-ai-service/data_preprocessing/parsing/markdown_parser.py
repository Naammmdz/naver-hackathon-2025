"""
Markdown Parser

Parser for user-written markdown documents.
Supports:
- Standard Markdown syntax
- YAML frontmatter metadata
- Code blocks
- Tables
- Headings
"""

import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Union

from .base_parser import BaseParser, ParsingResult

# Set up logging
logger = logging.getLogger(__name__)


class MarkdownParser(BaseParser):
    """
    Parser for Markdown documents.
    
    Features:
    - Parse markdown files or raw markdown strings
    - Extract YAML frontmatter metadata
    - Preserve document structure (headings, paragraphs, code blocks)
    - Support for tables, lists, and other markdown elements
    
    Example:
        >>> config = {'parsing': {'markdown': {'parse_frontmatter': True}}}
        >>> parser = MarkdownParser(config)
        >>> result = parser.parse('document.md')
        >>> print(result.text)
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Markdown parser.
        
        Args:
            config: Configuration dictionary from config.yml
        """
        super().__init__(config)
        
        # Get markdown-specific config
        self.md_config = config.get("parsing", {}).get("markdown", {})
        self.extensions = self.md_config.get("extensions", [
            "extra", "meta", "toc", "tables", "fenced_code"
        ])
        self.parse_frontmatter = self.md_config.get("parse_frontmatter", True)
        self.preserve_formatting = self.md_config.get("preserve_formatting", True)
        
        # Initialize markdown processor lazily
        self._md_processor = None
        
        logger.info(
            f"MarkdownParser initialized: "
            f"frontmatter={self.parse_frontmatter}, "
            f"extensions={len(self.extensions)}"
        )
    
    @property
    def md_processor(self):
        """Lazy initialization of Markdown processor"""
        if self._md_processor is None:
            try:
                import markdown
                self._md_processor = markdown.Markdown(
                    extensions=self.extensions,
                    output_format='html'
                )
                logger.debug("Markdown processor initialized successfully")
            except ImportError as e:
                logger.error(f"Failed to import markdown: {e}")
                raise ImportError(
                    "Python-Markdown library not found. "
                    "Install with: pip install markdown"
                ) from e
        
        return self._md_processor
    
    def supports(self, source: Union[str, Path]) -> bool:
        """
        Check if this parser supports the given source.
        
        Args:
            source: File path or content
        
        Returns:
            bool: True if source is markdown file or content
        """
        if isinstance(source, bytes):
            return False
        
        if isinstance(source, Path):
            source = str(source)
        
        # Check if it's a markdown file
        if isinstance(source, str):
            path = Path(source)
            if path.exists():
                ext = path.suffix.lower()
                return ext in ['.md', '.markdown', '.mdown', '.mkd']
            
            # If not a file, assume it's markdown content if it contains markdown patterns
            markdown_patterns = [
                r'^#{1,6}\s',  # Headings
                r'^\*\*.*\*\*',  # Bold
                r'^\*.*\*',  # Italic
                r'^\[.*\]\(.*\)',  # Links
                r'^```',  # Code blocks
                r'^\|.*\|',  # Tables
            ]
            
            for pattern in markdown_patterns:
                if re.search(pattern, source, re.MULTILINE):
                    return True
        
        return False
    
    def parse(self, source: Union[str, Path, bytes]) -> ParsingResult:
        """
        Parse markdown content.
        
        Args:
            source: Can be:
                - File path to .md file
                - Raw markdown string
                - Bytes (will be decoded)
        
        Returns:
            ParsingResult: Parsed markdown with text and structure
        """
        try:
            # Handle different source types
            if isinstance(source, bytes):
                content = source.decode(self.encoding)
                metadata = {'source_type': 'bytes'}
            elif isinstance(source, (str, Path)):
                path = Path(source) if isinstance(source, str) and len(source) < 260 else None
                
                # Check if it's a valid file path (not too long and exists)
                if path and path.exists() and path.is_file():
                    # Read from file
                    with open(path, 'r', encoding=self.encoding) as f:
                        content = f.read()
                    metadata = {
                        'source_type': 'file',
                        'file_name': path.name,
                        'file_path': str(path.absolute()),
                        'file_size_bytes': path.stat().st_size,
                    }
                else:
                    # Treat as raw markdown content
                    content = str(source)
                    metadata = {'source_type': 'string'}
            else:
                raise ValueError(f"Unsupported source type: {type(source)}")
            
            # Check minimum content length
            if not content or len(content.strip()) == 0:
                raise ValueError("Empty markdown content")
            
            logger.info(f"Parsing markdown content: {len(content)} characters")
            
            # Parse frontmatter if enabled
            frontmatter_meta = {}
            if self.parse_frontmatter:
                content, frontmatter_meta = self._extract_frontmatter(content)
            
            # Extract structure before processing
            headings = self._extract_headings(content)
            code_blocks = self._extract_code_blocks(content)
            tables = self._extract_tables(content)
            links = self._extract_links(content)
            
            # Convert markdown to HTML for better text extraction
            html = self.md_processor.convert(content)
            
            # Extract plain text
            if self.preserve_formatting:
                # Keep markdown formatting
                text = content
            else:
                # Strip HTML tags to get plain text
                text = self._html_to_text(html)
            
            # Apply preprocessing
            processed_text = self._apply_preprocessing(text)
            
            # Check minimum text length
            min_length = self.preprocessing.get("min_text_length", 50)
            if len(processed_text) < min_length:
                logger.warning(
                    f"Parsed text is too short ({len(processed_text)} chars). "
                    f"Minimum: {min_length} chars"
                )
            
            # Extract paragraphs
            paragraphs = self._extract_paragraphs(content)
            
            # Build metadata
            metadata.update({
                'headings_count': len(headings),
                'paragraphs_count': len(paragraphs),
                'code_blocks_count': len(code_blocks),
                'tables_count': len(tables),
                'links_count': len(links),
                'has_frontmatter': bool(frontmatter_meta),
                **frontmatter_meta  # Include frontmatter metadata
            })
            
            logger.info(
                f"Successfully parsed markdown: "
                f"{len(processed_text)} chars, "
                f"{len(headings)} headings, "
                f"{len(paragraphs)} paragraphs"
            )
            
            return ParsingResult(
                text=processed_text,
                metadata=metadata,
                paragraphs=paragraphs,
                headings=headings,
                tables=tables,
                raw_data={'html': html, 'markdown': content},
                success=True,
                error=None
            )
        
        except Exception as e:
            logger.error(f"Failed to parse markdown: {e}", exc_info=True)
            return ParsingResult(
                text="",
                metadata={'error_type': type(e).__name__},
                success=False,
                error=f"Failed to parse markdown: {str(e)}"
            )
    
    def _extract_frontmatter(self, content: str) -> tuple[str, Dict[str, Any]]:
        """
        Extract YAML frontmatter from markdown content.
        
        Args:
            content: Markdown content
        
        Returns:
            tuple: (content_without_frontmatter, frontmatter_dict)
        """
        try:
            import frontmatter
            
            post = frontmatter.loads(content)
            return post.content, dict(post.metadata)
        
        except ImportError:
            logger.warning("python-frontmatter not installed, skipping frontmatter parsing")
            # Fallback: simple regex-based extraction
            pattern = r'^---\s*\n(.*?)\n---\s*\n'
            match = re.match(pattern, content, re.DOTALL)
            
            if match:
                try:
                    import yaml
                    frontmatter_text = match.group(1)
                    metadata = yaml.safe_load(frontmatter_text)
                    content_without_fm = content[match.end():]
                    return content_without_fm, metadata or {}
                except Exception as e:
                    logger.warning(f"Failed to parse frontmatter with yaml: {e}")
            
            return content, {}
        
        except Exception as e:
            logger.warning(f"Failed to parse frontmatter: {e}")
            return content, {}
    
    def _extract_headings(self, content: str) -> List[Dict[str, Any]]:
        """
        Extract headings from markdown.
        
        Args:
            content: Markdown content
        
        Returns:
            List[Dict]: List of headings with level and text
        """
        headings = []
        
        # Pattern for ATX-style headings (# Heading)
        atx_pattern = r'^(#{1,6})\s+(.+)$'
        
        for line in content.split('\n'):
            match = re.match(atx_pattern, line.strip())
            if match:
                level = len(match.group(1))
                text = match.group(2).strip()
                headings.append({
                    'level': level,
                    'text': text
                })
        
        return headings
    
    def _extract_paragraphs(self, content: str) -> List[str]:
        """
        Extract paragraphs from markdown.
        
        Args:
            content: Markdown content
        
        Returns:
            List[str]: List of paragraph texts
        """
        # Split by double newlines to get paragraphs
        paragraphs = []
        
        for para in content.split('\n\n'):
            para = para.strip()
            if para and not para.startswith('#') and not para.startswith('```'):
                # Remove markdown formatting for plain text
                text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', para)  # Links
                text = re.sub(r'\*\*([^\*]+)\*\*', r'\1', text)  # Bold
                text = re.sub(r'\*([^\*]+)\*', r'\1', text)  # Italic
                text = re.sub(r'`([^`]+)`', r'\1', text)  # Inline code
                
                if text.strip():
                    paragraphs.append(text.strip())
        
        return paragraphs
    
    def _extract_code_blocks(self, content: str) -> List[Dict[str, Any]]:
        """
        Extract code blocks from markdown.
        
        Args:
            content: Markdown content
        
        Returns:
            List[Dict]: List of code blocks with language and content
        """
        code_blocks = []
        
        # Pattern for fenced code blocks
        pattern = r'```(\w+)?\n(.*?)```'
        
        for match in re.finditer(pattern, content, re.DOTALL):
            language = match.group(1) or 'text'
            code = match.group(2).strip()
            code_blocks.append({
                'language': language,
                'code': code,
                'lines': len(code.split('\n'))
            })
        
        return code_blocks
    
    def _extract_tables(self, content: str) -> List[Dict[str, Any]]:
        """
        Extract tables from markdown.
        
        Args:
            content: Markdown content
        
        Returns:
            List[Dict]: List of table metadata
        """
        tables = []
        
        # Simple detection of markdown tables
        lines = content.split('\n')
        in_table = False
        current_table = []
        
        for line in lines:
            if '|' in line and line.strip().startswith('|'):
                if not in_table:
                    in_table = True
                    current_table = []
                current_table.append(line)
            else:
                if in_table and current_table:
                    # Table ended
                    headers = current_table[0].split('|')
                    headers = [h.strip() for h in headers if h.strip()]
                    
                    tables.append({
                        'rows': len(current_table) - 2,  # Exclude header and separator
                        'cols': len(headers),
                        'headers': headers
                    })
                    in_table = False
        
        # Check if last table wasn't closed
        if in_table and current_table:
            headers = current_table[0].split('|')
            headers = [h.strip() for h in headers if h.strip()]
            tables.append({
                'rows': len(current_table) - 2,
                'cols': len(headers),
                'headers': headers
            })
        
        return tables
    
    def _extract_links(self, content: str) -> List[Dict[str, str]]:
        """
        Extract links from markdown.
        
        Args:
            content: Markdown content
        
        Returns:
            List[Dict]: List of links with text and URL
        """
        links = []
        
        # Pattern for markdown links: [text](url)
        pattern = r'\[([^\]]+)\]\(([^\)]+)\)'
        
        for match in re.finditer(pattern, content):
            links.append({
                'text': match.group(1),
                'url': match.group(2)
            })
        
        return links
    
    def _html_to_text(self, html: str) -> str:
        """
        Convert HTML to plain text.
        
        Args:
            html: HTML content
        
        Returns:
            str: Plain text
        """
        # Simple HTML tag removal
        text = re.sub(r'<[^>]+>', '', html)
        
        # Decode HTML entities
        try:
            import html as html_module
            text = html_module.unescape(text)
        except Exception:
            pass
        
        # Clean up whitespace
        text = re.sub(r'\n\s*\n', '\n\n', text)
        
        return text.strip()
    
    def __repr__(self) -> str:
        return (
            f"MarkdownParser(frontmatter={self.parse_frontmatter}, "
            f"extensions={len(self.extensions)})"
        )
