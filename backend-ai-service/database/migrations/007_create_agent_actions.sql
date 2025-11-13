-- ============================================================================
-- Migration: Create Agent Actions Table
-- Description: Log all agent actions for debugging and analytics
-- Author: AI Assistant
-- Date: 2025-11-08
-- ============================================================================

BEGIN;

-- ============================================================================
-- Create agent_actions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_actions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Context
    workspace_id VARCHAR NOT NULL,
    conversation_id VARCHAR,
    
    -- Agent information
    agent_name VARCHAR NOT NULL,
    action_type VARCHAR NOT NULL,
    
    -- Execution details
    input_data JSONB,
    output_data JSONB,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    execution_time_ms INTEGER,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    CHECK (execution_time_ms IS NULL OR execution_time_ms >= 0)
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Basic indexes
CREATE INDEX idx_agent_actions_workspace ON agent_actions(workspace_id);
CREATE INDEX idx_agent_actions_conversation ON agent_actions(conversation_id);
CREATE INDEX idx_agent_actions_agent ON agent_actions(agent_name);
CREATE INDEX idx_agent_actions_action ON agent_actions(action_type);
CREATE INDEX idx_agent_actions_success ON agent_actions(success);
CREATE INDEX idx_agent_actions_timestamp ON agent_actions(timestamp DESC);

-- Composite indexes for common analytics queries
CREATE INDEX idx_agent_actions_agent_success ON agent_actions(agent_name, success);
CREATE INDEX idx_agent_actions_agent_timestamp ON agent_actions(agent_name, timestamp DESC);
CREATE INDEX idx_agent_actions_workspace_timestamp ON agent_actions(workspace_id, timestamp DESC);

-- For performance monitoring
CREATE INDEX idx_agent_actions_execution_time ON agent_actions(execution_time_ms DESC NULLS LAST)
WHERE success = true;

-- For error analysis
CREATE INDEX idx_agent_actions_errors ON agent_actions(agent_name, action_type, timestamp DESC)
WHERE success = false;

-- GIN indexes for JSONB
CREATE INDEX idx_agent_actions_input ON agent_actions USING gin(input_data);
CREATE INDEX idx_agent_actions_output ON agent_actions USING gin(output_data);
CREATE INDEX idx_agent_actions_metadata ON agent_actions USING gin(metadata);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE agent_actions IS 
'Audit log of all agent actions for debugging and analytics';

COMMENT ON COLUMN agent_actions.workspace_id IS 
'Workspace context for the action';

COMMENT ON COLUMN agent_actions.conversation_id IS 
'Optional link to conversation that triggered this action';

COMMENT ON COLUMN agent_actions.agent_name IS 
'Agent that performed action: orchestrator, task_agent, document_agent, board_agent';

COMMENT ON COLUMN agent_actions.action_type IS 
'Type of action: retrieve_document, analyze_task, generate_chart, detect_intent, etc.';

COMMENT ON COLUMN agent_actions.input_data IS 
'Input parameters for the action';

COMMENT ON COLUMN agent_actions.output_data IS 
'Output/result of the action';

COMMENT ON COLUMN agent_actions.success IS 
'Whether the action completed successfully';

COMMENT ON COLUMN agent_actions.error_message IS 
'Error details if success = false';

COMMENT ON COLUMN agent_actions.execution_time_ms IS 
'Execution time in milliseconds';

-- ============================================================================
-- Trigger to prevent updates
-- ============================================================================
-- Agent actions should be immutable (audit log)
CREATE OR REPLACE FUNCTION prevent_agent_action_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Agent actions are immutable. Updates not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_agent_action_update
    BEFORE UPDATE ON agent_actions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_agent_action_update();

