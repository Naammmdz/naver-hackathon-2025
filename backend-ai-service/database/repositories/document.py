"""
Document repository for document-specific operations
"""

from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from database.models.document import Document, Board
from database.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    """Repository for Document operations"""
    
    def __init__(self, db: Session):
        super().__init__(Document, db)
    
    def get_by_workspace(self, workspace_id: str, skip: int = 0, limit: int = 100) -> List[Document]:
        """Get all documents in a workspace"""
        return (
            self.db.query(Document)
            .filter(Document.workspace_id == workspace_id, Document.trashed == False)
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_user(self, user_id: str, workspace_id: Optional[str] = None) -> List[Document]:
        """Get all documents created by a user"""
        query = self.db.query(Document).filter(Document.user_id == user_id, Document.trashed == False)
        if workspace_id:
            query = query.filter(Document.workspace_id == workspace_id)
        return query.all()
    
    def get_trashed(self, workspace_id: str) -> List[Document]:
        """Get all trashed documents in a workspace"""
        return (
            self.db.query(Document)
            .filter(Document.workspace_id == workspace_id, Document.trashed == True)
            .all()
        )
    
    def get_root_documents(self, workspace_id: str) -> List[Document]:
        """Get all root-level documents (no parent)"""
        return (
            self.db.query(Document)
            .filter(
                Document.workspace_id == workspace_id,
                Document.parent_id == None,
                Document.trashed == False
            )
            .all()
        )
    
    def get_document_with_children(self, document_id: str) -> Optional[Document]:
        """Get document with all children loaded"""
        return (
            self.db.query(Document)
            .options(joinedload(Document.children))
            .filter(Document.id == document_id)
            .first()
        )
    
    def get_document_with_chunks(self, document_id: str) -> Optional[Document]:
        """Get document with all chunks loaded"""
        return (
            self.db.query(Document)
            .options(joinedload(Document.chunks))
            .filter(Document.id == document_id)
            .first()
        )
    
    def trash_document(self, document_id: str) -> Optional[Document]:
        """Move document to trash"""
        from datetime import datetime
        document = self.get_by_id(document_id)
        if document:
            document.trashed = True
            document.trashed_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(document)
        return document
    
    def restore_document(self, document_id: str) -> Optional[Document]:
        """Restore document from trash"""
        document = self.get_by_id(document_id)
        if document:
            document.trashed = False
            document.trashed_at = None
            self.db.commit()
            self.db.refresh(document)
        return document
    
    def permanent_delete(self, document_id: str) -> bool:
        """Permanently delete a document (must be trashed first)"""
        document = self.get_by_id(document_id)
        if document and document.trashed:
            self.db.delete(document)
            self.db.commit()
            return True
        return False
    
    def search_documents(self, workspace_id: str, query: str) -> List[Document]:
        """Search documents by title/content"""
        return (
            self.db.query(Document)
            .filter(
                Document.workspace_id == workspace_id,
                Document.trashed == False,
                or_(
                    Document.title.ilike(f'%{query}%'),
                    Document.content.ilike(f'%{query}%')
                )
            )
            .all()
        )
    
    def get_children(self, parent_id: str) -> List[Document]:
        """Get all child documents of a parent"""
        return (
            self.db.query(Document)
            .filter(Document.parent_id == parent_id, Document.trashed == False)
            .all()
        )
