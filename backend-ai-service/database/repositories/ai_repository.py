"""
AI-specific repositories for RAG, Memory, and Agent operations
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from datetime import datetime

from database.models.ai_models import (
    DocumentChunk,
    Conversation,
    LongTermMemory,
    AgentAction,
    HITLFeedback
)
from database.repositories.base import BaseRepository


class DocumentChunkRepository(BaseRepository[DocumentChunk]):
    """Repository for DocumentChunk operations"""
    
    def __init__(self, db: Session):
        super().__init__(DocumentChunk, db)
    
    def get_by_document(self, document_id: str) -> List[DocumentChunk]:
        """Get all chunks for a document, ordered by index"""
        return (
            self.db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index)
            .all()
        )
    
    def count_by_document(self, document_id: str) -> int:
        """Count chunks for a document"""
        return (
            self.db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == document_id)
            .count()
        )
    
    def get_by_workspace(self, workspace_id: str) -> List[DocumentChunk]:
        """Get all chunks in a workspace"""
        from database.models import Document
        # Filter through documents table to handle cases where document_chunks.workspace_id might not exist
        return (
            self.db.query(DocumentChunk)
            .join(Document, DocumentChunk.document_id == Document.id)
            .filter(Document.workspace_id == workspace_id)
            .all()
        )
    
    def similarity_search(self, workspace_id: str, query_embedding: List[float], top_k: int = 5) -> List[DocumentChunk]:
        """
        Find similar chunks using vector similarity.
        Joins with Document table to include document title in chunk metadata.
        Note: Requires pgvector extension and proper indexing.
        
        Filters by workspace_id through documents table to handle cases where
        document_chunks.workspace_id column might not exist.
        """
        from sqlalchemy import func
        from database.models import Document
        
        # Query with JOIN to get document title and filter by workspace_id
        # Use documents.workspace_id to ensure compatibility even if document_chunks.workspace_id doesn't exist
        results = (
            self.db.query(DocumentChunk, Document.title)
            .join(Document, DocumentChunk.document_id == Document.id)
            .filter(
                Document.workspace_id == workspace_id,
                DocumentChunk.embedding.isnot(None)
            )
            .order_by(DocumentChunk.embedding.l2_distance(query_embedding))
            .limit(top_k)
            .all()
        )
        
        # Attach document title to chunk metadata
        chunks = []
        for chunk, doc_title in results:
            # Ensure chunk_metadata is a dict
            if chunk.chunk_metadata is None:
                chunk.chunk_metadata = {}
            
            # Add document title to metadata
            chunk.chunk_metadata['document_name'] = doc_title
            chunks.append(chunk)
        
        return chunks
    
    def delete_by_document(self, document_id: str) -> int:
        """Delete all chunks for a document"""
        count = (
            self.db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == document_id)
            .delete()
        )
        self.db.commit()
        return count


class ConversationRepository(BaseRepository[Conversation]):
    """Repository for Conversation operations"""
    
    def __init__(self, db: Session):
        super().__init__(Conversation, db)
    
    def get_by_session(self, session_id: str, limit: int = 100) -> List[Conversation]:
        """Get all messages in a session, ordered by timestamp"""
        return (
            self.db.query(Conversation)
            .filter(Conversation.session_id == session_id)
            .order_by(Conversation.timestamp)
            .limit(limit)
            .all()
        )
    
    def get_by_user(self, user_id: str, workspace_id: Optional[str] = None) -> List[Conversation]:
        """Get all conversations for a user"""
        query = self.db.query(Conversation).filter(Conversation.user_id == user_id)
        if workspace_id:
            query = query.filter(Conversation.workspace_id == workspace_id)
        return query.order_by(desc(Conversation.timestamp)).all()
    
    def get_recent(self, workspace_id: str, limit: int = 50) -> List[Conversation]:
        """Get recent conversations in workspace"""
        return (
            self.db.query(Conversation)
            .filter(Conversation.workspace_id == workspace_id)
            .order_by(desc(Conversation.timestamp))
            .limit(limit)
            .all()
        )
    
    def get_by_intent(self, workspace_id: str, intent: str) -> List[Conversation]:
        """Get conversations by intent type"""
        return (
            self.db.query(Conversation)
            .filter(
                Conversation.workspace_id == workspace_id,
                Conversation.intent == intent
            )
            .all()
        )
    
    def delete_session(self, session_id: str) -> int:
        """Delete all messages in a session"""
        count = (
            self.db.query(Conversation)
            .filter(Conversation.session_id == session_id)
            .delete()
        )
        self.db.commit()
        return count


class LongTermMemoryRepository(BaseRepository[LongTermMemory]):
    """Repository for LongTermMemory operations"""
    
    def __init__(self, db: Session):
        super().__init__(LongTermMemory, db)
    
    def get_by_workspace(self, workspace_id: str, knowledge_type: Optional[str] = None) -> List[LongTermMemory]:
        """Get all memories in workspace, optionally filtered by type"""
        query = self.db.query(LongTermMemory).filter(LongTermMemory.workspace_id == workspace_id)
        if knowledge_type:
            query = query.filter(LongTermMemory.knowledge_type == knowledge_type)
        return query.all()
    
    def get_by_key(self, workspace_id: str, key: str) -> Optional[LongTermMemory]:
        """Get memory by key in workspace"""
        return (
            self.db.query(LongTermMemory)
            .filter(
                LongTermMemory.workspace_id == workspace_id,
                LongTermMemory.key == key
            )
            .first()
        )
    
    def get_by_source(self, workspace_id: str, source: str) -> List[LongTermMemory]:
        """Get memories by source (e.g., 'hitl_confirmation')"""
        return (
            self.db.query(LongTermMemory)
            .filter(
                LongTermMemory.workspace_id == workspace_id,
                LongTermMemory.source == source
            )
            .all()
        )
    
    def get_high_confidence(self, workspace_id: str, min_confidence: float = 0.8) -> List[LongTermMemory]:
        """Get high-confidence memories"""
        return (
            self.db.query(LongTermMemory)
            .filter(
                LongTermMemory.workspace_id == workspace_id,
                LongTermMemory.confidence_score >= min_confidence
            )
            .all()
        )
    
    def increment_access(self, memory_id: str) -> Optional[LongTermMemory]:
        """Increment access count and update last accessed time"""
        memory = self.get_by_id(memory_id)
        if memory:
            memory.access_count += 1
            memory.last_accessed_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(memory)
        return memory
    
    def update_confidence(self, memory_id: str, new_confidence: float) -> Optional[LongTermMemory]:
        """Update confidence score"""
        memory = self.get_by_id(memory_id)
        if memory:
            memory.confidence_score = new_confidence
            self.db.commit()
            self.db.refresh(memory)
        return memory


class AgentActionRepository(BaseRepository[AgentAction]):
    """Repository for AgentAction operations"""
    
    def __init__(self, db: Session):
        super().__init__(AgentAction, db)
    
    def get_by_workspace(self, workspace_id: str, limit: int = 100) -> List[AgentAction]:
        """Get agent actions in workspace"""
        return (
            self.db.query(AgentAction)
            .filter(AgentAction.workspace_id == workspace_id)
            .order_by(desc(AgentAction.timestamp))
            .limit(limit)
            .all()
        )
    
    def get_by_conversation(self, conversation_id: str) -> List[AgentAction]:
        """Get all actions for a conversation"""
        return (
            self.db.query(AgentAction)
            .filter(AgentAction.conversation_id == conversation_id)
            .order_by(AgentAction.timestamp)
            .all()
        )
    
    def get_by_agent(self, workspace_id: str, agent_name: str) -> List[AgentAction]:
        """Get actions by specific agent"""
        return (
            self.db.query(AgentAction)
            .filter(
                AgentAction.workspace_id == workspace_id,
                AgentAction.agent_name == agent_name
            )
            .order_by(desc(AgentAction.timestamp))
            .all()
        )
    
    def get_failed_actions(self, workspace_id: str) -> List[AgentAction]:
        """Get all failed actions for debugging"""
        return (
            self.db.query(AgentAction)
            .filter(
                AgentAction.workspace_id == workspace_id,
                AgentAction.success == False
            )
            .order_by(desc(AgentAction.timestamp))
            .all()
        )
    
    def get_performance_stats(self, workspace_id: str, agent_name: Optional[str] = None):
        """Get performance statistics for agents"""
        from sqlalchemy import func, Integer
        
        query = self.db.query(
            AgentAction.agent_name,
            func.count(AgentAction.id).label('total_actions'),
            func.sum(func.cast(AgentAction.success, Integer)).label('successful_actions'),
            func.avg(AgentAction.execution_time_ms).label('avg_execution_time')
        ).filter(AgentAction.workspace_id == workspace_id)
        
        if agent_name:
            query = query.filter(AgentAction.agent_name == agent_name)
        
        return query.group_by(AgentAction.agent_name).all()


class HITLFeedbackRepository(BaseRepository[HITLFeedback]):
    """Repository for HITLFeedback operations"""
    
    def __init__(self, db: Session):
        super().__init__(HITLFeedback, db)
    
    def get_by_workspace(self, workspace_id: str, processed: Optional[bool] = None) -> List[HITLFeedback]:
        """Get feedback in workspace, optionally filtered by processed status"""
        query = self.db.query(HITLFeedback).filter(HITLFeedback.workspace_id == workspace_id)
        if processed is not None:
            query = query.filter(HITLFeedback.processed == processed)
        return query.order_by(desc(HITLFeedback.created_at)).all()
    
    def get_pending(self, workspace_id: str) -> List[HITLFeedback]:
        """Get all pending (unprocessed) feedback"""
        return self.get_by_workspace(workspace_id, processed=False)
    
    def get_by_conversation(self, conversation_id: str) -> List[HITLFeedback]:
        """Get all feedback for a conversation"""
        return (
            self.db.query(HITLFeedback)
            .filter(HITLFeedback.conversation_id == conversation_id)
            .all()
        )
    
    def get_by_type(self, workspace_id: str, feedback_type: str) -> List[HITLFeedback]:
        """Get feedback by type (e.g., 'confirmation', 'correction')"""
        return (
            self.db.query(HITLFeedback)
            .filter(
                HITLFeedback.workspace_id == workspace_id,
                HITLFeedback.feedback_type == feedback_type
            )
            .all()
        )
    
    def mark_processed(self, feedback_id: str, learned_knowledge_id: Optional[str] = None) -> Optional[HITLFeedback]:
        """Mark feedback as processed"""
        feedback = self.get_by_id(feedback_id)
        if feedback:
            feedback.processed = True
            feedback.processed_at = datetime.utcnow()
            if learned_knowledge_id:
                feedback.learned_knowledge_id = learned_knowledge_id
            self.db.commit()
            self.db.refresh(feedback)
        return feedback
    
    def get_approved_count(self, workspace_id: str) -> int:
        """Count approved feedback"""
        return (
            self.db.query(HITLFeedback)
            .filter(
                HITLFeedback.workspace_id == workspace_id,
                HITLFeedback.approved == True
            )
            .count()
        )
