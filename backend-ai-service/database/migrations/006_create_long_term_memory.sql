-- ============================================================================
-- Migration: Create Long-term Memory Table
-- Description: Store learned knowledge and patterns
-- Author: AI Assistant
-- Date: 2025-11-08
-- ============================================================================

BEGIN;

-- ============================================================================
-- Create long_term_memory table
-- ============================================================================
CREATE TABLE IF NOT EXISTS long_term_memory (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Context
    workspace_id VARCHAR NOT NULL,
    
    -- Knowledge content
    knowledge_type VARCHAR NOT NULL,
    key VARCHAR NOT NULL,
    value TEXT NOT NULL,
    
    -- Source and confidence
    source VARCHAR NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.80,
    
    -- Usage tracking
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMP,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    UNIQUE(workspace_id, knowledge_type, key),
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
    CHECK (access_count >= 0)
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Basic indexes
CREATE INDEX idx_ltm_workspace ON long_term_memory(workspace_id);
CREATE INDEX idx_ltm_type ON long_term_memory(knowledge_type);
CREATE INDEX idx_ltm_key ON long_term_memory(key);
CREATE INDEX idx_ltm_source ON long_term_memory(source);

-- Quality and usage indexes
CREATE INDEX idx_ltm_confidence ON long_term_memory(confidence_score DESC);
CREATE INDEX idx_ltm_access_count ON long_term_memory(access_count DESC);
CREATE INDEX idx_ltm_last_accessed ON long_term_memory(last_accessed_at DESC NULLS LAST);

-- Composite indexes for common queries
CREATE INDEX idx_ltm_workspace_type ON long_term_memory(workspace_id, knowledge_type);
CREATE INDEX idx_ltm_workspace_confidence ON long_term_memory(workspace_id, confidence_score DESC);

-- For finding high-quality, frequently used knowledge
CREATE INDEX idx_ltm_quality_usage ON long_term_memory(confidence_score DESC, access_count DESC);

-- GIN index for metadata
CREATE INDEX idx_ltm_metadata ON long_term_memory USING gin(metadata);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE long_term_memory IS 
'Persistent knowledge learned by the AI system';

COMMENT ON COLUMN long_term_memory.workspace_id IS 
'Workspace this knowledge belongs to';

COMMENT ON COLUMN long_term_memory.knowledge_type IS 
'Type: decision, pattern, clarification, preference, workflow, best_practice, etc.';

COMMENT ON COLUMN long_term_memory.key IS 
'Unique key for this knowledge within workspace and type';

COMMENT ON COLUMN long_term_memory.value IS 
'The actual knowledge content/value';

COMMENT ON COLUMN long_term_memory.source IS 
'Source: hitl_confirmation, document, inference, user_feedback, etc.';

COMMENT ON COLUMN long_term_memory.confidence_score IS 
'Confidence in this knowledge (0-1). Higher = more reliable';

COMMENT ON COLUMN long_term_memory.access_count IS 
'How many times this knowledge was used';

COMMENT ON COLUMN long_term_memory.last_accessed_at IS 
'When this knowledge was last retrieved/used';

COMMENT ON COLUMN long_term_memory.metadata IS 
'Additional data: {related_documents, related_tasks, user_confirmations, etc.}';

-- ============================================================================
-- Trigger to auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_long_term_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_long_term_memory_updated_at
    BEFORE UPDATE ON long_term_memory
    FOR EACH ROW
    EXECUTE FUNCTION update_long_term_memory_updated_at();

-- ============================================================================
-- Function to increment access count
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_ltm_access(memory_id VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE long_term_memory
    SET 
        access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE id = memory_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_ltm_access IS 
'Increment access count and update last_accessed_at for a memory';

-- ============================================================================
-- Function to upsert knowledge
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_knowledge(
    p_workspace_id VARCHAR,
    p_knowledge_type VARCHAR,
    p_key VARCHAR,
    p_value TEXT,
    p_source VARCHAR,
    p_confidence_score DECIMAL DEFAULT 0.80,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VARCHAR AS $$
DECLARE
    v_memory_id VARCHAR;
BEGIN
    INSERT INTO long_term_memory (
        workspace_id,
        knowledge_type,
        key,
        value,
        source,
        confidence_score,
        metadata
    ) VALUES (
        p_workspace_id,
        p_knowledge_type,
        p_key,
        p_value,
        p_source,
        p_confidence_score,
        p_metadata
    )
    ON CONFLICT (workspace_id, knowledge_type, key)
    DO UPDATE SET
        value = EXCLUDED.value,
        source = EXCLUDED.source,
        confidence_score = GREATEST(long_term_memory.confidence_score, EXCLUDED.confidence_score),
        metadata = long_term_memory.metadata || EXCLUDED.metadata,
        updated_at = NOW()
    RETURNING id INTO v_memory_id;
    
    RETURN v_memory_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION upsert_knowledge IS 
'Insert or update knowledge. On conflict, keeps higher confidence score and merges metadata';

COMMIT;

-- ============================================================================
-- Usage Examples
-- ============================================================================
/*
-- Insert a decision from HITL
INSERT INTO long_term_memory (
    workspace_id,
    knowledge_type,
    key,
    value,
    source,
    confidence_score,
    metadata
) VALUES (
    'workspace-123',
    'decision',
    'api_spec_priority',
    'API Spec v2 is the authoritative source for API integration requirements',
    'hitl_confirmation',
    1.0,
    '{
        "confirmed_by": "user-456",
        "related_document": "doc-api-spec-v2",
        "date_confirmed": "2025-11-08"
    }'::jsonb
);

-- Insert a learned pattern
INSERT INTO long_term_memory (
    workspace_id,
    knowledge_type,
    key,
    value,
    source,
    confidence_score,
    metadata
) VALUES (
    'workspace-123',
    'pattern',
    'backend_tasks_often_block_frontend',
    'Backend API tasks frequently become blockers for frontend tasks',
    'inference',
    0.75,
    '{
        "observed_instances": 5,
        "analysis_period": "last_30_days"
    }'::jsonb
);

-- Upsert knowledge (safe for duplicate keys)
SELECT upsert_knowledge(
    'workspace-123',
    'preference',
    'default_priority_new_bugs',
    'High',
    'user_feedback',
    0.90,
    '{"set_by": "user-456"}'::jsonb
);

-- Retrieve knowledge by type
SELECT 
    key,
    value,
    confidence_score,
    access_count,
    source
FROM long_term_memory
WHERE workspace_id = 'workspace-123'
    AND knowledge_type = 'decision'
ORDER BY confidence_score DESC, access_count DESC;

-- Get most frequently used knowledge
SELECT 
    knowledge_type,
    key,
    value,
    access_count,
    confidence_score
FROM long_term_memory
WHERE workspace_id = 'workspace-123'
ORDER BY access_count DESC
LIMIT 10;

-- Increment access count when using knowledge
SELECT increment_ltm_access('memory-id-123');

-- Find high-confidence, proven knowledge
SELECT 
    knowledge_type,
    key,
    value,
    confidence_score,
    access_count
FROM long_term_memory
WHERE workspace_id = 'workspace-123'
    AND confidence_score >= 0.85
    AND access_count >= 3
ORDER BY confidence_score DESC, access_count DESC;

-- Knowledge analytics by source
SELECT 
    source,
    knowledge_type,
    COUNT(*) as count,
    AVG(confidence_score) as avg_confidence,
    SUM(access_count) as total_usage
FROM long_term_memory
WHERE workspace_id = 'workspace-123'
GROUP BY source, knowledge_type
ORDER BY total_usage DESC;
*/
