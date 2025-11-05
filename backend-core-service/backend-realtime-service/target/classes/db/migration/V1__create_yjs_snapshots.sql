CREATE TABLE IF NOT EXISTS yjs_snapshots (
    workspace_id VARCHAR PRIMARY KEY,
    snapshot BYTEA NOT NULL,
    vector BYTEA NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    user_id VARCHAR
);
