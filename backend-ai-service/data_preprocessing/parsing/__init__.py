"""
Document Parsing Module

This module provides professional document parsing capabilities using:
- Docling: Universal document parser (PDF, DOCX, PPTX, images, HTML)
- Markdown: Parser for user-written markdown documents

All parsers implement a common interface for consistency and reusability.
"""

from .base_parser import BaseParser, ParsingResult
from .docling_parser import DoclingParser
from .markdown_parser import MarkdownParser
from .parser_factory import ParserFactory

__all__ = [
    "BaseParser",
    "ParsingResult",
    "DoclingParser",
    "MarkdownParser",
    "ParserFactory",
]
