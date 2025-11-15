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


class QueryResponse(BaseModel):
    """Query response"""
    query: str
    answer: str
    citations: List[Citation]
    confidence: float
    session_id: str
    retrieval_stats: Dict[str, Any]
    metadata: Dict[str, Any]


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
        
        # Initialize agent
        agent_kwargs = {
            "top_k": request.top_k
        }
        if request.llm_provider:
            agent_kwargs["llm_provider"] = request.llm_provider
        
        agent = DocumentAgent(**agent_kwargs)
        
        logger.info(f"Processing query in workspace {workspace_id}, session {session_id}")
        
        # Execute query
        result = agent.query(
            query=request.query,
            workspace_id=workspace_id,
            user_id=request.user_id,
            session_id=session_id
        )
        
        # Store conversation if memory enabled
        if request.include_memory:
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
                    agent_used="document_agent",
                    confidence_score=result.get('confidence', 0.0),
                    metadata=result.get('generation_metadata', {})
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
        
        # Format citations
        citations = []
        for citation in result.get('citations', []):
            citations.append(Citation(
                chunk_id=citation.get('chunk_id', ''),
                document_id=citation.get('document_id', ''),
                document_name=citation.get('document_name', 'Unknown'),
                page_number=citation.get('page_number'),
                chunk_text=citation.get('chunk_text', ''),
                score=citation.get('score', 0.0)
            ))
        
        return QueryResponse(
            query=request.query,
            answer=result['answer'],
            citations=citations,
            confidence=result.get('confidence', 0.0),
            session_id=session_id,
            retrieval_stats=result.get('retrieval_stats', {}),
            metadata=result.get('generation_metadata', {})
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
