"""
Naver CLOVA Embedder

Use Naver's CLOVA Embedding API via langchain_naver.ClovaXEmbeddings.

Supported models:
- bge-m3-v2: BGE-M3 v2 model (1024 dim, multilingual, recommended)
- clir-emb-dolphin: CLIR Dolphin model (768 dim, Korean/Vietnamese optimized)
- bge-m3: BGE-M3 model (1024 dim, multilingual)
- clir-sts: CLIR STS model (768 dim)
"""

from typing import List, Optional
import numpy as np
import os
from .base_embedder import BaseEmbedder, EmbeddingResult


class NaverEmbedder(BaseEmbedder):
    """
    Generate embeddings using Naver CLOVA Embedding API.
    
    Uses langchain_naver.ClovaXEmbeddings for API integration.
    
    Supported models:
    - bge-m3-v2 (recommended): 1024 dimensions, multilingual
    - clir-emb-dolphin: 768 dimensions, Korean/Vietnamese optimized
    - bge-m3: 1024 dimensions, multilingual
    - clir-sts: 768 dimensions
    
    Example:
        embedder = NaverEmbedder(
            model="bge-m3-v2",
            api_key=os.getenv("CLOVASTUDIO_API_KEY")
        )
        result = embedder.embed_batch(["text1", "text2"])
    """
    
    # Model dimension mapping
    MODEL_DIMENSIONS = {
        "bge-m3-v2": 1024,
        "bge-m3": 1024,
        "clir-emb-dolphin": 1024,  # Actually returns 1024 dimensions
        "clir-sts": 768,
    }
    
    def __init__(self, model: str = "bge-m3-v2",
                 batch_size: int = 16,
                 api_key: Optional[str] = None,
                 **kwargs):
        """
        Initialize Naver embedder.
        
        Args:
            model: Naver embedding model name (bge-m3-v2, clir-emb-dolphin, etc.)
            batch_size: Batch size for API calls
            api_key: Naver API key (or set CLOVASTUDIO_API_KEY env var)
            **kwargs: Additional config
        """
        # Use 'model' instead of 'model_name' for consistency with langchain_naver
        super().__init__(model, batch_size, **kwargs)
        
        self.api_key = api_key or os.getenv("CLOVASTUDIO_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Naver API key not provided. "
                "Set CLOVASTUDIO_API_KEY environment variable or pass api_key parameter."
            )
        
        # Set API key in environment for ClovaXEmbeddings
        os.environ["CLOVASTUDIO_API_KEY"] = self.api_key
        
        # Initialize ClovaXEmbeddings
        self._embedder = None
        
        print(f"NaverEmbedder initialized: model={model}, dimensions={self.dimensions}")
    
    @property
    def embedder(self):
        """Lazy-load the ClovaXEmbeddings client"""
        if self._embedder is None:
            try:
                from langchain_naver import ClovaXEmbeddings
                self._embedder = ClovaXEmbeddings(model=self.model_name)
                print(f"✅ ClovaXEmbeddings loaded: {self.model_name}")
            except ImportError:
                raise ImportError(
                    "langchain_naver not installed. "
                    "Install with: pip install langchain-naver"
                )
        return self._embedder
    
    @property
    def dimensions(self) -> int:
        """Get embedding dimensions for the model"""
        return self.MODEL_DIMENSIONS.get(self.model_name, 1024)
    
    def embed(self, text: str) -> np.ndarray:
        """
        Generate embedding for single text.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector as numpy array
        """
        if not text or not text.strip():
            raise ValueError("Cannot embed empty text")
        
        # Use ClovaXEmbeddings.embed_query for single text
        embedding = self.embedder.embed_query(text)
        return np.array(embedding)
    
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
        
        # Use ClovaXEmbeddings.embed_documents for batch
        embeddings_list = self.embedder.embed_documents(texts)
        
        # Convert to numpy arrays
        embeddings = [np.array(emb) for emb in embeddings_list]
        
        return EmbeddingResult(
            embeddings=embeddings,
            model_name=self.model_name,
            dimensions=self.dimensions,
            metadata={
                "num_texts": len(texts),
                "batch_size": self.batch_size,
                "provider": "naver_clova",
                "api_based": True
            }
        )
