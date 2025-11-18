"""
Document Indexing Endpoints

Provides APIs for document indexing pipeline:
- Upload documents (single/batch)
- Parse, chunk, embed documents
- Store to vector database
- Re-index with different strategies
- Manage indexed documents
"""

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import sys
from pathlib import Path
import tempfile
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor

if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.connection import get_db_session
from database.models import Document, DocumentChunk
from database.repositories import DocumentRepository, DocumentChunkRepository, WorkspaceRepository
from data_preprocessing.parsing import ParserFactory
from data_preprocessing.chunking import ChunkerFactory
from data_preprocessing.embedding import EmbeddingFactory
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


# Request/Response Models
class IndexRequest(BaseModel):
    """Document index request"""
    workspace_id: str = Field(..., description="Workspace ID")
    chunking_strategy: str = Field(
        default="paragraph",
        description="Chunking strategy: paragraph, fixed, semantic, hierarchical"
    )
    chunk_size: int = Field(default=768, description="Target chunk size in characters")
    chunk_overlap: int = Field(default=50, description="Overlap between chunks")
    embedding_provider: str = Field(
        default="huggingface",
        description="Embedding provider: huggingface, naver"
    )
    embedding_model: Optional[str] = Field(
        default=None,
        description="Specific embedding model (optional)"
    )


class IndexResponse(BaseModel):
    """Document index response"""
    document_id: str
    title: str
    file_size_bytes: int
    chunks_created: int
    embedding_dimensions: int
    chunking_strategy: str
    processing_time_seconds: float
    status: str
    message: str


class ChunkResponse(BaseModel):
    """Document chunk response"""
    chunk_id: str
    document_id: str
    chunk_index: int
    text: str
    text_length: int
    start_char: Optional[int]
    end_char: Optional[int]
    metadata: Optional[Dict[str, Any]]
    embedding_model: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentChunksResponse(BaseModel):
    """Document chunks list response"""
    document_id: str
    document_title: str
    total_chunks: int
    chunks: List[ChunkResponse]


class BatchIndexResponse(BaseModel):
    """Batch index response"""
    total_files: int
    successful: int
    failed: int
    results: List[IndexResponse]
    total_processing_time_seconds: float


class ReindexRequest(BaseModel):
    """Re-index request"""
    chunking_strategy: str = Field(
        default="paragraph",
        description="New chunking strategy"
    )
    chunk_size: int = Field(default=768, description="New chunk size")
    chunk_overlap: int = Field(default=50, description="New chunk overlap")
    embedding_provider: str = Field(
        default="huggingface",
        description="Embedding provider"
    )


