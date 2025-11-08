"""
Workspace and related models
"""

from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database.models.base import BaseModel, UUIDMixin, TimestampMixin


class Workspace(BaseModel, UUIDMixin, TimestampMixin):
    """Workspace/Project model"""
    
    __tablename__ = 'workspaces'
    
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    owner_id = Column(String, nullable=False)
    is_public = Column(Boolean, nullable=True)
    allow_invites = Column(Boolean, nullable=True)
    default_task_view = Column(String, nullable=True)
    default_document_view = Column(String, nullable=True)
    
    # Relationships
    tasks = relationship("Task", back_populates="workspace", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="workspace", cascade="all, delete-orphan")
    boards = relationship("Board", back_populates="workspace", cascade="all, delete-orphan")
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    invites = relationship("WorkspaceInvite", back_populates="workspace", cascade="all, delete-orphan")
    
    # AI-related relationships
    document_chunks = relationship("DocumentChunk", back_populates="workspace", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="workspace", cascade="all, delete-orphan")
    long_term_memories = relationship("LongTermMemory", back_populates="workspace", cascade="all, delete-orphan")
    agent_actions = relationship("AgentAction", back_populates="workspace", cascade="all, delete-orphan")
    hitl_feedbacks = relationship("HITLFeedback", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(BaseModel, UUIDMixin):
    """Workspace member model"""
    
    __tablename__ = 'workspace_members'
    
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False)  # owner, admin, member, viewer
    joined_at = Column(DateTime, nullable=False)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="members")


class WorkspaceInvite(BaseModel, UUIDMixin):
    """Workspace invite model"""
    
    __tablename__ = 'workspace_invites'
    
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    invited_by = Column(String, nullable=False)
    role = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)  # Only created_at, no updated_at
    
    # Relationships
    workspace = relationship("Workspace", back_populates="invites")
