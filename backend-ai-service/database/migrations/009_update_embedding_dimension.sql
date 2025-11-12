-- ============================================================================
-- Migration: Update Embedding Dimension from 768 to 1024
-- Description: Change vector dimension to match Qwen/HuggingFace embedder
-- Author: AI Assistant
-- Date: 2025-11-12
-- ============================================================================

BEGIN;

-- Drop the existing vector index first
DROP INDEX IF EXISTS idx_chunks_embedding;

-- Alter the column to use 1024 dimensions
ALTER TABLE document_chunks 
ALTER COLUMN embedding TYPE vector(1024);

-- Recreate the vector index with new dimension
CREATE INDEX idx_chunks_embedding ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Update comment
COMMENT ON COLUMN document_chunks.embedding IS 
'Vector embedding (1024-dim for Qwen/HuggingFace models)';

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
-- Verify the change
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'document_chunks' AND column_name = 'embedding';

-- Should show: vector(1024)
