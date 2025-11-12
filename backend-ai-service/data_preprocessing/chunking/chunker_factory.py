"""
Chunker Factory

Factory pattern for creating chunkers based on configuration.
"""

from typing import Dict, Any, Type
import yaml
from pathlib import Path

from .base_chunker import BaseChunker
from .paragraph_chunker import ParagraphChunker
from .fixed_size_chunker import FixedSizeChunker
from .semantic_chunker import SemanticChunker
from .hierarchical_chunker import HierarchicalChunker


class ChunkerFactory:
    """
    Factory for creating text chunkers.
    
    Usage:
        # From config file
        chunker = ChunkerFactory.from_config()
        
        # Programmatically
        chunker = ChunkerFactory.create_chunker("paragraph", chunk_size=768, overlap=50)
    """
    
    # Mapping of chunker names to classes
    CHUNKERS: Dict[str, Type[BaseChunker]] = {
        "paragraph": ParagraphChunker,
        "fixed": FixedSizeChunker,
        "fixed_size": FixedSizeChunker,
        "semantic": SemanticChunker,
        "hierarchical": HierarchicalChunker,
    }
    
    @classmethod
    def create_chunker(cls, method: str = "paragraph", **kwargs) -> BaseChunker:
        """
        Create a chunker instance.
        
        Args:
            method: Chunking method name (paragraph, fixed, semantic, hierarchical)
            **kwargs: Parameters for chunker (chunk_size, overlap, etc.)
            
        Returns:
            BaseChunker instance
            
        Raises:
            ValueError: If chunker method not found
        """
        method = method.lower().strip()
        
        if method not in cls.CHUNKERS:
            available = ", ".join(cls.CHUNKERS.keys())
            raise ValueError(
                f"Unknown chunker method: '{method}'. "
                f"Available methods: {available}"
            )
        
        chunker_class = cls.CHUNKERS[method]
        return chunker_class(**kwargs)
    
    @classmethod
    def from_config(cls, config_path: str = "config.yml") -> BaseChunker:
        """
        Create chunker from config file.
        
        Args:
            config_path: Path to config.yml
            
        Returns:
            Configured BaseChunker instance
        """
        # Load config
        config_file = Path(config_path)
        if not config_file.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")
        
        with open(config_file, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        # Extract chunking config
        chunking_config = config.get('data_preprocessing', {}).get('chunking', {})
        
        method = chunking_config.get('method', 'paragraph')
        chunk_size = chunking_config.get('chunk_size', 768)
        overlap = chunking_config.get('overlap', 50)
        
        # Create chunker
        return cls.create_chunker(
            method=method,
            chunk_size=chunk_size,
            overlap=overlap
        )
    
    @classmethod
    def get_available_chunkers(cls) -> list:
        """
        Get list of available chunker methods.
        
        Returns:
            List of chunker method names
        """
        return list(cls.CHUNKERS.keys())
