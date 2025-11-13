-- ============================================================================
-- Migration: Add Performance Indexes
-- Description: Optimize common query patterns for agent operations
-- Author: AI Assistant
-- Date: 2025-11-08
-- ============================================================================

BEGIN;

-- ============================================================================
-- Tasks Indexes
-- ============================================================================
-- Single column indexes
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_priority ON tasks(workspace_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_due_date ON tasks(workspace_id, due_date);

-- For risk detection queries (overdue tasks)
-- Note: Can't use status != 'Done' as it's not immutable. Use IN instead or remove WHERE clause
CREATE INDEX IF NOT EXISTS idx_tasks_status_due_date ON tasks(status, due_date);

COMMENT ON INDEX idx_tasks_workspace IS 'Filter tasks by workspace';
COMMENT ON INDEX idx_tasks_status IS 'Filter tasks by status (Todo, In_Progress, etc.)';
COMMENT ON INDEX idx_tasks_priority IS 'Filter tasks by priority';
COMMENT ON INDEX idx_tasks_due_date IS 'Find tasks by due date (for deadline tracking)';
COMMENT ON INDEX idx_tasks_workspace_status IS 'Common query: tasks in workspace by status';
COMMENT ON INDEX idx_tasks_status_due_date IS 'Risk detection: find overdue tasks';

-- ============================================================================
-- Documents Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_documents_workspace ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_parent ON documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);

-- Partial index for active (non-trashed) documents
-- Using IS FALSE instead of = false for immutability
CREATE INDEX IF NOT EXISTS idx_documents_active ON documents(workspace_id)
WHERE trashed IS FALSE;

-- For hierarchical queries
CREATE INDEX IF NOT EXISTS idx_documents_workspace_parent ON documents(workspace_id, parent_id);

COMMENT ON INDEX idx_documents_workspace IS 'Filter documents by workspace';
COMMENT ON INDEX idx_documents_parent IS 'Hierarchical document structure';
COMMENT ON INDEX idx_documents_active IS 'Quick access to active documents only';

-- ============================================================================
-- Boards Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_boards_workspace ON boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_boards_user ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_created_at ON boards(created_at DESC);

COMMENT ON INDEX idx_boards_workspace IS 'Filter boards by workspace';

-- ============================================================================
-- Subtasks Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_done ON subtasks(done);

-- Composite for progress tracking
CREATE INDEX IF NOT EXISTS idx_subtasks_task_done ON subtasks(task_id, done);

COMMENT ON INDEX idx_subtasks_task IS 'Get all subtasks for a task';
COMMENT ON INDEX idx_subtasks_task_done IS 'Calculate task completion percentage';

-- ============================================================================
-- Task_tags Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag);

-- For tag-based filtering
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_task ON task_tags(tag, task_id);

COMMENT ON INDEX idx_task_tags_task IS 'Get all tags for a task';
COMMENT ON INDEX idx_task_tags_tag IS 'Find all tasks with a specific tag';

-- ============================================================================
-- Task_docs Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_task_docs_task ON task_docs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_docs_doc ON task_docs(doc_id);
CREATE INDEX IF NOT EXISTS idx_task_docs_relation ON task_docs(relation_type);
CREATE INDEX IF NOT EXISTS idx_task_docs_created_at ON task_docs(created_at DESC);

-- Composite for common queries
CREATE INDEX IF NOT EXISTS idx_task_docs_task_relation ON task_docs(task_id, relation_type);

COMMENT ON INDEX idx_task_docs_task IS 'Get all documents linked to a task';
COMMENT ON INDEX idx_task_docs_doc IS 'Get all tasks linked to a document';
COMMENT ON INDEX idx_task_docs_relation IS 'Filter by relationship type';

-- ============================================================================
-- Workspace_members Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(role);

-- For permission checks
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_user ON workspace_members(workspace_id, user_id);

COMMENT ON INDEX idx_workspace_members_workspace IS 'Get all members of a workspace';
COMMENT ON INDEX idx_workspace_members_user IS 'Get all workspaces for a user';
COMMENT ON INDEX idx_workspace_members_workspace_user IS 'Check user permissions in workspace';

-- ============================================================================
-- Workspace_invites Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace ON workspace_invites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON workspace_invites(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_expires ON workspace_invites(expires_at);

-- For cleanup of expired invites  
-- Note: NOW() is not immutable, so we can't use it in WHERE clause
-- This index will be useful anyway for sorting by expires_at
CREATE INDEX IF NOT EXISTS idx_workspace_invites_expired ON workspace_invites(expires_at);

COMMENT ON INDEX idx_workspace_invites_email IS 'Find invites by email';
COMMENT ON INDEX idx_workspace_invites_expires IS 'Find expiring/expired invites';

COMMIT;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify all indexes were created:
/*
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
*/

-- ============================================================================
-- Index Usage Statistics (run after some usage)
-- ============================================================================
/*
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
*/
