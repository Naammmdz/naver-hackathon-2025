-- ============================================================================
-- Migration: Create Conversations Table
-- Description: Store chat history for short-term memory
-- Author: AI Assistant
-- Date: 2025-11-08
-- ============================================================================

BEGIN;

-- ============================================================================
-- Create conversations table
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Context
    workspace_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    session_id VARCHAR NOT NULL,
    
    -- Message content
    role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    
    -- AI metadata
    intent VARCHAR,
    agent_used VARCHAR,
    confidence_score DECIMAL(3,2),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Basic indexes
CREATE INDEX idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_session ON conversations(session_id);
CREATE INDEX idx_conversations_timestamp ON conversations(timestamp DESC);
CREATE INDEX idx_conversations_role ON conversations(role);

-- Agent analytics indexes
CREATE INDEX idx_conversations_agent ON conversations(agent_used);
CREATE INDEX idx_conversations_intent ON conversations(intent);

-- Composite indexes for common queries
CREATE INDEX idx_conversations_session_timestamp ON conversations(session_id, timestamp DESC);
CREATE INDEX idx_conversations_workspace_timestamp ON conversations(workspace_id, timestamp DESC);
CREATE INDEX idx_conversations_user_timestamp ON conversations(user_id, timestamp DESC);

-- For agent performance analysis
CREATE INDEX idx_conversations_agent_intent ON conversations(agent_used, intent)
WHERE agent_used IS NOT NULL;

-- GIN index for metadata
CREATE INDEX idx_conversations_metadata ON conversations USING gin(metadata);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE conversations IS 
'Chat history for short-term memory and context tracking';

COMMENT ON COLUMN conversations.id IS 
'Unique identifier for each message';

COMMENT ON COLUMN conversations.workspace_id IS 
'Workspace context for the conversation';

COMMENT ON COLUMN conversations.user_id IS 
'User who sent/received the message';

COMMENT ON COLUMN conversations.session_id IS 
'Groups related messages in a conversation session';

COMMENT ON COLUMN conversations.role IS 
'Message role: user (human), assistant (AI), system (internal)';

COMMENT ON COLUMN conversations.content IS 
'The actual message content';

COMMENT ON COLUMN conversations.intent IS 
'Detected user intent: query_task, analyze_risk, search_document, etc.';

COMMENT ON COLUMN conversations.agent_used IS 
'Which agent handled this: orchestrator, task_agent, document_agent, board_agent';

COMMENT ON COLUMN conversations.confidence_score IS 
'Confidence in intent detection (0-1)';

COMMENT ON COLUMN conversations.metadata IS 
'Additional data: {tokens_used, latency_ms, model_used, citations, etc.}';

-- ============================================================================
-- Trigger to prevent updates
-- ============================================================================
-- Conversations should be immutable (append-only log)
CREATE OR REPLACE FUNCTION prevent_conversation_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Conversations are immutable. Updates not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_conversation_update
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION prevent_conversation_update();

-- ============================================================================
-- Function to cleanup old conversations
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_conversations(days_to_keep INTEGER DEFAULT 90)
RETURNS TABLE (
    deleted_count BIGINT,
    workspace_id VARCHAR,
    oldest_deleted TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    WITH deleted AS (
        DELETE FROM conversations
        WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL
        RETURNING workspace_id, timestamp
    )
    SELECT 
        COUNT(*)::BIGINT,
        deleted.workspace_id,
        MIN(deleted.timestamp)
    FROM deleted
    GROUP BY deleted.workspace_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_conversations IS 
'Delete conversations older than specified days. Default: 90 days';

COMMIT;

-- ============================================================================
-- Usage Examples
-- ============================================================================
/*
-- Insert user message
INSERT INTO conversations (
    workspace_id,
    user_id,
    session_id,
    role,
    content
) VALUES (
    'workspace-123',
    'user-456',
    'session-789',
    'user',
    'Why is Beta Release delayed?'
);

-- Insert AI response
INSERT INTO conversations (
    workspace_id,
    user_id,
    session_id,
    role,
    content,
    intent,
    agent_used,
    confidence_score,
    metadata
) VALUES (
    'workspace-123',
    'user-456',
    'session-789',
    'assistant',
    'Beta Release is delayed due to...',
    'analyze_milestone_delay',
    'orchestrator',
    0.95,
    '{
        "tokens_used": 250,
        "latency_ms": 1200,
        "model_used": "HCX-007",
        "agents_called": ["task_agent", "document_agent"]
    }'::jsonb
);

-- Get conversation history for a session
SELECT 
    id,
    role,
    content,
    agent_used,
    timestamp
FROM conversations
WHERE session_id = 'session-789'
ORDER BY timestamp ASC;

-- Get recent conversations for a workspace
SELECT 
    session_id,
    COUNT(*) as message_count,
    MIN(timestamp) as session_start,
    MAX(timestamp) as session_end,
    COUNT(DISTINCT user_id) as unique_users
FROM conversations
WHERE workspace_id = 'workspace-123'
    AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY session_id
ORDER BY session_end DESC;

-- Agent performance analytics
SELECT 
    agent_used,
    intent,
    COUNT(*) as usage_count,
    AVG(confidence_score) as avg_confidence,
    AVG((metadata->>'latency_ms')::numeric) as avg_latency_ms
FROM conversations
WHERE role = 'assistant'
    AND agent_used IS NOT NULL
    AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY agent_used, intent
ORDER BY usage_count DESC;

-- Cleanup old conversations (keep last 90 days)
SELECT * FROM cleanup_old_conversations(90);
*/
