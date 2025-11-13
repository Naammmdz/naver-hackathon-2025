"""
Reranker

Re-ranks search results based on query relevance.
Implements simple scoring-based reranking (can be extended with cross-encoder models).
"""

from typing import List, Dict, Any, Union
from dataclasses import dataclass
import logging

from agents.tools.retrieval.vector_similarity import SearchResult
from agents.tools.retrieval.bm25 import BM25Result
from agents.tools.retrieval.hybrid import HybridResult

logger = logging.getLogger(__name__)


@dataclass
class RerankedResult:
    """Result after reranking"""
    chunk_id: str
    chunk_text: str
    chunk_metadata: Dict[str, Any]
    document_id: str
    workspace_id: str
    original_score: float
    rerank_score: float
    chunk_index: int
    original_rank: int
    rerank_rank: int


class Reranker:
    """
    Reranks search results based on query relevance.
    
    Current implementation:
    - Uses simple keyword overlap and length penalties
    - Can be extended with cross-encoder models (e.g., ms-marco-MiniLM)
    
    Future enhancements:
    - Add cross-encoder scoring
    - Use LLM-based relevance judgment
    - Add diversity-based reranking
    
    Example:
        reranker = Reranker()
        reranked = reranker.rerank(
            query="How does agentic AI work?",
            results=hybrid_results,
            top_k=5
        )
    """
    
    def __init__(self):
        """Initialize reranker"""
        logger.info("Reranker initialized with keyword-based scoring")
    
    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization (can be improved with proper tokenizer)"""
        import re
        # Convert to lowercase and split on non-alphanumeric
        tokens = re.findall(r'\b\w+\b', text.lower())
        return tokens
    
    def _calculate_keyword_overlap(self, query: str, text: str) -> float:
        """
        Calculate keyword overlap between query and text.
        
        Returns:
            Float between 0 and 1 (percentage of query tokens in text)
        """
        query_tokens = set(self._tokenize(query))
        text_tokens = set(self._tokenize(text))
        
        if not query_tokens:
            return 0.0
        
        overlap = len(query_tokens & text_tokens)
        return overlap / len(query_tokens)
    
    def _calculate_length_penalty(self, text: str, optimal_length: int = 500) -> float:
        """
        Calculate length penalty (prefer chunks near optimal length).
        
        Args:
            text: Chunk text
            optimal_length: Optimal chunk length in characters
            
        Returns:
            Float between 0 and 1 (1 = optimal length)
        """
        length = len(text)
        diff = abs(length - optimal_length)
        # Exponential decay based on difference
        penalty = max(0.0, 1.0 - (diff / optimal_length))
        return penalty
    
    def _calculate_rerank_score(
        self,
        query: str,
        text: str,
        original_score: float,
        keyword_weight: float = 0.3,
        length_weight: float = 0.1,
        original_weight: float = 0.6
    ) -> float:
        """
        Calculate rerank score combining multiple signals.
        
        Args:
            query: Search query
            text: Chunk text
            original_score: Original search score
            keyword_weight: Weight for keyword overlap
            length_weight: Weight for length penalty
            original_weight: Weight for original score
            
        Returns:
            Combined rerank score
        """
        keyword_score = self._calculate_keyword_overlap(query, text)
        length_score = self._calculate_length_penalty(text)
        
        rerank_score = (
            keyword_weight * keyword_score +
            length_weight * length_score +
            original_weight * original_score
        )
        
        return rerank_score
    
    def rerank(
        self,
        query: str,
        results: List[Union[SearchResult, BM25Result, HybridResult]],
        top_k: int = 10,
        keyword_weight: float = 0.3,
        length_weight: float = 0.1,
        original_weight: float = 0.6
    ) -> List[RerankedResult]:
        """
        Rerank search results based on query relevance.
        
        Args:
            query: Search query
            results: List of search results to rerank
            top_k: Number of top results to return
            keyword_weight: Weight for keyword overlap (default: 0.3)
            length_weight: Weight for length penalty (default: 0.1)
            original_weight: Weight for original score (default: 0.6)
            
        Returns:
            List of RerankedResult objects sorted by rerank score
        """
        try:
            logger.info(f"Reranking {len(results)} results for query: '{query[:50]}...'")
            
            reranked = []
            for result in results:
                # Extract fields based on result type
                if isinstance(result, SearchResult):
                    original_score = result.similarity_score
                elif isinstance(result, BM25Result):
                    original_score = result.bm25_score
                elif isinstance(result, HybridResult):
                    original_score = result.hybrid_score
                else:
                    logger.warning(f"Unknown result type: {type(result)}")
                    continue
                
                # Calculate rerank score
                rerank_score = self._calculate_rerank_score(
                    query=query,
                    text=result.chunk_text,
                    original_score=original_score,
                    keyword_weight=keyword_weight,
                    length_weight=length_weight,
                    original_weight=original_weight
                )
                
                reranked_result = RerankedResult(
                    chunk_id=result.chunk_id,
                    chunk_text=result.chunk_text,
                    chunk_metadata=result.chunk_metadata,
                    document_id=result.document_id,
                    workspace_id=result.workspace_id,
                    original_score=original_score,
                    rerank_score=rerank_score,
                    chunk_index=result.chunk_index,
                    original_rank=getattr(result, 'rank', 0),
                    rerank_rank=0  # Will be set after sorting
                )
                reranked.append(reranked_result)
            
            # Sort by rerank score
            reranked.sort(key=lambda x: x.rerank_score, reverse=True)
            
            # Set rerank ranks
            for rank, result in enumerate(reranked[:top_k], start=1):
                result.rerank_rank = rank
            
            logger.info(f"Reranking complete, returning top {top_k} results")
            return reranked[:top_k]
            
        except Exception as e:
            logger.error(f"Error in reranking: {str(e)}")
            raise
