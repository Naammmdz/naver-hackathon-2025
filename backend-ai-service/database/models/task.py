"""
Task and related models
"""

from datetime import datetime

from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database.models.base import BaseModel, UUIDMixin, TimestampMixin


class Task(BaseModel, UUIDMixin, TimestampMixin):
    """Task model"""
    
    __tablename__ = 'tasks'
    
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, index=True)  # Todo, In_Progress, Completed, etc.
    priority = Column(String, nullable=False, index=True)  # Low, Medium, High
    due_date = Column(DateTime, nullable=True, index=True)
    assignee_id = Column(String, nullable=True, index=True)
    order_index = Column(Integer, nullable=False, index=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="tasks")
    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete-orphan")
    tags = relationship("TaskTag", back_populates="task", cascade="all, delete-orphan")
    task_docs = relationship("TaskDoc", back_populates="task", cascade="all, delete-orphan")


class Subtask(BaseModel, UUIDMixin):
    """Subtask/checklist item model"""
    
    __tablename__ = 'subtasks'
    
    task_id = Column(String, ForeignKey('tasks.id'), nullable=False, index=True)
    title = Column(String, nullable=False)
    done = Column(Boolean, nullable=False, default=False)
    
    # Relationships
    task = relationship("Task", back_populates="subtasks")


class TaskTag(BaseModel):
    """Task tag model"""
    
    __tablename__ = 'task_tags'
    __table_args__ = {'extend_existing': True}
    
    task_id = Column(String, ForeignKey('tasks.id'), primary_key=True, nullable=False, index=True)
    tag = Column(String, primary_key=True, nullable=True, index=True)
    
    # Relationships
    task = relationship("Task", back_populates="tags")


class TaskDoc(BaseModel, UUIDMixin):
    """Task-Document link model"""
    
    __tablename__ = 'task_docs'
    
    task_id = Column(String, ForeignKey('tasks.id'), nullable=False, index=True)
    doc_id = Column(String, ForeignKey('documents.id'), nullable=False, index=True)
    user_id = Column(String, nullable=True)
    relation_type = Column(String, nullable=True, index=True)  # reference, requirement, design, etc.
    note = Column(String, nullable=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)  # Only created_at, no updated_at
    
    # Relationships
    task = relationship("Task", back_populates="task_docs")
    document = relationship("Document", back_populates="task_docs")
