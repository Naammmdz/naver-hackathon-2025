-- Fix schema issues for documents and users tables

-- 1. Fix documents.content type (change from VARCHAR(255) to TEXT)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'content'
    ) THEN
        ALTER TABLE documents ALTER COLUMN content TYPE TEXT;
    END IF;
END $$;

-- 2. Ensure users table has required columns
DO $$
BEGIN
    -- Add name if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'name'
    ) THEN
        ALTER TABLE users ADD COLUMN name VARCHAR;
    END IF;

    -- Add user_metadata if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'user_metadata'
    ) THEN
        -- Check if 'metadata' exists (from 010 migration) and rename it if user_metadata doesn't exist
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'metadata'
        ) THEN
            ALTER TABLE users RENAME COLUMN metadata TO user_metadata;
        ELSE
            ALTER TABLE users ADD COLUMN user_metadata TEXT;
        END IF;
    END IF;
    
    -- Ensure indexes exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'users' AND indexname = 'ix_users_name'
    ) THEN
        CREATE INDEX ix_users_name ON users(name);
    END IF;
END $$;
