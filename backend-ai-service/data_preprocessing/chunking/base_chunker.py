"""
Base Chunker Abstract Class

Defines the common interface for all text chunking strategies.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class Chunk:
    """
    Represents a single text chunk with metadata.
    
    Attributes:
        text: The chunk text content
        chunk_index: Position of this chunk in the document (0-based)
        char_start: Starting character position in original document
        char_end: Ending character position in original document
        token_count: Approximate token count (for embedding limits)
        metadata: Additional metadata (section, heading, page, etc.)
        parent_chunk_id: ID of parent chunk (for hierarchical chunking)
        overlap_with_previous: Whether this chunk overlaps with previous
    """
    text: str
    chunk_index: int
    char_start: int
    char_end: int
    token_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
    parent_chunk_id: Optional[str] = None
    overlap_with_previous: bool = False
    
    def __len__(self) -> int:
        """Return character length of chunk"""
        return len(self.text)
    
    def __str__(self) -> str:
        """String representation for debugging"""
        return f"Chunk[{self.chunk_index}]({len(self.text)} chars, ~{self.token_count} tokens)"


class BaseChunker(ABC):
    """
    Abstract base class for text chunking strategies.
    
    All chunkers must implement the chunk() method.
    """
    
    def __init__(self, chunk_size: int = 768, overlap: int = 50, **kwargs):
        """
        Initialize chunker with common parameters.
        
        Args:
            chunk_size: Target size for chunks (in characters)
            overlap: Number of characters to overlap between chunks
            **kwargs: Additional strategy-specific parameters
        """
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.config = kwargs
    
    @abstractmethod
    def chunk(self, text: str, metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        """
        Split text into chunks.
        
        Args:
            text: The text to chunk
            metadata: Optional metadata to attach to all chunks
            
        Returns:
            List of Chunk objects
        """
        pass
    
    def estimate_token_count(self, text: str) -> int:
        """
        Estimate token count for a text.
        
        Rule of thumb:
        - English: ~1 token per 4 characters
        - Vietnamese: ~1 token per 3-4 characters (more conservative)
        
        This is a rough estimate. For exact counts, use tiktoken or model-specific tokenizer.
        
        Args:
            text: Text to estimate tokens for
            
        Returns:
            Estimated token count
        """
        # Conservative estimate: 3.5 chars per token
        return max(1, len(text) // 4)
    
    def validate_chunks(self, chunks: List[Chunk]) -> bool:
        """
        Validate that chunks meet basic requirements.
        
        Args:
            chunks: List of chunks to validate
            
        Returns:
            True if valid, raises ValueError otherwise
        """
        if not chunks:
            raise ValueError("No chunks generated")
        
        for i, chunk in enumerate(chunks):
            if chunk.chunk_index != i:
                raise ValueError(f"Chunk index mismatch at position {i}")
            
            if len(chunk.text.strip()) == 0:
                raise ValueError(f"Empty chunk at position {i}")
            
            if chunk.char_end <= chunk.char_start:
                raise ValueError(f"Invalid char positions at chunk {i}")
        
        return True
    
    def add_context_metadata(self, chunks: List[Chunk], document_metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        """
        Add contextual metadata to chunks.
        
        Args:
            chunks: List of chunks to enrich
            document_metadata: Document-level metadata
            
        Returns:
            Chunks with enriched metadata
        """
        if document_metadata:
            for chunk in chunks:
                chunk.metadata.update(document_metadata)
        
        # Add positional metadata
        for i, chunk in enumerate(chunks):
            chunk.metadata["position"] = {
                "is_first": i == 0,
                "is_last": i == len(chunks) - 1,
                "chunk_number": i + 1,
                "total_chunks": len(chunks)
            }
        
        return chunks
