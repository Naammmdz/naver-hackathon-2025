import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_neondb_connection():
    """Test connection to Neon DB and list all tables"""
    
    # Get connection string from environment
    db_url = os.getenv('NEONDB')
    branch = os.getenv('BRANCH')
    
    print(f"Testing connection to Neon DB...")
    print(f"Branch: {branch}")
    print(f"Connection URL: {db_url[:50]}..." if db_url else "No connection URL found")
    print("-" * 80)
    
    try:
        # Connect to the database
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        print("✓ Successfully connected to Neon DB!")
        print("-" * 80)
        
        # Get database version
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()[0]
        print(f"\nDatabase Version:\n{db_version}")
        print("-" * 80)
        
        # Get current database name
        cursor.execute("SELECT current_database();")
        current_db = cursor.fetchone()[0]
        print(f"\nCurrent Database: {current_db}")
        print("-" * 80)
        
        # List all schemas
        cursor.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
            ORDER BY schema_name;
        """)
        schemas = cursor.fetchall()
        print(f"\nSchemas ({len(schemas)}):")
        for schema in schemas:
            print(f"  - {schema[0]}")
        print("-" * 80)
        
        # List all tables in public schema
        cursor.execute("""
            SELECT table_schema, table_name, table_type
            FROM information_schema.tables
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY table_schema, table_name;
        """)
        tables = cursor.fetchall()
        
        print(f"\nTables ({len(tables)}):")
        if tables:
            for schema, table, table_type in tables:
                print(f"  - {schema}.{table} ({table_type})")
                
                # Get column information for each table
                cursor.execute("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = %s AND table_name = %s
                    ORDER BY ordinal_position;
                """, (schema, table))
                columns = cursor.fetchall()
                
                print(f"    Columns:")
                for col_name, data_type, is_nullable in columns:
                    nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
                    print(f"      - {col_name}: {data_type} ({nullable})")
                
                # Get row count
                cursor.execute(sql.SQL("SELECT COUNT(*) FROM {}.{}").format(
                    sql.Identifier(schema),
                    sql.Identifier(table)
                ))
                row_count = cursor.fetchone()[0]
                print(f"    Row count: {row_count}")
                print()
        else:
            print("  No tables found in the database.")
        
        print("-" * 80)
        
        # Close connection
        cursor.close()
        conn.close()
        print("\n✓ Connection closed successfully.")
        
    except psycopg2.Error as e:
        print(f"\n✗ Database error occurred:")
        print(f"Error Code: {e.pgcode}")
        print(f"Error Message: {e.pgerror}")
        return False
    except Exception as e:
        print(f"\n✗ Error occurred: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    test_neondb_connection()
