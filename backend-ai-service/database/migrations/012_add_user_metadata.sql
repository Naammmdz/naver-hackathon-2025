-- Add user_metadata column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'user_metadata'
    ) THEN
        ALTER TABLE users ADD COLUMN user_metadata TEXT;
    END IF;
END $$;
