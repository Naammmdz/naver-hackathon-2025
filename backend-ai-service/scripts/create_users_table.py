"""Quick script to create users table"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('NEONDB'))
cur = conn.cursor()

# Create users table
cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        email VARCHAR NOT NULL UNIQUE,
        name VARCHAR NOT NULL,
        avatar_url VARCHAR,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
""")

# Create indexes  
cur.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users(email)")
cur.execute("CREATE INDEX IF NOT EXISTS ix_users_name ON users(name)")

# Insert mock users
cur.execute("""
    INSERT INTO users (id, email, name, avatar_url) VALUES
    ('user_3598sVShk4DTuSUrlZgc8loUPJd', 'thanhnx@devholic.com', 'ThanhNX', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ThanhNX'),
    ('user_alice_12345', 'alice@devholic.com', 'Alice Nguyen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'),
    ('user_bob_67890', 'bob@devholic.com', 'Bob Tran', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'),
    ('user_charlie_11111', 'charlie@devholic.com', 'Charlie Le', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie'),
    ('user_diana_22222', 'diana@devholic.com', 'Diana Pham', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana'),
    ('user_evan_33333', 'evan@devholic.com', 'Evan Vo', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Evan')
    ON CONFLICT (id) DO NOTHING
""")

conn.commit()
print('✓ Users table created and populated')

# Verify
cur.execute('SELECT id, name, email FROM users')
print('\n=== USERS ===')
for row in cur.fetchall():
    print(f'{row[1]:<20} | {row[2]}')

cur.close()
conn.close()
