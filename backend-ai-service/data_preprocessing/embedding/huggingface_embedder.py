"""
HuggingFace Embedder

Use HuggingFace models for local embedding generation.
Free and runs locally, but requires GPU for good performance.

Recommended models:
- sentence-transformers/all-MiniLM-L6-v2: Fast, 384 dim, English
- sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2: Multilingual, 384 dim
- intfloat/multilingual-e5-large: High quality, 1024 dim, slower
- Qwen/Qwen3-Embedding-0.6B: New, 768 dim, multilingual
"""

from typing import List
import numpy as np
from .base_embedder import BaseEmbedder, EmbeddingResult


class HuggingFaceEmbedder(BaseEmbedder):
    """
    Generate embeddings using HuggingFace sentence-transformers.
    
    This embedder:
    - Runs locally (no API calls)
    - Supports many pre-trained models
    - Works with multilingual text
    - Free to use
    
    Example:
        embedder = HuggingFaceEmbedder(
            model_name="Qwen/Qwen3-Embedding-0.6B",
            batch_size=16
        )
        result = embedder.embed_batch(["text1", "text2"])
    """
    
    def __init__(self, model_name: str = "Qwen/Qwen3-Embedding-0.6B", 
                 batch_size: int = 16, 
                 device: str = None,
                 normalize: bool = True,
                 **kwargs):
        """
        Initialize HuggingFace embedder.
        
        Args:
            model_name: HuggingFace model name or local path
            batch_size: Batch size for encoding
            device: Device to run on ("cpu", "cuda", "mps"). If None, auto-detect GPU
            normalize: Whether to normalize embeddings to unit length
            **kwargs: Additional config
        """
        super().__init__(model_name, batch_size, **kwargs)
        
        # Auto-detect device if not specified
        if device is None:
            device = self._auto_detect_device()
        
        self.device = device
        self.normalize = normalize
        self._model = None
    
    @staticmethod
    def _auto_detect_device() -> str:
        """
        Auto-detect the best available device.
        
        Priority: CUDA (NVIDIA GPU) > MPS (Apple Silicon) > CPU
        
        Returns:
            Device string: "cuda", "mps", or "cpu"
        """
        try:
            import torch
            
            if torch.cuda.is_available():
                device = "cuda"
                gpu_name = torch.cuda.get_device_name(0)
                print(f"🚀 GPU detected: {gpu_name}")
                print(f"   Using CUDA device: {device}")
                return device
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                device = "mps"
                print(f"🚀 Apple Silicon GPU detected")
                print(f"   Using MPS device: {device}")
                return device
            else:
                print(f"⚠️  No GPU detected, using CPU")
                return "cpu"
        except ImportError:
            print(f"⚠️  PyTorch not available, using CPU")
            return "cpu"
    
    @property
    def model(self):
        """Lazy-load the model"""
        if self._model is None:
            self._load_model()
        return self._model
    
    def _load_model(self):
        """Load sentence-transformers model"""
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            raise ImportError(
                "sentence-transformers not installed. "
                "Install with: pip install sentence-transformers"
            )
        
        print(f"Loading HuggingFace embedding model: {self.model_name}")
        self._model = SentenceTransformer(self.model_name, device=self.device)
        print(f"Model loaded. Embedding dimension: {self.dimensions}")
    
    def embed(self, text: str) -> np.ndarray:
        """
        Generate embedding for single text.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector
        """
        if not text or not text.strip():
            raise ValueError("Cannot embed empty text")
        
        embedding = self.model.encode(
            text,
            convert_to_numpy=True,
            normalize_embeddings=self.normalize,
            show_progress_bar=False
        )
        
        return embedding
    
    def embed_batch(self, texts: List[str]) -> EmbeddingResult:
        """
        Generate embeddings for multiple texts.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            EmbeddingResult with embeddings
        """
        # Validate and clean
        texts = self.validate_texts(texts)
        
        # Generate embeddings in batches
        embeddings = self.model.encode(
            texts,
            batch_size=self.batch_size,
            convert_to_numpy=True,
            normalize_embeddings=self.normalize,
            show_progress_bar=len(texts) > 100  # Show progress for large batches
        )
        
        # Convert to list of arrays
        if len(embeddings.shape) == 1:
            # Single embedding
            embeddings = [embeddings]
        else:
            embeddings = [embeddings[i] for i in range(len(embeddings))]
        
        return EmbeddingResult(
            embeddings=embeddings,
            model_name=self.model_name,
            dimensions=self.dimensions,
            metadata={
                "num_texts": len(texts),
                "batch_size": self.batch_size,
                "device": self.device,
                "normalized": self.normalize
            }
        )
