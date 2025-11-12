"""
AI-specific models: Document Chunks, Conversations, Memory, etc.
"""

from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, Numeric, CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from database.models.base import BaseModel, UUIDMixin, TimestampMixin


class DocumentChunk(BaseModel, UUIDMixin, TimestampMixin):
    """Document chunk for RAG retrieval"""
    
    __tablename__ = 'document_chunks'
    
    document_id = Column(String, ForeignKey('documents.id'), nullable=False, index=True)
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False, index=True)
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False, index=True)
    embedding = Column(Vector(1024), nullable=True)  # 1024-dim for Naver clir-emb-dolphin
    chunk_metadata = Column('metadata', JSONB, nullable=True, default={})
    
    # Relationships
    workspace = relationship("Workspace", back_populates="document_chunks")
    document = relationship("Document", back_populates="chunks")
    
    __table_args__ = (
        CheckConstraint('chunk_index >= 0', name='check_chunk_index_positive'),
        CheckConstraint("length(chunk_text) > 0", name='check_chunk_text_not_empty'),
    )


class Conversation(BaseModel, UUIDMixin):
    """Conversation/Chat history for short-term memory"""
    
    __tablename__ = 'conversations'
    
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)
    session_id = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    intent = Column(String, nullable=True, index=True)
    agent_used = Column(String, nullable=True, index=True)
    confidence_score = Column(Numeric(3, 2), nullable=True)
    conversation_metadata = Column('metadata', JSONB, nullable=True, default={})
    timestamp = Column(DateTime, nullable=False, index=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="conversations")
    agent_actions = relationship("AgentAction", back_populates="conversation")
    hitl_feedbacks = relationship("HITLFeedback", back_populates="conversation")
    
    __table_args__ = (
        CheckConstraint(
            "role IN ('user', 'assistant', 'system')",
            name='check_role_valid'
        ),
        CheckConstraint(
            "confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)",
            name='check_confidence_score_range'
        ),
    )


class LongTermMemory(BaseModel, UUIDMixin, TimestampMixin):
    """Long-term memory for learned knowledge"""
    
    __tablename__ = 'long_term_memory'
    
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False, index=True)
    knowledge_type = Column(String, nullable=False, index=True)  # decision, pattern, preference, etc.
    key = Column(String, nullable=False, index=True)
    value = Column(Text, nullable=False)
    source = Column(String, nullable=False, index=True)  # hitl_confirmation, document, inference, etc.
    confidence_score = Column(Numeric(3, 2), nullable=False, default=0.80)
    access_count = Column(Integer, nullable=False, default=0, index=True)
    last_accessed_at = Column(DateTime, nullable=True)
    memory_metadata = Column('metadata', JSONB, nullable=True, default={})
    
    # Relationships
    workspace = relationship("Workspace", back_populates="long_term_memories")
    hitl_feedbacks = relationship("HITLFeedback", back_populates="learned_knowledge")
    
    __table_args__ = (
        CheckConstraint(
            "confidence_score >= 0 AND confidence_score <= 1",
            name='check_ltm_confidence_range'
        ),
        CheckConstraint(
            "access_count >= 0",
            name='check_access_count_positive'
        ),
    )


class AgentAction(BaseModel, UUIDMixin):
    """Agent action audit log"""
    
    __tablename__ = 'agent_actions'
    
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False, index=True)
    conversation_id = Column(String, ForeignKey('conversations.id'), nullable=True, index=True)
    agent_name = Column(String, nullable=False, index=True)  # orchestrator, task_agent, etc.
    action_type = Column(String, nullable=False, index=True)  # retrieve_document, analyze_task, etc.
    input_data = Column(JSONB, nullable=True)
    output_data = Column(JSONB, nullable=True)
    success = Column(Boolean, nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    action_metadata = Column('metadata', JSONB, nullable=True, default={})
    timestamp = Column(DateTime, nullable=False, index=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="agent_actions")
    conversation = relationship("Conversation", back_populates="agent_actions")
    
    __table_args__ = (
        CheckConstraint(
            "execution_time_ms IS NULL OR execution_time_ms >= 0",
            name='check_execution_time_positive'
        ),
    )


class HITLFeedback(BaseModel, UUIDMixin):
    """Human-in-the-loop feedback"""
    
    __tablename__ = 'hitl_feedback'
    
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False, index=True)
    conversation_id = Column(String, ForeignKey('conversations.id'), nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)
    feedback_type = Column(String, nullable=False, index=True)  # confirmation, approval, correction, etc.
    question = Column(Text, nullable=False)
    user_response = Column(Text, nullable=True)
    approved = Column(Boolean, nullable=True, index=True)
    original_suggestion = Column(Text, nullable=True)
    corrected_value = Column(Text, nullable=True)
    processed = Column(Boolean, nullable=False, default=False, index=True)
    learned_knowledge_id = Column(String, ForeignKey('long_term_memory.id'), nullable=True)
    feedback_metadata = Column('metadata', JSONB, nullable=True, default={})
    created_at = Column(DateTime, nullable=False, index=True)  # Only created_at, no updated_at
    processed_at = Column(DateTime, nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="hitl_feedbacks")
    conversation = relationship("Conversation", back_populates="hitl_feedbacks")
    learned_knowledge = relationship("LongTermMemory", back_populates="hitl_feedbacks")
    
    __table_args__ = (
        CheckConstraint(
            "feedback_type IN ('confirmation', 'approval', 'correction', 'preference', 'clarification')",
            name='check_feedback_type_valid'
        ),
    )
