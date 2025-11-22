#!/usr/bin/env python3
"""
Run HITL migration 009
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import psycopg2

# Load environment variables
load_dotenv()

def run_migration():
    """Run the HITL extension migration"""
    # Connect to database
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("❌ DATABASE_URL environment variable not set")
        return False
    
    # Read migration file
    migration_file = Path(__file__).parent / "migrations" / "009_extend_hitl_feedback.sql"
    with open(migration_file) as f:
        sql = f.read()
    
    # Execute migration
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        cursor.execute(sql)
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Migration 009_extend_hitl_feedback.sql completed successfully")
        return True
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    run_migration()
