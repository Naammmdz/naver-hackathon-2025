"""
Query/Chat Endpoints

Provides APIs for asking questions and having conversations with documents.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import sys
from pathlib import Path
import uuid

if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.connection import get_db_session
from database.repositories import WorkspaceRepository, ConversationRepository
from agents.document_agent import DocumentAgent
from agents.memory import create_conversation_memory, create_fact_extractor
from utils.logger import get_logger
from sqlalchemy.orm import Session

logger = get_logger(__name__)
router = APIRouter()


# Dependency
def get_db():
    """Get database session"""
    db = get_db_session()
    try:
        yield db
    finally:
        db.close()


# Request/Response Models
class Citation(BaseModel):
    """Citation information"""
    chunk_id: str
    document_id: str
    document_name: str
    page_number: Optional[int]
    chunk_text: str
    score: float


class QueryRequest(BaseModel):
    """Query request"""
    query: str = Field(..., min_length=1, max_length=5000, description="User question")
    user_id: str = Field(default="anonymous", description="User identifier")
    session_id: Optional[str] = Field(None, description="Conversation session ID (auto-generated if not provided)")
    llm_provider: Optional[str] = Field(None, description="LLM provider override (naver, openai, cerebras, gemini)")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of chunks to retrieve")
    include_memory: bool = Field(default=True, description="Include conversation memory")
    document_context: Optional[Dict[str, Any]] = Field(None, description="Context of the currently open document")





class QueryResponse(BaseModel):
    """Query response"""
    query: str
    answer: str
    citations: List[Citation]
    confidence: float
    session_id: str
    retrieval_stats: Dict[str, Any]
    metadata: Dict[str, Any]
    requires_confirmation: bool = False





class ConversationMessage(BaseModel):
    """Conversation message"""
    role: str
    content: str
    timestamp: datetime
    confidence: Optional[float]


class ConversationHistory(BaseModel):
    """Conversation history"""
    session_id: str
    messages: List[ConversationMessage]
    total_messages: int


class SessionCreate(BaseModel):
    """Create session request"""
    user_id: str = Field(default="anonymous")
    session_name: Optional[str] = Field(None, description="Session name")


class SessionResponse(BaseModel):
    """Session response"""
    session_id: str
    user_id: str
    created_at: datetime


# Endpoints
from agents.task_agent import TaskAgent
from agents.orchestrator_agent_hitl import OrchestratorAgentWithHITL

@router.post(
    "/workspaces/{workspace_id}/query",
    response_model=QueryResponse,
    summary="Query Documents",
    description="Ask a question and get an answer based on workspace documents"
)
async def query_documents(
    workspace_id: str,
    request: QueryRequest,
    db: Session = Depends(get_db)
):
    """
    Query documents with RAG
    
    Args:
        workspace_id: Workspace to query
        request: Query request with question and parameters
        
    Returns:
        Answer with citations and metadata
    """
    try:
        # Verify workspace exists
        workspace_repo = WorkspaceRepository(db)
        workspace = workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace {workspace_id} not found"
            )
        
        # Generate session ID if not provided
        session_id = request.session_id or f"session-{uuid.uuid4().hex[:12]}"
        
        # Initialize agents
        # We need both Document and Task agents for the Orchestrator
        doc_agent_kwargs = {
            "top_k": request.top_k
        }
        if request.llm_provider:
            doc_agent_kwargs["llm_provider"] = request.llm_provider
            
        document_agent = DocumentAgent(**doc_agent_kwargs)
        
        # Initialize Task Agent (uses default provider or same as request)
        task_agent_kwargs = {}
        if request.llm_provider:
            task_agent_kwargs["llm_provider"] = request.llm_provider
        task_agent = TaskAgent(**task_agent_kwargs)
        
        # Initialize Orchestrator with HITL support
        orchestrator = OrchestratorAgentWithHITL(
            llm_provider=request.llm_provider or "naver",
            document_agent=document_agent,
            task_agent=task_agent
        )
        
        logger.info(f"Processing query in workspace {workspace_id}, session {session_id}")
        
        # Fetch conversation history
        conversation_history = []
        if session_id:
            try:
                conversation_repo = ConversationRepository(db)
                # Get recent messages from this session
                recent_messages = conversation_repo.get_by_session(session_id, limit=10)
                
                # Format for Orchestrator (list of dicts)
                for msg in recent_messages:
                    conversation_history.append({
                        "role": msg.role,
                        "content": msg.content
                    })
                logger.info(f"Retrieved {len(conversation_history)} messages from history")
            except Exception as e:
                logger.warning(f"Failed to fetch conversation history: {e}")
                conversation_history = [] 

        # Query with Orchestrator (now supports CRUD operations with HITL)
        result = orchestrator.query_with_crud(
            query=request.query,
            workspace_id=workspace_id,
            user_id=request.user_id,
            conversation_history=conversation_history,
            document_context=request.document_context
        )
        
        # Check if HITL confirmation is required
        if result.get('requires_confirmation'):
            # Write operation detected - return HITL request
            logger.info(f"HITL required for operation: {result.get('operation_type')}")
            
            return QueryResponse(
                query=request.query,
                answer=result.get('message', '⏳ Confirmation required for this operation'),
                citations=[],
                confidence=1.0,
                session_id=session_id,
                retrieval_stats={},
                metadata={
                    'requires_hitl': True,
                    'hitl_request': result,
                    'operation_type': result.get('operation_type'),
                    'intent_type': result.get('intent_type')
                },
                requires_confirmation=True
            )
        
        # Normal query (read operation) - extract citations and prepare response
        # The orchestrator returns a 'metadata' dict which contains 'step_results'
        citations = []
        metadata = result.get('metadata', {})
        step_results = metadata.get('step_results', [])
        
        for step in step_results:
            if step.get('success') and step.get('result'):
                step_res = step['result']
                # Check if this step produced citations (Document Agent)
                if 'citations' in step_res:
                    for citation in step_res['citations']:
                        citations.append(Citation(
                            chunk_id=citation.get('chunk_id', ''),
                            document_id=citation.get('document_id', ''),
                            document_name=citation.get('document_name', 'Unknown'),
                            page_number=citation.get('page_number'),
                            chunk_text=citation.get('chunk_text', ''),
                            score=citation.get('score', 0.0)
                        ))
        
        # Store conversation if memory enabled AND it's not a HITL confirmation request
        # If it requires confirmation, we don't store it as a completed interaction yet
        if request.include_memory and not result.get('requires_confirmation'):
            try:
                memory = create_conversation_memory(db)
                
                # Store user question
                memory.add_message(
                    session_id=session_id,
                    role="user",
                    content=request.query,
                    workspace_id=workspace_id,
                    user_id=request.user_id
                )
                
                # Store assistant answer
                memory.add_message(
                    session_id=session_id,
                    role="assistant",
                    content=result['answer'],
                    workspace_id=workspace_id,
                    user_id=request.user_id,
                    agent_used="orchestrator_agent",
                    confidence_score=result.get('confidence', 0.0), # Orchestrator might not return top-level confidence
                    metadata=result # Store full result as metadata
                )
                
                # Extract and store facts
                fact_extractor = create_fact_extractor(db)
                fact_extractor.extract_facts(
                    question=request.query,
                    answer=result['answer'],
                    workspace_id=workspace_id,
                    user_id=request.user_id,
                    session_id=session_id
                )
            except Exception as e:
                logger.warning(f"Failed to store conversation memory: {e}")
        
        return QueryResponse(
            query=request.query,
            answer=result['answer'],
            citations=citations,
            confidence=result.get('confidence', 1.0), # Default to 1.0 if not provided
            session_id=session_id,
            retrieval_stats=result.get('retrieval_stats', {}),
            metadata=result # Pass full result including HITL info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing query: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process query: {str(e)}"
        )


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Session",
    description="Create a new conversation session"
)
async def create_session(
    request: SessionCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new conversation session
    
    Args:
        request: Session creation request
        
    Returns:
        Created session information
    """
    session_id = f"session-{uuid.uuid4().hex[:12]}"
    
    return SessionResponse(
        session_id=session_id,
        user_id=request.user_id,
        created_at=datetime.utcnow()
    )


