"""
Base Embedder Abstract Class

Defines the common interface for all embedding providers.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import numpy as np


@dataclass
class EmbeddingResult:
    """
    Result from embedding generation.
    
    Attributes:
        embeddings: List of embedding vectors (numpy arrays)
        model_name: Name of the embedding model used
        dimensions: Embedding dimension size
        metadata: Additional metadata (token counts, processing time, etc.)
    """
    embeddings: List[np.ndarray]
    model_name: str
    dimensions: int
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __len__(self) -> int:
        """Return number of embeddings"""
        return len(self.embeddings)
    
    def to_list(self) -> List[List[float]]:
        """Convert embeddings to list format (for JSON serialization)"""
        return [emb.tolist() for emb in self.embeddings]


class BaseEmbedder(ABC):
    """
    Abstract base class for embedding generators.
    
    All embedders must implement:
    - embed(): Single text embedding
    - embed_batch(): Batch text embedding
    """
    
    def __init__(self, model_name: str, batch_size: int = 16, **kwargs):
        """
        Initialize embedder.
        
        Args:
            model_name: Name/path of the embedding model
            batch_size: Batch size for batch processing
            **kwargs: Provider-specific parameters
        """
        self.model_name = model_name
        self.batch_size = batch_size
        self.config = kwargs
        self._dimensions = None  # Lazy-loaded
    
    @abstractmethod
    def embed(self, text: str) -> np.ndarray:
        """
        Generate embedding for a single text.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector as numpy array
        """
        pass
    
    @abstractmethod
    def embed_batch(self, texts: List[str]) -> EmbeddingResult:
        """
        Generate embeddings for multiple texts.
        
        This is more efficient than calling embed() multiple times.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            EmbeddingResult with all embeddings
        """
        pass
    
    @property
    def dimensions(self) -> int:
        """
        Get embedding dimension size.
        
        This is lazy-loaded by generating a test embedding.
        
        Returns:
            Dimension size
        """
        if self._dimensions is None:
            test_embedding = self.embed("test")
            self._dimensions = len(test_embedding)
        return self._dimensions
    
    def validate_texts(self, texts: List[str]) -> List[str]:
        """
        Validate and clean input texts.
        
        Args:
            texts: List of texts to validate
            
        Returns:
            Cleaned texts
            
        Raises:
            ValueError: If texts are invalid
        """
        if not texts:
            raise ValueError("Cannot embed empty text list")
        
        # Filter out empty strings
        cleaned = [t.strip() for t in texts if t and t.strip()]
        
        if not cleaned:
            raise ValueError("All texts are empty after cleaning")
        
        return cleaned
    
    def normalize_embeddings(self, embeddings: List[np.ndarray]) -> List[np.ndarray]:
        """
        Normalize embeddings to unit length.
        
        This is useful for cosine similarity (becomes dot product).
        
        Args:
            embeddings: List of embedding vectors
            
        Returns:
            Normalized embeddings
        """
        normalized = []
        for emb in embeddings:
            norm = np.linalg.norm(emb)
            if norm > 0:
                normalized.append(emb / norm)
            else:
                normalized.append(emb)
        return normalized
