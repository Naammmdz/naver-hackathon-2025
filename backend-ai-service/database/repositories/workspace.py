"""
Workspace repository for workspace-specific operations
"""

from typing import Optional, List
from sqlalchemy.orm import Session, joinedload

from database.models.workspace import Workspace, WorkspaceMember, WorkspaceInvite
from database.repositories.base import BaseRepository


class WorkspaceRepository(BaseRepository[Workspace]):
    """Repository for Workspace operations"""
    
    def __init__(self, db: Session):
        super().__init__(Workspace, db)
    
    def get_by_owner(self, owner_id: str, skip: int = 0, limit: int = 100) -> List[Workspace]:
        """Get all workspaces owned by a user"""
        return (
            self.db.query(Workspace)
            .filter(Workspace.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_public_workspaces(self, skip: int = 0, limit: int = 100) -> List[Workspace]:
        """Get all public workspaces"""
        return (
            self.db.query(Workspace)
            .filter(Workspace.is_public == True)
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_workspace_with_members(self, workspace_id: str) -> Optional[Workspace]:
        """Get workspace with all members loaded"""
        return (
            self.db.query(Workspace)
            .options(joinedload(Workspace.members))
            .filter(Workspace.id == workspace_id)
            .first()
        )
    
    def get_workspace_with_tasks(self, workspace_id: str) -> Optional[Workspace]:
        """Get workspace with all tasks loaded"""
        return (
            self.db.query(Workspace)
            .options(joinedload(Workspace.tasks))
            .filter(Workspace.id == workspace_id)
            .first()
        )
    
    def get_workspace_with_documents(self, workspace_id: str) -> Optional[Workspace]:
        """Get workspace with all documents loaded"""
        return (
            self.db.query(Workspace)
            .options(joinedload(Workspace.documents))
            .filter(Workspace.id == workspace_id)
            .first()
        )
    
    def add_member(self, workspace_id: str, user_id: str, role: str) -> WorkspaceMember:
        """Add a member to workspace"""
        from datetime import datetime
        member = WorkspaceMember(
            workspace_id=workspace_id,
            user_id=user_id,
            role=role,
            joined_at=datetime.utcnow()
        )
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member
    
    def remove_member(self, workspace_id: str, user_id: str) -> bool:
        """Remove a member from workspace"""
        member = (
            self.db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id
            )
            .first()
        )
        if member:
            self.db.delete(member)
            self.db.commit()
            return True
        return False
    
    def get_members(self, workspace_id: str) -> List[WorkspaceMember]:
        """Get all members of a workspace"""
        return (
            self.db.query(WorkspaceMember)
            .filter(WorkspaceMember.workspace_id == workspace_id)
            .all()
        )
    
    def is_member(self, workspace_id: str, user_id: str) -> bool:
        """Check if user is a member of workspace"""
        return (
            self.db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id
            )
            .first()
        ) is not None
    
    def get_user_workspaces(self, user_id: str) -> List[Workspace]:
        """Get all workspaces where user is a member"""
        return (
            self.db.query(Workspace)
            .join(WorkspaceMember)
            .filter(WorkspaceMember.user_id == user_id)
            .all()
        )
