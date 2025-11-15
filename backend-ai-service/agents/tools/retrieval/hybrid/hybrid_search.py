"""
Hybrid Search Tool

Combines vector similarity search and BM25 keyword search using Reciprocal Rank Fusion (RRF).
RRF is a simple yet effective method for combining multiple ranked lists.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import sys
from pathlib import Path
from collections import defaultdict

# Add project root to path for utils import
project_root = Path(__file__).resolve().parents[4]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from utils.logger import get_logger
from agents.tools.retrieval.vector_similarity import VectorSearchTool
from agents.tools.retrieval.bm25 import BM25SearchTool

logger = get_logger(__name__)


@dataclass
class HybridResult:
    """Result from hybrid search"""
    chunk_id: str
    chunk_text: str
    chunk_metadata: Dict[str, Any]
    document_id: str
    workspace_id: str
    hybrid_score: float
    vector_score: Optional[float]
    bm25_score: Optional[float]
    chunk_index: int
    rank: int


class HybridSearchTool:
    """
    Hybrid search combining vector similarity and BM25 using RRF.
    
    Reciprocal Rank Fusion (RRF) formula:
        RRF_score(d) = Σ 1 / (k + rank_i(d))
    
    where:
    - d is a document
    - rank_i(d) is the rank of document d in ranking i
    - k is a constant (typically 60)
    
    Benefits:
    - Combines semantic search (vector) with keyword search (BM25)
    - No need to normalize different scoring systems
    - Simple and effective
    - Robust to individual system errors
    
    Example:
        hybrid = HybridSearchTool()
        results = hybrid.search(
            query="How does agentic AI work?",
            workspace_id="workspace-123",
            top_k=10
        )
    """
    
    def __init__(
        self,
        embedder_type: str = 'huggingface',
        bm25_k1: float = 1.5,
        bm25_b: float = 0.75,
        rrf_k: int = 60
    ):
        """
        Initialize hybrid search tool.
        
        Args:
            embedder_type: Type of embedder for vector search
            bm25_k1: BM25 term frequency saturation
            bm25_b: BM25 length normalization
            rrf_k: RRF constant (typically 60)
        """
        self.vector_search = VectorSearchTool(embedder_type=embedder_type)
        self.bm25_search = BM25SearchTool(k1=bm25_k1, b=bm25_b)
        self.rrf_k = rrf_k
        logger.info(f"HybridSearchTool initialized with RRF_k={rrf_k}")
    
    def reciprocal_rank_fusion(
        self,
        rankings: List[List[str]],
        scores: List[Dict[str, float]],
        k: int = 60
    ) -> Dict[str, float]:
        """
        Calculate RRF scores for multiple rankings.
        
        Args:
            rankings: List of ranked lists (each list contains chunk IDs)
            scores: List of score dictionaries (chunk_id -> score)
            k: RRF constant
            
        Returns:
            Dictionary mapping chunk_id to RRF score
        """
        rrf_scores = defaultdict(float)
        
        for ranking in rankings:
            for rank, chunk_id in enumerate(ranking, start=1):
                # RRF formula: 1 / (k + rank)
                rrf_scores[chunk_id] += 1.0 / (k + rank)
        
        return dict(rrf_scores)
    
    def search(
        self,
        query: str,
        workspace_id: str,
        top_k: int = 10,
        vector_weight: float = 0.5,
        bm25_weight: float = 0.5,
        use_rrf: bool = True
    ) -> List[HybridResult]:
        """
        Perform hybrid search combining vector and BM25.
        
        Args:
            query: Search query
            workspace_id: Workspace to search in
            top_k: Number of results to return
            vector_weight: Weight for vector search (used if not using RRF)
            bm25_weight: Weight for BM25 search (used if not using RRF)
            use_rrf: Whether to use RRF fusion (recommended)
            
        Returns:
            List of HybridResult objects sorted by score
        """
        try:
            logger.info(f"Hybrid search for query: '{query[:50]}...'")
            
            # Get results from both search methods
            # Request more results than top_k for better fusion
            search_k = top_k * 2
            
            vector_results = self.vector_search.search(
                query=query,
                workspace_id=workspace_id,
                top_k=search_k
            )
            
            bm25_results = self.bm25_search.search(
                query=query,
                workspace_id=workspace_id,
                top_k=search_k
            )
            
            logger.info(f"Vector search: {len(vector_results)} results, BM25: {len(bm25_results)} results")
            
            # Build score dictionaries
            vector_scores = {r.chunk_id: r.similarity_score for r in vector_results}
            bm25_scores = {r.chunk_id: r.bm25_score for r in bm25_results}
            
            # Build metadata dictionary
            chunk_metadata = {}
            for r in vector_results:
                chunk_metadata[r.chunk_id] = {
                    'text': r.chunk_text,
                    'metadata': r.chunk_metadata,
                    'document_id': r.document_id,
                    'workspace_id': r.workspace_id,
                    'chunk_index': r.chunk_index
                }
            for r in bm25_results:
                if r.chunk_id not in chunk_metadata:
                    chunk_metadata[r.chunk_id] = {
                        'text': r.chunk_text,
                        'metadata': r.chunk_metadata,
                        'document_id': r.document_id,
                        'workspace_id': r.workspace_id,
                        'chunk_index': r.chunk_index
                    }
            
            if use_rrf:
                # Use Reciprocal Rank Fusion
                vector_ranking = [r.chunk_id for r in vector_results]
                bm25_ranking = [r.chunk_id for r in bm25_results]
                
                rrf_scores = self.reciprocal_rank_fusion(
                    rankings=[vector_ranking, bm25_ranking],
                    scores=[vector_scores, bm25_scores],
                    k=self.rrf_k
                )
                
                # Sort by RRF score
                sorted_chunks = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
                
            else:
                # Use weighted combination
                combined_scores = {}
                all_chunk_ids = set(vector_scores.keys()) | set(bm25_scores.keys())
                
                for chunk_id in all_chunk_ids:
                    v_score = vector_scores.get(chunk_id, 0.0) * vector_weight
                    b_score = bm25_scores.get(chunk_id, 0.0) * bm25_weight
                    combined_scores[chunk_id] = v_score + b_score
                
                sorted_chunks = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
            
            # Build final results
            results = []
            for rank, (chunk_id, hybrid_score) in enumerate(sorted_chunks[:top_k], start=1):
                if chunk_id in chunk_metadata:
                    meta = chunk_metadata[chunk_id]
                    result = HybridResult(
                        chunk_id=chunk_id,
                        chunk_text=meta['text'],
                        chunk_metadata=meta['metadata'],
                        document_id=meta['document_id'],
                        workspace_id=meta['workspace_id'],
                        hybrid_score=hybrid_score,
                        vector_score=vector_scores.get(chunk_id),
                        bm25_score=bm25_scores.get(chunk_id),
                        chunk_index=meta['chunk_index'],
                        rank=rank
                    )
                    results.append(result)
            
            logger.info(f"Hybrid search returned {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"Error in hybrid search: {str(e)}")
            raise
