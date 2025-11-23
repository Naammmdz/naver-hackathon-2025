-- ============================================================================
-- Migration: Add workspace_id to document_chunks if missing
-- Description: Ensure document_chunks table has workspace_id column
-- Author: AI Assistant
-- Date: 2025-11-23
-- ============================================================================

BEGIN;

-- Add workspace_id column if it doesn't exist
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS workspace_id VARCHAR;

-- Add foreign key constraint if column was just added and constraint doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'document_chunks_workspace_id_fkey'
    ) THEN
        ALTER TABLE document_chunks
        ADD CONSTRAINT document_chunks_workspace_id_fkey 
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_chunks_workspace ON document_chunks(workspace_id);

-- Update existing rows: set workspace_id from documents table if it's NULL
UPDATE document_chunks dc
SET workspace_id = d.workspace_id
FROM documents d
WHERE dc.document_id = d.id 
  AND dc.workspace_id IS NULL
  AND d.workspace_id IS NOT NULL;

-- Make workspace_id NOT NULL after populating existing data
-- But only if all rows have workspace_id set
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM document_chunks WHERE workspace_id IS NULL
    ) THEN
        ALTER TABLE document_chunks 
        ALTER COLUMN workspace_id SET NOT NULL;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
-- Verify the column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'document_chunks' AND column_name = 'workspace_id';

