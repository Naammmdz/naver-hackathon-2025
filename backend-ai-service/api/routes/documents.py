"""
Document Management Endpoints

Provides APIs for uploading, ingesting, and managing documents.
"""

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import sys
from pathlib import Path
import tempfile
import os
import yaml

if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.connection import get_db_session
from database.models import Document, DocumentChunk
from database.repositories import DocumentRepository, WorkspaceRepository, DocumentChunkRepository
from scripts.ingest_documents import ingest_single_document
from data_preprocessing.parsing import ParserFactory
from data_preprocessing.chunking import ChunkerFactory
from data_preprocessing.embedding import EmbeddingFactory
from utils.logger import get_logger
from sqlalchemy.orm import Session

logger = get_logger(__name__)
router = APIRouter()


# Helper functions
def load_config() -> Dict[str, Any]:
    """Load configuration from config.yml"""
    config_path = Path(__file__).parent.parent.parent / 'config.yml'
    with open(config_path) as f:
        return yaml.safe_load(f)


def index_document_content(
    document_id: str,
    workspace_id: str,
    content: str,
    title: str,
    db: Session
) -> Dict[str, Any]:
    """
    Index user-authored document content.
    
    This function:
    1. Deletes existing chunks for the document
    2. Parses the markdown/text content
    3. Chunks the text
    4. Generates embeddings
    5. Stores chunks in database
    
    Args:
        document_id: Document ID
        workspace_id: Workspace ID
        content: Document content (markdown/text)
        title: Document title
        db: Database session
    
    Returns:
        Dict with indexing results
    """
    import time
    start_time = time.time()
    
    try:
        # Delete old chunks
        db.query(DocumentChunk).filter_by(document_id=document_id).delete()
        db.commit()
        
        # Load config
        config = load_config()
        
        # Parse markdown content
        parser = ParserFactory.create_parser('markdown', config)
        parse_result = parser.parse(content)
        
        if not parse_result.success:
            raise Exception(f"Parsing failed: {parse_result.error}")
        
        # Chunk text
        chunking_config = config.get('data_preprocessing', {}).get('chunking', {})
        chunker = ChunkerFactory.create_chunker(
            method=chunking_config.get('method', 'paragraph'),
            chunk_size=chunking_config.get('chunk_size', 768),
            overlap=chunking_config.get('overlap', 50)
        )
        chunks = chunker.chunk(parse_result.text)
        
        if not chunks:
            logger.warning(f"No chunks created for document {document_id}")
            return {
                'success': True,
                'chunks_created': 0,
                'embedding_dimensions': 0,
                'processing_time': time.time() - start_time
            }
        
        # Generate embeddings
        embedding_config = config.get('data_preprocessing', {}).get('embedding', {})
        provider = embedding_config.get('provider', 'huggingface')
        
        embedder = EmbeddingFactory.create_embedder(
            provider=provider,
            config=config
        )
        
        chunk_texts = [c.text for c in chunks]
        embedding_result = embedder.embed_batch(chunk_texts)
        
        # Store chunks
        for i, (chunk, embedding) in enumerate(zip(chunks, embedding_result.embeddings)):
            chunk_record = DocumentChunk(
                document_id=document_id,
                workspace_id=workspace_id,
                chunk_index=i,
                chunk_text=chunk.text,
                embedding=embedding.tolist(),
                metadata={
                    'start_char': chunk.metadata.get('start_index', 0),
                    'end_char': chunk.metadata.get('end_index', len(chunk.text)),
                    'source': 'user_authored',
                    'method': chunking_config.get('method', 'paragraph')
                }
            )
            db.add(chunk_record)
        
        db.commit()
        
        processing_time = time.time() - start_time
        logger.info(f"✅ Indexed document {document_id}: {len(chunks)} chunks in {processing_time:.2f}s")
        
        return {
            'success': True,
            'chunks_created': len(chunks),
            'embedding_dimensions': len(embedding_result.embeddings[0]) if chunks else 0,
            'processing_time': processing_time
        }
        
    except Exception as e:
        logger.error(f"❌ Error indexing content for {document_id}: {e}", exc_info=True)
        db.rollback()
        return {
            'success': False,
            'chunks_created': 0,
            'error': str(e)
        }


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


class DocumentUpdateRequest(BaseModel):
    """Request model for updating document content"""
    title: Optional[str] = Field(None, description="Document title")
    content: Optional[str] = Field(None, description="Document content (markdown/text)")
    icon: Optional[str] = Field(None, description="Document icon")
    parent_id: Optional[str] = Field(None, description="Parent document ID for hierarchy")


class DocumentUpdateResponse(BaseModel):
    """Response for document update"""
    document_id: str
    title: str
    content_length: int
    indexed: bool
    chunks_created: int
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


