-- Sync schema with backend-core-service

-- Add assignee_id to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id VARCHAR;
CREATE INDEX IF NOT EXISTS ix_tasks_assignee_id ON tasks (assignee_id);

-- Update users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS image_url VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata TEXT;

-- Create indexes for new user columns
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username);

-- Migrate existing data (best effort)
-- We assume 'name' might map to 'username' or 'first_name' depending on usage, 
-- but for now mapping to username is safest for display.
UPDATE users SET username = name WHERE username IS NULL;
UPDATE users SET image_url = avatar_url WHERE image_url IS NULL;
