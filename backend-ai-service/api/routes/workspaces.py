"""
Workspace Management Endpoints

Provides APIs for creating and managing workspaces.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import sys
from pathlib import Path

if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.connection import get_db_session
from database.models import Workspace
from database.repositories import WorkspaceRepository
from utils.logger import get_logger
from sqlalchemy.orm import Session

logger = get_logger(__name__)
router = APIRouter()


# Dependency
def get_db():
    """Get database session"""
    db = get_db_session()
    try:
        yield db
    finally:
        db.close()


# Request/Response Models
class WorkspaceCreate(BaseModel):
    """Create workspace request"""
    name: str = Field(..., min_length=1, max_length=200, description="Workspace name")
    description: Optional[str] = Field(None, max_length=1000, description="Workspace description")
    owner_id: str = Field(..., description="Owner user ID")


class WorkspaceResponse(BaseModel):
    """Workspace response"""
    workspace_id: str
    name: str
    description: Optional[str]
    owner_id: str
    created_at: datetime
    updated_at: datetime
    document_count: int = 0

    class Config:
        from_attributes = True


class WorkspaceUpdate(BaseModel):
    """Update workspace request"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)


# Endpoints
@router.post(
    "/workspaces",
    response_model=WorkspaceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Workspace",
    description="Create a new workspace for organizing documents"
)
async def create_workspace(
    workspace_data: WorkspaceCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new workspace
    
    Args:
        workspace_data: Workspace creation data
        
    Returns:
        Created workspace information
    """
    try:
        repo = WorkspaceRepository(db)
        
        # Create workspace
        workspace = repo.create(
            name=workspace_data.name,
            description=workspace_data.description,
            owner_id=workspace_data.owner_id
        )
        
        logger.info(f"Created workspace: {workspace.workspace_id} by {workspace_data.owner_id}")
        
        return WorkspaceResponse(
            workspace_id=workspace.workspace_id,
            name=workspace.name,
            description=workspace.description,
            owner_id=workspace.owner_id,
            created_at=workspace.created_at,
            updated_at=workspace.updated_at,
            document_count=0
        )
    except Exception as e:
        logger.error(f"Error creating workspace: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create workspace: {str(e)}"
        )


@router.get(
    "/workspaces/{workspace_id}",
    response_model=WorkspaceResponse,
    summary="Get Workspace",
    description="Get workspace information by ID"
)
async def get_workspace(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """
    Get workspace by ID
    
    Args:
        workspace_id: Workspace identifier
        
    Returns:
        Workspace information
    """
    try:
        repo = WorkspaceRepository(db)
        workspace = repo.get_by_id(workspace_id)
        
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace {workspace_id} not found"
            )
        
        # Get document count
        from database.repositories import DocumentRepository
        doc_repo = DocumentRepository(db)
        document_count = len(doc_repo.get_by_workspace(workspace_id))
        
        return WorkspaceResponse(
            workspace_id=workspace.workspace_id,
            name=workspace.name,
            description=workspace.description,
            owner_id=workspace.owner_id,
            created_at=workspace.created_at,
            updated_at=workspace.updated_at,
            document_count=document_count
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting workspace: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get workspace: {str(e)}"
        )


@router.get(
    "/workspaces",
    response_model=List[WorkspaceResponse],
    summary="List Workspaces",
    description="List all workspaces for a user"
)
async def list_workspaces(
    owner_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List workspaces
    
    Args:
        owner_id: Filter by owner (optional)
        skip: Number of records to skip
        limit: Maximum number of records to return
        
    Returns:
        List of workspaces
    """
    try:
        repo = WorkspaceRepository(db)
        
        if owner_id:
            workspaces = repo.get_by_owner(owner_id, limit=limit, offset=skip)
        else:
            workspaces = repo.get_all(limit=limit, offset=skip)
        
        # Get document counts
        from database.repositories import DocumentRepository
        doc_repo = DocumentRepository(db)
        
        results = []
        for workspace in workspaces:
            document_count = len(doc_repo.get_by_workspace(workspace.workspace_id))
            results.append(WorkspaceResponse(
                workspace_id=workspace.workspace_id,
                name=workspace.name,
                description=workspace.description,
                owner_id=workspace.owner_id,
                created_at=workspace.created_at,
                updated_at=workspace.updated_at,
                document_count=document_count
            ))
        
        return results
    except Exception as e:
        logger.error(f"Error listing workspaces: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list workspaces: {str(e)}"
        )


@router.patch(
    "/workspaces/{workspace_id}",
    response_model=WorkspaceResponse,
    summary="Update Workspace",
    description="Update workspace information"
)
async def update_workspace(
    workspace_id: str,
    update_data: WorkspaceUpdate,
    db: Session = Depends(get_db)
):
    """
    Update workspace
    
    Args:
        workspace_id: Workspace identifier
        update_data: Fields to update
        
    Returns:
        Updated workspace information
    """
    try:
        repo = WorkspaceRepository(db)
        workspace = repo.get_by_id(workspace_id)
        
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace {workspace_id} not found"
            )
        
        # Update fields
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            workspace = repo.update(workspace_id, **update_dict)
        
        logger.info(f"Updated workspace: {workspace_id}")
        
        # Get document count
        from database.repositories import DocumentRepository
        doc_repo = DocumentRepository(db)
        document_count = len(doc_repo.get_by_workspace(workspace_id))
        
        return WorkspaceResponse(
            workspace_id=workspace.workspace_id,
            name=workspace.name,
            description=workspace.description,
            owner_id=workspace.owner_id,
            created_at=workspace.created_at,
            updated_at=workspace.updated_at,
            document_count=document_count
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating workspace: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update workspace: {str(e)}"
        )


@router.delete(
    "/workspaces/{workspace_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Workspace",
    description="Delete a workspace and all its documents"
)
async def delete_workspace(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete workspace
    
    Args:
        workspace_id: Workspace identifier
    """
    try:
        repo = WorkspaceRepository(db)
        workspace = repo.get_by_id(workspace_id)
        
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace {workspace_id} not found"
            )
        
        # Delete workspace (cascade will handle documents)
        repo.delete(workspace_id)
        
        logger.info(f"Deleted workspace: {workspace_id}")
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting workspace: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete workspace: {str(e)}"
        )