@router.put(
    "/workspaces/{workspace_id}/documents/{document_id}",
    response_model=DocumentUpdateResponse,
    summary="Update Document",
    description="Update document content with automatic indexing"
)
async def update_document(
    workspace_id: str,
    document_id: str,
    request: DocumentUpdateRequest,
    auto_index: bool = Query(default=True, description="Auto-index content for RAG"),
    db: Session = Depends(get_db)
):
    """
    Update document and optionally index its content.
    
    Args:
        workspace_id: Workspace ID
        document_id: Document ID
        request: Update payload (title, content, icon, parent_id)
        auto_index: Auto-index content for RAG (default: True)
    
    Returns:
        Updated document with indexing status
    """
    try:
        # Get document
        doc_repo = DocumentRepository(db)
        document = doc_repo.get_by_id(document_id)
        
        if not document or document.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found in workspace {workspace_id}"
            )
        
        # Update fields
        updated = False
        if request.title is not None:
            document.title = request.title
            updated = True
        if request.content is not None:
            document.content = request.content
            updated = True
        if request.icon is not None:
            document.icon = request.icon
            updated = True
        if request.parent_id is not None:
            document.parent_id = request.parent_id
            updated = True
        
        if updated:
            document.updated_at = datetime.utcnow()
            db.commit()
        
        # Index content if requested and content exists
        indexing_result = None
        should_index = (
            auto_index and 
            document.content and 
            len(document.content.strip()) > 50  # Minimum content length
        )
        
        if should_index:
            logger.info(f"Auto-indexing document {document_id}...")
            indexing_result = await run_in_threadpool(
                index_document_content,
                document_id=document_id,
                workspace_id=workspace_id,
                content=document.content,
                title=document.title,
                db=db
            )
        
        chunks_created = 0
        if indexing_result and indexing_result.get('success'):
            chunks_created = indexing_result.get('chunks_created', 0)
        
        return DocumentUpdateResponse(
            document_id=document.id,
            title=document.title,
            content_length=len(document.content or ''),
            indexed=chunks_created > 0,
            chunks_created=chunks_created,
            message=f"Document updated{'and indexed' if chunks_created > 0 else ''}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update document: {str(e)}"
        )


@router.post(
    "/workspaces/{workspace_id}/documents/{document_id}/reindex",
    summary="Re-index Document",
    description="Manually re-index a user-authored document"
)
async def reindex_document(
    workspace_id: str,
    document_id: str,
    db: Session = Depends(get_db)
):
    """
    Manually re-index a user-authored document.
    
    Useful for:
    - Changing chunking strategy
    - Re-indexing after config changes
    - Fixing indexing issues
    
    Args:
        workspace_id: Workspace ID
        document_id: Document ID
    
    Returns:
        Indexing result
    """
    try:
        # Get document
        doc_repo = DocumentRepository(db)
        document = doc_repo.get_by_id(document_id)
        
        if not document or document.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found"
            )
        
        if not document.content or len(document.content.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document has no content to index"
            )
        
        logger.info(f"Manually re-indexing document {document_id}...")
        
        result = await run_in_threadpool(
            index_document_content,
            document_id=document_id,
            workspace_id=workspace_id,
            content=document.content,
            title=document.title,
            db=db
        )
        
        if result['success']:
            return {
                "message": f"Document re-indexed: {result['chunks_created']} chunks",
                "document_id": document_id,
                "chunks_created": result['chunks_created'],
                "processing_time": result['processing_time']
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Indexing failed')
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error re-indexing document: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to re-index document: {str(e)}"
        )


@router.post(
    "/workspaces/{workspace_id}/documents/reindex-all",
    summary="Batch Re-index All Documents",
    description="Re-index all user-authored documents in workspace"
)
async def reindex_all_documents(
    workspace_id: str,
    filter_empty: bool = Query(default=True, description="Skip documents with no content"),
    db: Session = Depends(get_db)
):
    """
    Re-index all user-authored documents in workspace.
    
    Useful for:
    - After config changes (chunking strategy, embedding model)
    - Bulk migration of existing documents
    - Fixing indexing issues across workspace
    
    Args:
        workspace_id: Workspace ID
        filter_empty: Skip documents with empty/minimal content
    
    Returns:
        Batch indexing results
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
        
        # Get all documents in workspace
        doc_repo = DocumentRepository(db)
        query = db.query(Document).filter_by(workspace_id=workspace_id)
        
        if filter_empty:
            # Filter out documents with no content or very short content
            query = query.filter(
                Document.content != None,
                Document.content != ''
            )
        
        documents = query.all()
        
        if not documents:
            return {
                "message": "No documents found to index",
                "total_documents": 0,
                "successful": 0,
                "failed": 0,
                "total_chunks": 0,
                "details": []
            }
        
        logger.info(f"Batch re-indexing {len(documents)} documents in workspace {workspace_id}...")
        
        # Process each document
        results = []
        for doc in documents:
            # Skip if content too short
            if filter_empty and len(doc.content.strip() if doc.content else '') < 10:
                results.append({
                    'document_id': doc.id,
                    'title': doc.title,
                    'success': False,
                    'chunks_created': 0,
                    'error': 'Content too short'
                })
                continue
            
            # Index document
            result = await run_in_threadpool(
                index_document_content,
                document_id=doc.id,
                workspace_id=workspace_id,
                content=doc.content,
                title=doc.title,
                db=db
            )
            
            results.append({
                'document_id': doc.id,
                'title': doc.title,
                'success': result['success'],
                'chunks_created': result.get('chunks_created', 0),
                'error': result.get('error')
            })
        
        # Calculate stats
        success_count = sum(1 for r in results if r['success'])
        failed_count = len(results) - success_count
        total_chunks = sum(r['chunks_created'] for r in results)
        
        logger.info(
            f"Batch re-index complete: {success_count}/{len(documents)} successful, "
            f"{total_chunks} total chunks"
        )
        
        return {
            "message": f"Re-indexed {success_count}/{len(documents)} documents",
            "total_documents": len(documents),
            "successful": success_count,
            "failed": failed_count,
            "total_chunks": total_chunks,
            "details": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch re-index: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to batch re-index: {str(e)}"
        )