-- ============================================================================
-- Function to log agent action
-- ============================================================================
CREATE OR REPLACE FUNCTION log_agent_action(
    p_workspace_id VARCHAR,
    p_conversation_id VARCHAR,
    p_agent_name VARCHAR,
    p_action_type VARCHAR,
    p_input_data JSONB,
    p_output_data JSONB,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VARCHAR AS $$
DECLARE
    v_action_id VARCHAR;
BEGIN
    INSERT INTO agent_actions (
        workspace_id,
        conversation_id,
        agent_name,
        action_type,
        input_data,
        output_data,
        success,
        error_message,
        execution_time_ms,
        metadata
    ) VALUES (
        p_workspace_id,
        p_conversation_id,
        p_agent_name,
        p_action_type,
        p_input_data,
        p_output_data,
        p_success,
        p_error_message,
        p_execution_time_ms,
        p_metadata
    )
    RETURNING id INTO v_action_id;
    
    RETURN v_action_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_agent_action IS 
'Helper function to log an agent action';

-- ============================================================================
-- Function to cleanup old actions
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_agent_actions(days_to_keep INTEGER DEFAULT 30)
RETURNS TABLE (
    deleted_count BIGINT,
    workspace_id VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH deleted AS (
        DELETE FROM agent_actions
        WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL
        RETURNING workspace_id
    )
    SELECT 
        COUNT(*)::BIGINT,
        deleted.workspace_id
    FROM deleted
    GROUP BY deleted.workspace_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_agent_actions IS 
'Delete agent actions older than specified days. Default: 30 days';

COMMIT;

-- ============================================================================
-- Usage Examples
-- ============================================================================
/*
-- Log a successful action
SELECT log_agent_action(
    'workspace-123',
    'conversation-456',
    'document_agent',
    'retrieve_document',
    '{"query": "API requirements", "top_k": 5}'::jsonb,
    '{"documents": [{"id": "doc-1", "score": 0.95}], "count": 5}'::jsonb,
    true,
    NULL,
    250,
    '{"model": "clir-emb-dolphin", "method": "vector_search"}'::jsonb
);

-- Log a failed action
SELECT log_agent_action(
    'workspace-123',
    'conversation-456',
    'task_agent',
    'analyze_risk',
    '{"milestone": "Beta Release"}'::jsonb,
    NULL,
    false,
    'Database connection timeout',
    5000,
    '{"retry_count": 3}'::jsonb
);

-- Get recent actions for a workspace
SELECT 
    agent_name,
    action_type,
    success,
    execution_time_ms,
    timestamp
FROM agent_actions
WHERE workspace_id = 'workspace-123'
ORDER BY timestamp DESC
LIMIT 20;

-- Agent performance analytics
SELECT 
    agent_name,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE success = true) as successful_actions,
    COUNT(*) FILTER (WHERE success = false) as failed_actions,
    ROUND(AVG(execution_time_ms)::numeric, 2) as avg_execution_time_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms)::numeric, 2) as p95_execution_time_ms
FROM agent_actions
WHERE workspace_id = 'workspace-123'
    AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY agent_name
ORDER BY total_actions DESC;

-- Action type distribution
SELECT 
    agent_name,
    action_type,
    COUNT(*) as count,
    AVG(execution_time_ms) as avg_time_ms,
    COUNT(*) FILTER (WHERE success = false) as error_count
FROM agent_actions
WHERE workspace_id = 'workspace-123'
    AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY agent_name, action_type
ORDER BY count DESC;

-- Error analysis
SELECT 
    agent_name,
    action_type,
    error_message,
    COUNT(*) as error_count,
    MAX(timestamp) as last_occurrence
FROM agent_actions
WHERE workspace_id = 'workspace-123'
    AND success = false
    AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY agent_name, action_type, error_message
ORDER BY error_count DESC;

-- Slowest operations
SELECT 
    agent_name,
    action_type,
    execution_time_ms,
    timestamp,
    input_data->>'query' as query
FROM agent_actions
WHERE workspace_id = 'workspace-123'
    AND success = true
    AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY execution_time_ms DESC
LIMIT 10;

-- Cleanup old actions (keep last 30 days)
SELECT * FROM cleanup_old_agent_actions(30);
*/
