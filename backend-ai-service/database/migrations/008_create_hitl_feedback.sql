-- ============================================================================
-- Migration: Create HITL Feedback Table
-- Description: Store human-in-the-loop feedback for learning
-- Author: AI Assistant
-- Date: 2025-11-08
-- ============================================================================

BEGIN;

-- ============================================================================
-- Create hitl_feedback table
-- ============================================================================
CREATE TABLE IF NOT EXISTS hitl_feedback (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Context
    workspace_id VARCHAR NOT NULL,
    conversation_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    
    -- Feedback type and content
    feedback_type VARCHAR NOT NULL,
    question TEXT NOT NULL,
    user_response TEXT,
    approved BOOLEAN,
    
    -- Original AI suggestion
    original_suggestion TEXT,
    corrected_value TEXT,
    
    -- Processing status
    processed BOOLEAN NOT NULL DEFAULT false,
    learned_knowledge_id VARCHAR,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (learned_knowledge_id) REFERENCES long_term_memory(id) ON DELETE SET NULL,
    CHECK (feedback_type IN ('confirmation', 'approval', 'correction', 'preference', 'clarification'))
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Basic indexes
CREATE INDEX idx_hitl_workspace ON hitl_feedback(workspace_id);
CREATE INDEX idx_hitl_conversation ON hitl_feedback(conversation_id);
CREATE INDEX idx_hitl_user ON hitl_feedback(user_id);
CREATE INDEX idx_hitl_type ON hitl_feedback(feedback_type);
CREATE INDEX idx_hitl_approved ON hitl_feedback(approved);
CREATE INDEX idx_hitl_processed ON hitl_feedback(processed);
CREATE INDEX idx_hitl_created_at ON hitl_feedback(created_at DESC);

-- For learning pipeline
CREATE INDEX idx_hitl_unprocessed ON hitl_feedback(workspace_id, processed, created_at)
WHERE processed = false;

-- For analytics
CREATE INDEX idx_hitl_workspace_type_approved ON hitl_feedback(workspace_id, feedback_type, approved);

-- GIN index for metadata
CREATE INDEX idx_hitl_metadata ON hitl_feedback USING gin(metadata);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE hitl_feedback IS 
'Human-in-the-loop feedback for AI learning and improvement';

COMMENT ON COLUMN hitl_feedback.workspace_id IS 
'Workspace context';

COMMENT ON COLUMN hitl_feedback.conversation_id IS 
'Conversation where feedback was requested';

COMMENT ON COLUMN hitl_feedback.user_id IS 
'User who provided feedback';

COMMENT ON COLUMN hitl_feedback.feedback_type IS 
'Type: confirmation, approval, correction, preference, clarification';

COMMENT ON COLUMN hitl_feedback.question IS 
'Question asked to user';

COMMENT ON COLUMN hitl_feedback.user_response IS 
'Free-form user response';

COMMENT ON COLUMN hitl_feedback.approved IS 
'For approval-type feedback: true/false/null';

COMMENT ON COLUMN hitl_feedback.original_suggestion IS 
'What AI originally suggested';

COMMENT ON COLUMN hitl_feedback.corrected_value IS 
'User correction if original was wrong';

COMMENT ON COLUMN hitl_feedback.processed IS 
'Whether feedback has been processed into long-term memory';

COMMENT ON COLUMN hitl_feedback.learned_knowledge_id IS 
'Reference to knowledge created from this feedback';

-- ============================================================================
-- Trigger to auto-update processed_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_hitl_processed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.processed = true AND OLD.processed = false THEN
        NEW.processed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hitl_processed_at
    BEFORE UPDATE ON hitl_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_hitl_processed_at();

-- ============================================================================
-- Function to create confirmation request
-- ============================================================================
CREATE OR REPLACE FUNCTION request_confirmation(
    p_workspace_id VARCHAR,
    p_conversation_id VARCHAR,
    p_user_id VARCHAR,
    p_question TEXT,
    p_original_suggestion TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VARCHAR AS $$
DECLARE
    v_feedback_id VARCHAR;
BEGIN
    INSERT INTO hitl_feedback (
        workspace_id,
        conversation_id,
        user_id,
        feedback_type,
        question,
        original_suggestion,
        metadata
    ) VALUES (
        p_workspace_id,
        p_conversation_id,
        p_user_id,
        'confirmation',
        p_question,
        p_original_suggestion,
        p_metadata
    )
    RETURNING id INTO v_feedback_id;
    
    RETURN v_feedback_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION request_confirmation IS 
'Create a confirmation request for user';

-- ============================================================================
-- Function to process feedback into knowledge
-- ============================================================================
CREATE OR REPLACE FUNCTION process_hitl_feedback(
    p_feedback_id VARCHAR,
    p_knowledge_type VARCHAR,
    p_key VARCHAR,
    p_value TEXT,
    p_confidence_score DECIMAL DEFAULT 1.0
)
RETURNS VARCHAR AS $$
DECLARE
    v_workspace_id VARCHAR;
    v_knowledge_id VARCHAR;
BEGIN
    -- Get workspace from feedback
    SELECT workspace_id INTO v_workspace_id
    FROM hitl_feedback
    WHERE id = p_feedback_id;
    
    -- Create or update knowledge
    SELECT upsert_knowledge(
        v_workspace_id,
        p_knowledge_type,
        p_key,
        p_value,
        'hitl_confirmation',
        p_confidence_score,
        jsonb_build_object('feedback_id', p_feedback_id)
    ) INTO v_knowledge_id;
    
    -- Mark feedback as processed
    UPDATE hitl_feedback
    SET 
        processed = true,
        learned_knowledge_id = v_knowledge_id
    WHERE id = p_feedback_id;
    
    RETURN v_knowledge_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_hitl_feedback IS 
'Process feedback into long-term memory knowledge';

-- ============================================================================
-- Function to get pending feedback
-- ============================================================================
CREATE OR REPLACE FUNCTION get_pending_feedback(
    p_workspace_id VARCHAR,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id VARCHAR,
    feedback_type VARCHAR,
    question TEXT,
    original_suggestion TEXT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.feedback_type,
        f.question,
        f.original_suggestion,
        f.created_at
    FROM hitl_feedback f
    WHERE f.workspace_id = p_workspace_id
        AND f.processed = false
    ORDER BY f.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pending_feedback IS 
'Get pending (unprocessed) feedback for a workspace';

COMMIT;

-- ============================================================================
-- Usage Examples
-- ============================================================================
/*
-- Request confirmation from user
SELECT request_confirmation(
    'workspace-123',
    'conversation-456',
    'user-789',
    'Document "API Spec v2" conflicts with meeting notes. Which is correct?',
    'Using meeting notes as source',
    '{
        "conflict_documents": ["doc-api-spec-v2", "doc-meeting-notes"],
        "confidence_before": 0.60
    }'::jsonb
);

-- User provides feedback
UPDATE hitl_feedback
SET 
    approved = false,
    corrected_value = 'API Spec v2 is the authoritative source',
    metadata = metadata || '{"user_confidence": "certain"}'::jsonb
WHERE id = 'feedback-id-123';

-- Process feedback into knowledge
SELECT process_hitl_feedback(
    'feedback-id-123',
    'decision',
    'api_spec_priority',
    'API Spec v2 is the authoritative source for API requirements',
    1.0
);

-- Get pending feedback for processing
SELECT * FROM get_pending_feedback('workspace-123', 10);

-- Feedback analytics
SELECT 
    feedback_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE approved = true) as approved_count,
    COUNT(*) FILTER (WHERE approved = false) as rejected_count,
    COUNT(*) FILTER (WHERE approved IS NULL) as pending_count,
    COUNT(*) FILTER (WHERE processed = true) as processed_count,
    AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time_seconds
FROM hitl_feedback
WHERE workspace_id = 'workspace-123'
    AND created_at > NOW() - INTERVAL '30 days'
GROUP BY feedback_type;

-- User engagement metrics
SELECT 
    user_id,
    COUNT(*) as feedback_provided,
    COUNT(*) FILTER (WHERE approved = true) as approvals,
    COUNT(*) FILTER (WHERE approved = false) as rejections,
    COUNT(*) FILTER (WHERE corrected_value IS NOT NULL) as corrections,
    MAX(created_at) as last_feedback_at
FROM hitl_feedback
WHERE workspace_id = 'workspace-123'
GROUP BY user_id
ORDER BY feedback_provided DESC;

-- Learning pipeline: unprocessed feedback
SELECT 
    id,
    feedback_type,
    question,
    user_response,
    corrected_value,
    created_at
FROM hitl_feedback
WHERE workspace_id = 'workspace-123'
    AND processed = false
    AND approved IS NOT NULL
ORDER BY created_at ASC;

-- Effectiveness: knowledge created from HITL
SELECT 
    f.feedback_type,
    l.knowledge_type,
    l.key,
    l.value,
    l.confidence_score,
    l.access_count,
    f.created_at as feedback_date
FROM hitl_feedback f
JOIN long_term_memory l ON f.learned_knowledge_id = l.id
WHERE f.workspace_id = 'workspace-123'
    AND f.processed = true
ORDER BY l.access_count DESC, f.created_at DESC;
*/
