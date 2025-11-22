import os
import psycopg2
import uuid

def create_test_workspace():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("❌ DATABASE_URL environment variable not set")
        return

    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        workspace_id = str(uuid.uuid4())
        owner_id = str(uuid.uuid4()) # Mock owner ID
        
        cursor.execute("""
            INSERT INTO workspaces (id, name, description, owner_id, is_public, allow_invites)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (workspace_id, "Test Workspace", "Workspace for testing AI APIs", owner_id, True, True))
        
        conn.commit()
        print(f"✅ Created workspace: {workspace_id}")
        
        cursor.close()
        conn.close()
        return workspace_id
        
    except Exception as e:
        print(f"❌ Error creating workspace: {e}")

if __name__ == "__main__":
    create_test_workspace()
