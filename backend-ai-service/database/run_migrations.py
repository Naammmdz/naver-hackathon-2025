#!/usr/bin/env python3
"""
Database Migration Runner
Runs all SQL migration files in order and verifies schema changes
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2 import sql

# Load environment variables
load_dotenv()

# Migration directory
MIGRATIONS_DIR = Path(__file__).parent / "migrations"

# Migration files in order
MIGRATION_FILES = [
    "001_add_foreign_keys.sql",
    "002_add_indexes.sql",
    "003_install_pgvector.sql",
    "004_create_document_chunks.sql",
    "005_create_conversations.sql",
    "006_create_long_term_memory.sql",
    "007_create_agent_actions.sql",
    "008_create_hitl_feedback.sql",
]

def connect_to_db():
    """Connect to database using environment variables"""
    db_url = os.getenv('NEONDB')
    if not db_url:
        raise ValueError("NEONDB environment variable not set")
    
    return psycopg2.connect(db_url)

def run_migration_file(cursor, filepath: Path):
    """Run a single migration file"""
    print(f"\n{'='*80}")
    print(f"Running migration: {filepath.name}")
    print('='*80)
    
    with open(filepath, 'r') as f:
        sql_content = f.read()
    
    try:
        cursor.execute(sql_content)
        print(f"✓ Migration {filepath.name} completed successfully")
        return True
    except psycopg2.Error as e:
        print(f"✗ Migration {filepath.name} failed:")
        print(f"  Error Code: {e.pgcode}")
        print(f"  Error Message: {e.pgerror}")
        return False

def verify_tables(cursor):
    """Verify new tables were created"""
    print(f"\n{'='*80}")
    print("Verifying new tables...")
    print('='*80)
    
    expected_tables = [
        'document_chunks',
        'conversations',
        'long_term_memory',
        'agent_actions',
        'hitl_feedback',
    ]
    
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    
    existing_tables = [row[0] for row in cursor.fetchall()]
    
    print(f"\nExisting tables ({len(existing_tables)}):")
    for table in existing_tables:
        marker = "✓ NEW" if table in expected_tables else "  "
        print(f"  {marker} {table}")
    
    # Check if all expected tables exist
    missing_tables = set(expected_tables) - set(existing_tables)
    if missing_tables:
        print(f"\n✗ Missing tables: {', '.join(missing_tables)}")
        return False
    else:
        print(f"\n✓ All {len(expected_tables)} new tables created successfully")
        return True

def verify_foreign_keys(cursor):
    """Verify foreign keys were created"""
    print(f"\n{'='*80}")
    print("Verifying foreign key constraints...")
    print('='*80)
    
    cursor.execute("""
        SELECT 
            tc.table_name,
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name;
    """)
    
    foreign_keys = cursor.fetchall()
    print(f"\nForeign Keys ({len(foreign_keys)}):")
    for table, constraint, column, ref_table, ref_column in foreign_keys:
        print(f"  ✓ {table}.{column} → {ref_table}.{ref_column}")
    
    return len(foreign_keys) > 0

def verify_indexes(cursor):
    """Verify indexes were created"""
    print(f"\n{'='*80}")
    print("Verifying indexes...")
    print('='*80)
    
    cursor.execute("""
        SELECT
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
            AND indexname NOT LIKE '%_pkey'
        ORDER BY tablename, indexname;
    """)
    
    indexes = cursor.fetchall()
    
    # Group by table
    table_indexes = {}
    for table, index, indexdef in indexes:
        if table not in table_indexes:
            table_indexes[table] = []
        table_indexes[table].append(index)
    
    print(f"\nIndexes by table:")
    for table, index_list in sorted(table_indexes.items()):
        print(f"\n  {table} ({len(index_list)} indexes):")
        for index in sorted(index_list):
            print(f"    ✓ {index}")
    
    print(f"\n✓ Total {len(indexes)} indexes created")
    return len(indexes) > 0

def verify_pgvector(cursor):
    """Verify pgvector extension is installed"""
    print(f"\n{'='*80}")
    print("Verifying pgvector extension...")
    print('='*80)
    
    cursor.execute("""
        SELECT 
            extname,
            extversion
        FROM pg_extension 
        WHERE extname = 'vector';
    """)
    
    result = cursor.fetchone()
    if result:
        name, version = result
        print(f"✓ pgvector extension installed")
        print(f"  Name: {name}")
        print(f"  Version: {version}")
        return True
    else:
        print("✗ pgvector extension not found")
        return False

def get_table_stats(cursor):
    """Get row counts for all tables"""
    print(f"\n{'='*80}")
    print("Table statistics...")
    print('='*80)
    
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    
    tables = [row[0] for row in cursor.fetchall()]
    
    stats = []
    for table in tables:
        cursor.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(
            sql.Identifier(table)
        ))
        count = cursor.fetchone()[0]
        stats.append((table, count))
    
    print(f"\nTable | Row Count")
    print("-" * 40)
    for table, count in stats:
        marker = "⭐" if count > 0 else "  "
        print(f"{marker} {table:30s} | {count:>6d}")
    
    total_rows = sum(count for _, count in stats)
    print("-" * 40)
    print(f"   {'TOTAL':30s} | {total_rows:>6d}")

def main():
    """Run all migrations"""
    print("\n" + "="*80)
    print("DATABASE MIGRATION RUNNER")
    print("="*80)
    
    # Connect to database
    try:
        conn = connect_to_db()
        conn.autocommit = False  # Use transactions
        cursor = conn.cursor()
        print("✓ Connected to database")
    except Exception as e:
        print(f"✗ Failed to connect to database: {e}")
        sys.exit(1)
    
    # Run migrations
    failed_migrations = []
    for migration_file in MIGRATION_FILES:
        filepath = MIGRATIONS_DIR / migration_file
        
        if not filepath.exists():
            print(f"✗ Migration file not found: {filepath}")
            failed_migrations.append(migration_file)
            continue
        
        success = run_migration_file(cursor, filepath)
        
        if success:
            conn.commit()
        else:
            conn.rollback()
            failed_migrations.append(migration_file)
            print(f"✗ Migration rolled back due to error")
            # Stop on first failure
            break
    
    # If all migrations succeeded, verify
    if not failed_migrations:
        print(f"\n{'='*80}")
        print("All migrations completed successfully!")
        print('='*80)
        
        # Verify changes
        verify_pgvector(cursor)
        verify_tables(cursor)
        verify_foreign_keys(cursor)
        verify_indexes(cursor)
        get_table_stats(cursor)
        
        print(f"\n{'='*80}")
        print("✓ MIGRATION COMPLETE - DATABASE READY FOR AGENTIC AI")
        print('='*80)
    else:
        print(f"\n{'='*80}")
        print(f"✗ MIGRATION FAILED")
        print('='*80)
        print(f"\nFailed migrations:")
        for migration in failed_migrations:
            print(f"  ✗ {migration}")
        sys.exit(1)
    
    # Close connection
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
