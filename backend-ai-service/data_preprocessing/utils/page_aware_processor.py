"""
Page-Aware Document Processing Utilities

This module provides utilities to parse, chunk, and store documents
with page number preservation for accurate citations.

Usage:
    from data_preprocessing.utils.page_aware_processor import PageAwareProcessor
    
    processor = PageAwareProcessor(config)
    processor.process_and_store_document(
        pdf_path='document.pdf',
        document_id='uuid',
        workspace_id='workspace-uuid'
    )
"""

from pathlib import Path
from typing import List, Dict, Any, Optional
import yaml

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions

from database.connection import get_db
from database.models.ai_models import DocumentChunk
from database.models.document import Document
from data_preprocessing.embedding.huggingface_embedder import HuggingFaceEmbedder


class PageAwareProcessor:
    """
    Process documents with page-aware chunking for accurate citations.
    
    This processor:
    1. Parses PDF with Docling to extract structure + page numbers
    2. Creates chunks while preserving page metadata
    3. Generates embeddings
    4. Stores chunks in database with page information
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize processor.
        
        Args:
            config: Configuration dict (if None, loads from config.yml)
        """
        if config is None:
            with open('config.yml', 'r') as f:
                config = yaml.safe_load(f)
        
        self.config = config
        
        # Get chunking config
        chunking_config = config.get('chunking', {})
        self.chunk_size = chunking_config.get('chunk_size', 512)
        self.overlap = chunking_config.get('overlap', 50)
        
        # Get embedding config
        embedding_config = config.get('embedding', {})
        model_name = embedding_config.get('huggingface', {}).get('model_name', 'Qwen/Qwen3-Embedding-0.6B')
        device = embedding_config.get('huggingface', {}).get('device', 'cuda')
        
        # Initialize embedder
        self.embedder = HuggingFaceEmbedder(
            model_name=model_name,
            device=device,
            normalize=True
        )
        
        # Initialize Docling converter
        self._setup_docling()
    
    def _setup_docling(self):
        """Setup Docling converter with proper configuration"""
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = False
        pipeline_options.do_table_structure = False
        
        format_options = {
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
        
        self.converter = DocumentConverter(
            allowed_formats=[InputFormat.PDF],
            format_options=format_options
        )
    
    def parse_document(self, pdf_path: str):
        """
        Parse PDF document with Docling.
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            Docling document object
        """
        conv_result = self.converter.convert(Path(pdf_path))
        return conv_result.document
    
    def chunk_with_pages(self, doc) -> List[Dict[str, Any]]:
        """
        Create chunks from Docling document while preserving page numbers.
        
        Args:
            doc: Docling document object
            
        Returns:
            List of chunk dictionaries with text, page, and metadata
        """
        chunks = []
        current_chunk_text = ""
        current_start_page = None
        current_end_page = None
        
        # Iterate through document items
        for item, level in doc.iterate_items():
            # Skip items without text
            if not hasattr(item, 'text') or not item.text:
                continue
            
            # Get page number from provenance
            page_no = None
            if hasattr(item, 'prov') and item.prov:
                page_no = item.prov[0].page_no
            
            text = item.text.strip()
            if not text:
                continue
            
            # If this is the first chunk or first item in chunk
            if current_start_page is None:
                current_start_page = page_no
                current_end_page = page_no
            
            # Check if adding this text would exceed chunk size
            if len(current_chunk_text) + len(text) + 1 > self.chunk_size:
                # Save current chunk if it has content
                if current_chunk_text:
                    chunks.append({
                        'text': current_chunk_text.strip(),
                        'page': current_start_page,
                        'start_page': current_start_page,
                        'end_page': current_end_page,
                        'level': level
                    })
                
                # Start new chunk with overlap
                if self.overlap > 0 and len(current_chunk_text) > self.overlap:
                    current_chunk_text = current_chunk_text[-self.overlap:] + "\n" + text
                else:
                    current_chunk_text = text
                
                current_start_page = page_no
                current_end_page = page_no
            else:
                # Add to current chunk
                if current_chunk_text:
                    current_chunk_text += "\n" + text
                else:
                    current_chunk_text = text
                
                # Update end page
                if page_no is not None:
                    current_end_page = page_no
        
        # Add final chunk
        if current_chunk_text:
            chunks.append({
                'text': current_chunk_text.strip(),
                'page': current_start_page,
                'start_page': current_start_page,
                'end_page': current_end_page,
                'level': 0
            })
        
        return chunks
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for texts.
        
        Args:
            texts: List of text strings
            
        Returns:
            List of embedding vectors
        """
        result = self.embedder.embed_batch(texts)
        return result.embeddings
    
    def store_chunks(
        self,
        chunks_data: List[Dict[str, Any]],
        embeddings: List[List[float]],
        document_id: str,
        workspace_id: str
    ) -> int:
        """
        Store chunks with embeddings in database.
        
        Args:
            chunks_data: List of chunk dictionaries
            embeddings: List of embedding vectors
            document_id: Database document ID
            workspace_id: Workspace ID
            
        Returns:
            Number of chunks inserted
        """
        with get_db() as db:
            # Get document title
            document = db.query(Document).filter(Document.id == document_id).first()
            doc_title = document.title if document else "Unknown"
            
            inserted_count = 0
            for i, (chunk_data, embedding) in enumerate(zip(chunks_data, embeddings)):
                # Prepare chunk metadata with page info
                metadata = {
                    'source_file': doc_title,
                    'page': chunk_data['page'],  # ✅ Main page field for citations
                    'start_page': chunk_data['start_page'],
                    'end_page': chunk_data['end_page'],
                    'chunk_index': i,
                    'total_chunks': len(chunks_data),
                    'chunk_length': len(chunk_data['text']),
                    'level': chunk_data['level']
                }
                
                # Create chunk object
                chunk = DocumentChunk(
                    workspace_id=workspace_id,
                    document_id=document_id,
                    chunk_index=i,
                    chunk_text=chunk_data['text'],
                    embedding=embedding,
                    chunk_metadata=metadata
                )
                
                db.add(chunk)
                inserted_count += 1
            
            db.commit()
        
        return inserted_count
    
    def process_and_store_document(
        self,
        pdf_path: str,
        document_id: str,
        workspace_id: str,
        delete_existing: bool = True
    ) -> Dict[str, Any]:
        """
        Complete pipeline: Parse → Chunk → Embed → Store.
        
        Args:
            pdf_path: Path to PDF file
            document_id: Database document ID
            workspace_id: Workspace ID
            delete_existing: Whether to delete existing chunks first
            
        Returns:
            Processing result dictionary
        """
        # Step 1: Parse document
        doc = self.parse_document(pdf_path)
        num_pages = len(doc.pages)
        num_items = len(list(doc.iterate_items()))
        
        # Step 2: Chunk with page numbers
        chunks_data = self.chunk_with_pages(doc)
        
        # Step 3: Generate embeddings
        texts = [chunk['text'] for chunk in chunks_data]
        embeddings = self.generate_embeddings(texts)
        
        # Step 4: Delete existing chunks if requested
        if delete_existing:
            with get_db() as db:
                db.query(DocumentChunk).filter(
                    DocumentChunk.document_id == document_id
                ).delete()
                db.commit()
        
        # Step 5: Store chunks
        num_inserted = self.store_chunks(
            chunks_data, 
            embeddings, 
            document_id, 
            workspace_id
        )
        
        return {
            'success': True,
            'pdf_path': pdf_path,
            'document_id': document_id,
            'workspace_id': workspace_id,
            'num_pages': num_pages,
            'num_items': num_items,
            'num_chunks': num_inserted,
            'embedding_dim': len(embeddings[0]) if embeddings else 0
        }


# Convenience function for quick usage
def process_pdf_with_pages(
    pdf_path: str,
    document_id: str,
    workspace_id: str,
    config: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Quick function to process a PDF with page-aware chunking.
    
    Args:
        pdf_path: Path to PDF file
        document_id: Database document ID
        workspace_id: Workspace ID
        config: Optional config dict
        
    Returns:
        Processing result
        
    Example:
        >>> result = process_pdf_with_pages(
        ...     'document.pdf',
        ...     'doc-uuid',
        ...     'workspace-uuid'
        ... )
        >>> print(f"Created {result['num_chunks']} chunks")
    """
    processor = PageAwareProcessor(config)
    return processor.process_and_store_document(
        pdf_path, 
        document_id, 
        workspace_id
    )
