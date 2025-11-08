"""
Document and related models
"""

from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database.models.base import BaseModel, UUIDMixin, TimestampMixin


class Document(BaseModel, UUIDMixin, TimestampMixin):
    """Document model"""
    
    __tablename__ = 'documents'
    
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    parent_id = Column(String, ForeignKey('documents.id'), nullable=True, index=True)  # For hierarchical structure
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    trashed = Column(Boolean, nullable=False, default=False, index=True)
    trashed_at = Column(DateTime, nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="documents")
    task_docs = relationship("TaskDoc", back_populates="document", cascade="all, delete-orphan")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    
    # Self-referential for hierarchy (parent relationship is the many-to-one side)
    parent = relationship(
        "Document",
        remote_side="Document.id",
        backref="children"
    )


class Board(BaseModel, UUIDMixin, TimestampMixin):
    """Board/Visualization model"""
    
    __tablename__ = 'boards'
    
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    snapshot = Column(String, nullable=True)  # OID type mapped to String
    
    # Relationships
    workspace = relationship("Workspace", back_populates="boards")
