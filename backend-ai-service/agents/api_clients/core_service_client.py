"""
Core Service API Client

HTTP client for interacting with backend-core-service APIs.
Handles authentication, retries, and error mapping.
"""

import httpx
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import logging
from tenacity import retry, stop_after_attempt, wait_exponential
from datetime import datetime

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Exception raised by API calls"""
    def __init__(self, message: str, status_code: Optional[int] = None, response_data: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.response_data = response_data
        super().__init__(message)


class CoreServiceClient:
    """
    Client for backend-core-service REST APIs.
    
    Provides methods for:
    - Document CRUD
    - Task CRUD  
    - Board CRUD
    """
    
    def __init__(self, base_url: str = "http://localhost:3000/api"):
        """
        Initialize API client
        
        Args:
            base_url: Base URL for core service API
        """
        self.base_url = base_url.rstrip('/')
        self.client = httpx.Client(timeout=30.0)
        logger.info(f"CoreServiceClient initialized with base_url: {self.base_url}")
    
    def _handle_response(self, response: httpx.Response) -> Dict[str, Any]:
        """Handle API response and errors"""
        try:
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            error_data = None
            try:
                error_data = response.json()
            except:
                pass
            
            raise APIError(
                message=f"HTTP {response.status_code}: {response.text}",
                status_code=response.status_code,
                response_data=error_data
            )
        except Exception as e:
            raise APIError(f"API call failed: {str(e)}")
    
    # ==================== Documents ====================
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def create_document(
        self,
        workspace_id: str,
        title: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new document
        
        Args:
            workspace_id: Workspace ID
            title: Document title
            content: Document content (markdown)
            metadata: Optional metadata
            
        Returns:
            Created document data with ID
        """
        logger.info(f"Creating document: {title} in workspace {workspace_id}")
        
        payload = {
            "workspaceId": workspace_id,
            "title": title,
            "content": content,
            "metadata": metadata or {}
        }
        
        response = self.client.post(
            f"{self.base_url}/documents",
            json=payload
        )
        
        result = self._handle_response(response)
        logger.info(f"Document created with ID: {result.get('id')}")
        return result
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def update_document(
        self,
        document_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Update an existing document
        
        Args:
            document_id: Document ID
            title: New title (optional)
            content: New content (optional)
            metadata: New metadata (optional)
            
        Returns:
            Updated document data
        """
        logger.info(f"Updating document: {document_id}")
        
        payload = {}
        if title is not None:
            payload["title"] = title
        if content is not None:
            payload["content"] = content
        if metadata is not None:
            payload["metadata"] = metadata
        
        response = self.client.patch(
            f"{self.base_url}/documents/{document_id}",
            json=payload
        )
        
        result = self._handle_response(response)
        logger.info(f"Document {document_id} updated")
        return result
    
    # ==================== Tasks ====================
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def create_task(
        self,
        workspace_id: str,
        title: str,
        description: Optional[str] = None,
        status: str = "TODO",
        priority: str = "MEDIUM",
        assignee_id: Optional[str] = None,
        due_date: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new task
        
        Args:
            workspace_id: Workspace ID
            title: Task title
            description: Task description
            status: Task status (TODO, IN_PROGRESS, DONE)
            priority: Priority (LOW, MEDIUM, HIGH)
            assignee_id: Assignee user ID
            due_date: Due date (ISO format)
            metadata: Optional metadata
            
        Returns:
            Created task data with ID
        """
        logger.info(f"Creating task: {title} in workspace {workspace_id}")
        
        payload = {
            "workspaceId": workspace_id,
            "title": title,
            "description": description,
            "status": status,
            "priority": priority,
            "assigneeId": assignee_id,
            "dueDate": due_date,
            "metadata": metadata or {}
        }
        
        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}
        
        response = self.client.post(
            f"{self.base_url}/tasks",
            json=payload
        )
        
        result = self._handle_response(response)
        logger.info(f"Task created with ID: {result.get('id')}")
        return result
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def bulk_create_tasks(
        self,
        workspace_id: str,
        tasks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create multiple tasks in one request
        
        Args:
            workspace_id: Workspace ID
            tasks: List of task data dicts
            
        Returns:
            Result with created task IDs and any failures
        """
        logger.info(f"Bulk creating {len(tasks)} tasks in workspace {workspace_id}")
        
        payload = {
            "workspaceId": workspace_id,
            "tasks": tasks
        }
        
        response = self.client.post(
            f"{self.base_url}/tasks/bulk",
            json=payload
        )
        
        result = self._handle_response(response)
        logger.info(f"Bulk create result: {result.get('created_count', 0)} created, {result.get('failed_count', 0)} failed")
        return result
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def update_task(
        self,
        task_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assignee_id: Optional[str] = None,
        due_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update an existing task
        
        Args:
            task_id: Task ID
            title: New title (optional)
            description: New description (optional)
            status: New status (optional)
            priority: New priority (optional)
            assignee_id: New assignee (optional)
            due_date: New due date (optional)
            
        Returns:
            Updated task data
        """
        logger.info(f"Updating task: {task_id}")
        
        payload = {}
        if title is not None:
            payload["title"] = title
        if description is not None:
            payload["description"] = description
        if status is not None:
            payload["status"] = status
        if priority is not None:
            payload["priority"] = priority
        if assignee_id is not None:
            payload["assigneeId"] = assignee_id
        if due_date is not None:
            payload["dueDate"] = due_date
        
        response = self.client.patch(
            f"{self.base_url}/tasks/{task_id}",
            json=payload
        )
        
        result = self._handle_response(response)
        logger.info(f"Task {task_id} updated")
        return result
    
    # ==================== Boards ====================
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def create_board(
        self,
        workspace_id: str,
        name: str,
        mermaid_code: str,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new board with Mermaid visualization
        
        Args:
            workspace_id: Workspace ID
            name: Board name
            mermaid_code: Mermaid.js code
            description: Optional description
            
        Returns:
            Created board data with ID
        """
        logger.info(f"Creating board: {name} in workspace {workspace_id}")
        
        payload = {
            "workspaceId": workspace_id,
            "name": name,
           "mermaidCode": mermaid_code,
            "description": description
        }
        
        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}
        
        response = self.client.post(
            f"{self.base_url}/boards",
            json=payload
        )
        
        result = self._handle_response(response)
        logger.info(f"Board created with ID: {result.get('id')}")
        return result
    
    def close(self):
        """Close HTTP client"""
        self.client.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
