"""
Embedding Module

Generate vector embeddings for text chunks to enable semantic search in RAG.

Supported embedding providers:
- HuggingFace: Free, runs locally, good for prototyping
- Naver CLOVA: Naver's embedding service (clir-emb-dolphin)

Usage:
    from data_preprocessing.embedding import EmbeddingFactory
    
    # Create embedding generator
    generator = EmbeddingFactory.from_config()
    
    # Generate embeddings
    embeddings = generator.embed_batch(["text1", "text2"])
"""

from .base_embedder import BaseEmbedder, EmbeddingResult
from .huggingface_embedder import HuggingFaceEmbedder
from .naver_embedder import NaverEmbedder
from .embedding_factory import EmbeddingFactory

__all__ = [
    "BaseEmbedder",
    "EmbeddingResult",
    "HuggingFaceEmbedder",
    "NaverEmbedder",
    "EmbeddingFactory",
]
