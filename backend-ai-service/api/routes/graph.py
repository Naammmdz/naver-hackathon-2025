"""
Graph view API routes
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models.workspace import Workspace
from database.models.document import Document
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/graph")
async def get_graph_data(
    workspace_id: str = Query(..., description="Workspace ID"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get graph data for visualization (Obsidian-like graph view)
    
    Returns nodes and links representing:
    - Workspace (project node)
    - Documents as folders/notes
    - Hierarchical relationships
    - Tags (extracted from document content/metadata)
    """
    try:
        # Get workspace
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        # Get all documents in workspace (excluding trashed)
        documents = db.query(Document).filter(
            Document.workspace_id == workspace_id,
            Document.trashed == False
        ).all()
        
        nodes: List[Dict[str, Any]] = []
        links: List[Dict[str, Any]] = []
        tag_set = set()
        
        # Add workspace as project node
        nodes.append({
            "id": f"workspace_{workspace.id}",
            "label": workspace.name,
            "type": "project"
        })
        
        # Build document hierarchy
        # First pass: identify folders (documents with children)
        doc_children_map = {}
        for doc in documents:
            if doc.parent_id:
                if doc.parent_id not in doc_children_map:
                    doc_children_map[doc.parent_id] = []
                doc_children_map[doc.parent_id].append(doc.id)
        
        folder_ids = set(doc_children_map.keys())
        
        # Second pass: create nodes
        for doc in documents:
            doc_id = f"doc_{doc.id}"
            
            # Determine if this is a folder or note
            is_folder = doc.id in folder_ids
            node_type = "folder" if is_folder else "note"
            
            node = {
                "id": doc_id,
                "label": doc.title,
                "type": node_type
            }
            
            # If this document has a parent, mark it
            if doc.parent_id and not is_folder:
                node["folder"] = f"doc_{doc.parent_id}"
            
            nodes.append(node)
            
            # Create link from workspace to top-level documents
            if not doc.parent_id:
                links.append({
                    "source": f"workspace_{workspace.id}",
                    "target": doc_id
                })
            
            # Create link from parent to child
            if doc.parent_id:
                links.append({
                    "source": f"doc_{doc.parent_id}",
                    "target": doc_id
                })
            
            # Extract tags from content (simple implementation)
            # Look for #hashtags in content
            if doc.content:
                import re
                hashtags = re.findall(r'#(\w+)', doc.content)
                for tag in hashtags:
                    tag_id = f"tag_{tag.lower()}"
                    tag_set.add((tag_id, f"#{tag.lower()}"))
                    
                    # Create link from document to tag
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
        
        return {
            "nodes": nodes,
            "links": links
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting graph data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get graph data: {str(e)}")


@router.get("/graph/demo")
async def get_demo_graph_data() -> Dict[str, Any]:
    """
    Get demo graph data for testing (without database)
    """
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

