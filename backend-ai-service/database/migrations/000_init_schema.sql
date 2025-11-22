-- Initial Schema Creation
-- Creates base tables required for the application

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR,
    owner_id VARCHAR NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    allow_invites BOOLEAN DEFAULT TRUE,
    default_task_view VARCHAR,
    default_document_view VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR PRIMARY KEY,
    workspace_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    description VARCHAR,
    status VARCHAR NOT NULL,
    priority VARCHAR NOT NULL,
    due_date TIMESTAMP,
    order_index INTEGER NOT NULL DEFAULT 0,
    assignee_id VARCHAR, -- Added directly here
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR PRIMARY KEY,
    workspace_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    parent_id VARCHAR,
    title VARCHAR NOT NULL,
    content TEXT,
    icon VARCHAR,
    trashed BOOLEAN DEFAULT FALSE,
    trashed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Boards
CREATE TABLE IF NOT EXISTS boards (
    id VARCHAR PRIMARY KEY,
    workspace_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    snapshot TEXT, -- JSON string
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS workspace_members (
    id VARCHAR PRIMARY KEY,
    workspace_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    role VARCHAR NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Subtasks
CREATE TABLE IF NOT EXISTS subtasks (
    id VARCHAR PRIMARY KEY,
    task_id VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Task Tags
CREATE TABLE IF NOT EXISTS task_tags (
    task_id VARCHAR NOT NULL,
    tag VARCHAR NOT NULL,
    PRIMARY KEY (task_id, tag)
);

-- Workspace Invites
CREATE TABLE IF NOT EXISTS workspace_invites (
    id VARCHAR PRIMARY KEY,
    workspace_id VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    role VARCHAR NOT NULL,
    token VARCHAR NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Task Docs (Link between tasks and documents)
CREATE TABLE IF NOT EXISTS task_docs (
    id VARCHAR PRIMARY KEY,
    task_id VARCHAR NOT NULL,
    doc_id VARCHAR NOT NULL,
    user_id VARCHAR,
    relation_type VARCHAR,
    note VARCHAR,
    created_by VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
