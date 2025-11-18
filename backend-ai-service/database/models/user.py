"""
User Model

Stores user information for readable display names.
"""

from sqlalchemy import Column, String, DateTime
from datetime import datetime
from database.models.base import Base


class User(Base):
    """User model for storing user information"""
    
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, comment="Clerk user ID")
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False, index=True, comment="Display name")
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f"<User(id='{self.id}', name='{self.name}', email='{self.email}')>"