# Helper Functions
def process_document_indexing(
    file_path: Path,
    workspace_id: str,
    title: str,
    chunking_strategy: str,
    chunk_size: int,
    chunk_overlap: int,
    embedding_provider: str,
    embedding_model: Optional[str],
    db: Session
) -> Dict[str, Any]:
    """
    Process document indexing pipeline.
    
    Steps:
    1. Parse document
    2. Chunk text
    3. Generate embeddings
    4. Store to database
    
    Returns:
        Dict with processing results
    """
    import time
    start_time = time.time()
    
    try:
        # 1. Parse document
        logger.info(f"📄 Parsing document: {file_path.name}")
        parser = ParserFactory.create_parser(parser_type='docling')
        parse_result = parser.parse(str(file_path))
        
        if not parse_result.success:
            raise Exception(f"Parsing failed: {parse_result.error}")
        
        logger.info(f"✅ Parsed {len(parse_result.text)} characters")
        
        # 2. Chunk text
        logger.info(f"✂️  Chunking with strategy: {chunking_strategy}")
        chunker = ChunkerFactory.create_chunker(
            method=chunking_strategy,
            chunk_size=chunk_size,
            overlap=chunk_overlap
        )
        chunks = chunker.chunk(parse_result.text)
        logger.info(f"✅ Generated {len(chunks)} chunks")
        
        # 3. Generate embeddings
        logger.info(f"🧮 Generating embeddings with provider: {embedding_provider}")
        embedder_kwargs = {"provider": embedding_provider}
        if embedding_model:
            embedder_kwargs["model_name"] = embedding_model
        
        embedder = EmbeddingFactory.create_embedder(**embedder_kwargs)
        chunk_texts = [chunk.text for chunk in chunks]
        embedding_result = embedder.embed_batch(chunk_texts)
        logger.info(f"✅ Generated embeddings with {embedding_result.dimensions} dimensions")
        
        # 4. Store to database
        logger.info(f"💾 Storing document and chunks to database")
        
        # Create document record
        doc_repo = DocumentRepository(db)
        document = doc_repo.create(
            workspace_id=workspace_id,
            user_id="api-user",  # TODO: Get from auth
            title=title,
            content=parse_result.text[:5000],  # Store first 5000 chars as preview
            trashed=False
        )
        
        # Create chunk records
        chunk_repo = DocumentChunkRepository(db)
        for i, (chunk, embedding) in enumerate(zip(chunks, embedding_result.embeddings)):
            chunk_repo.create(
                document_id=document.id,
                chunk_index=i,
                text=chunk.text,
                start_char=chunk.start_index if hasattr(chunk, 'start_index') else None,
                end_char=chunk.end_index if hasattr(chunk, 'end_index') else None,
                embedding=embedding.tolist(),
                metadata={
                    "chunking_strategy": chunking_strategy,
                    "chunk_size": chunk_size,
                    "chunk_overlap": chunk_overlap,
                    "embedding_provider": embedding_provider,
                    "embedding_model": embedder.model_name if hasattr(embedder, 'model_name') else None,
                    "embedding_dimensions": embedding_result.dimensions
                }
            )
        
        db.commit()
        
        processing_time = time.time() - start_time
        logger.info(f"✅ Document indexed successfully in {processing_time:.2f}s")
        
        return {
            "success": True,
            "document_id": document.id,
            "title": title,
            "file_size_bytes": len(parse_result.text),
            "chunks_created": len(chunks),
            "embedding_dimensions": embedding_result.dimensions,
            "processing_time": processing_time,
            "error": None
        }
        
    except Exception as e:
        logger.error(f"❌ Error indexing document: {e}", exc_info=True)
        db.rollback()
        processing_time = time.time() - start_time
        return {
            "success": False,
            "document_id": None,
            "title": title,
            "file_size_bytes": 0,
            "chunks_created": 0,
            "embedding_dimensions": 0,
            "processing_time": processing_time,
            "error": str(e)
        }


