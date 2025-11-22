"""
Document Graph Nodes

Implements the nodes for the Document Agent's LangGraph workflow.
Each node performs a specific task in the RAG pipeline.
"""

from typing import Dict, Any
import sys
from pathlib import Path

# Add project root to path for utils import
project_root = Path(__file__).resolve().parents[3]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from utils.logger import get_logger
from agents.graphs.document_graph.state import DocumentGraphState
from agents.tools.retrieval import HybridSearchTool, Reranker
from agents.memory import get_context_for_query
from agents.memory.conversation_memory import ConversationMemory
from agents.prompts.document_agent_prompts import (
    create_generation_prompt,
    create_fallback_response,
    extract_citations_from_answer,
    create_citation_text,
    QUERY_REFORMULATION_PROMPT
)
from llm import LLMFactory
from database.connection import get_db_session

logger = get_logger(__name__)


class DocumentGraphNodes:
    """
    Nodes for the Document Agent RAG workflow.
    
    Each method is a node in the LangGraph that processes the state
    and returns updated state.
    """
    
    def __init__(
        self,
        embedder_type: str = 'huggingface',
        llm_provider: str = 'openai',
        top_k: int = 5,
        relevance_threshold: float = 0.3
    ):
        """
        Initialize document graph nodes.
        
        Args:
            embedder_type: Type of embedder for vector search
            llm_provider: LLM provider for generation
            top_k: Number of chunks to retrieve
            relevance_threshold: Minimum relevance score
        """
        self.hybrid_search = HybridSearchTool(embedder_type=embedder_type)
        self.reranker = Reranker()
        
        # Initialize LLM
        llm_factory = LLMFactory()
        self.llm = llm_factory.create_llm(provider=llm_provider)
        
        self.top_k = top_k
        self.relevance_threshold = relevance_threshold
        
        logger.info(f"DocumentGraphNodes initialized with {embedder_type} embedder and {llm_provider} LLM")
    
    def reformulate_query_node(self, state: DocumentGraphState) -> Dict[str, Any]:
        """
        Reformulate query into standalone question using conversation history.
        
        For follow-up questions that reference previous context (e.g., "What are the key aspects of it?"),
        this node uses LLM to reformulate them into standalone questions that can be understood
        without conversation history.
        
        Args:
            state: Current graph state
            
        Returns:
            Updated state with reformulated_query
        """
        try:
            # Debug: log type and available keys
            logger.info(f"Reformulation input type: {type(state)}")
            logger.info(f"State keys available: {list(state.keys()) if hasattr(state, 'keys') else 'No keys method'}")
            
            query = state.get('query', '') if hasattr(state, 'get') else ''  # Use .get() for safety
            if not query:
                logger.warning("No query found in state, returning empty reformulation")
                return {'reformulated_query': ''}
            
            session_id = state.get('session_id', 'default-session') if hasattr(state, 'get') else 'default-session'
            
            # Get database session
            db = get_db_session()
            
            try:
                # Get recent conversation history
                memory = ConversationMemory(db)
                chat_history = memory.format_for_reformulation(
                    session_id=session_id,
                    last_n=5  # Last 5 messages for context
                )
                
                # If no chat history, return original query
                if not chat_history:
                    logger.info("No chat history found, using original query")
                    return {'reformulated_query': query}
                
                # Use LLM to reformulate query
                prompt = QUERY_REFORMULATION_PROMPT.format(
                    chat_history=chat_history,
                    question=query
                )
                
                response = self.llm.invoke(prompt)
                reformulated = response.content if hasattr(response, 'content') else str(response)
                reformulated = reformulated.strip()
                
                # Log the reformulation
                if reformulated != query:
                    logger.info(f"Query reformulated: '{query}' → '{reformulated}'")
                else:
                    logger.info("Query is already standalone, no reformulation needed")
                
                return {'reformulated_query': reformulated}
                
            finally:
                db.close()
                
        except Exception as e:
            import traceback
            logger.error(f"Error in reformulate_query_node: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            # On error, use original query
            fallback_query = state.get('query', '') if hasattr(state, 'get') else ''
            return {'reformulated_query': fallback_query}
    
    def retrieve_node(self, state: DocumentGraphState) -> Dict[str, Any]:
        """
        Retrieve relevant document chunks.
        
        Uses hybrid search (vector + BM25 with RRF fusion) to find
        the most relevant chunks for the query.
        
        Args:
            state: Current graph state
            
        Returns:
            Updated state with retrieved chunks
        """
        try:
            # Use reformulated query if available, otherwise use original query
            query = state.get('reformulated_query', state['query'])
            
            logger.info(f"Retrieving documents for query: '{query[:50]}...'")
            
            # Perform hybrid search
            results = self.hybrid_search.search(
                query=query,
                workspace_id=state['workspace_id'],
                top_k=self.top_k * 2,  # Get more for reranking
                use_rrf=True
            )
            
            # Convert results to chunk dictionaries
            chunks = []
            for result in results:
                chunk = {
                    'chunk_id': result.chunk_id,
                    'chunk_text': result.chunk_text,
                    'chunk_metadata': result.chunk_metadata,
                    'document_id': result.document_id,
                    'workspace_id': result.workspace_id,
                    'hybrid_score': result.hybrid_score,
                    'vector_score': result.vector_score,
                    'bm25_score': result.bm25_score,
                    'chunk_index': result.chunk_index
                }
                chunks.append(chunk)
            
            logger.info(f"Retrieved {len(chunks)} chunks")
            
            return {
                'retrieved_chunks': chunks,
                'retrieval_method': 'hybrid',
                'retrieval_stats': {
                    'total_retrieved': len(chunks),
                    'method': 'hybrid_rrf',
                    'top_score': chunks[0]['hybrid_score'] if chunks else 0.0
                }
            }
            
        except Exception as e:
            logger.error(f"Error in retrieve_node: {str(e)}")
            return {
                'retrieved_chunks': [],
                'error': f"Retrieval failed: {str(e)}",
                'retrieval_stats': {'error': str(e)}
            }
    
    def rerank_node(self, state: DocumentGraphState) -> Dict[str, Any]:
        """
        Rerank retrieved chunks by relevance.
        
        Uses the reranker to improve the ordering of chunks
        based on query relevance.
        
        Args:
            state: Current graph state
            
        Returns:
            Updated state with reranked chunks
        """
        try:
            chunks = state.get('retrieved_chunks', [])
            
            if not chunks:
                logger.warning("No chunks to rerank")
                return {
                    'reranked_chunks': [],
                    'has_relevant_docs': False
                }
            
            logger.info(f"Reranking {len(chunks)} chunks")
            
            # Use simple scoring instead of reranker to avoid type issues
            # Sort by hybrid_score (already calculated)
            sorted_chunks = sorted(
                chunks,
                key=lambda x: x.get('hybrid_score', 0.0),
                reverse=True
            )[:self.top_k]
            
            # Add rerank_score (same as hybrid_score for now)
            reranked_chunks = []
            for chunk in sorted_chunks:
                chunk_copy = chunk.copy()
                chunk_copy['rerank_score'] = chunk.get('hybrid_score', 0.0)
                chunk_copy['original_score'] = chunk.get('hybrid_score', 0.0)
                reranked_chunks.append(chunk_copy)
            
            # Check if we have relevant documents
            top_score = reranked_chunks[0]['rerank_score'] if reranked_chunks else 0.0
            has_relevant = top_score >= state.get('relevance_threshold', self.relevance_threshold)
            
            logger.info(f"Reranked to {len(reranked_chunks)} chunks, top score: {top_score:.4f}")
            
            return {
                'reranked_chunks': reranked_chunks,
                'has_relevant_docs': has_relevant
            }
            
        except Exception as e:
            logger.error(f"Error in rerank_node: {str(e)}")
            return {
                'reranked_chunks': state.get('retrieved_chunks', [])[:self.top_k],
                'has_relevant_docs': False,
                'error': f"Reranking failed: {str(e)}"
            }
    
    def memory_retrieval_node(self, state: DocumentGraphState) -> Dict[str, Any]:
        """
        Retrieve relevant conversation history and facts.
        
        Retrieves:
        - Recent conversation from current session
        - Relevant facts from long-term memory
        - Past relevant conversations
        
        Args:
            state: Current graph state
            
        Returns:
            Updated state with conversation context
        """
        try:
            # Get memory context
            db = get_db_session()
            
            try:
                context = get_context_for_query(
                    db=db,
                    workspace_id=state['workspace_id'],
                    user_id=state.get('user_id', 'default-user'),
                    session_id=state.get('session_id', 'default-session'),
                    query=state['query'],
                    max_recent=10,
                    max_facts=5,
                    max_history=3
                )
                
                logger.info(f"Retrieved memory context ({len(context)} chars)")
                
                return {
                    'conversation_context': context
                }
                
            finally:
                db.close()
                
        except Exception as e:
            logger.warning(f"Error retrieving memory: {str(e)}")
            # Continue without memory if retrieval fails
            return {
                'conversation_context': ""
            }
    
    def generate_node(self, state: DocumentGraphState) -> Dict[str, Any]:
        """
        Generate answer from reranked chunks with conversation context.
        
        Uses LLM to generate a comprehensive answer with citations,
        incorporating conversation history and facts from memory.
        
        Args:
            state: Current graph state
            
        Returns:
            Updated state with generated answer and citations
        """
        try:
            chunks = state.get('reranked_chunks', [])
            
            if not chunks:
                logger.warning("No chunks available for generation")
                return self._generate_fallback(state)
            
            logger.info(f"Generating answer from {len(chunks)} chunks")
            
            # Get conversation context
            conversation_context = state.get('conversation_context', '')
            
            # Create generation prompt with memory
            prompt = create_generation_prompt(
                state['query'],
                chunks,
                conversation_context=conversation_context
            )
            
            # Generate answer
            response = self.llm.invoke(prompt)
            answer = response.content if hasattr(response, 'content') else str(response)
            
            # Extract citations
            citations = extract_citations_from_answer(answer, chunks)
            
            # Add citation text to answer
            citation_text = create_citation_text(citations)
            full_answer = answer + citation_text
            
            # Calculate confidence based on top rerank score
            top_score = chunks[0].get('rerank_score', 0.0)
            confidence = min(1.0, top_score / 1.5)  # Normalize to 0-1
            
            logger.info(f"Generated answer with {len(citations)} citations, confidence: {confidence:.2f}")
            
            return {
                'answer': full_answer,
                'citations': citations,
                'confidence': confidence,
                'generation_metadata': {
                    'chunks_used': len(chunks),
                    'citations_count': len(citations),
                    'prompt_length': len(prompt),
                    'answer_length': len(answer),
                    'has_memory_context': bool(conversation_context)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in generate_node: {str(e)}")
            return self._generate_fallback(state, error=str(e))
    
    def fallback_node(self, state: DocumentGraphState) -> Dict[str, Any]:
        """
        Handle case when no relevant documents found.
        
        Returns a helpful fallback message.
        
        Args:
            state: Current graph state
            
        Returns:
            Updated state with fallback response
        """
        return self._generate_fallback(state)
    
    def _generate_fallback(self, state: DocumentGraphState, error: str = None) -> Dict[str, Any]:
        """
        Generate fallback response with memory context if available.
        
        Args:
            state: Current graph state
            error: Optional error message
            
        Returns:
            Updated state with fallback response
        """
        logger.info("Generating fallback response")
        
        conversation_context = state.get('conversation_context', '')
        
        # If we have memory context, try to use LLM to answer from memory
        if conversation_context and not error:
            try:
                logger.info("Attempting to answer from memory context only")
                
                prompt = f"""You are a helpful DevHolic AI assistant. The user has asked a question, but no relevant documents were found.
However, you have access to the conversation history and previous knowledge.

{conversation_context}

QUESTION: {state['query']}

Please try to answer based on the conversation history above. If you can provide a helpful response based on previous discussion, do so. Otherwise, politely explain that you don't have enough information.

ANSWER:"""
                
                response = self.llm.invoke(prompt)
                answer = response.content if hasattr(response, 'content') else str(response)
                
                # Check if answer is meaningful (not just "I don't know")
                if len(answer) > 100 and "don't have" not in answer.lower()[:50]:
                    logger.info("Generated answer from memory context")
                    return {
                        'answer': answer,
                        'citations': [],
                        'confidence': 0.5,  # Lower confidence for memory-only answers
                        'fallback_triggered': False,
                        'generation_metadata': {
                            'source': 'memory_only',
                            'has_memory_context': True
                        }
                    }
            except Exception as e:
                logger.warning(f"Failed to generate from memory: {e}")
        
        # Standard fallback
        fallback_answer = create_fallback_response(state['query'])
        
        if error:
            fallback_answer += f"\n\nTechnical details: {error}"
        
        return {
            'answer': fallback_answer,
            'citations': [],
            'confidence': 0.0,
            'fallback_triggered': True,
            'generation_metadata': {
                'fallback': True,
                'reason': error or 'No relevant documents',
                'has_memory_context': bool(conversation_context)
            }
        }
