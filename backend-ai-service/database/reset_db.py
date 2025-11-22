import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def reset_db():
    """Drop public schema and recreate it to wipe all data and tables"""
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("❌ DATABASE_URL not set")
        return

    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("🗑️  Dropping public schema...")
        cursor.execute("DROP SCHEMA public CASCADE;")
        cursor.execute("CREATE SCHEMA public;")
        cursor.execute("GRANT ALL ON SCHEMA public TO postgres;")
        cursor.execute("GRANT ALL ON SCHEMA public TO public;")
        
        print("✅ Database reset complete.")
        conn.close()
    except Exception as e:
        print(f"❌ Failed to reset DB: {e}")

if __name__ == "__main__":
    reset_db()
