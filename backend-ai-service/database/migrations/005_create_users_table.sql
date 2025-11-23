-- Create users table for readable user names
-- Handle case where table already exists (from backend-core)
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        -- Create table with all columns
        CREATE TABLE users (
            id VARCHAR PRIMARY KEY,
            email VARCHAR NOT NULL UNIQUE,
            name VARCHAR NOT NULL,
            avatar_url VARCHAR,
            user_metadata TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    ELSE
        -- Table exists, add missing columns
        -- Add name if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'name'
        ) THEN
            ALTER TABLE users ADD COLUMN name VARCHAR;
        END IF;
        
        -- Add avatar_url if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'avatar_url'
        ) THEN
            ALTER TABLE users ADD COLUMN avatar_url VARCHAR;
        END IF;

        -- Add user_metadata if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'user_metadata'
        ) THEN
            ALTER TABLE users ADD COLUMN user_metadata TEXT;
        END IF;
        
        -- Add created_at if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
        END IF;
        
        -- Add updated_at if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
        END IF;
        
        -- Add email if missing (should exist but check anyway)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'email'
        ) THEN
            ALTER TABLE users ADD COLUMN email VARCHAR;
        END IF;
    END IF;
END $$;

-- Create indexes (only if columns exist)
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

-- Only create name index if the column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'name'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'users' AND indexname = 'ix_users_name'
    ) THEN
        CREATE INDEX ix_users_name ON users(name);
    END IF;
END $$;

-- Insert mock users (only if name column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'name'
    ) THEN
        -- Check if created_at column exists to include it in INSERT
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'created_at'
        ) THEN
            -- Include created_at and updated_at in INSERT
            INSERT INTO users (id, email, name, avatar_url, created_at, updated_at) VALUES
            ('user_3598sVShk4DTuSUrlZgc8loUPJd', 'thanhnx@devholic.com', 'Xuan-Thanh Nguyen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ThanhNX', NOW(), NOW()),
            ('user_alice_12345', 'alice@devholic.com', 'Alice Nguyen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', NOW(), NOW()),
            ('user_bob_67890', 'bob@devholic.com', 'Bob Tran', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', NOW(), NOW()),
            ('user_charlie_11111', 'charlie@devholic.com', 'Charlie Le', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie', NOW(), NOW()),
            ('user_diana_22222', 'diana@devholic.com', 'Diana Pham', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana', NOW(), NOW()),
            ('user_evan_33333', 'evan@devholic.com', 'Evan Vo', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Evan', NOW(), NOW())
            ON CONFLICT (id) DO NOTHING;
        ELSE
            -- created_at doesn't exist, insert without it
            INSERT INTO users (id, email, name, avatar_url) VALUES
            ('user_3598sVShk4DTuSUrlZgc8loUPJd', 'thanhnx@devholic.com', 'Xuan-Thanh Nguyen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ThanhNX'),
            ('user_alice_12345', 'alice@devholic.com', 'Alice Nguyen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'),
            ('user_bob_67890', 'bob@devholic.com', 'Bob Tran', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'),
            ('user_charlie_11111', 'charlie@devholic.com', 'Charlie Le', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie'),
            ('user_diana_22222', 'diana@devholic.com', 'Diana Pham', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana'),
            ('user_evan_33333', 'evan@devholic.com', 'Evan Vo', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Evan')
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;
END $$;
