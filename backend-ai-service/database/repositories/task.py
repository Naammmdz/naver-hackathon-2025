"""
Task repository for task-specific operations
"""

from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_

from database.models.task import Task, Subtask, TaskTag, TaskDoc
from database.repositories.base import BaseRepository


class TaskRepository(BaseRepository[Task]):
    """Repository for Task operations"""
    
    def __init__(self, db: Session):
        super().__init__(Task, db)
    
    def get_by_workspace(self, workspace_id: str, skip: int = 0, limit: int = 100) -> List[Task]:
        """Get all tasks in a workspace"""
        return (
            self.db.query(Task)
            .filter(Task.workspace_id == workspace_id)
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_user(self, user_id: str, workspace_id: Optional[str] = None) -> List[Task]:
        """Get all tasks assigned to a user, optionally filtered by workspace"""
        query = self.db.query(Task).filter(Task.assignee == user_id)
        if workspace_id:
            query = query.filter(Task.workspace_id == workspace_id)
        return query.all()
    
    def get_by_status(self, workspace_id: str, status: str) -> List[Task]:
        """Get all tasks by status in a workspace"""
        return (
            self.db.query(Task)
            .filter(
                Task.workspace_id == workspace_id,
                Task.status == status
            )
            .all()
        )
    
    def get_by_priority(self, workspace_id: str, priority: str) -> List[Task]:
        """Get all tasks by priority in a workspace"""
        return (
            self.db.query(Task)
            .filter(
                Task.workspace_id == workspace_id,
                Task.priority == priority
            )
            .all()
        )
    
    def get_task_with_subtasks(self, task_id: str) -> Optional[Task]:
        """Get task with all subtasks loaded"""
        return (
            self.db.query(Task)
            .options(joinedload(Task.subtasks))
            .filter(Task.id == task_id)
            .first()
        )
    
    def get_task_with_tags(self, task_id: str) -> Optional[Task]:
        """Get task with all tags loaded"""
        return (
            self.db.query(Task)
            .options(joinedload(Task.task_tags))
            .filter(Task.id == task_id)
            .first()
        )
    
    def get_task_with_documents(self, task_id: str) -> Optional[Task]:
        """Get task with all linked documents loaded"""
        return (
            self.db.query(Task)
            .options(joinedload(Task.task_docs))
            .filter(Task.id == task_id)
            .first()
        )
    
    def add_subtask(self, task_id: str, **kwargs) -> Subtask:
        """Add a subtask to a task"""
        subtask = Subtask(task_id=task_id, **kwargs)
        self.db.add(subtask)
        self.db.commit()
        self.db.refresh(subtask)
        return subtask
    
    def add_tag(self, task_id: str, tag: str) -> TaskTag:
        """Add a tag to a task"""
        task_tag = TaskTag(task_id=task_id, tag=tag)
        self.db.add(task_tag)
        self.db.commit()
        self.db.refresh(task_tag)
        return task_tag
    
    def link_document(self, task_id: str, doc_id: str, user_id: str, relation_type: str = "reference") -> TaskDoc:
        """Link a document to a task"""
        task_doc = TaskDoc(task_id=task_id, doc_id=doc_id, user_id=user_id, relation_type=relation_type)
        self.db.add(task_doc)
        self.db.commit()
        self.db.refresh(task_doc)
        return task_doc
    
    def remove_tag(self, task_id: str, tag: str) -> bool:
        """Remove a tag from task"""
        task_tag = (
            self.db.query(TaskTag)
            .filter(
                TaskTag.task_id == task_id,
                TaskTag.tag == tag
            )
            .first()
        )
        if task_tag:
            self.db.delete(task_tag)
            self.db.commit()
            return True
        return False
    
    def unlink_document(self, task_id: str, doc_id: str) -> bool:
        """Unlink a document from task"""
        task_doc = (
            self.db.query(TaskDoc)
            .filter(
                TaskDoc.task_id == task_id,
                TaskDoc.doc_id == doc_id
            )
            .first()
        )
        if task_doc:
            self.db.delete(task_doc)
            self.db.commit()
            return True
        return False
    
    def search_tasks(
        self,
        workspace_id: str,
        query: str,
        status: Optional[str] = None,
        priority: Optional[str] = None
    ) -> List[Task]:
        """Search tasks by title/description with optional filters"""
        filters = [
            Task.workspace_id == workspace_id,
            or_(
                Task.title.ilike(f'%{query}%'),
                Task.description.ilike(f'%{query}%')
            )
        ]
        
        if status:
            filters.append(Task.status == status)
        if priority:
            filters.append(Task.priority == priority)
        
        return self.db.query(Task).filter(and_(*filters)).all()
