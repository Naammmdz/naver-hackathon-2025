-- Create users table for readable user names
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    avatar_url VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_name ON users(name);

-- Insert mock users
INSERT INTO users (id, email, name, avatar_url) VALUES
('user_3598sVShk4DTuSUrlZgc8loUPJd', 'thanhnx@devholic.com', 'Xuan-Thanh Nguyen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ThanhNX'),
('user_alice_12345', 'alice@devholic.com', 'Alice Nguyen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'),
('user_bob_67890', 'bob@devholic.com', 'Bob Tran', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'),
('user_charlie_11111', 'charlie@devholic.com', 'Charlie Le', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie'),
('user_diana_22222', 'diana@devholic.com', 'Diana Pham', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana'),
('user_evan_33333', 'evan@devholic.com', 'Evan Vo', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Evan')
ON CONFLICT (id) DO NOTHING;
