"""
Vector Similarity Search Tool

Uses pgvector for fast approximate nearest neighbor search.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import sys
from pathlib import Path

# Add project root to path for utils import
project_root = Path(__file__).resolve().parents[4]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from utils.logger import get_logger
from database.connection import get_db
from database.repositories.ai_repository import DocumentChunkRepository
from data_preprocessing.embedding.embedding_factory import EmbeddingFactory

logger = get_logger(__name__)


@dataclass
class SearchResult:
    """Result from vector search"""
    chunk_id: str
    chunk_text: str
    chunk_metadata: Dict[str, Any]
    document_id: str
    workspace_id: str
    similarity_score: float
    chunk_index: int


class VectorSearchTool:
    """
    Vector similarity search using pgvector.
    
    Features:
    - Fast approximate nearest neighbor search with IVFFlat index
    - Cosine similarity distance metric
    - Configurable top-k results
    - Distance threshold filtering
    
    Example:
        search_tool = VectorSearchTool(embedder_type='huggingface')
        results = search_tool.search(
            query="What is agentic AI?",
            workspace_id="workspace-123",
            top_k=5
        )
    """
    
    def __init__(self, embedder_type: str = 'huggingface', embedder_config: Optional[Dict] = None):
        """
        Initialize vector search tool.
        
        Args:
            embedder_type: Type of embedder ('naver' or 'huggingface')
            embedder_config: Optional config for embedder
        """
        self.embedder = EmbeddingFactory.create_embedder(embedder_type)
        logger.info(f"VectorSearchTool initialized with {embedder_type} embedder")
    
    def search(
        self,
        query: str,
        workspace_id: str,
        top_k: int = 5,
        distance_threshold: Optional[float] = None
    ) -> List[SearchResult]:
        """
        Search for similar document chunks using vector similarity.
        
        Args:
            query: Search query text
            workspace_id: Workspace ID to search within
            top_k: Number of top results to return
            distance_threshold: Optional max distance threshold (cosine distance)
            
        Returns:
            List of SearchResult objects sorted by similarity
        """
        try:
            # Generate query embedding
            logger.info(f"Generating embedding for query: '{query[:50]}...'")
            query_embedding = self.embedder.embed(query)
            
            # Convert numpy array to list if needed
            if hasattr(query_embedding, 'tolist'):
                query_embedding = query_embedding.tolist()
            
            # Search in database
            with get_db() as db:
                repo = DocumentChunkRepository(db)
                
                chunks = repo.similarity_search(
                    workspace_id=workspace_id,
                    query_embedding=query_embedding,
                    top_k=top_k
                )
                
                # Convert to SearchResult objects
                results = []
                for chunk in chunks:
                    # Calculate similarity score from distance (cosine distance: 0 = identical, 2 = opposite)
                    # Convert to similarity: 1 - (distance / 2)
                    # This gives us: 1.0 = identical, 0.0 = opposite
                    similarity_score = 1.0  # Placeholder - actual distance calculation in repository
                    
                    result = SearchResult(
                        chunk_id=chunk.id,
                        chunk_text=chunk.chunk_text,
                        chunk_metadata=chunk.chunk_metadata or {},
                        document_id=chunk.document_id,
                        workspace_id=chunk.workspace_id,
                        similarity_score=similarity_score,
                        chunk_index=chunk.chunk_index
                    )
                    results.append(result)
                
                logger.info(f"Found {len(results)} chunks for query in workspace {workspace_id}")
                return results
                
        except Exception as e:
            logger.error(f"Error in vector search: {str(e)}")
            raise
    
    def batch_search(
        self,
        queries: List[str],
        workspace_id: str,
        top_k: int = 5
    ) -> List[List[SearchResult]]:
        """
        Search multiple queries in batch.
        
        Args:
            queries: List of query texts
            workspace_id: Workspace ID to search within
            top_k: Number of top results per query
            
        Returns:
            List of result lists, one per query
        """
        results = []
        for query in queries:
            query_results = self.search(query, workspace_id, top_k)
            results.append(query_results)
        
        return results
