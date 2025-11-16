"""
Document Management Endpoints

Provides APIs for uploading, ingesting, and managing documents.
"""

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import sys
from pathlib import Path
import tempfile
import os

if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.connection import get_db_session
from database.models import Document
from database.repositories import DocumentRepository, WorkspaceRepository
from scripts.ingest_documents import ingest_single_document
from utils.logger import get_logger
from sqlalchemy.orm import Session

logger = get_logger(__name__)
router = APIRouter()


# Dependency
def get_db():
    """Get database session"""
    db = get_db_session()
    try:
        yield db
    finally:
        db.close()


# Response Models
class DocumentResponse(BaseModel):
    """Document response"""
    document_id: str
    workspace_id: Optional[str]
    title: str
    content: Optional[str] = None
    total_chunks: int
    trashed: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Document list response"""
    documents: List[DocumentResponse]
    total: int
    page: int
    page_size: int


class DocumentStats(BaseModel):
    """Document statistics"""
    total_documents: int
    total_chunks: int
    total_size_bytes: int
    documents_by_type: dict


class IngestResponse(BaseModel):
    """Document ingest response"""
    document_id: str
    title: str
    chunks_created: int
    status: str
    message: str


# Endpoints
@router.post(
    "/workspaces/{workspace_id}/documents/upload",
    response_model=IngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and Ingest Document",
    description="Upload a document file and automatically ingest it into the workspace"
)
async def upload_document(
    workspace_id: str,
    file: UploadFile = File(..., description="Document file to upload"),
    title: Optional[str] = Form(None, description="Custom document title"),
    db: Session = Depends(get_db)
):
    """
    Upload and ingest a document
    
    Supported formats: PDF, DOCX, TXT, MD, HTML
    
    Args:
        workspace_id: Target workspace ID
        file: Document file
        title: Custom title (optional, uses filename if not provided)
        
    Returns:
        Ingestion result with document ID and chunk count
    """
    try:
        # Verify workspace exists
        workspace_repo = WorkspaceRepository(db)
        workspace = workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace {workspace_id} not found"
            )
        
        # Save uploaded file to temp location
        suffix = Path(file.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            # Ingest document
            doc_title = title or Path(file.filename).stem
            
            logger.info(f"Ingesting document: {file.filename} into workspace {workspace_id}")
            
            result = ingest_single_document(
                file_path=tmp_path,
                workspace_id=workspace_id,
                title=doc_title,
                db=db
            )
            
            return IngestResponse(
                document_id=result['document_id'],
                title=result['title'],
                chunks_created=result['chunks_created'],
                status="success",
                message=f"Successfully ingested {result['chunks_created']} chunks"
            )
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}"
        )


@router.get(
    "/workspaces/{workspace_id}/documents",
    response_model=DocumentListResponse,
    summary="List Documents",
    description="List all documents in a workspace"
)
async def list_documents(
    workspace_id: str,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db)
):
    """
    List documents in workspace
    
    Args:
        workspace_id: Workspace identifier
        page: Page number (1-indexed)
        page_size: Number of items per page
        
    Returns:
        Paginated list of documents
    """
    try:
        # Verify workspace exists
        workspace_repo = WorkspaceRepository(db)
        workspace = workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace {workspace_id} not found"
            )
        
        doc_repo = DocumentRepository(db)
        
        # Get documents with pagination
        offset = (page - 1) * page_size
        all_documents = doc_repo.get_by_workspace(workspace_id)
        
        # Manual pagination
        documents = all_documents[offset:offset + page_size]
        total = len(all_documents)
        
        # Get chunk counts
        from database.repositories import DocumentChunkRepository
        chunk_repo = DocumentChunkRepository(db)
        
        doc_responses = []
        for doc in documents:
            chunk_count = chunk_repo.count_by_document(doc.id)
            doc_responses.append(DocumentResponse(
                document_id=doc.id,
                workspace_id=doc.workspace_id,
                title=doc.title,
                content=doc.content[:100] if doc.content else None,  # First 100 chars
                total_chunks=chunk_count,
                trashed=doc.trashed,
                created_at=doc.created_at,
                updated_at=doc.updated_at
            ))
        
        return DocumentListResponse(
            documents=doc_responses,
            total=total,
            page=page,
            page_size=page_size
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list documents: {str(e)}"
        )


@router.get(
    "/workspaces/{workspace_id}/documents/stats",
    response_model=DocumentStats,
    summary="Get Document Statistics",
    description="Get statistics about documents in workspace"
)
async def get_document_stats(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """
    Get document statistics
    
    Args:
        workspace_id: Workspace identifier
        
    Returns:
        Document statistics including counts and sizes
    """
    try:
        # Verify workspace exists
        workspace_repo = WorkspaceRepository(db)
        workspace = workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace {workspace_id} not found"
            )
        
        doc_repo = DocumentRepository(db)
        documents = doc_repo.get_by_workspace(workspace_id)
        
        # Calculate stats
        total_documents = len(documents)
        total_size = sum(len(doc.content or '') for doc in documents)  # Total content length
        
        # Count by status (since we don't have source_type in current schema)
        docs_by_type = {}
        for doc in documents:
            doc_type = "trashed" if doc.trashed else "active"
            docs_by_type[doc_type] = docs_by_type.get(doc_type, 0) + 1
        
        # Count total chunks
        from database.repositories import DocumentChunkRepository
        chunk_repo = DocumentChunkRepository(db)
        total_chunks = sum(
            chunk_repo.count_by_document(doc.id)
            for doc in documents
        )
        
        return DocumentStats(
            total_documents=total_documents,
            total_chunks=total_chunks,
            total_size_bytes=total_size,
            documents_by_type=docs_by_type
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get document stats: {str(e)}"
        )


@router.get(
    "/workspaces/{workspace_id}/documents/{document_id}",
    response_model=DocumentResponse,
    summary="Get Document",
    description="Get document information by ID"
)
async def get_document(
    workspace_id: str,
    document_id: str,
    db: Session = Depends(get_db)
):
    """
    Get document by ID
    
    Args:
        workspace_id: Workspace identifier
        document_id: Document identifier
        
    Returns:
        Document information
    """
    try:
        doc_repo = DocumentRepository(db)
        document = doc_repo.get_by_id(document_id)
        
        if not document or document.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found in workspace {workspace_id}"
            )
        
        # Get chunk count
        from database.repositories import DocumentChunkRepository
        chunk_repo = DocumentChunkRepository(db)
        chunk_count = chunk_repo.count_by_document(document_id)
        
        return DocumentResponse(
            document_id=document.id,
            workspace_id=document.workspace_id,
            title=document.title,
            content=document.content[:200] if document.content else None,
            total_chunks=chunk_count,
            trashed=document.trashed,
            created_at=document.created_at,
            updated_at=document.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get document: {str(e)}"
        )


@router.delete(
    "/workspaces/{workspace_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Document",
    description="Delete a document and all its chunks"
)
async def delete_document(
    workspace_id: str,
    document_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete document
    
    Args:
        workspace_id: Workspace identifier
        document_id: Document identifier
    """
    try:
        doc_repo = DocumentRepository(db)
        document = doc_repo.get_by_id(document_id)
        
        if not document or document.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found in workspace {workspace_id}"
            )
        
        # Delete document (cascade will handle chunks)
        doc_repo.delete(document_id)
        
        logger.info(f"Deleted document: {document_id} from workspace {workspace_id}")
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )
