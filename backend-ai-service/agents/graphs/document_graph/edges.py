"""
Document Graph Edges

Defines routing logic for the Document Agent's LangGraph workflow.
"""

from typing import Literal
import sys
from pathlib import Path

# Add project root to path for utils import
project_root = Path(__file__).resolve().parents[3]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from utils.logger import get_logger
from agents.graphs.document_graph.state import DocumentGraphState

logger = get_logger(__name__)


def should_generate_answer(state: DocumentGraphState) -> Literal["generate", "fallback"]:
    """
    Decide whether to generate answer or use fallback.
    
    This is a conditional edge that routes based on whether
    relevant documents were found.
    
    Args:
        state: Current graph state
        
    Returns:
        "generate" if relevant docs found, "fallback" otherwise
    """
    has_relevant = state.get('has_relevant_docs', False)
    
    if has_relevant:
        logger.info("Relevant documents found, proceeding to generation")
        return "generate"
    else:
        logger.info("No relevant documents found, using fallback")
        return "fallback"


def check_retrieval_success(state: DocumentGraphState) -> Literal["rerank", "fallback"]:
    """
    Check if retrieval was successful.
    
    Routes to reranking if chunks were retrieved, fallback otherwise.
    
    Args:
        state: Current graph state
        
    Returns:
        "rerank" if chunks retrieved, "fallback" otherwise
    """
    chunks = state.get('retrieved_chunks', [])
    error = state.get('error')
    
    if error:
        logger.warning(f"Retrieval error: {error}")
        return "fallback"
    
    if not chunks:
        logger.warning("No chunks retrieved")
        return "fallback"
    
    logger.info(f"Retrieval successful, {len(chunks)} chunks found")
    return "rerank"
