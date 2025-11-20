from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database.connection import get_db
from database.repositories.ai_repository import ConversationRepository, LongTermMemoryRepository
from database.models.ai_models import Conversation, LongTermMemory

router = APIRouter()

# --- Pydantic Models ---

class ConversationMessage(BaseModel):
    role: str
    content: str
    timestamp: str
    confidence: Optional[float] = None

class ConversationHistory(BaseModel):
    session_id: str
    messages: List[ConversationMessage]
    total_messages: int

class LongTermMemoryResponse(BaseModel):
    memory_id: str
    knowledge_type: str
    key: str
    value: str
    source: str
    confidence_score: float
    access_count: int
    last_accessed_at: Optional[str] = None
    created_at: str
    metadata: Optional[dict] = None

class MemoryListResponse(BaseModel):
    workspace_id: str
    memories: List[LongTermMemoryResponse]
    total_count: int
    page: int
    page_size: int

class SessionInfo(BaseModel):
    session_id: str
    user_id: str
    created_at: str
    message_count: Optional[int] = 0
    last_message_at: Optional[str] = None

class CreateSessionRequest(BaseModel):
    user_id: str
    session_name: Optional[str] = None

class SearchMemoryRequest(BaseModel):
    query: str
    limit: int = 10

# --- Endpoints ---

@router.get("/sessions/{session_id}/history", response_model=ConversationHistory)
async def get_conversation_history(
    session_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Get conversation history for a session"""
    repo = ConversationRepository(db)
    messages = repo.get_by_session(session_id, limit)
    
    return {
        "session_id": session_id,
        "messages": [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
                "confidence": float(msg.confidence_score) if msg.confidence_score else None
            }
            for msg in messages
        ],
        "total_messages": len(messages)
    }

@router.get("/workspaces/{workspace_id}/memories", response_model=MemoryListResponse)
async def get_long_term_memories(
    workspace_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    knowledge_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get long-term memories for a workspace"""
    repo = LongTermMemoryRepository(db)
    memories = repo.get_by_workspace(workspace_id, knowledge_type)
    
    # Simple pagination (in production, use DB pagination)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_memories = memories[start:end]
    
    return {
        "workspace_id": workspace_id,
        "memories": [
            {
                "memory_id": m.id,
                "knowledge_type": m.knowledge_type,
                "key": m.key,
                "value": m.value,
                "source": m.source,
                "confidence_score": float(m.confidence_score),
                "access_count": m.access_count,
                "last_accessed_at": m.last_accessed_at.isoformat() if m.last_accessed_at else None,
                "created_at": m.created_at.isoformat(),
                "metadata": m.memory_metadata
            }
            for m in paginated_memories
        ],
        "total_count": len(memories),
        "page": page,
        "page_size": page_size
    }

@router.post("/workspaces/{workspace_id}/memories/search", response_model=List[LongTermMemoryResponse])
async def search_memories(
    workspace_id: str,
    request: SearchMemoryRequest,
    db: Session = Depends(get_db)
):
    """Search long-term memories"""
    repo = LongTermMemoryRepository(db)
    # For now, just filter by key/value string match since we don't have vector search for memories yet
    # In a real implementation, this would use vector similarity
    all_memories = repo.get_by_workspace(workspace_id)
    
    query = request.query.lower()
    matches = [
        m for m in all_memories 
        if query in m.key.lower() or query in m.value.lower()
    ]
    
    return [
        {
            "memory_id": m.id,
            "knowledge_type": m.knowledge_type,
            "key": m.key,
            "value": m.value,
            "source": m.source,
            "confidence_score": float(m.confidence_score),
            "access_count": m.access_count,
            "last_accessed_at": m.last_accessed_at.isoformat() if m.last_accessed_at else None,
            "created_at": m.created_at.isoformat(),
            "metadata": m.memory_metadata
        }
        for m in matches[:request.limit]
    ]

@router.post("/sessions", response_model=SessionInfo)
async def create_session(
    request: CreateSessionRequest,
    db: Session = Depends(get_db)
):
    """Create a new session (placeholder)"""
    import uuid
    from datetime import datetime
    
    # In a real app, we might create a Session record.
    # Here we just generate an ID and return it.
    session_id = str(uuid.uuid4())
    
    return {
        "session_id": session_id,
        "user_id": request.user_id,
        "created_at": datetime.utcnow().isoformat(),
        "message_count": 0
    }

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Delete a session and its history"""
    repo = ConversationRepository(db)
    count = repo.delete_session(session_id)
    return {"message": "Session deleted", "deleted_count": count}
