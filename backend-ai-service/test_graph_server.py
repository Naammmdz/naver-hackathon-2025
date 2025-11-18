"""
Simple test server for graph API with database support
Run this instead of the full backend if you have dependency issues
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="Graph API Test Server")

# Try to import database modules
HAS_DATABASE = False
Session = None
get_db = None
Workspace = None
Document = None
Depends = None

try:
    from database.connection import get_db
    from database.models.workspace import Workspace
    from database.models.document import Document
    from sqlalchemy.orm import Session
    from fastapi import Depends
    HAS_DATABASE = True
    print("✅ Database modules loaded successfully")
except Exception as e:
    HAS_DATABASE = False
    print(f"⚠️  Database not available: {e}")
    print("📊 Will use demo data only")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/graph")
async def get_workspace_graph(workspace_id: str = Query(..., description="Workspace ID")):
    """Get graph data for workspace"""
    
    # If database is available, query real data
    if HAS_DATABASE and workspace_id:
        # Get database session
        try:
            db = next(get_db())
        except:
            print("❌ Failed to get database session")
            return get_demo_data()
        
        db = db if HAS_DATABASE else None
        try:
            print(f"📊 Querying database for workspace: {workspace_id}")
            
            # Get workspace
            workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
            if not workspace:
                print(f"⚠️  Workspace not found: {workspace_id}")
                return get_demo_data()  # Fallback to demo
            
            # Get all documents in workspace (excluding trashed)
            documents = db.query(Document).filter(
                Document.workspace_id == workspace_id,
                Document.trashed == False
            ).all()
            
            print(f"✅ Found {len(documents)} documents")
            
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
            
            print(f"✅ Generated graph: {len(nodes)} nodes, {len(links)} links")
            return {"nodes": nodes, "links": links}
            
        except Exception as e:
            print(f"❌ Database error: {e}")
            print("📊 Falling back to demo data")
            return get_demo_data()
    
    # Fallback to demo data
    print("📊 Using demo data (no database or workspace_id)")
    return get_demo_data()

def get_demo_data():
    """Return demo graph data"""
    return {
        "nodes": [
            {"id": "proj", "label": "My Workspace", "type": "project"},
            {"id": "f_school", "label": "School", "type": "folder"},
            {"id": "f_code", "label": "Code", "type": "folder"},
            {"id": "f_research", "label": "Research", "type": "folder"},
            {"id": "n_dfa", "label": "DFA Minimization", "type": "note", "folder": "f_school"},
            {"id": "n_osIntro", "label": "OS – Intro", "type": "note", "folder": "f_school"},
            {"id": "n_gomoku", "label": "Gomoku Rules", "type": "note", "folder": "f_code"},
            {"id": "n_dlist", "label": "DLinkedList Impl", "type": "note", "folder": "f_code"},
            {"id": "n_alpr", "label": "ALPR Report", "type": "note", "folder": "f_research"},
            {"id": "n_yolo", "label": "YOLOv5 Notes", "type": "note", "folder": "f_research"},
            {"id": "n_bitcoin", "label": "Bitcoin & Civil Code", "type": "note", "folder": "f_research"},
            {"id": "tag_os", "label": "#os", "type": "tag"},
            {"id": "tag_cpp", "label": "#cpp", "type": "tag"},
            {"id": "tag_ml", "label": "#ml", "type": "tag"},
            {"id": "tag_law", "label": "#law", "type": "tag"}
        ],
        "links": [
            {"source": "proj", "target": "f_school"},
            {"source": "proj", "target": "f_code"},
            {"source": "proj", "target": "f_research"},
            {"source": "f_school", "target": "n_dfa"},
            {"source": "f_school", "target": "n_osIntro"},
            {"source": "f_code", "target": "n_gomoku"},
            {"source": "f_code", "target": "n_dlist"},
            {"source": "f_research", "target": "n_alpr"},
            {"source": "f_research", "target": "n_yolo"},
            {"source": "f_research", "target": "n_bitcoin"},
            {"source": "n_osIntro", "target": "n_dfa"},
            {"source": "n_gomoku", "target": "n_dlist"},
            {"source": "n_alpr", "target": "n_yolo"},
            {"source": "n_alpr", "target": "n_bitcoin"},
            {"source": "n_osIntro", "target": "tag_os"},
            {"source": "n_dfa", "target": "tag_os"},
            {"source": "n_dlist", "target": "tag_cpp"},
            {"source": "n_gomoku", "target": "tag_cpp"},
            {"source": "n_alpr", "target": "tag_ml"},
            {"source": "n_yolo", "target": "tag_ml"},
            {"source": "n_bitcoin", "target": "tag_law"}
        ]
    }

@app.get("/api/v1/graph/demo")
async def get_demo_graph():
    """Demo graph data"""
    return {
        "nodes": [
            {"id": "proj", "label": "My Workspace", "type": "project"},
            {"id": "f_school", "label": "School", "type": "folder"},
            {"id": "f_code", "label": "Code", "type": "folder"},
            {"id": "f_research", "label": "Research", "type": "folder"},
            {"id": "n_dfa", "label": "DFA Minimization", "type": "note", "folder": "f_school"},
            {"id": "n_osIntro", "label": "OS – Intro", "type": "note", "folder": "f_school"},
            {"id": "n_gomoku", "label": "Gomoku Rules", "type": "note", "folder": "f_code"},
            {"id": "n_dlist", "label": "DLinkedList Impl", "type": "note", "folder": "f_code"},
            {"id": "n_alpr", "label": "ALPR Report", "type": "note", "folder": "f_research"},
            {"id": "n_yolo", "label": "YOLOv5 Notes", "type": "note", "folder": "f_research"},
            {"id": "n_bitcoin", "label": "Bitcoin & Civil Code", "type": "note", "folder": "f_research"},
            {"id": "tag_os", "label": "#os", "type": "tag"},
            {"id": "tag_cpp", "label": "#cpp", "type": "tag"},
            {"id": "tag_ml", "label": "#ml", "type": "tag"},
            {"id": "tag_law", "label": "#law", "type": "tag"}
        ],
        "links": [
            {"source": "proj", "target": "f_school"},
            {"source": "proj", "target": "f_code"},
            {"source": "proj", "target": "f_research"},
            {"source": "f_school", "target": "n_dfa"},
            {"source": "f_school", "target": "n_osIntro"},
            {"source": "f_code", "target": "n_gomoku"},
            {"source": "f_code", "target": "n_dlist"},
            {"source": "f_research", "target": "n_alpr"},
            {"source": "f_research", "target": "n_yolo"},
            {"source": "f_research", "target": "n_bitcoin"},
            {"source": "n_osIntro", "target": "n_dfa"},
            {"source": "n_gomoku", "target": "n_dlist"},
            {"source": "n_alpr", "target": "n_yolo"},
            {"source": "n_alpr", "target": "n_bitcoin"},
            {"source": "n_osIntro", "target": "tag_os"},
            {"source": "n_dfa", "target": "tag_os"},
            {"source": "n_dlist", "target": "tag_cpp"},
            {"source": "n_gomoku", "target": "tag_cpp"},
            {"source": "n_alpr", "target": "tag_ml"},
            {"source": "n_yolo", "target": "tag_ml"},
            {"source": "n_bitcoin", "target": "tag_law"}
        ]
    }

@app.get("/")
async def root():
    return {
        "name": "Graph API Test Server",
        "status": "running",
        "endpoints": ["/api/v1/graph/demo"]
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Graph API Test Server on http://localhost:8000")
    print("📊 Test endpoint: http://localhost:8000/api/v1/graph/demo")
    uvicorn.run(app, host="0.0.0.0", port=8000)

