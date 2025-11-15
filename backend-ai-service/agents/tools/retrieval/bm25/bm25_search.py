"""
BM25 Keyword Search Tool

Implements BM25 algorithm for keyword-based retrieval.
BM25 is a ranking function used by search engines to estimate relevance of documents to a query.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import re
import sys
from pathlib import Path
from collections import Counter
import math

# Add project root to path for utils import
project_root = Path(__file__).resolve().parents[4]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from utils.logger import get_logger
from database.connection import get_db
from sqlalchemy import text

logger = get_logger(__name__)


@dataclass
class BM25Result:
    """Result from BM25 search"""
    chunk_id: str
    chunk_text: str
    chunk_metadata: Dict[str, Any]
    document_id: str
    workspace_id: str
    bm25_score: float
    chunk_index: int


class BM25SearchTool:
    """
    BM25 keyword search for document retrieval.
    
    BM25 (Best Matching 25) is a probabilistic ranking function that:
    - Considers term frequency (TF)
    - Applies inverse document frequency (IDF)
    - Uses document length normalization
    - Works well for keyword/exact match queries
    
    Parameters:
    - k1: Term frequency saturation parameter (default: 1.5)
    - b: Length normalization parameter (default: 0.75)
    
    Example:
        bm25 = BM25SearchTool()
        results = bm25.search(
            query="project management AI agent",
            workspace_id="workspace-123",
            top_k=5
        )
    """
    
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        """
        Initialize BM25 search tool.
        
        Args:
            k1: Term frequency saturation (1.2-2.0 recommended)
            b: Length normalization (0-1, where 1 = full normalization)
        """
        self.k1 = k1
        self.b = b
        logger.info(f"BM25SearchTool initialized with k1={k1}, b={b}")
    
    def tokenize(self, text: str) -> List[str]:
        """
        Simple tokenization: lowercase and split on non-alphanumeric.
        
        Args:
            text: Text to tokenize
            
        Returns:
            List of tokens
        """
        # Lowercase and split on non-word characters
        tokens = re.findall(r'\w+', text.lower())
        return tokens
    
    def calculate_bm25_score(
        self,
        query_tokens: List[str],
        doc_tokens: List[str],
        doc_length: int,
        avg_doc_length: float,
        doc_count: int,
        term_doc_freq: Dict[str, int]
    ) -> float:
        """
        Calculate BM25 score for a document given a query.
        
        Args:
            query_tokens: Tokenized query
            doc_tokens: Tokenized document
            doc_length: Length of document
            avg_doc_length: Average document length in corpus
            doc_count: Total number of documents
            term_doc_freq: Document frequency for each term
            
        Returns:
            BM25 score
        """
        score = 0.0
        doc_term_freq = Counter(doc_tokens)
        
        for term in set(query_tokens):
            if term not in doc_term_freq:
                continue
            
            # Term frequency in document
            tf = doc_term_freq[term]
            
            # Document frequency for term
            df = term_doc_freq.get(term, 0)
            if df == 0:
                continue
            
            # IDF component: log((N - df + 0.5) / (df + 0.5))
            idf = math.log((doc_count - df + 0.5) / (df + 0.5) + 1.0)
            
            # Document length normalization
            norm = 1 - self.b + self.b * (doc_length / avg_doc_length)
            
            # BM25 formula
            score += idf * (tf * (self.k1 + 1)) / (tf + self.k1 * norm)
        
        return score
    
    def search(
        self,
        query: str,
        workspace_id: str,
        top_k: int = 5,
        min_score: float = 0.0
    ) -> List[BM25Result]:
        """
        Search for relevant chunks using BM25.
        
        Args:
            query: Search query
            workspace_id: Workspace to search in
            top_k: Number of results to return
            min_score: Minimum BM25 score threshold
            
        Returns:
            List of BM25Result objects sorted by score (descending)
        """
        try:
            # Tokenize query
            query_tokens = self.tokenize(query)
            if not query_tokens:
                logger.warning("Empty query after tokenization")
                return []
            
            logger.info(f"BM25 search for query: '{query}' (tokens: {query_tokens})")
            
            # Fetch all chunks from workspace with document titles
            with get_db() as db:
                result = db.execute(text("""
                    SELECT 
                        dc.id, 
                        dc.chunk_text, 
                        dc.chunk_index, 
                        dc.document_id, 
                        dc.workspace_id, 
                        dc.metadata,
                        d.title as document_name
                    FROM document_chunks dc
                    JOIN documents d ON dc.document_id = d.id
                    WHERE dc.workspace_id = :workspace_id
                """), {"workspace_id": workspace_id}).fetchall()
                
                if not result:
                    logger.info(f"No documents found in workspace {workspace_id}")
                    return []
                
                chunks = []
                total_length = 0
                
                # Tokenize all documents and collect stats
                for row in result:
                    tokens = self.tokenize(row[1])  # chunk_text
                    
                    # Ensure metadata is a dict and add document name
                    metadata = row[5] or {}
                    if not isinstance(metadata, dict):
                        metadata = {}
                    metadata['document_name'] = row[6]  # document_name from JOIN
                    
                    chunks.append({
                        'id': row[0],
                        'text': row[1],
                        'index': row[2],
                        'document_id': row[3],
                        'workspace_id': row[4],
                        'metadata': metadata,
                        'tokens': tokens,
                        'length': len(tokens)
                    })
                    total_length += len(tokens)
                
                # Calculate average document length
                avg_doc_length = total_length / len(chunks) if chunks else 1
                doc_count = len(chunks)
                
                # Calculate document frequency for each term
                term_doc_freq = Counter()
                for chunk in chunks:
                    unique_terms = set(chunk['tokens'])
                    for term in unique_terms:
                        term_doc_freq[term] += 1
                
                # Calculate BM25 score for each document
                scored_chunks = []
                for chunk in chunks:
                    score = self.calculate_bm25_score(
                        query_tokens=query_tokens,
                        doc_tokens=chunk['tokens'],
                        doc_length=chunk['length'],
                        avg_doc_length=avg_doc_length,
                        doc_count=doc_count,
                        term_doc_freq=term_doc_freq
                    )
                    
                    if score >= min_score:
                        scored_chunks.append((chunk, score))
                
                # Sort by score (descending) and take top-k
                scored_chunks.sort(key=lambda x: x[1], reverse=True)
                top_chunks = scored_chunks[:top_k]
                
                # Convert to BM25Result objects
                results = []
                for chunk, score in top_chunks:
                    result = BM25Result(
                        chunk_id=chunk['id'],
                        chunk_text=chunk['text'],
                        chunk_metadata=chunk['metadata'],
                        document_id=chunk['document_id'],
                        workspace_id=chunk['workspace_id'],
                        bm25_score=score,
                        chunk_index=chunk['index']
                    )
                    results.append(result)
                
                logger.info(f"BM25 search returned {len(results)} results")
                return results
                
        except Exception as e:
            logger.error(f"Error in BM25 search: {str(e)}")
            raise
