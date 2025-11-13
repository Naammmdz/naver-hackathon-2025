"""
Paragraph-based Chunker

Splits text by paragraphs, combining them to fit within chunk_size.
This is the DEFAULT and RECOMMENDED strategy because:
- Preserves natural document structure
- Maintains semantic coherence
- Works well with most document types
- Fast and reliable
"""

import re
from typing import List, Dict, Any, Optional
from .base_chunker import BaseChunker, Chunk


class ParagraphChunker(BaseChunker):
    """
    Chunk text based on paragraph boundaries.
    
    This chunker:
    1. Splits text by paragraph breaks (double newlines)
    2. Combines paragraphs until reaching chunk_size
    3. Adds overlap by including last N characters from previous chunk
    4. Preserves paragraph integrity (doesn't split mid-paragraph)
    
    Example:
        chunker = ParagraphChunker(chunk_size=768, overlap=50)
        chunks = chunker.chunk(document_text)
    """
    
    def __init__(self, chunk_size: int = 768, overlap: int = 50, 
                 min_paragraph_length: int = 20, **kwargs):
        """
        Initialize paragraph chunker.
        
        Args:
            chunk_size: Target chunk size in characters
            overlap: Overlap size in characters
            min_paragraph_length: Minimum length to consider as a paragraph
            **kwargs: Additional config
        """
        super().__init__(chunk_size, overlap, **kwargs)
        self.min_paragraph_length = min_paragraph_length
    
    def chunk(self, text: str, metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        """
        Split text into paragraph-based chunks.
        
        Args:
            text: Text to chunk
            metadata: Optional metadata for all chunks
            
        Returns:
            List of Chunk objects
        """
        if not text or not text.strip():
            return []
        
        # Split into paragraphs
        paragraphs = self._split_paragraphs(text)
        
        # Filter out very short paragraphs
        paragraphs = [p for p in paragraphs if len(p.strip()) >= self.min_paragraph_length]
        
        if not paragraphs:
            # Fallback: treat entire text as one paragraph
            paragraphs = [text.strip()]
        
        # Combine paragraphs into chunks
        chunks = self._combine_paragraphs(paragraphs, text)
        
        # Validate and add metadata
        self.validate_chunks(chunks)
        chunks = self.add_context_metadata(chunks, metadata)
        
        return chunks
    
    def _split_paragraphs(self, text: str) -> List[str]:
        """
        Split text into paragraphs.
        
        Handles various paragraph separators:
        - Double newlines (\n\n)
        - Multiple newlines
        - Different line endings (Unix/Windows)
        
        Args:
            text: Text to split
            
        Returns:
            List of paragraph strings
        """
        # Normalize line endings
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Split by double newline or more
        paragraphs = re.split(r'\n\s*\n+', text)
        
        # Clean whitespace but preserve internal structure
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        
        return paragraphs
    
    def _combine_paragraphs(self, paragraphs: List[str], original_text: str) -> List[Chunk]:
        """
        Combine paragraphs into chunks respecting chunk_size.
        
        Args:
            paragraphs: List of paragraph strings
            original_text: Original text for char position tracking
            
        Returns:
            List of Chunk objects
        """
        chunks = []
        current_chunk_text = []
        current_chunk_start = 0
        chunk_index = 0
        char_position = 0
        
        for para_idx, paragraph in enumerate(paragraphs):
            # Calculate current chunk length
            current_length = sum(len(p) for p in current_chunk_text) + len('\n\n'.join([''] * len(current_chunk_text)))
            para_length = len(paragraph)
            
            # Check if adding this paragraph would exceed chunk_size
            if current_chunk_text and (current_length + para_length + 2) > self.chunk_size:
                # Finalize current chunk
                chunk_text = '\n\n'.join(current_chunk_text)
                chunk = Chunk(
                    text=chunk_text,
                    chunk_index=chunk_index,
                    char_start=current_chunk_start,
                    char_end=current_chunk_start + len(chunk_text),
                    token_count=self.estimate_token_count(chunk_text),
                    overlap_with_previous=(chunk_index > 0)
                )
                chunks.append(chunk)
                
                # Start new chunk with overlap
                if self.overlap > 0 and chunk_index > 0:
                    # Include last N characters from previous chunk
                    overlap_text = chunk_text[-self.overlap:].lstrip()
                    current_chunk_text = [overlap_text, paragraph] if overlap_text else [paragraph]
                    current_chunk_start = chunk.char_end - len(overlap_text)
                else:
                    current_chunk_text = [paragraph]
                    current_chunk_start = chunk.char_end
                
                chunk_index += 1
            else:
                # Add paragraph to current chunk
                current_chunk_text.append(paragraph)
            
            # Track character position
            char_position += para_length + 2  # +2 for \n\n
        
        # Add final chunk if any content remains
        if current_chunk_text:
            chunk_text = '\n\n'.join(current_chunk_text)
            chunk = Chunk(
                text=chunk_text,
                chunk_index=chunk_index,
                char_start=current_chunk_start,
                char_end=current_chunk_start + len(chunk_text),
                token_count=self.estimate_token_count(chunk_text),
                overlap_with_previous=(chunk_index > 0)
            )
            chunks.append(chunk)
        
        return chunks
