import os
import psycopg2

def mark_applied():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("❌ DATABASE_URL environment variable not set")
        return

    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Create table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_file VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        
        # Mark all current migrations as applied
        migrations = [
            "000_init_schema.sql",
            "001_add_foreign_keys.sql",
            "002_add_indexes.sql",
            "003_install_pgvector.sql",
            "004_create_document_chunks.sql",
            "005_create_conversations.sql",
            "005_create_users_table.sql",
            "006_create_long_term_memory.sql",
            "007_create_agent_actions.sql",
            "008_create_hitl_feedback.sql",
            "009_extend_hitl_feedback.sql",
            "009_update_embedding_dimension.sql",
            "010_sync_schema_with_core.sql",
        ]
        
        for migration in migrations:
            cursor.execute("""
                INSERT INTO schema_migrations (migration_file)
                VALUES (%s)
                ON CONFLICT (migration_file) DO NOTHING
            """, (migration,))
        
        conn.commit()
        print(f"✅ Marked {len(migrations)} migrations as applied")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    mark_applied()