@router.get(
    "/sessions/{session_id}/history",
    response_model=ConversationHistory,
    summary="Get Conversation History",
    description="Retrieve conversation history for a session"
)
async def get_conversation_history(
    session_id: str,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get conversation history
    
    Args:
        session_id: Session identifier
        limit: Maximum number of messages to retrieve
        
    Returns:
        Conversation history
    """
    try:
        conv_repo = ConversationRepository(db)
        messages = conv_repo.get_by_session(session_id, limit=limit)
        
        formatted_messages = []
        for msg in messages:
            formatted_messages.append(ConversationMessage(
                role=msg.role,
                content=msg.content,
                timestamp=msg.timestamp,
                confidence=float(msg.confidence_score) if msg.confidence_score else None
            ))
        
        return ConversationHistory(
            session_id=session_id,
            messages=formatted_messages,
            total_messages=len(formatted_messages)
        )
    except Exception as e:
        logger.error(f"Error getting conversation history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation history: {str(e)}"
        )


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Session",
    description="Delete a conversation session and its history"
)
async def delete_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete conversation session
    
    Args:
        session_id: Session identifier
    """
    try:
        conv_repo = ConversationRepository(db)
        
        # Delete all messages in session
        messages = conv_repo.get_by_session(session_id)
        for msg in messages:
            conv_repo.delete(msg.conversation_id)
        
        logger.info(f"Deleted session: {session_id}")
        
        return None
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}"
        )
