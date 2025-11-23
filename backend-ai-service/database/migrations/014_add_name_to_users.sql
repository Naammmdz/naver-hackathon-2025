-- Add name column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'name'
    ) THEN
        ALTER TABLE users ADD COLUMN name VARCHAR;
    END IF;
    
    -- Create index for name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'users' AND indexname = 'ix_users_name'
    ) THEN
        CREATE INDEX ix_users_name ON users(name);
    END IF;
END $$;
