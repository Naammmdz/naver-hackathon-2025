-- ============================================================================
-- Migration: Add Missing Foreign Key Constraints
-- Description: Ensure referential integrity across tables
-- Author: AI Assistant
-- Date: 2025-11-08
-- ============================================================================

BEGIN;

-- ============================================================================
-- Tasks -> Workspaces
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_tasks_workspace'
    ) THEN
        ALTER TABLE tasks 
        ADD CONSTRAINT fk_tasks_workspace 
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
        
        COMMENT ON CONSTRAINT fk_tasks_workspace ON tasks IS 
        'Ensures tasks belong to valid workspaces. Cascade delete tasks when workspace is deleted.';
    END IF;
END $$;

-- ============================================================================
-- Boards -> Workspaces
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_boards_workspace'
    ) THEN
        ALTER TABLE boards 
        ADD CONSTRAINT fk_boards_workspace 
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
        
        COMMENT ON CONSTRAINT fk_boards_workspace ON boards IS 
        'Ensures boards belong to valid workspaces. Cascade delete boards when workspace is deleted.';
    END IF;
END $$;

-- ============================================================================
-- Documents -> Workspaces
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_documents_workspace'
    ) THEN
        ALTER TABLE documents 
        ADD CONSTRAINT fk_documents_workspace 
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
        
        COMMENT ON CONSTRAINT fk_documents_workspace ON documents IS 
        'Ensures documents belong to valid workspaces. Cascade delete documents when workspace is deleted.';
    END IF;
END $$;

-- ============================================================================
-- Documents -> Documents (parent relationship)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_documents_parent'
    ) THEN
        ALTER TABLE documents 
        ADD CONSTRAINT fk_documents_parent 
        FOREIGN KEY (parent_id) REFERENCES documents(id) ON DELETE CASCADE;
        
        COMMENT ON CONSTRAINT fk_documents_parent ON documents IS 
        'Hierarchical document structure. Cascade delete children when parent is deleted.';
    END IF;
END $$;

-- ============================================================================
-- Task_docs -> Tasks
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_task_docs_task'
    ) THEN
        ALTER TABLE task_docs 
        ADD CONSTRAINT fk_task_docs_task 
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
        
        COMMENT ON CONSTRAINT fk_task_docs_task ON task_docs IS 
        'Links documents to tasks. Cascade delete links when task is deleted.';
    END IF;
END $$;

-- ============================================================================
-- Task_docs -> Documents
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_task_docs_doc'
    ) THEN
        ALTER TABLE task_docs 
        ADD CONSTRAINT fk_task_docs_doc 
        FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE;
        
        COMMENT ON CONSTRAINT fk_task_docs_doc ON task_docs IS 
        'Links documents to tasks. Cascade delete links when document is deleted.';
    END IF;
END $$;

-- ============================================================================
-- Workspace_invites -> Workspaces
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_workspace_invites_workspace'
    ) THEN
        ALTER TABLE workspace_invites 
        ADD CONSTRAINT fk_workspace_invites_workspace 
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
        
        COMMENT ON CONSTRAINT fk_workspace_invites_workspace ON workspace_invites IS 
        'Ensures invites belong to valid workspaces. Cascade delete invites when workspace is deleted.';
    END IF;
END $$;

-- ============================================================================
-- Subtasks -> Tasks
-- ============================================================================
-- This FK already exists based on DATABASE_SCHEMA.md, but we verify it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subtasks_task_id_fkey'
    ) THEN
        ALTER TABLE subtasks 
        ADD CONSTRAINT subtasks_task_id_fkey 
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- Task_tags -> Tasks
-- ============================================================================
-- This FK already exists based on DATABASE_SCHEMA.md, but we verify it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'task_tags_task_id_fkey'
    ) THEN
        ALTER TABLE task_tags 
        ADD CONSTRAINT task_tags_task_id_fkey 
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- Workspace_members -> Workspaces
-- ============================================================================
-- This FK already exists based on DATABASE_SCHEMA.md, but we verify it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'workspace_members_workspace_id_fkey'
    ) THEN
        ALTER TABLE workspace_members 
        ADD CONSTRAINT workspace_members_workspace_id_fkey 
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify all foreign keys were created:
/*
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;
*/
