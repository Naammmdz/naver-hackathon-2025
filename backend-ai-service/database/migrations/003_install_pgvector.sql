-- ============================================================================
-- Migration: Install pgvector Extension
-- Description: Enable vector similarity search for RAG
-- Author: AI Assistant
-- Date: 2025-11-08
-- Requirements: pgvector extension must be available in PostgreSQL
-- ============================================================================

BEGIN;

-- ============================================================================
-- Install pgvector extension
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Verify installation
-- ============================================================================
DO $$
DECLARE
    ext_version text;
BEGIN
    SELECT extversion INTO ext_version
    FROM pg_extension
    WHERE extname = 'vector';
    
    IF ext_version IS NULL THEN
        RAISE EXCEPTION 'pgvector extension installation failed';
    ELSE
        RAISE NOTICE 'pgvector extension installed successfully. Version: %', ext_version;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Check extension is installed:
/*
SELECT 
    extname,
    extversion,
    extrelocatable,
    extschema
FROM pg_extension 
WHERE extname = 'vector';
*/

-- Check available vector operators:
/*
SELECT 
    oprname,
    oprleft::regtype,
    oprright::regtype,
    oprresult::regtype,
    oprcode
FROM pg_operator
WHERE oprname IN ('<->', '<#>', '<=>', '<+>')
ORDER BY oprname;
*/

-- ============================================================================
-- pgvector Operators Reference
-- ============================================================================
/*
Operator | Description                  | Index Type
---------|------------------------------|------------
<->      | L2 distance (Euclidean)     | ivfflat, hnsw
<#>      | Inner product (negative)    | ivfflat, hnsw
<=>      | Cosine distance             | ivfflat, hnsw
<+>      | L1 distance (Manhattan)     | -

For our use case (document embeddings), we'll use:
- Cosine distance (<=>) for similarity search
- This is most common for text embeddings
*/
