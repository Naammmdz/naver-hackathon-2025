"""
Graph API Server with Real Database Connection
Fetches data from actual documents in workspace
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Query, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import httpx

# Import database modules
try:
    from database.connection import get_db
    from database.models.workspace import Workspace
    from database.models.document import Document
    from sqlalchemy.orm import Session
    print("✅ Database modules loaded")
except Exception as e:
    print(f"❌ Failed to load database modules: {e}")
    print("⚠️  Make sure you have:")
    print("   1. Database connection configured in .env")
    print("   2. Required packages: pip install sqlalchemy psycopg2-binary")
    sys.exit(1)

app = FastAPI(title="Graph API Server")

# Java backend API URL (where documents are created)
JAVA_API_BASE_URL = os.getenv("JAVA_API_BASE_URL", "http://localhost:8989")

async def fetch_workspace_name(workspace_id: str, auth_token: Optional[str] = None) -> Optional[str]:
    """Fetch workspace name from Java API or database"""
    # Try Java API first
    try:
        headers = {}
        if auth_token:
            headers["Authorization"] = auth_token
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{JAVA_API_BASE_URL}/api/workspaces/{workspace_id}",
                headers=headers
            )
            if response.status_code == 200:
                workspace_data = response.json()
                return workspace_data.get('name') or workspace_data.get('title')
    except:
        pass
    
    # Fallback to database
    try:
        with get_db() as db:
            workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
            if workspace:
                return workspace.name
    except:
        pass
    
    return None

async def fetch_documents_from_java_api(workspace_id: str, user_id: Optional[str] = None, auth_token: Optional[str] = None) -> list:
    """Fetch documents from Java backend API"""
    try:
        url = f"{JAVA_API_BASE_URL}/api/documents/workspace/{workspace_id}"
        if user_id:
            url += f"?userId={user_id}"
        
        headers = {}
        if auth_token:
            headers["Authorization"] = auth_token
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                print(f"⚠️  Java API requires authentication (401)")
            else:
                print(f"⚠️  Java API returned status {response.status_code}")
            return []
    except httpx.ConnectError:
        print(f"⚠️  Java API not reachable at {JAVA_API_BASE_URL}")
        return []
    except Exception as e:
        print(f"⚠️  Failed to fetch from Java API: {e}")
        return []

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/graph")
async def get_workspace_graph(
    workspace_id: str = Query(..., description="Workspace ID"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    authorization: Optional[str] = Header(None)
):
    """Get graph data from real documents in workspace or user's documents"""
    
    print(f"📊 Fetching graph for workspace: {workspace_id}, user: {x_user_id}")
    
    # First, try to fetch documents from Java API (where documents are actually created)
    java_docs = await fetch_documents_from_java_api(workspace_id, x_user_id, authorization)
    
    if java_docs and len(java_docs) > 0:
        print(f"✅ Found {len(java_docs)} documents from Java API")
        # Get workspace name
        workspace_name = await fetch_workspace_name(workspace_id, authorization)
        if not workspace_name:
            workspace_name = "My Workspace"  # Fallback
        
        # Convert Java API documents to graph format
        nodes = []
        links = []
        tag_set = set()
        
        # Add workspace node with real name
        nodes.append({
            "id": f"workspace_{workspace_id}",
            "label": workspace_name,
            "type": "project"
        })
        
        # Process documents
        for doc in java_docs:
            doc_id = f"doc_{doc.get('id')}"
            node_type = "folder" if doc.get('parentId') is None else "note"
            
            node = {
                "id": doc_id,
                "label": doc.get('title', 'Untitled'),
                "type": node_type
            }
            
            if doc.get('parentId'):
                node["folder"] = f"doc_{doc.get('parentId')}"
            
            nodes.append(node)
            
            # Create links
            if not doc.get('parentId'):
                links.append({
                    "source": f"workspace_{workspace_id}",
                    "target": doc_id
                })
            else:
                links.append({
                    "source": f"doc_{doc.get('parentId')}",
                    "target": doc_id
                })
            
            # Extract tags from content if available
            content = doc.get('content', '')
            if content:
                import re
                hashtags = re.findall(r'#(\w+)', str(content))
                for tag in hashtags:
                    tag_id = f"tag_{tag.lower()}"
                    tag_set.add((tag_id, f"#{tag.lower()}"))
                    links.append({
                        "source": doc_id,
                        "target": tag_id
                    })
        
        # Add tag nodes
        for tag_id, tag_label in tag_set:
            nodes.append({
                "id": tag_id,
                "label": tag_label,
                "type": "tag"
            })
        
        print(f"✅ Generated graph from Java API: {len(nodes)} nodes, {len(links)} links")
        return {"nodes": nodes, "links": links}
    
    # Fallback to database query
    print("⚠️  No documents from Java API, trying database...")
    
    # Use database session with context manager
    with get_db() as db:
        try:
            workspace = None
            actual_workspace_id = None
            documents = []
            
            # Try to get workspace first
            workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
            
            if workspace:
                print(f"✅ Workspace found: {workspace.name} (id: {workspace.id})")
                actual_workspace_id = workspace.id
                
                # Get all documents in workspace (excluding trashed)
                documents = db.query(Document).filter(
                    Document.workspace_id == actual_workspace_id,
                    Document.trashed == False
                ).all()
                
                print(f"📄 Found {len(documents)} documents in workspace '{workspace.name}'")
            
            # If workspace not found or no documents, try to get user's documents
            if (not workspace or len(documents) == 0) and x_user_id:
                print(f"⚠️  No documents in workspace. Trying to get user's documents: {x_user_id}")
                user_docs = db.query(Document).filter(
                    Document.user_id == x_user_id,
                    Document.trashed == False
                ).all()
                
                if len(user_docs) > 0:
                    print(f"✅ Found {len(user_docs)} documents for user {x_user_id}")
                    documents = user_docs
                    # Use the workspace_id from first document, or create virtual workspace
                    if user_docs[0].workspace_id:
                        actual_workspace_id = user_docs[0].workspace_id
                        workspace = db.query(Workspace).filter(Workspace.id == actual_workspace_id).first()
                        if workspace:
                            print(f"📌 Using workspace from documents: {workspace.name}")
                        else:
                            actual_workspace_id = f"user_{x_user_id}"
                            workspace = type('Workspace', (), {'id': actual_workspace_id, 'name': 'My Documents'})()
                    else:
                        actual_workspace_id = f"user_{x_user_id}"
                        workspace = type('Workspace', (), {'id': actual_workspace_id, 'name': 'My Documents'})()
            
            # Final fallback: find workspace with most documents
            if not workspace or len(documents) == 0:
                print(f"⚠️  Still no documents. Trying final fallback...")
                from sqlalchemy import func
                workspace_counts = db.query(
                    Workspace.id,
                    func.count(Document.id).label('doc_count')
                ).join(
                    Document, Workspace.id == Document.workspace_id
                ).filter(
                    Document.trashed == False
                ).group_by(Workspace.id).order_by(func.count(Document.id).desc()).all()
                
                if workspace_counts and workspace_counts[0][1] > 0:
                    best_workspace_id = workspace_counts[0][0]
                    workspace = db.query(Workspace).filter(Workspace.id == best_workspace_id).first()
                    actual_workspace_id = workspace.id
                    documents = db.query(Document).filter(
                        Document.workspace_id == actual_workspace_id,
                        Document.trashed == False
                    ).all()
                    print(f"📌 Using fallback workspace: {workspace.name} (id: {workspace.id}) with {len(documents)} documents")
                else:
                    print("⚠️  No documents found anywhere, returning empty graph")
                    return {"nodes": [], "links": []}
            
            # Debug: list all documents
            if len(documents) > 0:
                print("📋 Documents:")
                for doc in documents[:10]:  # Show first 10
                    print(f"   - {doc.title} (id: {doc.id}, parent: {doc.parent_id}, workspace: {doc.workspace_id})")
            else:
                # Check if there are any documents at all (even trashed)
                all_docs = db.query(Document).filter(Document.workspace_id == actual_workspace_id).all() if actual_workspace_id else []
                print(f"⚠️  No non-trashed documents. Total documents (including trashed): {len(all_docs)}")
            
            nodes = []
            links = []
            tag_set = set()
            
            # Add workspace as project node
            nodes.append({
                "id": f"workspace_{workspace.id}",
                "label": workspace.name,
                "type": "project"
            })
            
            # Build document hierarchy
            doc_children_map = {}
            for doc in documents:
                if doc.parent_id:
                    if doc.parent_id not in doc_children_map:
                        doc_children_map[doc.parent_id] = []
                    doc_children_map[doc.parent_id].append(doc.id)
            
            folder_ids = set(doc_children_map.keys())
            
            # Create nodes
            for doc in documents:
                doc_id = f"doc_{doc.id}"
                is_folder = doc.id in folder_ids
                node_type = "folder" if is_folder else "note"
                
                node = {
                    "id": doc_id,
                    "label": doc.title,
                    "type": node_type
                }
                
                # If note has parent folder, mark it
                if doc.parent_id and not is_folder:
                    node["folder"] = f"doc_{doc.parent_id}"
                
                nodes.append(node)
                
                # Create links
                if not doc.parent_id:
                    links.append({
                        "source": f"workspace_{workspace.id}",
                        "target": doc_id
                    })
                
                if doc.parent_id:
                    links.append({
                        "source": f"doc_{doc.parent_id}",
                        "target": doc_id
                    })
                
                # Extract tags from content
                if doc.content:
                    import re
                    hashtags = re.findall(r'#(\w+)', doc.content)
                    for tag in hashtags:
                        tag_id = f"tag_{tag.lower()}"
                        tag_set.add((tag_id, f"#{tag.lower()}"))
                        links.append({
                            "source": doc_id,
                            "target": tag_id
                        })
            
            # Add tag nodes
            for tag_id, tag_label in tag_set:
                nodes.append({
                    "id": tag_id,
                    "label": tag_label,
                    "type": "tag"
                })
            
            print(f"✅ Generated graph: {len(nodes)} nodes, {len(links)} links, {len(tag_set)} tags")
            
            return {"nodes": nodes, "links": links}
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/graph/demo")
async def get_demo_graph():
    """Demo endpoint - returns empty graph"""
    return {
        "nodes": [
            {"id": "empty", "label": "No demo data", "type": "project"}
        ],
        "links": []
    }

@app.get("/")
async def root():
    return {
        "name": "Graph API Server",
        "status": "running",
        "mode": "database",
        "endpoints": ["/api/v1/graph?workspace_id=xxx"]
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Graph API Server with Database Connection")
    print("📊 Endpoint: http://localhost:8000/api/v1/graph?workspace_id=xxx")
    print("💾 Fetching data from real documents in database")
    uvicorn.run(app, host="0.0.0.0", port=8000)

