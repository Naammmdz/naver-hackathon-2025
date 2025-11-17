"""Check workspaces and documents in database"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.connection import get_db
from database.models.workspace import Workspace
from database.models.document import Document

print("🔍 Checking database...\n")

with get_db() as db:
    # List all workspaces
    workspaces = db.query(Workspace).all()
    print(f"📊 Found {len(workspaces)} workspaces:\n")
    
    for ws in workspaces:
        # Count documents
        doc_count = db.query(Document).filter(
            Document.workspace_id == ws.id,
            Document.trashed == False
        ).count()
        
        total_docs = db.query(Document).filter(
            Document.workspace_id == ws.id
        ).count()
        
        print(f"  Workspace: {ws.name}")
        print(f"    ID: {ws.id}")
        print(f"    Documents: {doc_count} (non-trashed) / {total_docs} (total)")
        
        # List first 5 documents
        if doc_count > 0:
            docs = db.query(Document).filter(
                Document.workspace_id == ws.id,
                Document.trashed == False
            ).limit(5).all()
            print(f"    Sample documents:")
            for doc in docs:
                print(f"      - {doc.title} (id: {doc.id})")
        print()

if __name__ == "__main__":
    pass

