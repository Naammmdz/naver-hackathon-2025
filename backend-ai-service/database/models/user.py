"""
User model for authentication and user management.
"""

from sqlalchemy import Column, String, DateTime, Text
from database.models.base import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True, index=True)
    avatar_url = Column(String, nullable=True)
    username = Column(String, unique=False, nullable=True, index=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    user_metadata = Column(Text, nullable=True)  # Renamed from 'metadata' to avoid conflict with SQLAlchemy Base.metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
