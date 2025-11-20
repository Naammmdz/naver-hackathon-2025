"""
Task Tools

Tools for creating and updating tasks.
"""

from typing import Dict, Any, Optional, List
from agents.tools.base_tool import AgentTool, ToolPreview, ToolResult, ToolResultStatus, ToolError
from agents.api_clients import CoreServiceClient, APIError
import logging

logger = logging.getLogger(__name__)


class CreateTaskTool(AgentTool):
    """
    Tool for creating a single task.
    
    Parameters:
        workspace_id: Workspace ID
        title: Task title
        description: Task description (optional)
        status: Task status (TODO, IN_PROGRESS, DONE)
        priority: Priority (LOW, MEDIUM, HIGH)
        assignee_id: Assignee user ID (optional)
        due_date: Due date ISO format (optional)
        metadata: Optional metadata dict
    """
    
    def __init__(self, api_client: Optional[CoreServiceClient] = None):
        super().__init__()
        self.api_client = api_client or CoreServiceClient()
        self._created_ids = {}


    def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate parameters"""
        required = ['workspace_id', 'title']
        
        for field in required:
            if field not in params:
                raise ToolError(f"Missing required parameter: {field}")
        
        if not isinstance(params['title'], str) or not params['title'].strip():
            raise ToolError("Title must be a non-empty string")
        
        # Validate enum values
        valid_statuses = ['TODO', 'IN_PROGRESS', 'DONE']
        if 'status' in params and params['status'] not in valid_statuses:
            raise ToolError(f"Invalid status. Must be one of: {valid_statuses}")
        
        valid_priorities = ['LOW', 'MEDIUM', 'HIGH']
        if 'priority' in params and params['priority'] not in valid_priorities:
            raise ToolError(f"Invalid priority. Must be one of: {valid_priorities}")
        
        return True
    
    def preview(self, params: Dict[str, Any]) -> ToolPreview:
        """Generate preview of task creation"""
        self.validate_params(params)
        
        title = params['title']
        priority = params.get('priority', 'MEDIUM')
        status = params.get('status', 'TODO')
        
        return ToolPreview(
            action="create_task",
            summary=f"Create task '{title}' with {priority} priority",
            details={
                "title": title,
                "description": params.get('description', ''),
                "status": status,
                "priority": priority,
                "assignee_id": params.get('assignee_id'),
                "due_date": params.get('due_date'),
                "metadata": params.get('metadata', {})
            },
            estimated_impact="New task added to workspace",
            risks=["low"],
            reversible=True,
            estimated_time_ms=500
        )
    
    def execute(self, params: Dict[str, Any]) -> ToolResult:
        """Execute task creation"""
        self.validate_params(params)
        
        try:
            result = self.api_client.create_task(
                workspace_id=params['workspace_id'],
                title=params['title'],
                description=params.get('description'),
                status=params.get('status', 'TODO'),
                priority=params.get('priority', 'MEDIUM'),
                assignee_id=params.get('assignee_id'),
                due_date=params.get('due_date'),
                metadata=params.get('metadata')
            )
            
            task_id = result.get('id')
            rollback_id = self._generate_rollback_id()
            
            self._created_ids[rollback_id] = task_id
            
            tool_result = ToolResult(
                status=ToolResultStatus.SUCCESS,
                data={
                    'task_id': task_id,
                    'title': params['title'],
                    'created_at': result.get('createdAt')
                },
                rollback_id=rollback_id,
                rollback_metadata={
                    'task_id': task_id,
                    'action': 'delete_task'
                }
            )
            
            self._record_execution(params, tool_result)
            return tool_result
            
        except APIError as e:
            logger.error(f"Failed to create task: {e.message}")
            return ToolResult(
                status=ToolResultStatus.FAILED,
                error=f"API Error: {e.message}"
            )
        except Exception as e:
            logger.error(f"Unexpected error creating task: {str(e)}")
            return ToolResult(
                status=ToolResultStatus.FAILED,
                error=f"Error: {str(e)}"
            )


class BulkCreateTasksTool(AgentTool):
    """
    Tool for creating multiple tasks at once.
    
    Parameters:
        workspace_id: Workspace ID
        tasks: List of task data dicts (each with title, description, etc.)
    """
    
    def __init__(self, api_client: Optional[CoreServiceClient] = None):
        super().__init__()
        self.api_client = api_client or CoreServiceClient()
        self._created_ids = {}
    
    def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate parameters"""
        if 'workspace_id' not in params:
            raise ToolError("Missing required parameter: workspace_id")
        
        if 'tasks' not in params or not isinstance(params['tasks'], list):
            raise ToolError("Missing or invalid 'tasks' parameter (must be a list)")
        
        if len(params['tasks']) == 0:
            raise ToolError("Task list cannot be empty")
        
        if len(params['tasks']) > 50:
            raise ToolError("Cannot create more than 50 tasks at once")
        
        # Validate each task
        for i, task in enumerate(params['tasks']):
            if not isinstance(task, dict):
                raise ToolError(f"Task {i} must be a dictionary")
            if 'title' not in task or not task['title'].strip():
                raise ToolError(f"Task {i} missing required field: title")
        
        return True
    
    def preview(self, params: Dict[str, Any]) -> ToolPreview:
        """Generate preview of bulk task creation"""
        self.validate_params(params)
        
        tasks = params['tasks']
        task_count = len(tasks)
        
        # Preview first 3 tasks
        preview_tasks = []
        for task in tasks[:3]:
            preview_tasks.append({
                'title': task['title'],
                'priority': task.get('priority', 'MEDIUM'),
                'status': task.get('status', 'TODO')
            })
        
        return ToolPreview(
            action="bulk_create_tasks",
            summary=f"Create {task_count} tasks",
            details={
                "total_count": task_count,
                "preview": preview_tasks,
                "has_more": task_count > 3
            },
            estimated_impact

=f"{task_count} new tasks added to workspace",
            risks=["medium" if task_count > 5 else "low"],
            reversible=True,
            estimated_time_ms=1000 + (task_count * 100)
        )
    
    def execute(self, params: Dict[str, Any]) -> ToolResult:
        """Execute bulk task creation"""
        self.validate_params(params)
        
        try:
            result = self.api_client.bulk_create_tasks(
                workspace_id=params['workspace_id'],
                tasks=params['tasks']
            )
            
            created_ids = result.get('created_ids', [])
            failed_count = result.get('failed_count', 0)
            rollback_id = self._generate_rollback_id()
            
            self._created_ids[rollback_id] = created_ids
            
            status = ToolResultStatus.SUCCESS
            if failed_count > 0:
                if failed_count == len(params['tasks']):
                    status = ToolResultStatus.FAILED
                else:
                    status = ToolResultStatus.PARTIAL
            
            tool_result = ToolResult(
                status=status,
                data={
                    'created_ids': created_ids,
                    'created_count': len(created_ids),
                    'failed_count': failed_count,
                    'total_requested': len(params['tasks'])
                },
                rollback_id=rollback_id,
                rollback_metadata={
                    'task_ids': created_ids,
                    'action': 'bulk_delete_tasks'
                }
            )
            
            self._record_execution(params, tool_result)
            return tool_result
            
        except APIError as e:
            logger.error(f"Failed to bulk create tasks: {e.message}")
            return ToolResult(
                status=ToolResultStatus.FAILED,
                error=f"API Error: {e.message}"
            )
        except Exception as e:
            logger.error(f"Unexpected error bulk creating tasks: {str(e)}")
            return ToolResult(
                status=ToolResultStatus.FAILED,
                error=f"Error: {str(e)}"
            )


