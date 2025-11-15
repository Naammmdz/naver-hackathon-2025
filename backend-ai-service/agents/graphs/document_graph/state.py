"""
Document Graph State

Defines the state schema for the Document Agent's LangGraph workflow.
"""

from typing import TypedDict, List, Optional, Dict, Any
from typing_extensions import Annotated
import operator


class DocumentGraphState(TypedDict):
    """
    State for the Document Agent RAG workflow.
    
    This state is passed between nodes in the LangGraph.
    Each node can read from and write to this state.
    """
    
    # Input
    query: str  # User's question/query
    workspace_id: str  # Workspace context
    user_id: str  # User identifier for memory
    session_id: str  # Conversation session identifier
    
    # Query Reformulation
    reformulated_query: Optional[str]  # Query reformulated for standalone retrieval
    
    # Retrieval
    retrieved_chunks: Annotated[List[Dict[str, Any]], operator.add]  # Retrieved document chunks
    retrieval_method: str  # 'vector', 'bm25', or 'hybrid'
    
    # Reranking
    reranked_chunks: List[Dict[str, Any]]  # Reranked chunks
    relevance_threshold: float  # Minimum relevance score
    
    # Memory Context
    conversation_context: str  # Formatted conversation history
    relevant_facts: List[Dict[str, Any]]  # Relevant facts from long-term memory
    
    # Generation
    answer: str  # Generated answer
    citations: List[Dict[str, Any]]  # Source citations
    confidence: float  # Confidence score (0-1)
    
    # Control flow
    has_relevant_docs: bool  # Whether relevant documents were found
    error: Optional[str]  # Error message if any
    fallback_triggered: bool  # Whether fallback was used
    
    # Metadata
    retrieval_stats: Dict[str, Any]  # Statistics about retrieval
    generation_metadata: Dict[str, Any]  # Metadata about generation


def create_initial_state(
    query: str,
    workspace_id: str,
    user_id: str = "default-user",
    session_id: str = "default-session"
) -> DocumentGraphState:
    """
    Create initial state for Document Agent workflow.
    
    Args:
        query: User's question
        workspace_id: Workspace to search in
        user_id: User identifier for memory tracking
        session_id: Conversation session identifier
        
    Returns:
        Initial DocumentGraphState
    """
    return DocumentGraphState(
        # Input
        query=query,
        workspace_id=workspace_id,
        user_id=user_id,
        session_id=session_id,
        
        # Query Reformulation
        reformulated_query=None,
        
        # Retrieval
        retrieved_chunks=[],
        retrieval_method='hybrid',
        
        # Reranking
        reranked_chunks=[],
        relevance_threshold=0.01,  # Default low threshold for RRF scores
        
        # Memory Context
        conversation_context="",
        relevant_facts=[],
        
        # Generation
        answer="",
        citations=[],
        confidence=0.0,
        
        # Control flow
        has_relevant_docs=False,
        error=None,
        fallback_triggered=False,
        
        # Metadata
        retrieval_stats={},
        generation_metadata={}
    )
