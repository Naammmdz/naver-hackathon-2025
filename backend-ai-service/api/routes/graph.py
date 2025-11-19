"""
Graph view API routes
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
import httpx
import os
import re

from database.connection import get_db_session
from database.models.workspace import Workspace
from database.models.document import Document
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


# Dependency for FastAPI
def get_db():
    """Get database session"""
    db = get_db_session()
    try:
        yield db
    finally:
        db.close()

# Java backend API URL (where documents are actually created)
JAVA_API_BASE_URL = os.getenv("JAVA_API_BASE_URL", "http://localhost:8989")


async def fetch_documents_from_java_api(
    workspace_id: str, 
    user_id: Optional[str] = None, 
    auth_token: Optional[str] = None
) -> list:
    """Fetch documents from Java backend API"""
    try:
        url = f"{JAVA_API_BASE_URL}/api/documents/workspace/{workspace_id}"
        if user_id:
            url += f"?userId={user_id}"
        
        headers = {}
        if auth_token:
            headers["Authorization"] = auth_token
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                logger.warning(f"Java API requires authentication (401)")
            else:
                logger.warning(f"Java API returned status {response.status_code}")
            return []
    except httpx.ConnectError:
        logger.warning(f"Java API not reachable at {JAVA_API_BASE_URL}")
        return []
    except Exception as e:
        logger.error(f"Failed to fetch from Java API: {e}")
        return []


async def fetch_workspace_name(
    workspace_id: str, 
    auth_token: Optional[str] = None
) -> Optional[str]:
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
        db = get_db_session()
        try:
            workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
            if workspace:
                return workspace.name
        finally:
            db.close()
    except:
        pass
    
    return None


@router.get("/graph")
async def get_graph_data(
    workspace_id: str = Query(..., description="Workspace ID"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    authorization: Optional[str] = Header(None),
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
        logger.info(f"📊 Fetching graph for workspace: {workspace_id}, user: {x_user_id}")
        
        # Priority 1: Get data directly from Neon DB (filtered by user if provided)
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        logger.info(f"✅ Found workspace: {workspace.name} (id: {workspace.id})")
        
        # Build query for documents in workspace (excluding trashed)
        query = db.query(Document).filter(
            Document.workspace_id == workspace_id,
            Document.trashed == False
        )
        
        # Check total documents before filtering
        total_docs = query.count()
        logger.info(f"📄 Total documents in workspace (before user filter): {total_docs}")
        
        # Filter by user_id if provided
        if x_user_id:
            query = query.filter(Document.user_id == x_user_id)
            logger.info(f"🔍 Filtering documents by user_id: {x_user_id}")
        
        documents = query.all()
        logger.info(f"📄 Documents after filter: {len(documents)}")
        
        # If filtering by user_id returns no results, try without filter to see what users exist
        if x_user_id and len(documents) == 0 and total_docs > 0:
            all_docs = db.query(Document).filter(
                Document.workspace_id == workspace_id,
                Document.trashed == False
            ).all()
            user_ids = set(doc.user_id for doc in all_docs)
            logger.warning(f"⚠️  No documents found for user {x_user_id}. Available users in workspace: {user_ids}")
            logger.warning(f"⚠️  Returning documents without user filter for debugging...")
            documents = all_docs
        
        if documents and len(documents) > 0:
            logger.info(f"✅ Found {len(documents)} documents from Neon DB for workspace {workspace_id}")
            
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
                
                # If this document has a parent, mark it (for both notes and subfolders)
                if doc.parent_id:
                    # Check if parent is also a folder
                    parent_is_folder = doc.parent_id in folder_ids
                    if parent_is_folder:
                        # This is a subfolder or note inside a folder
                        node["folder"] = f"doc_{doc.parent_id}"
                    elif not is_folder:
                        # This is a note inside a note (unusual but handle it)
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
            
            logger.info(f"✅ Generated graph from Neon DB: {len(nodes)} nodes, {len(links)} links")
            return {
                "nodes": nodes,
                "links": links
            }
        
        # Fallback: Try Java API if no documents found in DB
        logger.warning(f"⚠️  No documents found in Neon DB for workspace {workspace_id}, trying Java API...")
        java_docs = await fetch_documents_from_java_api(workspace_id, x_user_id, authorization)
        
        if java_docs and len(java_docs) > 0:
            logger.info(f"✅ Found {len(java_docs)} documents from Java API")
            
            # Get workspace name
            workspace_name = await fetch_workspace_name(workspace_id, authorization)
            if not workspace_name:
                workspace_name = workspace.name if workspace else "My Workspace"
            
            # Convert Java API documents to graph format
            nodes: List[Dict[str, Any]] = []
            links: List[Dict[str, Any]] = []
            tag_set = set()
            
            # Add workspace node with real name
            nodes.append({
                "id": f"workspace_{workspace_id}",
                "label": workspace_name,
                "type": "project"
            })
            
            # Build document hierarchy - identify folders (documents with children)
            doc_children_map = {}
            for doc in java_docs:
                parent_id = doc.get('parentId')
                if parent_id:
                    if parent_id not in doc_children_map:
                        doc_children_map[parent_id] = []
                    doc_children_map[parent_id].append(doc.get('id'))
            
            folder_ids = set(doc_children_map.keys())
            
            # Process documents
            for doc in java_docs:
                doc_id = f"doc_{doc.get('id')}"
                
                # Determine if this is a folder or note
                is_folder = doc.get('id') in folder_ids
                node_type = "folder" if is_folder else "note"
                
                node = {
                    "id": doc_id,
                    "label": doc.get('title', 'Untitled'),
                    "type": node_type
                }
                
                # If this document has a parent, mark it (for both notes and subfolders)
                parent_id = doc.get('parentId')
                if parent_id:
                    # Check if parent is also a folder
                    parent_is_folder = parent_id in folder_ids
                    if parent_is_folder:
                        # This is a subfolder or note inside a folder
                        node["folder"] = f"doc_{parent_id}"
                    elif not is_folder:
                        # This is a note inside a note (unusual but handle it)
                        node["folder"] = f"doc_{parent_id}"
                
                nodes.append(node)
                
                # Create links
                if not parent_id:
                    # Link from workspace to top-level documents
                    links.append({
                        "source": f"workspace_{workspace_id}",
                        "target": doc_id
                    })
                else:
                    # Link from parent to child
                    links.append({
                        "source": f"doc_{parent_id}",
                        "target": doc_id
                    })
                
                # Extract tags from content if available
                content = doc.get('content', '')
                if content:
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
            
            logger.info(f"✅ Generated graph from Java API: {len(nodes)} nodes, {len(links)} links")
            return {
                "nodes": nodes,
                "links": links
            }
        
        # No documents found anywhere - return empty graph with just workspace node
        logger.warning(f"⚠️  No documents found in database or Java API for workspace {workspace_id}")
        return {
            "nodes": [{
                "id": f"workspace_{workspace.id}",
                "label": workspace.name,
                "type": "project"
            }],
            "links": []
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

