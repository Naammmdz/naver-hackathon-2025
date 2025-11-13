-- ============================================================================
-- Migration: Create Document Chunks Table for RAG
-- Description: Store document chunks with embeddings for vector search
-- Author: AI Assistant
-- Date: 2025-11-08
-- Dependencies: 003_install_pgvector.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- Create document_chunks table
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_id VARCHAR NOT NULL,
    workspace_id VARCHAR NOT NULL,
    
    -- Chunk content
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    
    -- Vector embedding (1024 dimensions for Qwen/HuggingFace models)
    embedding vector(1024),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    UNIQUE(document_id, chunk_index),
    CHECK (chunk_index >= 0),
    CHECK (length(chunk_text) > 0)
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Basic indexes
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_workspace ON document_chunks(workspace_id);
CREATE INDEX idx_chunks_index ON document_chunks(chunk_index);
CREATE INDEX idx_chunks_created_at ON document_chunks(created_at DESC);

-- Vector similarity search index (IVFFlat)
-- Note: This index should be created AFTER inserting data
-- For now, we'll create it with a reasonable list size
-- Lists = sqrt(total_rows) is a good starting point
-- We'll start with 100 lists (good for ~10,000 chunks)
CREATE INDEX idx_chunks_embedding ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- GIN index for JSONB metadata queries
CREATE INDEX idx_chunks_metadata ON document_chunks USING gin(metadata);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE document_chunks IS 
'Stores document chunks with embeddings for RAG retrieval';

COMMENT ON COLUMN document_chunks.id IS 
'Unique identifier for chunk';

COMMENT ON COLUMN document_chunks.document_id IS 
'Reference to parent document';

COMMENT ON COLUMN document_chunks.workspace_id IS 
'Reference to workspace (for multi-tenancy)';

COMMENT ON COLUMN document_chunks.chunk_text IS 
'The actual text content of the chunk';

COMMENT ON COLUMN document_chunks.chunk_index IS 
'Sequential index of chunk within document (0-based)';

COMMENT ON COLUMN document_chunks.embedding IS 
'Vector embedding (1024-dim for Qwen/HuggingFace models)';

COMMENT ON COLUMN document_chunks.metadata IS 
'Additional metadata: {section, page_number, heading, source_type, etc.}';

COMMENT ON INDEX idx_chunks_embedding IS 
'IVFFlat index for fast approximate vector similarity search using cosine distance';

-- ============================================================================
-- Trigger to auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_document_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_chunks_updated_at
    BEFORE UPDATE ON document_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_document_chunks_updated_at();

COMMIT;

-- ============================================================================
-- Usage Examples
-- ============================================================================
/*
-- Insert a chunk with embedding
INSERT INTO document_chunks (
    document_id,
    workspace_id,
    chunk_text,
    chunk_index,
    embedding,
    metadata
) VALUES (
    'doc-123',
    'workspace-456',
    'This is the first paragraph of the document...',
    0,
    '[0.1, 0.2, ..., 0.5]'::vector(768),
    '{"section": "Introduction", "page_number": 1}'::jsonb
);

-- Vector similarity search (find top 10 most similar chunks)
SELECT 
    id,
    document_id,
    chunk_text,
    metadata,
    embedding <=> '[0.1, 0.2, ..., 0.5]'::vector(768) AS distance
FROM document_chunks
WHERE workspace_id = 'workspace-456'
ORDER BY embedding <=> '[0.1, 0.2, ..., 0.5]'::vector(768)
LIMIT 10;

-- Search with metadata filter
SELECT 
    id,
    chunk_text,
    metadata->>'section' as section,
    embedding <=> $1::vector(768) AS distance
FROM document_chunks
WHERE workspace_id = $2
    AND metadata->>'section' = 'Requirements'
ORDER BY embedding <=> $1::vector(768)
LIMIT 5;

-- Get chunk statistics by document
SELECT 
    document_id,
    COUNT(*) as chunk_count,
    AVG(length(chunk_text)) as avg_chunk_length,
    MIN(chunk_index) as first_chunk,
    MAX(chunk_index) as last_chunk
FROM document_chunks
WHERE workspace_id = 'workspace-456'
GROUP BY document_id;
*/

-- ============================================================================
-- Index Optimization Notes
-- ============================================================================
/*
After inserting significant data, you may want to rebuild the vector index:

-- Drop old index
DROP INDEX idx_chunks_embedding;

-- Recreate with optimal list size (sqrt of total rows)
-- For 10,000 chunks: lists = 100
-- For 100,000 chunks: lists = 316
-- For 1,000,000 chunks: lists = 1000
CREATE INDEX idx_chunks_embedding ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = <calculated_value>);

-- For HNSW index (better accuracy, more memory):
CREATE INDEX idx_chunks_embedding_hnsw ON document_chunks 
USING hnsw (embedding vector_cosine_ops);
*/
