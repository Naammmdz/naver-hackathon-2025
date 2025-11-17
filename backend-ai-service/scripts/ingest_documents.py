"""
Data Ingestion Script

Processes documents from data_sample/ folder and ingests them into the database.

Steps:
1. Parse documents using DoclingParser
2. Chunk text using configured chunker
3. Generate embeddings using configured embedder
4. Store Document and DocumentChunk records in database

Usage:
    python scripts/ingest_documents.py --workspace-id <workspace_id> --user-id <user_id>
    
    # With specific chunking strategy
    python scripts/ingest_documents.py --workspace-id ws_123 --user-id user_123 --chunker paragraph
    
    # With dry-run mode (no DB writes)
    python scripts/ingest_documents.py --workspace-id ws_123 --user-id user_123 --dry-run
"""

import os
import sys
import argparse
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from data_preprocessing.parsing import ParserFactory
from data_preprocessing.chunking import ChunkerFactory
from data_preprocessing.embedding import EmbeddingFactory
from database.connection import get_db_session
from database.repositories import DocumentRepository, DocumentChunkRepository
from utils.logger import get_logger, log_execution_time

# Get logger
logger = get_logger(__name__)


class DocumentIngestion:
    """
    Document ingestion pipeline.
    
    Orchestrates parsing, chunking, embedding, and storage.
    """
    
    def __init__(
        self,
        workspace_id: str,
        user_id: str,
        chunker_method: str = "paragraph",
        embedding_provider: str = "huggingface",
        dry_run: bool = False
    ):
        """
        Initialize ingestion pipeline.
        
        Args:
            workspace_id: Target workspace ID
            user_id: User ID performing the ingestion
            chunker_method: Chunking strategy (paragraph, fixed, semantic, hierarchical)
            embedding_provider: Embedding provider (huggingface, naver)
            dry_run: If True, don't write to database
        """
        self.workspace_id = workspace_id
        self.user_id = user_id
        self.dry_run = dry_run
        
        logger.info(f"Initializing ingestion pipeline for workspace={workspace_id}, user={user_id}")
        logger.info(f"Chunker: {chunker_method}, Embedder: {embedding_provider}, Dry-run: {dry_run}")
        
        # Initialize components
        try:
            self.parser = ParserFactory.create_parser(parser_type='docling')
            logger.info(f"✅ Parser initialized: {type(self.parser).__name__}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize parser: {e}")
            raise
        
        try:
            self.chunker = ChunkerFactory.create_chunker(method=chunker_method)
            logger.info(f"✅ Chunker initialized: {type(self.chunker).__name__}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize chunker: {e}")
            raise
        
        try:
            self.embedder = EmbeddingFactory.create_embedder(provider=embedding_provider)
            logger.info(f"✅ Embedder initialized: {type(self.embedder).__name__}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize embedder: {e}")
            raise
        
        # Initialize repositories
        if not dry_run:
            self.db_session_gen = get_db_session()
            self.db_session = self.db_session_gen.__enter__()
            self.doc_repo = DocumentRepository(self.db_session)
            self.chunk_repo = DocumentChunkRepository(self.db_session)
            logger.info("✅ Database repositories initialized")
        
        # Statistics
        self.stats = {
            'files_processed': 0,
            'files_failed': 0,
            'documents_created': 0,
            'chunks_created': 0,
            'total_parse_time': 0,
            'total_chunk_time': 0,
            'total_embed_time': 0,
            'total_db_time': 0
        }
    
    @log_execution_time(logger)
    def ingest_file(self, file_path: Path) -> Dict[str, Any]:
        """
        Ingest a single file.
        
        Args:
            file_path: Path to the file
        
        Returns:
            Dict with ingestion results
        """
        logger.info(f"\n{'='*80}")
        logger.info(f"Processing: {file_path.name}")
        logger.info(f"{'='*80}")
        
        result = {
            'file': file_path.name,
            'success': False,
            'document_id': None,
            'chunks_created': 0,
            'error': None
        }
        
        try:
            # Step 1: Parse document
            logger.info(f"📄 Step 1/4: Parsing document...")
            import time
            start_time = time.time()
            
            parse_result = self.parser.parse(str(file_path))
            
            if not parse_result.success:
                raise Exception(f"Parse failed: {parse_result.error}")
            
            parse_time = time.time() - start_time
            self.stats['total_parse_time'] += parse_time
            
            logger.info(f"   ✅ Parsed successfully in {parse_time:.2f}s")
            logger.info(f"   - Text length: {len(parse_result.text)} chars")
            pages = parse_result.metadata.get('pages', 0)
            if isinstance(pages, list):
                logger.info(f"   - Pages: {len(pages)}")
            else:
                logger.info(f"   - Pages: {pages}")
            
            # Step 2: Chunk text
            logger.info(f"✂️  Step 2/4: Chunking text...")
            start_time = time.time()
            
            chunks = self.chunker.chunk(
                text=parse_result.text,
                metadata=parse_result.metadata
            )
            
            chunk_time = time.time() - start_time
            self.stats['total_chunk_time'] += chunk_time
            
            logger.info(f"   ✅ Created {len(chunks)} chunks in {chunk_time:.2f}s")
            if chunks:
                logger.info(f"   - Avg chunk size: {sum(len(c.text) for c in chunks) / len(chunks):.0f} chars")
            
            # Step 3: Generate embeddings
            logger.info(f"🔢 Step 3/4: Generating embeddings...")
            start_time = time.time()
            
            chunk_texts = [chunk.text for chunk in chunks]
            embedding_result = self.embedder.embed_batch(chunk_texts)
            
            embed_time = time.time() - start_time
            self.stats['total_embed_time'] += embed_time
            
            logger.info(f"   ✅ Generated {len(embedding_result.embeddings)} embeddings in {embed_time:.2f}s")
            logger.info(f"   - Dimensions: {embedding_result.dimensions}")
            logger.info(f"   - Model: {embedding_result.metadata.get('model', 'unknown')}")
            
            # Step 4: Store in database
            if not self.dry_run:
                logger.info(f"💾 Step 4/4: Storing in database...")
                start_time = time.time()
                
                # Create Document
                document = self.doc_repo.create(
                    workspace_id=self.workspace_id,
                    user_id=self.user_id,
                    title=file_path.stem,  # Filename without extension
                    content=parse_result.text,
                    trashed=False
                )
                
                result['document_id'] = document.id
                self.stats['documents_created'] += 1
                
                logger.info(f"   ✅ Document created: {document.id}")
                
                # Create DocumentChunks
                for idx, (chunk, embedding) in enumerate(zip(chunks, embedding_result.embeddings)):
                    # Prepare metadata
                    chunk_metadata = chunk.metadata.copy() if chunk.metadata else {}
                    chunk_metadata['source_file'] = file_path.name
                    chunk_metadata['chunk_method'] = type(self.chunker).__name__
                    chunk_metadata['embedding_model'] = embedding_result.metadata.get('model', 'unknown')
                    
                    # Create chunk
                    self.chunk_repo.create(
                        document_id=document.id,
                        workspace_id=self.workspace_id,
                        chunk_text=chunk.text,
                        chunk_index=idx,
                        embedding=embedding.tolist(),  # Convert numpy array to list
                        metadata=chunk_metadata
                    )
                    
                    result['chunks_created'] += 1
                    self.stats['chunks_created'] += 1
                
                # Commit transaction
                self.db_session.commit()
                
                db_time = time.time() - start_time
                self.stats['total_db_time'] += db_time
                
                logger.info(f"   ✅ Stored {result['chunks_created']} chunks in {db_time:.2f}s")
            else:
                logger.info(f"🔍 Step 4/4: DRY-RUN MODE - Skipping database storage")
                logger.info(f"   Would create 1 document + {len(chunks)} chunks")
            
            result['success'] = True
            self.stats['files_processed'] += 1
            
            logger.info(f"\n✅ SUCCESS: {file_path.name}")
            
        except Exception as e:
            logger.error(f"\n❌ FAILED: {file_path.name}")
            logger.error(f"   Error: {str(e)}", exc_info=True)
            result['error'] = str(e)
            self.stats['files_failed'] += 1
            
            if not self.dry_run:
                self.db_session.rollback()
        
        return result
    
    @log_execution_time(logger)
    def ingest_directory(self, directory_path: Path) -> List[Dict[str, Any]]:
        """
        Ingest all documents in a directory.
        
        Args:
            directory_path: Path to directory containing documents
        
        Returns:
            List of ingestion results
        """
        logger.info(f"\n{'#'*80}")
        logger.info(f"STARTING BATCH INGESTION")
        logger.info(f"{'#'*80}")
        logger.info(f"Directory: {directory_path}")
        logger.info(f"Workspace: {self.workspace_id}")
        logger.info(f"User: {self.user_id}")
        logger.info(f"Dry-run: {self.dry_run}")
        
        # Find all supported files
        supported_extensions = {'.pdf', '.docx', '.doc', '.pptx', '.xlsx', '.md', '.txt'}
        files = [
            f for f in directory_path.iterdir()
            if f.is_file() and f.suffix.lower() in supported_extensions
        ]
        
        logger.info(f"\nFound {len(files)} files to process:")
        for f in files:
            logger.info(f"  - {f.name}")
        
        # Process each file
        results = []
        for file_path in files:
            result = self.ingest_file(file_path)
            results.append(result)
        
        # Print summary
        self._print_summary(results)
        
        return results
    
    def _print_summary(self, results: List[Dict[str, Any]]):
        """Print ingestion summary"""
        logger.info(f"\n{'#'*80}")
        logger.info(f"INGESTION SUMMARY")
        logger.info(f"{'#'*80}")
        
        logger.info(f"\n📊 Statistics:")
        logger.info(f"  Files processed:    {self.stats['files_processed']}/{len(results)}")
        logger.info(f"  Files failed:       {self.stats['files_failed']}/{len(results)}")
        logger.info(f"  Documents created:  {self.stats['documents_created']}")
        logger.info(f"  Chunks created:     {self.stats['chunks_created']}")
        
        logger.info(f"\n⏱️  Performance:")
        logger.info(f"  Parse time:         {self.stats['total_parse_time']:.2f}s")
        logger.info(f"  Chunk time:         {self.stats['total_chunk_time']:.2f}s")
        logger.info(f"  Embedding time:     {self.stats['total_embed_time']:.2f}s")
        if not self.dry_run:
            logger.info(f"  Database time:      {self.stats['total_db_time']:.2f}s")
        
        total_time = (
            self.stats['total_parse_time'] +
            self.stats['total_chunk_time'] +
            self.stats['total_embed_time'] +
            self.stats['total_db_time']
        )
        logger.info(f"  TOTAL TIME:         {total_time:.2f}s")
        
        # Failed files
        failed = [r for r in results if not r['success']]
        if failed:
            logger.info(f"\n❌ Failed files:")
            for r in failed:
                logger.info(f"  - {r['file']}: {r['error']}")
        
        # Success files
        success = [r for r in results if r['success']]
        if success:
            logger.info(f"\n✅ Successful files:")
            for r in success:
                logger.info(f"  - {r['file']}: {r['chunks_created']} chunks")
    
    def cleanup(self):
        """Cleanup resources"""
        if not self.dry_run and hasattr(self, 'db_session_gen'):
            self.db_session_gen.__exit__(None, None, None)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Ingest documents from data_sample into database',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        '--workspace-id',
        type=str,
        required=True,
        help='Workspace ID for document ownership'
    )
    
    parser.add_argument(
        '--user-id',
        type=str,
        required=True,
        help='User ID who owns the documents'
    )
    
    parser.add_argument(
        '--data-dir',
        type=str,
        default='data_sample',
        help='Directory containing documents to ingest (default: data_sample)'
    )
    
    parser.add_argument(
        '--chunker',
        type=str,
        default='paragraph',
        choices=['paragraph', 'fixed', 'semantic', 'hierarchical'],
        help='Chunking strategy (default: paragraph)'
    )
    
    parser.add_argument(
        '--embedder',
        type=str,
        default='huggingface',
        choices=['huggingface', 'naver'],
        help='Embedding provider (default: huggingface)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Run without writing to database (testing mode)'
    )
    
    args = parser.parse_args()
    
    # Resolve data directory
    data_dir = Path(__file__).parent.parent / args.data_dir
    
    if not data_dir.exists():
        logger.error(f"❌ Data directory not found: {data_dir}")
        sys.exit(1)
    
    # Run ingestion
    ingestion = None
    try:
        ingestion = DocumentIngestion(
            workspace_id=args.workspace_id,
            user_id=args.user_id,
            chunker_method=args.chunker,
            embedding_provider=args.embedder,
            dry_run=args.dry_run
        )
        
        results = ingestion.ingest_directory(data_dir)
        
        # Exit code based on results
        failed_count = sum(1 for r in results if not r['success'])
        if failed_count > 0:
            logger.warning(f"\n⚠️  Completed with {failed_count} failures")
            sys.exit(1)
        else:
            logger.info(f"\n🎉 All files processed successfully!")
            sys.exit(0)
    
    except Exception as e:
        logger.error(f"\n❌ Fatal error: {e}", exc_info=True)
        sys.exit(1)
    
    finally:
        if ingestion:
            ingestion.cleanup()


if __name__ == '__main__':
    main()
