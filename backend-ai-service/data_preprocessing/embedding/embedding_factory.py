"""
Embedding Factory

Factory pattern for creating embedding generators based on configuration.
"""

from typing import Dict, Any, Type, Optional
import yaml
from pathlib import Path

from .base_embedder import BaseEmbedder
from .huggingface_embedder import HuggingFaceEmbedder
from .naver_embedder import NaverEmbedder


class EmbeddingFactory:
    """
    Factory for creating embedding generators.
    
    Usage:
        # From config file
        embedder = EmbeddingFactory.from_config()
        
        # Programmatically
        embedder = EmbeddingFactory.create_embedder(
            "huggingface",
            model_name="Qwen/Qwen3-Embedding-0.6B"
        )
    """
    
    # Mapping of provider names to classes
    EMBEDDERS: Dict[str, Type[BaseEmbedder]] = {
        "huggingface": HuggingFaceEmbedder,
        "naver": NaverEmbedder,
    }
    
    @classmethod
    def create_embedder(cls, provider: str = "huggingface", **kwargs) -> BaseEmbedder:
        """
        Create an embedder instance.
        
        Args:
            provider: Provider name (huggingface, naver)
            **kwargs: Provider-specific parameters
            
        Returns:
            BaseEmbedder instance
            
        Raises:
            ValueError: If provider not found
        """
        provider = provider.lower().strip()
        
        if provider not in cls.EMBEDDERS:
            available = ", ".join(cls.EMBEDDERS.keys())
            raise ValueError(
                f"Unknown embedding provider: '{provider}'. "
                f"Available providers: {available}"
            )
        
        embedder_class = cls.EMBEDDERS[provider]
        return embedder_class(**kwargs)
    
    @classmethod
    def from_config(cls, config_path: str = "config.yml") -> BaseEmbedder:
        """
        Create embedder from config file.
        
        Args:
            config_path: Path to config.yml
            
        Returns:
            Configured BaseEmbedder instance
        """
        # Load config
        config_file = Path(config_path)
        if not config_file.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")
        
        with open(config_file, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        # Extract embedding config
        embedding_config = config.get('data_preprocessing', {}).get('embedding', {})
        
        provider = embedding_config.get('provider', 'huggingface')
        
        # Get provider-specific config
        provider_config = embedding_config.get(provider, {})
        
        # Create embedder
        return cls.create_embedder(provider, **provider_config)
    
    @classmethod
    def get_available_providers(cls) -> list:
        """
        Get list of available embedding providers.
        
        Returns:
            List of provider names
        """
        return list(cls.EMBEDDERS.keys())
