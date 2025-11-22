import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_db_connection():
    """Test connection to DB and list all tables"""
    try:
        # Get DB URL from environment
        db_url = os.getenv('DATABASE_URL')
        
        if not db_url:
            print("❌ DATABASE_URL environment variable not set")
            return False
            
        print(f"Testing connection to DB...")
        
        # Connect to database
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Execute simple query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✓ Connected to: {version[0]}")
        
        # List tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"\nFound {len(tables)} tables:")
        for table in tables:
            print(f"  - {table[0]}")
            
        # Check workspaces
        cursor.execute("SELECT id, name FROM workspaces")
        workspaces = cursor.fetchall()
        print(f"\nFound {len(workspaces)} workspaces:")
        for ws in workspaces:
            print(f"  - {ws[0]} ({ws[1]})")
            
        print("-" * 80)
            
        cursor.close()
        conn.close()
        print("\n✓ Successfully connected to DB!")
        return True
        
    except Exception as e:
        print(f"\n❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    test_db_connection()
