"""
Board Tools

Tools for creating and saving board visualizations.
"""

from typing import Dict, Any, Optional
from agents.tools.base_tool import AgentTool, ToolPreview, ToolResult, ToolResultStatus, ToolError
from agents.api_clients import CoreServiceClient, APIError
import logging

logger = logging.getLogger(__name__)


class SaveBoardTool(AgentTool):
    """
    Tool for saving a board visualization.
    
    Parameters:
        workspace_id: Workspace ID
        name: Board name
        mermaid_code: Mermaid.js diagram code
        description: Optional description
    """
    
    def __init__(self, api_client: Optional[CoreServiceClient] = None):
        super().__init__()
        self.api_client = api_client or CoreServiceClient()
        self._created_ids = {}
    
    def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate parameters"""
        required = ['workspace_id', 'name', 'mermaid_code']
        
        for field in required:
            if field not in params:
                raise ToolError(f"Missing required parameter: {field}")
        
        if not isinstance(params['name'], str) or not params['name'].strip():
            raise ToolError("Name must be a non-empty string")
        
        if not isinstance(params['mermaid_code'], str) or not params['mermaid_code'].strip():
            raise ToolError("Mermaid code must be a non-empty string")
        
        return True
    
    def preview(self, params: Dict[str, Any]) -> ToolPreview:
        """Generate preview of board save"""
        self.validate_params(params)
        
        name = params['name']
        mermaid_preview = params['mermaid_code'][:200] + "..." if len(params['mermaid_code']) > 200 else params['mermaid_code']
        
        return ToolPreview(
            action="save_board",
            summary=f"Save board '{name}'",
            details={
                "name": name,
                "description": params.get('description', ''),
                "mermaid_preview": mermaid_preview,
                "diagram_size": len(params['mermaid_code'])
            },
            estimated_impact="New board added to workspace",
            risks=["low"],
            reversible=True,
            estimated_time_ms=500
        )
    
    def execute(self, params: Dict[str, Any]) -> ToolResult:
        """Execute board save"""
        self.validate_params(params)
        
        try:
            result = self.api_client.create_board(
                workspace_id=params['workspace_id'],
                name=params['name'],
                mermaid_code=params['mermaid_code'],
                description=params.get('description')
            )
            
            board_id = result.get('id')
            rollback_id = self._generate_rollback_id()
            
            self._created_ids[rollback_id] = board_id
            
            tool_result = ToolResult(
                status=ToolResultStatus.SUCCESS,
                data={
                    'board_id': board_id,
                    'name': params['name'],
                    'created_at': result.get('createdAt')
                },
                rollback_id=rollback_id,
                rollback_metadata={
                    'board_id': board_id,
                    'action': 'delete_board'
                }
            )
            
            self._record_execution(params, tool_result)
            return tool_result
            
        except APIError as e:
            logger.error(f"Failed to save board: {e.message}")
            return ToolResult(
                status=ToolResultStatus.FAILED,
                error=f"API Error: {e.message}"
            )
        except Exception as e:
            logger.error(f"Unexpected error saving board: {str(e)}")
            return ToolResult(
                status=ToolResultStatus.FAILED,
                error=f"Error: {str(e)}"
            )
