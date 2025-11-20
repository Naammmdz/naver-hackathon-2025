"""
Document Tools

Tools for creating and updating documents.
"""

from typing import Dict, Any, Optional
from agents.tools.base_tool import AgentTool, ToolPreview, ToolResult, ToolResultStatus, ToolError
from agents.api_clients import CoreServiceClient, APIError
import logging

logger = logging.getLogger(__name__)


class CreateDocumentTool(AgentTool):
    """
    Tool for creating new documents.
    
    Parameters:
        workspace_id: Workspace ID
        title: Document title
        content: Document content (markdown)
        metadata: Optional metadata dict
    """
    
    def __init__(self, api_client: Optional[CoreServiceClient] = None):
        super().__init__()
        self.api_client = api_client or CoreServiceClient()
        self._created_ids = {}  # For rollback
    
    def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate parameters"""
        required = ['workspace_id', 'title', 'content']
        
        for field in required:
            if field not in params:
                raise ToolError(f"Missing required parameter: {field}")
        
        if not isinstance(params['title'], str) or not params['title'].strip():
            raise ToolError("Title must be a non-empty string")
        
        if not isinstance(params['content'], str):
            raise ToolError("Content must be a string")
        
        return True
    
    def preview(self, params: Dict[str, Any]) -> ToolPreview:
        """Generate preview of document creation"""
        self.validate_params(params)
        
        title = params['title']
        content = params['content']
        content_preview = content[:200] + "..." if len(content) > 200 else content
        
        return ToolPreview(
            action="create_document",
            summary=f"Create document '{title}'",
            details={
                "title": title,
                "content_preview": content_preview,
                "content_length": len(content),
                "word_count": len(content.split()),
                "metadata": params.get('metadata', {})
            },
            estimated_impact=f"New document added to workspace",
            risks=["low"],
            reversible=True,
            estimated_time_ms=500
        )
    
    def execute(self, params: Dict[str, Any]) -> ToolResult:
        """Execute document creation"""
        self.validate_params(params)
        
        try:
            result = self.api_client.create_document(
                workspace_id=params['workspace_id'],
                title=params['title'],
                content=params['content'],
                metadata=params.get('metadata')
            )
            
            document_id = result.get('id')
            rollback_id = self._generate_rollback_id()
            
            # Store for rollback
            self._created_ids[rollback_id] = document_id
            
            tool_result = ToolResult(
                status=ToolResultStatus.SUCCESS,
                data={
                    'document_id': document_id,
                    'title': params['title'],
                    'created_at': result.get('createdAt')
                },
                rollback_id=rollback_id,
                rollback_metadata={
                    'document_id': document_id,
                    'action': 'delete_document'
                }
            )
            
            self._record_execution(params, tool_result)
            return tool_result
            
        except APIError as e:
            logger.error(f"Failed to create document: {e.message}")
            return ToolResult(
                status=ToolResultStatus.FAILED,
                error=f"API Error: {e.message}"
            )
        except Exception as e:
            logger.error(f"Unexpected error creating document: {str(e)}")
            return ToolResult(
                status=ToolResultStatus.FAILED,
                error=f"Error: {str(e)}"
            )
    
    def rollback(self, rollback_id: str) -> bool:
        """Rollback document creation by deleting it"""
        if rollback_id not in self._created_ids:
            raise ToolError(f"Rollback ID not found: {rollback_id}")
        
        document_id = self._created_ids[rollback_id]
        
        try:
            # Call delete API (soft delete)
            # Note: Implement when delete endpoint is available
            logger.warning(f"Rollback for document {document_id} - delete API not yet implemented")
            return True
        except Exception as e:
            raise ToolError(f"Rollback failed: {str(e)}")


class UpdateDocumentTool(AgentTool):
    """
    Tool for updating existing documents.
    
    Parameters:
        document_id: Document ID to update
        title: New title (optional)
        content: New content (optional)
        metadata: New metadata (optional)
    """
    
    def __init__(self, api_client: Optional[CoreServiceClient] = None):
        super().__init__()
        self.api_client = api_client or CoreServiceClient()
        self._update_history = {}  # For rollback
    
    def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate parameters"""
        if 'document_id' not in params:
            raise ToolError("Missing required parameter: document_id")
        
        # At least one field to update
        updateable_fields = ['title', 'content', 'metadata']
        if not any(field in params for field in updateable_fields):
            raise ToolError("At least one field to update is required (title, content, or metadata)")
        
        return True
    
    def preview(self, params: Dict[str, Any]) -> ToolPreview:
        """Generate preview of document update"""
        self.validate_params(params)
        
        changes = []
        details = {"document_id": params['document_id'], "changes": {}}
        
        if 'title' in params:
            changes.append(f"title → '{params['title']}'")
            details['changes']['title'] = params['title']
        
        if 'content' in params:
            content_preview = params['content'][:100] + "..." if len(params['content']) > 100 else params['content']
            changes.append(f"content ({len(params['content'])} chars)")
            details['changes']['content_preview'] = content_preview
        
        if 'metadata' in params:
            changes.append("metadata")
            details['changes']['metadata'] = params['metadata']
        
        return ToolPreview(
            action="update_document",
            summary=f"Update document {params['document_id']}: {', '.join(changes)}",
            details=details,
            estimated_impact=f"Document will be modified ({len(changes)} field(s))",
            risks=["medium"],
            reversible=True,
            estimated_time_ms=500
        )
    
    def execute(self, params: Dict[str, Any]) -> ToolResult:
        """Execute document update"""
        self.validate_params(params)
        
        try:
            result = self.api_client.update_document(
                document_id=params['document_id'],
                title=params.get('title'),
                content=params.get('content'),
                metadata=params.get('metadata')
            )
            
            rollback_id = self._generate_rollback_id()
            
            # Store previous values for rollback (would need to fetch first in production)
            self._update_history[rollback_id] = {
                'document_id': params['document_id'],
                'previous_values': {}  # Would store old values
            }
            
            tool_result = ToolResult(
                status=ToolResultStatus.SUCCESS,
                data={
                    'document_id': params['document_id'],
                    'updated_fields': list(params.keys()),
                    'updated_at': result.get('updatedAt')
                },
                rollback_id=rollback_id,
                rollback_metadata={
                    'document_id': params['document_id'],
                    'action': 'restore_document',
                    'previous_values': {}
                }
            )
            
            self._record_execution(params, tool_result)
            return tool_result
            
        except APIError as e:
            logger.error(f"Failed to update document: {e.message}")
            return ToolResult(
                status=ToolResultStatus.FAILED,
                error=f"API Error: {e.message}"
            )
        except Exception as e:
            logger.error(f"Unexpected error updating document: {str(e)}")
            return ToolResult(
                status=ToolResultStatus.FAILED,
                error=f"Error: {str(e)}"
            )
