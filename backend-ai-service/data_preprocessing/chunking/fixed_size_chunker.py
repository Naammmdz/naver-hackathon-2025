"""
Fixed-size Chunker

Simple chunking strategy that splits text into fixed-size chunks with overlap.
Good for uniform processing but may break semantic boundaries.
"""

from typing import List, Dict, Any, Optional
from .base_chunker import BaseChunker, Chunk


class FixedSizeChunker(BaseChunker):
    """
    Chunk text into fixed-size pieces with overlap.
    
    This is the simplest chunking strategy:
    - Fast and predictable
    - May split sentences/paragraphs mid-way
    - Good for when uniform chunk sizes are critical
    
    Example:
        chunker = FixedSizeChunker(chunk_size=512, overlap=50)
        chunks = chunker.chunk(text)
    """
    
    def __init__(self, chunk_size: int = 768, overlap: int = 50, 
                 respect_word_boundaries: bool = True, **kwargs):
        """
        Initialize fixed-size chunker.
        
        Args:
            chunk_size: Size of each chunk in characters
            overlap: Overlap between consecutive chunks
            respect_word_boundaries: If True, don't split words
            **kwargs: Additional config
        """
        super().__init__(chunk_size, overlap, **kwargs)
        self.respect_word_boundaries = respect_word_boundaries
    
    def chunk(self, text: str, metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        """
        Split text into fixed-size chunks.
        
        Args:
            text: Text to chunk
            metadata: Optional metadata for all chunks
            
        Returns:
            List of Chunk objects
        """
        if not text or not text.strip():
            return []
        
        text = text.strip()
        chunks = []
        chunk_index = 0
        start_pos = 0
        
        while start_pos < len(text):
            # Calculate end position
            end_pos = min(start_pos + self.chunk_size, len(text))
            
            # Respect word boundaries if enabled
            if self.respect_word_boundaries and end_pos < len(text):
                end_pos = self._find_word_boundary(text, end_pos)
            
            # Extract chunk text
            chunk_text = text[start_pos:end_pos].strip()
            
            if chunk_text:  # Only add non-empty chunks
                chunk = Chunk(
                    text=chunk_text,
                    chunk_index=chunk_index,
                    char_start=start_pos,
                    char_end=end_pos,
                    token_count=self.estimate_token_count(chunk_text),
                    overlap_with_previous=(chunk_index > 0 and self.overlap > 0)
                )
                chunks.append(chunk)
                chunk_index += 1
            
            # Move to next chunk position with overlap
            start_pos = end_pos - self.overlap
            
            # Ensure we make progress (avoid infinite loop)
            if start_pos >= end_pos:
                start_pos = end_pos
        
        # Validate and add metadata
        if chunks:
            self.validate_chunks(chunks)
            chunks = self.add_context_metadata(chunks, metadata)
        
        return chunks
    
    def _find_word_boundary(self, text: str, position: int) -> int:
        """
        Find the nearest word boundary before the given position.
        
        This prevents splitting words in the middle.
        
        Args:
            text: The text being chunked
            position: Target position to find boundary near
            
        Returns:
            Adjusted position at word boundary
        """
        # Look backwards for space, newline, or punctuation
        max_lookback = min(100, position)  # Don't look back too far
        
        for i in range(position, position - max_lookback, -1):
            if i >= len(text):
                continue
            
            char = text[i]
            
            # Word boundaries: space, newline, common punctuation
            if char in ' \n\t.!?,;:—–-':
                return i + 1 if char in ' \n\t' else i
        
        # If no boundary found, return original position
        return position
