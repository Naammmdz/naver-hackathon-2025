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
-- Only update if columns exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'name'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
    ) THEN
        UPDATE users SET username = name WHERE username IS NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'avatar_url'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'image_url'
    ) THEN
        UPDATE users SET image_url = avatar_url WHERE image_url IS NULL;
    END IF;
END $$;
