"""
Document Agent

Main agent for document-based question answering using RAG (Retrieval-Augmented Generation).

This agent uses a LangGraph workflow to:
1. Retrieve relevant document chunks (hybrid search)
2. Rerank chunks by relevance
3. Generate answer with citations using LLM

Example:
    ```python
    from agents.document_agent import DocumentAgent
    
    agent = DocumentAgent()
    result = agent.query(
        query="How does agentic AI work?",
        workspace_id="workspace-123"
    )
    
    print(result['answer'])
    print(result['citations'])
    ```
"""

from typing import Dict, Any, Optional
import sys
import os
import yaml
from pathlib import Path

# Add parent directory to path for utils import
if str(Path(__file__).parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent))

from langgraph.graph import StateGraph, END
from agents.graphs.document_graph import (
    DocumentGraphState,
    create_initial_state,
    DocumentGraphNodes,
    should_generate_answer,
    check_retrieval_success
)
from llm import LLMFactory
from database.connection import get_db_session
from database.repositories import (
    DocumentChunkRepository,
    ConversationRepository,
    LongTermMemoryRepository
)
from utils.logger import get_logger, LogContext

logger = get_logger(__name__)


class DocumentAgent:
    """
    Document Agent for RAG-based question answering.
    
    Uses LangGraph to orchestrate a multi-step workflow:
    - Retrieval (hybrid search with vector + BM25)
    - Reranking (relevance-based)
    - Generation (LLM with citations)
    - Fallback (when no relevant docs found)
    """
    
    def __init__(
        self,
        embedder_type: Optional[str] = None,
        llm_provider: Optional[str] = None,  # Will use config default if None
        top_k: int = 5,
        relevance_threshold: float = 0.01  # Lower threshold for hybrid scores
    ):
        """
        Initialize Document Agent.
        
        Args:
            embedder_type: Embedder for vector search ('huggingface' or 'naver')
            llm_provider: LLM provider ('openai', 'naver', 'cerebras', 'gemini')
            top_k: Number of chunks to use for generation
            relevance_threshold: Minimum relevance score to proceed
        """
        # Get default provider from config if not specified
        llm_factory = LLMFactory()
        if llm_provider is None:
            llm_provider = llm_factory.get_default_provider()
            
        self.llm = llm_factory.create_llm(provider=llm_provider)
        
        # Get default embedder from config if not specified
        if embedder_type is None:
            try:
                # Load config.yml directly to get data_preprocessing section
                config_path = "config.yml"
                if os.path.exists(config_path):
                    with open(config_path, "r") as f:
                        full_config = yaml.safe_load(f)
                        embedder_type = full_config.get('data_preprocessing', {}).get('embedding', {}).get('provider')
                        logger.info(f"Loaded embedder type from config: {embedder_type}")
                
                if not embedder_type:
                    embedder_type = 'huggingface'
                    logger.info(f"Using default embedder type: {embedder_type}")
            except Exception as e:
                logger.error(f"Error loading embedder type from config: {e}")
                embedder_type = 'huggingface'
        else:
            logger.info(f"Using provided embedder type: {embedder_type}")
        
        self.embedder_type = embedder_type
        self.llm_provider = llm_provider
        self.top_k = top_k
        self.relevance_threshold = relevance_threshold
        
        # Initialize nodes
        self.nodes = DocumentGraphNodes(
            embedder_type=embedder_type,
            llm_provider=llm_provider,
            top_k=top_k,
            relevance_threshold=relevance_threshold
        )
        
        # Build workflow graph
        self.graph = self._build_graph()
        
        # Initialize CRUD tools for write operations
        try:
            from agents.tools import CreateDocumentTool, UpdateDocumentTool
            from agents.api_clients import CoreServiceClient
            
            api_client = CoreServiceClient()
            self.tools = {
                'create_document': CreateDocumentTool(api_client),
                'update_document': UpdateDocumentTool(api_client)
            }
            logger.info("Document CRUD tools initialized")
        except ImportError as e:
            logger.warning(f"CRUD tools not available: {e}")
            self.tools = {}
        
        logger.info(f"DocumentAgent initialized with {embedder_type} embedder and {llm_provider} LLM")
    
    def _build_graph(self) -> StateGraph:
        """
        Build the LangGraph workflow.
        
        Graph flow:
            START -> reformulate_query -> retrieve -> rerank -> [check relevance] -> generate -> END
                                                                                   -> fallback -> END
        
        Returns:
            Compiled StateGraph
        """
        # Create workflow
        workflow = StateGraph(DocumentGraphState)
        
        # Add nodes
        workflow.add_node("reformulate_query", self.nodes.reformulate_query_node)
        workflow.add_node("retrieve", self.nodes.retrieve_node)
        workflow.add_node("rerank", self.nodes.rerank_node)
        workflow.add_node("memory_retrieval", self.nodes.memory_retrieval_node)
        workflow.add_node("generate", self.nodes.generate_node)
        workflow.add_node("fallback", self.nodes.fallback_node)
        
        # Add edges
        # Start -> Reformulate Query
        workflow.set_entry_point("reformulate_query")
        
        # Reformulate Query -> Retrieve
        workflow.add_edge("reformulate_query", "retrieve")
        
        # Retrieve -> Memory Retrieval (ALWAYS get memory first)
        workflow.add_edge("retrieve", "memory_retrieval")
        
        # Memory Retrieval -> Check if docs available -> Rerank or Fallback
        workflow.add_conditional_edges(
            "memory_retrieval",
            check_retrieval_success,
            {
                "rerank": "rerank",
                "fallback": "fallback"
            }
        )
        
        # Rerank -> Check relevance -> Generate or Fallback
        workflow.add_conditional_edges(
            "rerank",
            should_generate_answer,
            {
                "generate": "generate",
                "fallback": "fallback"
            }
        )
        
        # Generate -> END
        workflow.add_edge("generate", END)
        
        # Fallback -> END
        workflow.add_edge("fallback", END)
        
        # Compile graph
        return workflow.compile()
    
    def query(
        self,
        query: str,
        workspace_id: str,
        user_id: str = "default-user",
        session_id: str = "default-session",
        relevance_threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Query the document agent with conversation memory.
        
        Args:
            query: User's question
            workspace_id: Workspace to search in
            user_id: User identifier for memory tracking
            session_id: Conversation session identifier
            relevance_threshold: Optional override for relevance threshold
            
        Returns:
            Dictionary with:
                - answer: Generated answer text
                - citations: List of source citations
                - confidence: Confidence score (0-1)
                - metadata: Additional metadata about the process
        """
        # Use LogContext to automatically add user/workspace/session to all logs
        with LogContext(logger, user_id=user_id, workspace_id=workspace_id, session_id=session_id):
            try:
                logger.info(
                    f"Processing query",
                    extra={
                        'query_preview': query[:100],
                        'query_length': len(query)
                    }
                )
                
                # Create initial state with memory identifiers
                initial_state = create_initial_state(
                    query=query,
                    workspace_id=workspace_id,
                    user_id=user_id,
                    session_id=session_id
                )
                
                # Override relevance threshold if provided
                if relevance_threshold is not None:
                    initial_state['relevance_threshold'] = relevance_threshold
                    logger.debug(f"Using custom relevance threshold: {relevance_threshold}")
                
                # Run the graph
                final_state = self.graph.invoke(initial_state)
                
                # Extract result
                result = {
                    'answer': final_state.get('answer', ''),
                    'citations': final_state.get('citations', []),
                    'confidence': final_state.get('confidence', 0.0),
                    'metadata': {
                        'retrieval_stats': final_state.get('retrieval_stats', {}),
                        'generation_metadata': final_state.get('generation_metadata', {}),
                        'fallback_triggered': final_state.get('fallback_triggered', False),
                        'has_memory_context': bool(final_state.get('conversation_context', '')),
                        'error': final_state.get('error')
                    }
                }
                
                logger.info(
                    "Query completed successfully",
                    extra={
                        'confidence': round(result['confidence'], 3),
                        'citation_count': len(result['citations']),
                        'has_memory': result['metadata']['has_memory_context'],
                        'fallback': result['metadata']['fallback_triggered'],
                        'answer_length': len(result['answer'])
                    }
                )
                
                return result
                
            except Exception as e:
                logger.error(
                    f"Error processing query: {str(e)}",
                    extra={'error_type': type(e).__name__},
                    exc_info=True
                )
                return {
                    'answer': f"An error occurred while processing your question: {str(e)}",
                    'citations': [],
                    'confidence': 0.0,
                    'metadata': {
                        'error': str(e),
                        'fallback_triggered': True
                    }
                }
    
    async def aquery(
        self,
        query: str,
        workspace_id: str,
        relevance_threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Async version of query method.
        
        Args:
            query: User's question
            workspace_id: Workspace to search in
            relevance_threshold: Optional override for relevance threshold
            
        Returns:
            Same as query() method
        """
        try:
            logger.info(f"Processing async query: '{query[:50]}...'")
            
            # Create initial state
            initial_state = create_initial_state(query, workspace_id)
            
            if relevance_threshold is not None:
                initial_state['relevance_threshold'] = relevance_threshold
            
            # Run the graph asynchronously
            final_state = await self.graph.ainvoke(initial_state)
            
            # Extract result (same as sync version)
            result = {
                'answer': final_state.get('answer', ''),
                'citations': final_state.get('citations', []),
                'confidence': final_state.get('confidence', 0.0),
                'metadata': {
                    'retrieval_stats': final_state.get('retrieval_stats', {}),
                    'generation_metadata': final_state.get('generation_metadata', {}),
                    'fallback_triggered': final_state.get('fallback_triggered', False),
                    'error': final_state.get('error')
                }
            }
            
            logger.info(f"Async query completed. Confidence: {result['confidence']:.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in async query: {str(e)}")
            return {
                'answer': f"An error occurred: {str(e)}",
                'citations': [],
                'confidence': 0.0,
                'metadata': {'error': str(e), 'fallback_triggered': True}
            }
    
    def visualize(self, output_path: str = "document_agent_graph.png"):
        """
        Visualize the agent's workflow graph.
        
        Args:
            output_path: Path to save visualization
        """
        try:
            from PIL import Image
            import io
            
            # Get graph visualization
            graph_image = self.graph.get_graph().draw_mermaid_png()
            
            # Save to file
            img = Image.open(io.BytesIO(graph_image))
            img.save(output_path)
            logger.info(f"Graph visualization saved to {output_path}")
            
        except Exception as e:
            logger.warning(f"Could not create visualization: {str(e)}")
    
    # ==================== CRUD Operations ====================
    
    def create_document(
        self,
        workspace_id: str,
        title: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        with_preview: bool = True
    ) -> Dict[str, Any]:
        """
        Create a new document (with optional preview for HITL).
        
        Args:
            workspace_id: Workspace ID
            title: Document title
            content: Document content (markdown)
            metadata: Optional metadata
            with_preview: If True, return preview instead of executing
            
        Returns:
            If with_preview=True: preview dict
            If with_preview=False: execution result
        """
        if 'create_document' not in self.tools:
            raise RuntimeError("Create document tool not available")
        
        tool = self.tools['create_document']
        params = {
            'workspace_id': workspace_id,
            'title': title,
            'content': content,
            'metadata': metadata
        }
        
        if with_preview:
            # Return preview for HITL
            preview = tool.preview(params)
            return {
                'requires_confirmation': True,
                'preview': preview.model_dump(),
                'params': params,
                'tool_name': 'create_document'
            }
        else:
            # Execute directly
            result = tool.execute(params)
            return result.model_dump()
    
    def update_document(
        self,
        document_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        with_preview: bool = True
    ) -> Dict[str, Any]:
        """
        Update an existing document (with optional preview for HITL).
        
        Args:
            document_id: Document ID to update
            title: New title (optional)
            content: New content (optional)
            metadata: New metadata (optional)
            with_preview: If True, return preview instead of executing
            
        Returns:
            If with_preview=True: preview dict
            If with_preview=False: execution result
        """
        if 'update_document' not in self.tools:
            raise RuntimeError("Update document tool not available")
        
        tool = self.tools['update_document']
        params = {
            'document_id': document_id,
            'title': title,
            'content': content,
            'metadata': metadata
        }
        
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}
        
        if with_preview:
            # Return preview for HITL
            preview = tool.preview(params)
            return {
                'requires_confirmation': True,
                'preview': preview.model_dump(),
                'params': params,
                'tool_name': 'update_document'
            }
        else:
            # Execute directly
            result = tool.execute(params)
            return result.model_dump()
    
    def execute_tool(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a tool by name (called after HITL approval).
        
        Args:
            tool_name: Name of tool to execute
            params: Tool parameters
            
        Returns:
            Execution result
        """
        if tool_name not in self.tools:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        tool = self.tools[tool_name]
        result = tool.execute(params)
        return result.model_dump()

    def complete_text(
        self,
        query: str,
        current_content: str,
        cursor_position: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate text completion based on current document context.
        
        Args:
            query: User instruction (e.g. "Finish this paragraph")
            current_content: Current document text
            cursor_position: Cursor position (optional)
            
        Returns:
            Dict with 'completion' text
        """
        from langchain_core.messages import SystemMessage, HumanMessage
        
        prompt = f"""
        You are an AI writing assistant.
        User Instruction: {query}
        
        Current Document Content:
        {current_content}
        
        Task: Generate the text that should follow or complete the current content based on the user's instruction.
        Return ONLY the new text to be inserted. Do not repeat the existing text.
        """
        
        try:
            response = self.llm.invoke([
                SystemMessage(content="You are a helpful AI writing assistant."),
                HumanMessage(content=prompt)
            ])
            return {"completion": response.content}
        except Exception as e:
            logger.error(f"Error generating completion: {e}")
            return {"completion": "", "error": str(e)}
