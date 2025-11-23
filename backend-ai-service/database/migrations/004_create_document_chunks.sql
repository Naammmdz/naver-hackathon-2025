-- ============================================================================
-- Migration: Create Document Chunks Table for RAG
-- Description: Store document chunks with embeddings for vector search
-- Author: AI Assistant
-- Date: 2025-11-08
-- Dependencies: 003_install_pgvector.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- Create document_chunks table or add missing columns if it exists
-- ============================================================================
-- Check if table exists
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'document_chunks'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        -- Create table with all columns
        CREATE TABLE document_chunks (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
            document_id VARCHAR NOT NULL,
            workspace_id VARCHAR NOT NULL,
            chunk_text TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            embedding vector(1024),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
            UNIQUE(document_id, chunk_index),
            CHECK (chunk_index >= 0),
            CHECK (length(chunk_text) > 0)
        );
    ELSE
        -- Table exists, add missing columns
        -- Add chunk_text if missing (nullable for now, will be populated later)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'document_chunks' AND column_name = 'chunk_text'
        ) THEN
            ALTER TABLE document_chunks ADD COLUMN chunk_text TEXT;
        END IF;
        
        -- Add chunk_index if missing (nullable for now, will be populated later)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'document_chunks' AND column_name = 'chunk_index'
        ) THEN
            ALTER TABLE document_chunks ADD COLUMN chunk_index INTEGER;
            -- Set default value for existing rows
            UPDATE document_chunks SET chunk_index = 0 WHERE chunk_index IS NULL;
        END IF;
        
        -- Add embedding if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'document_chunks' AND column_name = 'embedding'
        ) THEN
            ALTER TABLE document_chunks ADD COLUMN embedding vector(1024);
        END IF;
        
        -- Add metadata if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'document_chunks' AND column_name = 'metadata'
        ) THEN
            ALTER TABLE document_chunks ADD COLUMN metadata JSONB DEFAULT '{}';
        END IF;
        
        -- Add created_at if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'document_chunks' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE document_chunks ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
        END IF;
        
        -- Add updated_at if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'document_chunks' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE document_chunks ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Add workspace_id column if it doesn't exist (for compatibility with backend-core)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_chunks' AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE document_chunks ADD COLUMN workspace_id VARCHAR;
        
        -- Populate workspace_id from documents table if possible
        UPDATE document_chunks dc
        SET workspace_id = d.workspace_id
        FROM documents d
        WHERE dc.document_id = d.id AND d.workspace_id IS NOT NULL;
        
        -- Make it NOT NULL after populating (if all rows have workspace_id)
        -- Only add foreign key if we can make it NOT NULL
        IF NOT EXISTS (SELECT 1 FROM document_chunks WHERE workspace_id IS NULL) THEN
            ALTER TABLE document_chunks ALTER COLUMN workspace_id SET NOT NULL;
            
            -- Add foreign key constraint only if column is NOT NULL
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'document_chunks_workspace_id_fkey'
            ) THEN
                ALTER TABLE document_chunks
                ADD CONSTRAINT document_chunks_workspace_id_fkey 
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

-- Add constraints if they don't exist
DO $$
BEGIN
    -- Add unique constraint on (document_id, chunk_index) if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'document_chunks_document_id_chunk_index_key'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_chunks' AND column_name = 'chunk_index'
    ) THEN
        ALTER TABLE document_chunks
        ADD CONSTRAINT document_chunks_document_id_chunk_index_key 
        UNIQUE(document_id, chunk_index);
    END IF;
    
    -- Add check constraint for chunk_index if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_chunk_index_positive'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_chunks' AND column_name = 'chunk_index'
    ) THEN
        ALTER TABLE document_chunks
        ADD CONSTRAINT check_chunk_index_positive 
        CHECK (chunk_index >= 0);
    END IF;
    
    -- Add check constraint for chunk_text if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_chunk_text_not_empty'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_chunks' AND column_name = 'chunk_text'
    ) THEN
        ALTER TABLE document_chunks
        ADD CONSTRAINT check_chunk_text_not_empty 
        CHECK (length(chunk_text) > 0);
    END IF;
END $$;

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Basic indexes (create only if not exists)
CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
-- Only create workspace_id index if the column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_chunks' AND column_name = 'workspace_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'document_chunks' AND indexname = 'idx_chunks_workspace'
    ) THEN
        CREATE INDEX idx_chunks_workspace ON document_chunks(workspace_id);
    END IF;
END $$;
-- Only create chunk_index index if the column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_chunks' AND column_name = 'chunk_index'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'document_chunks' AND indexname = 'idx_chunks_index'
    ) THEN
        CREATE INDEX idx_chunks_index ON document_chunks(chunk_index);
    END IF;
END $$;
-- Only create created_at index if the column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_chunks' AND column_name = 'created_at'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'document_chunks' AND indexname = 'idx_chunks_created_at'
    ) THEN
        CREATE INDEX idx_chunks_created_at ON document_chunks(created_at DESC);
    END IF;
END $$;

-- Vector similarity search index (IVFFlat)
-- Note: This index should be created AFTER inserting data
-- For now, we'll create it with a reasonable list size
-- Lists = sqrt(total_rows) is a good starting point
-- We'll start with 100 lists (good for ~10,000 chunks)
-- Only create if embedding column exists and index doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_chunks' AND column_name = 'embedding'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'document_chunks' AND indexname = 'idx_chunks_embedding'
    ) THEN
        CREATE INDEX idx_chunks_embedding ON document_chunks 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    END IF;
END $$;

-- GIN index for JSONB metadata queries (only if column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_chunks' AND column_name = 'metadata'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'document_chunks' AND indexname = 'idx_chunks_metadata'
    ) THEN
        CREATE INDEX idx_chunks_metadata ON document_chunks USING gin(metadata);
    END IF;
END $$;

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

-- Create trigger only if it doesn't exist
DROP TRIGGER IF EXISTS trigger_update_document_chunks_updated_at ON document_chunks;
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