# Endpoints
@router.post(
    "/index",
    response_model=IndexResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Index Document",
    description="Upload and index a document with custom chunking and embedding strategies"
)
async def index_document(
    file: UploadFile = File(..., description="Document file to index"),
    workspace_id: str = Form(..., description="Workspace ID"),
    title: Optional[str] = Form(None, description="Custom document title"),
    chunking_strategy: str = Form(
        default="paragraph",
        description="Chunking strategy: paragraph, fixed, semantic, hierarchical"
    ),
    chunk_size: int = Form(default=768, description="Target chunk size"),
    chunk_overlap: int = Form(default=50, description="Chunk overlap"),
    embedding_provider: str = Form(
        default="huggingface",
        description="Embedding provider: huggingface, naver"
    ),
    embedding_model: Optional[str] = Form(None, description="Specific embedding model"),
    db: Session = Depends(get_db)
):
    """
    Upload and index a document with full control over processing pipeline.
    
    **Supported formats**: PDF, DOCX, PPTX, TXT, MD, HTML
    
    **Chunking strategies**:
    - `paragraph`: Split by paragraphs (recommended)
    - `fixed`: Fixed-size chunks
    - `semantic`: Similarity-based (experimental)
    - `hierarchical`: Parent-child chunks (experimental)
    
    **Embedding providers**:
    - `huggingface`: Qwen3-Embedding-0.6B (768 dim)
    - `naver`: CLOVA Embedding (experimental)
    
    **Example**:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/documents/index" \\
      -F "file=@document.pdf" \\
      -F "workspace_id=ws_123" \\
      -F "title=My Document" \\
      -F "chunking_strategy=paragraph" \\
      -F "chunk_size=768" \\
      -F "embedding_provider=huggingface"
    ```
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
            tmp_path = Path(tmp_file.name)
        
        try:
            # Process indexing
            doc_title = title or Path(file.filename).stem
            
            logger.info(f"🚀 Starting indexing: {file.filename} -> workspace {workspace_id}")
            
            result = process_document_indexing(
                file_path=tmp_path,
                workspace_id=workspace_id,
                title=doc_title,
                chunking_strategy=chunking_strategy,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                embedding_provider=embedding_provider,
                embedding_model=embedding_model,
                db=db
            )
            
            if not result['success']:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Indexing failed: {result['error']}"
                )
            
            return IndexResponse(
                document_id=result['document_id'],
                title=result['title'],
                file_size_bytes=result['file_size_bytes'],
                chunks_created=result['chunks_created'],
                embedding_dimensions=result['embedding_dimensions'],
                chunking_strategy=chunking_strategy,
                processing_time_seconds=result['processing_time'],
                status="success",
                message=f"Successfully indexed {result['chunks_created']} chunks in {result['processing_time']:.2f}s"
            )
        finally:
            # Clean up temp file
            if tmp_path.exists():
                tmp_path.unlink()
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in index endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post(
    "/batch-index",
    response_model=BatchIndexResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Batch Index Documents",
    description="Upload and index multiple documents in parallel"
)
async def batch_index_documents(
    files: List[UploadFile] = File(..., description="Document files to index"),
    workspace_id: str = Form(..., description="Workspace ID"),
    chunking_strategy: str = Form(default="paragraph", description="Chunking strategy"),
    chunk_size: int = Form(default=768, description="Chunk size"),
    chunk_overlap: int = Form(default=50, description="Chunk overlap"),
    embedding_provider: str = Form(default="huggingface", description="Embedding provider"),
    embedding_model: Optional[str] = Form(None, description="Embedding model"),
    max_workers: int = Form(default=4, description="Max parallel workers"),
    db: Session = Depends(get_db)
):
    """
    Upload and index multiple documents in parallel.
    
    **Features**:
    - Parallel processing for faster indexing
    - Automatic error handling per file
    - Progress tracking
    - Detailed results for each file
    
    **Example**:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/documents/batch-index" \\
      -F "files=@doc1.pdf" \\
      -F "files=@doc2.pdf" \\
      -F "files=@doc3.pdf" \\
      -F "workspace_id=ws_123" \\
      -F "chunking_strategy=paragraph" \\
      -F "max_workers=4"
    ```
    """
    import time
    start_time = time.time()
    
    try:
        # Verify workspace exists
        workspace_repo = WorkspaceRepository(db)
        workspace = workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace {workspace_id} not found"
            )
        
        if len(files) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No files provided"
            )
        
        if len(files) > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 50 files per batch"
            )
        
        logger.info(f"🚀 Starting batch indexing: {len(files)} files")
        
        # Save all files to temp locations
        temp_files = []
        for file in files:
            suffix = Path(file.filename).suffix
            tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            content = await file.read()
            tmp_file.write(content)
            tmp_file.close()
            temp_files.append({
                'path': Path(tmp_file.name),
                'title': Path(file.filename).stem,
                'original_name': file.filename
            })
        
        try:
            # Process files in parallel
            results = []
            
            def process_file(file_info):
                """Process single file in thread pool"""
                # Create new db session for thread
                thread_db = get_db_session()
                try:
                    result = process_document_indexing(
                        file_path=file_info['path'],
                        workspace_id=workspace_id,
                        title=file_info['title'],
                        chunking_strategy=chunking_strategy,
                        chunk_size=chunk_size,
                        chunk_overlap=chunk_overlap,
                        embedding_provider=embedding_provider,
                        embedding_model=embedding_model,
                        db=thread_db
                    )
                    return result
                finally:
                    thread_db.close()
            
            # Use ThreadPoolExecutor for parallel processing
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [executor.submit(process_file, f) for f in temp_files]
                results = [future.result() for future in futures]
            
            # Build response
            successful = sum(1 for r in results if r['success'])
            failed = len(results) - successful
            total_time = time.time() - start_time
            
            index_responses = []
            for result in results:
                index_responses.append(IndexResponse(
                    document_id=result['document_id'] or "N/A",
                    title=result['title'],
                    file_size_bytes=result['file_size_bytes'],
                    chunks_created=result['chunks_created'],
                    embedding_dimensions=result['embedding_dimensions'],
                    chunking_strategy=chunking_strategy,
                    processing_time_seconds=result['processing_time'],
                    status="success" if result['success'] else "failed",
                    message=result['error'] if result['error'] else "Success"
                ))
            
            logger.info(f"✅ Batch indexing complete: {successful}/{len(files)} successful in {total_time:.2f}s")
            
            return BatchIndexResponse(
                total_files=len(files),
                successful=successful,
                failed=failed,
                results=index_responses,
                total_processing_time_seconds=total_time
            )
            
        finally:
            # Clean up temp files
            for file_info in temp_files:
                if file_info['path'].exists():
                    file_info['path'].unlink()
                    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in batch index endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/{document_id}/chunks",
    response_model=DocumentChunksResponse,
    summary="Get Document Chunks",
    description="Retrieve all chunks for a document"
)
async def get_document_chunks(
    document_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Get all chunks for a specific document.
    
    **Use cases**:
    - Preview document chunks
    - Debug chunking strategy
    - Inspect embeddings metadata
    
    **Example**:
    ```bash
    curl "http://localhost:8000/api/v1/documents/{document_id}/chunks?page=1&page_size=10"
    ```
    """
    try:
        # Verify document exists
        doc_repo = DocumentRepository(db)
        document = doc_repo.get_by_id(document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found"
            )
        
        # Get chunks
        chunk_repo = DocumentChunkRepository(db)
        all_chunks = chunk_repo.get_by_document_id(document_id)
        
        # Paginate
        total_chunks = len(all_chunks)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_chunks = all_chunks[start_idx:end_idx]
        
        chunk_responses = [
            ChunkResponse(
                chunk_id=chunk.id,
                document_id=chunk.document_id,
                chunk_index=chunk.chunk_index,
                text=chunk.text,
                text_length=len(chunk.text),
                start_char=chunk.start_char,
                end_char=chunk.end_char,
                metadata=chunk.metadata,
                embedding_model=chunk.metadata.get('embedding_model') if chunk.metadata else None,
                created_at=chunk.created_at
            )
            for chunk in paginated_chunks
        ]
        
        return DocumentChunksResponse(
            document_id=document_id,
            document_title=document.title,
            total_chunks=total_chunks,
            chunks=chunk_responses
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting chunks: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post(
    "/{document_id}/reindex",
    response_model=IndexResponse,
    summary="Re-index Document",
    description="Re-index document with different chunking/embedding strategy"
)
async def reindex_document(
    document_id: str,
    request: ReindexRequest,
    db: Session = Depends(get_db)
):
    """
    Re-index an existing document with new chunking or embedding strategy.
    
    **Use cases**:
    - Experiment with different chunk sizes
    - Switch embedding models
    - Improve retrieval quality
    
    **Process**:
    1. Deletes existing chunks
    2. Re-chunks document content
    3. Generates new embeddings
    4. Stores new chunks
    
    **Example**:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/documents/{document_id}/reindex" \\
      -H "Content-Type: application/json" \\
      -d '{
        "chunking_strategy": "fixed",
        "chunk_size": 512,
        "chunk_overlap": 50,
        "embedding_provider": "huggingface"
      }'
    ```
    """
    import time
    start_time = time.time()
    
    try:
        # Verify document exists
        doc_repo = DocumentRepository(db)
        document = doc_repo.get_by_id(document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found"
            )
        
        if not document.content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document content not available for re-indexing"
            )
        
        logger.info(f"🔄 Re-indexing document: {document.title}")
        
        # Delete existing chunks
        chunk_repo = DocumentChunkRepository(db)
        old_chunks = chunk_repo.get_by_document_id(document_id)
        for chunk in old_chunks:
            db.delete(chunk)
        db.commit()
        
        logger.info(f"🗑️  Deleted {len(old_chunks)} old chunks")
        
        # Re-chunk document
        logger.info(f"✂️  Chunking with strategy: {request.chunking_strategy}")
        chunker = ChunkerFactory.create_chunker(
            method=request.chunking_strategy,
            chunk_size=request.chunk_size,
            overlap=request.chunk_overlap
        )
        chunks = chunker.chunk(document.content)
        logger.info(f"✅ Generated {len(chunks)} new chunks")
        
        # Generate new embeddings
        logger.info(f"🧮 Generating embeddings with provider: {request.embedding_provider}")
        embedder = EmbeddingFactory.create_embedder(provider=request.embedding_provider)
        chunk_texts = [chunk.text for chunk in chunks]
        embedding_result = embedder.embed_batch(chunk_texts)
        logger.info(f"✅ Generated embeddings with {embedding_result.dimensions} dimensions")
        
        # Store new chunks
        for i, (chunk, embedding) in enumerate(zip(chunks, embedding_result.embeddings)):
            chunk_repo.create(
                document_id=document_id,
                chunk_index=i,
                text=chunk.text,
                start_char=chunk.start_index if hasattr(chunk, 'start_index') else None,
                end_char=chunk.end_index if hasattr(chunk, 'end_index') else None,
                embedding=embedding.tolist(),
                metadata={
                    "chunking_strategy": request.chunking_strategy,
                    "chunk_size": request.chunk_size,
                    "chunk_overlap": request.chunk_overlap,
                    "embedding_provider": request.embedding_provider,
                    "embedding_model": embedder.model_name if hasattr(embedder, 'model_name') else None,
                    "embedding_dimensions": embedding_result.dimensions,
                    "reindexed": True
                }
            )
        
        db.commit()
        
        processing_time = time.time() - start_time
        logger.info(f"✅ Re-indexing complete in {processing_time:.2f}s")
        
        return IndexResponse(
            document_id=document_id,
            title=document.title,
            file_size_bytes=len(document.content),
            chunks_created=len(chunks),
            embedding_dimensions=embedding_result.dimensions,
            chunking_strategy=request.chunking_strategy,
            processing_time_seconds=processing_time,
            status="success",
            message=f"Successfully re-indexed with {len(chunks)} chunks"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error re-indexing document: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Document",
    description="Delete document and all associated chunks and embeddings"
)
async def delete_document(
    document_id: str,
    permanent: bool = Query(
        False,
        description="Permanently delete (true) or soft delete (false)"
    ),
    db: Session = Depends(get_db)
):
    """
    Delete a document and all its chunks.
    
    **Soft delete** (default): Marks document as trashed
    **Permanent delete**: Removes from database completely
    
    **Example**:
    ```bash
    # Soft delete
    curl -X DELETE "http://localhost:8000/api/v1/documents/{document_id}"
    
    # Permanent delete
    curl -X DELETE "http://localhost:8000/api/v1/documents/{document_id}?permanent=true"
    ```
    """
    try:
        # Verify document exists
        doc_repo = DocumentRepository(db)
        document = doc_repo.get_by_id(document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found"
            )
        
        if permanent:
            # Permanent delete - chunks will be deleted via cascade
            logger.info(f"🗑️  Permanently deleting document: {document.title}")
            db.delete(document)
            db.commit()
            logger.info(f"✅ Document and chunks permanently deleted")
        else:
            # Soft delete
            logger.info(f"🗑️  Soft deleting document: {document.title}")
            document.trashed = True
            document.trashed_at = datetime.utcnow()
            db.commit()
            logger.info(f"✅ Document marked as trashed")
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting document: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )
