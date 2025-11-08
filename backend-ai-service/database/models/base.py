"""
SQLAlchemy Base and Common Mixins
"""

from datetime import datetime
from typing import Any
import uuid

from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.orm import DeclarativeMeta

# Create base class for all models
Base: DeclarativeMeta = declarative_base()


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps"""
    
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now()
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow
    )


class UUIDMixin:
    """Mixin for UUID primary key"""
    
    id = Column(
        String,
        primary_key=True,
        nullable=False,
        default=lambda: str(uuid.uuid4())
    )


class WorkspaceMixin:
    """Mixin for workspace_id foreign key"""
    
    @declared_attr
    def workspace_id(cls):
        return Column(
            String,
            nullable=False,
            index=True
        )


class UserMixin:
    """Mixin for user_id"""
    
    @declared_attr
    def user_id(cls):
        return Column(
            String,
            nullable=False,
            index=True
        )


def to_dict(obj: Any) -> dict:
    """Convert SQLAlchemy model instance to dictionary"""
    return {
        column.name: getattr(obj, column.name)
        for column in obj.__table__.columns
    }


class BaseModel(Base):
    """
    Base model with common functionality
    """
    __abstract__ = True
    
    def to_dict(self) -> dict:
        """Convert model to dictionary"""
        return to_dict(self)
    
    def __repr__(self) -> str:
        """String representation"""
        attrs = ', '.join(
            f"{key}={value!r}"
            for key, value in self.to_dict().items()
            if not key.startswith('_')
        )
        return f"{self.__class__.__name__}({attrs})"
