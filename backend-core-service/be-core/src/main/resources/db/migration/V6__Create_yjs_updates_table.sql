-- Migration: Create yjs_updates table for Yjs CRDT persistence
-- Purpose: Store Yjs binary updates to enable data recovery after server restart

CREATE TABLE IF NOT EXISTS yjs_updates (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(160) NOT NULL,
    update_data BYTEA NOT NULL,
    update_size INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    user_id VARCHAR(160),
    
    CONSTRAINT fk_yjs_updates_workspace 
        FOREIGN KEY (workspace_id) 
        REFERENCES workspaces(id) 
        ON DELETE CASCADE
);

-- Index for fast retrieval of updates by workspace
CREATE INDEX idx_yjs_updates_workspace_id 
    ON yjs_updates(workspace_id);

-- Index for chronological queries (used for loading state and pruning)
CREATE INDEX idx_yjs_updates_workspace_created 
    ON yjs_updates(workspace_id, created_at);

-- Comments
COMMENT ON TABLE yjs_updates IS 'Stores Yjs CRDT binary updates for real-time collaboration persistence';
COMMENT ON COLUMN yjs_updates.workspace_id IS 'Workspace that owns this update - all documents in workspace share same Y.Doc';
COMMENT ON COLUMN yjs_updates.update_data IS 'Binary Yjs update data (CRDT operations)';
COMMENT ON COLUMN yjs_updates.update_size IS 'Size of update in bytes for monitoring';
COMMENT ON COLUMN yjs_updates.user_id IS 'User who created this update (optional, for debugging)';
