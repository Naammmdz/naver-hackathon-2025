"""
Chunking Module

This module provides text chunking strategies for RAG (Retrieval-Augmented Generation).
Chunking splits documents into smaller, semantically meaningful pieces for better retrieval.

Available chunking strategies:
- ParagraphChunker: Split by paragraphs (default, preserves natural document structure)
- FixedSizeChunker: Fixed-size chunks with overlap (simple and reliable)
- SemanticChunker: Semantic similarity-based chunking (advanced, slower)
- HierarchicalChunker: Multi-level chunking with parent-child relationships

Usage:
    from data_preprocessing.chunking import ChunkerFactory
    
    chunker = ChunkerFactory.create_chunker("paragraph", chunk_size=768, overlap=50)
    chunks = chunker.chunk(text)
"""

from .base_chunker import BaseChunker, Chunk
from .paragraph_chunker import ParagraphChunker
from .fixed_size_chunker import FixedSizeChunker
from .semantic_chunker import SemanticChunker
from .hierarchical_chunker import HierarchicalChunker
from .chunker_factory import ChunkerFactory

__all__ = [
    "BaseChunker",
    "Chunk",
    "ParagraphChunker",
    "FixedSizeChunker",
    "SemanticChunker",
    "HierarchicalChunker",
    "ChunkerFactory",
]