class UpdateTaskTool(AgentTool):
    """
    Tool for updating an existing task.
    
    Parameters:
        task_id: Task ID to update
        title: New title (optional)
        description: New description (optional)
        status: New status (optional)
        priority: New priority (optional)
        assignee_id: New assignee (optional)
        due_date: New due date (optional)
    """
    
    def __init__(self, api_client: Optional[CoreServiceClient] = None):
        super().__init__()
        self.api_client = api_client or CoreServiceClient()
        self._update_history = {}
    
    def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate parameters"""
        if 'task_id' not in params:
            raise ToolError("Missing required parameter: task_id")
        
        updateable_fields = ['title', 'description', 'status', 'priority', 'assignee_id', 'due_date']
        if not any(field in params for field in updateable_fields):
            raise ToolError("At least one field to update is required")
        
        # Validate enum values
        valid_statuses = ['TODO', 'IN_PROGRESS', 'DONE']
        if 'status' in params and params['status'] not in valid_statuses:
            raise ToolError(f"Invalid status. Must be one of: {valid_statuses}")
        
        valid_priorities = ['LOW', 'MEDIUM', 'HIGH']
        if 'priority' in params and params['priority'] not in valid_priorities:
            raise ToolError(f"Invalid priority. Must be one of: {valid_priorities}")
        
        return True
    
    def preview(self, params: Dict[str, Any]) -> ToolPreview:
        """Generate preview of task update"""
        self.validate_params(params)
        
        changes = []
        details = {"task_id": params['task_id'], "changes": {}}
        
        for field in ['title', 'description', 'status', 'priority', 'assignee_id', 'due_date']:
            if field in params:
                changes.append(f"{field} → {params[field]}")
                details['changes'][field] = params[field]
        
        return ToolPreview(
            action="update_task",
            summary=f"Update task {params['task_id']}: {', '.join(changes)}",
            details=details,
            estimated_impact=f"Task will be modified ({len(changes)} field(s))",
            risks=["medium"],
            reversible=True,
            estimated_time_ms=500
        )
    
    def execute(self, params: Dict[str, Any]) -> ToolResult:
        """Execute task update"""
        self.validate_params(params)
        
        try:
            result = self.api_client.update_task(
                task_id=params['task_id'],
                title=params.get('title'),
                description=params.get('description'),
                status=params.get('status'),
                priority=params.get('priority'),
                assignee_id=params.get('assignee_id'),
                due_date=params.get('due_date')
            )
            
            rollback_id = self._generate_rollback_id()
            
            tool_result = ToolResult(
                status=ToolResultStatus.SUCCESS,
                data={
                    'task_id': params['task_id'],
                    'updated_fields': [k for k in params.keys() if k != 'task_id'],
                    'updated_at': result.get('updatedAt')
                },
                rollback_id=rollback_id,
                rollback_metadata={
                    'task_id': params['task_id'],
                    'action': 'restore_task',
                    'previous_values': {}
                }
            )
            
            self._record_execution(params, tool_result)
            return tool_result
            
        except APIError as e:
            logger.error(f"Failed to update task: {e.message}")
            return ToolResult(
                status=ToolResultStatus.FAILED,
                error=f"API Error: {e.message}"
            )
        except Exception as e:
            logger.error(f"Unexpected error updating task: {str(e)}")
            return ToolResult(
                status=ToolResultStatus.FAILED,
                error=f"Error: {str(e)}"
            )
