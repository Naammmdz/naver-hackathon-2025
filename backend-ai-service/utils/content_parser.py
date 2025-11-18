"""
Document Content Parser

Utilities to extract plain text from different document content formats:
- Markdown
- BlockNote JSON (fallback)
- Plain text
"""

import json
import re
from typing import Optional


def extract_text_from_markdown(markdown: str) -> str:
    """
    Extract plain text from Markdown content.
    
    Removes Markdown syntax while preserving the text content.
    
    Args:
        markdown: Markdown formatted text
        
    Returns:
        Plain text without Markdown formatting
    """
    if not markdown:
        return ""
    
    text = markdown
    
    # Remove code blocks (preserve content)
    text = re.sub(r'```[\w]*\n(.*?)\n```', r'\1', text, flags=re.DOTALL)
    
    # Remove inline code (preserve content)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    
    # Remove images (keep alt text)
    text = re.sub(r'!\[([^\]]*)\]\([^)]+\)', r'\1', text)
    
    # Remove links (keep link text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    
    # Remove headings markers
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    
    # Remove bold/italic markers
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Bold
    text = re.sub(r'\*([^*]+)\*', r'\1', text)      # Italic
    text = re.sub(r'__([^_]+)__', r'\1', text)      # Bold (alternative)
    text = re.sub(r'_([^_]+)_', r'\1', text)        # Italic (alternative)
    
    # Remove strikethrough
    text = re.sub(r'~~([^~]+)~~', r'\1', text)
    
    # Remove blockquote markers
    text = re.sub(r'^>\s*', '', text, flags=re.MULTILINE)
    
    # Remove list markers
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    
    # Remove checkbox markers
    text = re.sub(r'^\s*-\s*\[[x ]\]\s+', '', text, flags=re.MULTILINE)
    
    # Remove horizontal rules
    text = re.sub(r'^[-*_]{3,}\s*$', '', text, flags=re.MULTILINE)
    
    # Remove HTML comments
    text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)
    
    # Clean up multiple newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Clean up spaces
    text = re.sub(r' {2,}', ' ', text)
    
    return text.strip()


def extract_text_from_blocknote_json(blocknote_json: str) -> str:
    """
    Extract plain text from BlockNote JSON structure.
    
    Args:
        blocknote_json: JSON string of BlockNote blocks
        
    Returns:
        Plain text extracted from blocks
    """
    try:
        blocks = json.loads(blocknote_json)
        if not isinstance(blocks, list):
            return blocknote_json  # Not BlockNote format, return as-is
        
        text_parts = []
        
        for block in blocks:
            if not isinstance(block, dict):
                continue
            
            block_text = _extract_text_from_block(block)
            if block_text:
                text_parts.append(block_text)
        
        return '\n\n'.join(text_parts)
    
    except (json.JSONDecodeError, Exception):
        # Not valid JSON, return as-is
        return blocknote_json


def _extract_text_from_block(block: dict) -> str:
    """Extract text from a single BlockNote block"""
    content = block.get('content', '')
    
    # Content can be string or array of inline content
    if isinstance(content, str):
        return content
    
    if isinstance(content, list):
        text_parts = []
        for item in content:
            if isinstance(item, str):
                text_parts.append(item)
            elif isinstance(item, dict) and 'text' in item:
                text_parts.append(item['text'])
        return ''.join(text_parts)
    
    return ''


def detect_content_format(content: str) -> str:
    """
    Detect the format of document content.
    
    Args:
        content: Document content string
        
    Returns:
        Format type: 'json', 'markdown', or 'plain'
    """
    if not content or not content.strip():
        return 'plain'
    
    # Try to parse as JSON
    try:
        parsed = json.loads(content)
        if isinstance(parsed, list):
            return 'json'
    except (json.JSONDecodeError, Exception):
        pass
    
    # Check for Markdown patterns
    markdown_patterns = [
        r'^#{1,6}\s',           # Headings
        r'^\s*[-*+]\s',         # Bullet lists
        r'^\s*\d+\.\s',         # Numbered lists
        r'^>',                  # Blockquotes
        r'```',                 # Code blocks
        r'!\[.*?\]\(.*?\)',     # Images
        r'\[.*?\]\(.*?\)'       # Links
    ]
    
    for pattern in markdown_patterns:
        if re.search(pattern, content, re.MULTILINE):
            return 'markdown'
    
    # Default to plain text
    return 'plain'


def parse_document_content(content: Optional[str]) -> str:
    """
    Smart parser that handles any document content format.
    
    Automatically detects format and extracts plain text.
    
    Args:
        content: Document content in any format
        
    Returns:
        Plain text extracted from content
    """
    if not content:
        return ""
    
    format_type = detect_content_format(content)
    
    if format_type == 'json':
        return extract_text_from_blocknote_json(content)
    elif format_type == 'markdown':
        return extract_text_from_markdown(content)
    else:
        # Plain text
        return content.strip()


# Alias for backward compatibility
extract_text_from_content = parse_document_content
