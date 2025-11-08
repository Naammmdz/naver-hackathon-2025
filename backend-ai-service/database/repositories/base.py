"""
Base repository with common CRUD operations
"""

from typing import Generic, TypeVar, Type, Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.models.base import BaseModel

ModelType = TypeVar('ModelType', bound=BaseModel)


class BaseRepository(Generic[ModelType]):
    """Base repository with generic CRUD operations"""
    
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db
    
    def create(self, **kwargs) -> ModelType:
        """Create a new record"""
        instance = self.model(**kwargs)
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance
    
    def get_by_id(self, id: str) -> Optional[ModelType]:
        """Get a record by ID"""
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Get all records with pagination"""
        return self.db.query(self.model).offset(skip).limit(limit).all()
    
    def get_by_filter(self, filters: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Get records by filter criteria"""
        query = self.db.query(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key):
                query = query.filter(getattr(self.model, key) == value)
        return query.offset(skip).limit(limit).all()
    
    def update(self, id: str, **kwargs) -> Optional[ModelType]:
        """Update a record by ID"""
        instance = self.get_by_id(id)
        if instance:
            for key, value in kwargs.items():
                if hasattr(instance, key):
                    setattr(instance, key, value)
            self.db.commit()
            self.db.refresh(instance)
        return instance
    
    def delete(self, id: str) -> bool:
        """Delete a record by ID"""
        instance = self.get_by_id(id)
        if instance:
            self.db.delete(instance)
            self.db.commit()
            return True
        return False
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters"""
        query = self.db.query(func.count(self.model.id))
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.filter(getattr(self.model, key) == value)
        return query.scalar()
    
    def exists(self, id: str) -> bool:
        """Check if a record exists by ID"""
        return self.db.query(self.model.id).filter(self.model.id == id).first() is not None
    
    def bulk_create(self, items: List[Dict[str, Any]]) -> List[ModelType]:
        """Bulk create multiple records"""
        instances = [self.model(**item) for item in items]
        self.db.add_all(instances)
        self.db.commit()
        for instance in instances:
            self.db.refresh(instance)
        return instances
