"""
HITL-Enhanced Board Agent

Board Agent with Human-in-the-Loop confirmation for export and bulk operations.

HITL Triggers:
- Large export operations (MEDIUM severity)
- Bulk visualization generation (LOW severity)
- Data modifications through board (HIGH severity)

Example:
    ```python
    from agents.board_agent_hitl import BoardAgentWithHITL
    
    agent = BoardAgentWithHITL()
    
    # Request that triggers HITL
    result = agent.visualize_with_hitl(
        query="Generate Gantt chart for all 500 tasks",
        workspace_id="workspace-123",
        user_id="user-456"
    )
    
    if result['requires_confirmation']:
        # User responds via API
        response = agent.wait_for_confirmation(result['request_id'])
        
        if response['approved']:
            execution_result = agent.execute_confirmed_action(
                request_id=result['request_id'],
                response=response
            )
    ```
"""

from typing import Dict, Any, Optional, List
from datetime import datetime

from agents.board_agent import BoardAgent
from agents.hitl_manager import HITLManager
from agents.schemas.hitl_schemas import (
    ActionOption,
    ActionType,
    ActionSeverity,
    ConfirmationResponse,
    ConfirmationStatus,
    HITLConfig
)
from utils.logger import get_logger

logger = get_logger(__name__)


class BoardAgentWithHITL(BoardAgent):
    """
    Board Agent with HITL support for large operations.
    
    Adds confirmation layer for:
    - Large exports (>100 tasks)
    - Bulk visualization generation
    - Data modifications
    """
    
    def __init__(
        self,
        llm_provider: str = None,
        hitl_config: Optional[HITLConfig] = None
    ):
        """
        Initialize HITL-enhanced Board Agent
        
        Args:
            llm_provider: LLM provider
            hitl_config: HITL configuration
        """
        super().__init__(llm_provider=llm_provider)
        
        self.hitl_manager = HITLManager(
            config=hitl_config or HITLConfig(
                auto_execute_low=True,  # Auto-approve small exports
                require_confirmation_medium=True
            )
        )
        
        logger.info("BoardAgentWithHITL initialized with HITL support")
    
    def _should_require_confirmation(
        self,
        chart_type: str,
        task_count: int,
        filters: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Check if operation requires HITL confirmation
        
        Args:
            chart_type: Type of chart (kanban, gantt, flowchart)
            task_count: Number of tasks to visualize
            filters: Applied filters
            
        Returns:
            Operation info if confirmation needed, None otherwise
        """
        # Large exports (>100 tasks) - MEDIUM severity
        if task_count > 100:
            return {
                'type': ActionType.BULK_OPERATION,
                'severity': ActionSeverity.MEDIUM,
                'reason': f'Large export operation ({task_count} tasks)',
                'estimated_impact': f'Will generate {chart_type} for {task_count} tasks. May take 30-60 seconds.'
            }
        
        # Very large exports (>500 tasks) - HIGH severity
        if task_count > 500:
            return {
                'type': ActionType.BULK_OPERATION,
                'severity': ActionSeverity.HIGH,
                'reason': f'Very large export ({task_count} tasks)',
                'estimated_impact': f'Will generate {chart_type} for {task_count} tasks. May take 2-5 minutes and impact performance.'
            }
        
        # Gantt charts with many tasks - MEDIUM severity
        if chart_type == 'gantt' and task_count > 50:
            return {
                'type': ActionType.BULK_OPERATION,
                'severity': ActionSeverity.MEDIUM,
                'reason': f'Large Gantt chart ({task_count} tasks)',
                'estimated_impact': 'Complex timeline visualization may be slow to render'
            }
        
        # No confirmation needed for small operations
        return None
    
    def _create_board_options(
        self,
        operation: Dict[str, Any],
        chart_type: str,
        task_count: int,
        workspace_id: str
    ) -> List[ActionOption]:
        """
        Create confirmation options for board operations
        
        Args:
            operation: Operation info
            chart_type: Chart type
            task_count: Task count
            workspace_id: Workspace ID
            
        Returns:
            List of action options
        """
        if task_count > 100:
            return [
                ActionOption(
                    id="generate_full",
                    label=f"✅ Generate {chart_type} for all {task_count} tasks",
                    description=f"Create full visualization (may take time)",
                    action_type=ActionType.BULK_OPERATION,
                    severity=operation['severity'],
                    parameters={
                        'chart_type': chart_type,
                        'task_count': task_count,
                        'limit': None
                    },
                    reversible=False,
                    estimated_impact=operation.get('estimated_impact')
                ),
                ActionOption(
                    id="generate_limited",
                    label=f"⚡ Generate {chart_type} for top 100 tasks",
                    description="Faster generation with limited scope",
                    action_type=ActionType.BULK_OPERATION,
                    severity=ActionSeverity.LOW,
                    parameters={
                        'chart_type': chart_type,
                        'task_count': task_count,
                        'limit': 100
                    },
                    reversible=False,
                    estimated_impact="Quick generation with most important tasks"
                ),
                ActionOption(
                    id="export_csv",
                    label="📊 Export to CSV instead",
                    description="Export data to CSV file for external processing",
                    action_type=ActionType.BULK_OPERATION,
                    severity=ActionSeverity.LOW,
                    parameters={
                        'export_format': 'csv',
                        'task_count': task_count
                    },
                    reversible=False,
                    estimated_impact="Lightweight export, can process externally"
                ),
                ActionOption(
                    id="cancel",
                    label="❌ Cancel",
                    description="Do nothing",
                    action_type=ActionType.BULK_OPERATION,
                    severity=ActionSeverity.LOW,
                    parameters={},
                    reversible=True
                )
            ]
        
        # Default options for smaller operations
        return [
            ActionOption(
                id="confirm",
                label=f"✅ Generate {chart_type}",
                description=f"Create visualization for {task_count} tasks",
                action_type=ActionType.BULK_OPERATION,
                severity=operation['severity'],
                parameters={
                    'chart_type': chart_type,
                    'task_count': task_count,
                    'limit': None
                },
                reversible=False
            ),
            ActionOption(
                id="cancel",
                label="❌ Cancel",
                description="Do nothing",
                action_type=ActionType.BULK_OPERATION,
                severity=ActionSeverity.LOW,
                parameters={},
                reversible=True
            )
        ]
    
    def visualize_with_hitl(
        self,
        query: str,
        workspace_id: str,
        user_id: str = "default-user",
        session_id: str = "default-session"
    ) -> Dict[str, Any]:
        """
        Create board visualization with HITL confirmation for large operations
        
        Args:
            query: Visualization request
            workspace_id: Workspace ID
            user_id: User ID
            session_id: Session ID
            
        Returns:
            Result with requires_confirmation flag
        """
        logger.info(f"Processing HITL-enhanced board request: '{query}'")
        
        # Parse the request to determine chart type and scope
        # This is simplified - in production would use LLM to parse
        query_lower = query.lower()
        
        if 'kanban' in query_lower:
            chart_type = 'kanban'
        elif 'gantt' in query_lower:
            chart_type = 'gantt'
        elif 'flowchart' in query_lower or 'flow' in query_lower:
            chart_type = 'flowchart'
        else:
            chart_type = 'kanban'  # default
        
        # Get task count (in production, would query database)
        # For now, assume from query
        import re
        count_match = re.search(r'(\d+)\s*tasks?', query_lower)
        if count_match:
            task_count = int(count_match.group(1))
        else:
            # Query database to get actual count
            from database.repositories.task_repository import TaskRepository
            from database.connection import get_db_session
            
            db = get_db_session()
            try:
                task_repo = TaskRepository(db)
                tasks = task_repo.list_by_workspace(workspace_id)
                task_count = len(tasks)
            finally:
                db.close()
        
        # Check if confirmation needed
        operation = self._should_require_confirmation(
            chart_type=chart_type,
            task_count=task_count,
            filters={}
        )
        
        if operation is None or (operation['severity'] == ActionSeverity.LOW and self.hitl_manager.config.auto_execute_low):
            # Execute without confirmation
            logger.info(f"Small operation ({task_count} tasks) - executing without HITL")
            return {
                **self.visualize(query, workspace_id, user_id, session_id),
                'requires_confirmation': False,
                'task_count': task_count,
                'chart_type': chart_type
            }
        
        # Create confirmation request
        logger.warning(f"Large operation detected: {chart_type} for {task_count} tasks ({operation['severity']})")
        
        options = self._create_board_options(
            operation=operation,
            chart_type=chart_type,
            task_count=task_count,
            workspace_id=workspace_id
        )
        
        confirmation_request = self.hitl_manager.create_confirmation_request(
            workspace_id=workspace_id,
            user_id=user_id,
            agent_name="BoardAgent",
            title=f"⚠️ Large Visualization Request",
            description=f"{operation['reason']}\n\n**Request:** {query}\n**Impact:** {operation.get('estimated_impact', 'Unknown')}",
            options=options,
            context={
                'query': query,
                'chart_type': chart_type,
                'task_count': task_count,
                'operation_type': operation['type'].value,
                'severity': operation['severity'].value,
                'detected_at': datetime.utcnow().isoformat()
            },
            default_option="generate_limited" if task_count > 100 else "confirm",
            timeout_seconds=300
        )
        
        return {
            'answer': f"⏳ Confirmation required for large {chart_type} generation ({task_count} tasks)",
            'requires_confirmation': True,
            'request_id': confirmation_request.request_id,
            'operation_type': operation['type'].value,
            'severity': operation['severity'].value,
            'chart_type': chart_type,
            'task_count': task_count,
            'options': [
                {
                    'id': opt.id,
                    'label': opt.label,
                    'description': opt.description,
                    'severity': opt.severity.value,
                    'reversible': opt.reversible
                }
                for opt in options
            ],
            'expires_at': confirmation_request.expires_at.isoformat(),
            'metadata': {
                'workspace_id': workspace_id,
                'user_id': user_id,
                'query': query
            }
        }
    
    def execute_confirmed_action(
        self,
        request_id: str,
        response: ConfirmationResponse
    ) -> Dict[str, Any]:
        """
        Execute board action after user confirmation
        
        Args:
            request_id: Confirmation request ID
            response: User response
            
        Returns:
            Execution result
        """
        if response.status != ConfirmationStatus.APPROVED:
            logger.info(f"Board action {request_id} not approved: {response.status}")
            return {
                'success': False,
                'answer': f"Action {response.status.value}",
                'status': response.status.value,
                'reason': response.reason
            }
        
        # Get request
        request = self.hitl_manager.get_request(request_id)
        if not request:
            return {
                'success': False,
                'answer': "Request not found",
                'error': 'request_not_found'
            }
        
        # Find selected option
        selected_option = next(
            (opt for opt in request.options if opt.id == response.selected_option_id),
            None
        )
        
        if not selected_option:
            return {
                'success': False,
                'answer': "Selected option not found",
                'error': 'option_not_found'
            }
        
        params = selected_option.parameters
        
        # Execute based on parameters
        if params.get('export_format') == 'csv':
            # CSV export
            return {
                'success': True,
                'answer': f"📊 CSV export initiated for {params.get('task_count')} tasks",
                'export_format': 'csv',
                'task_count': params.get('task_count')
            }
        
        elif params.get('chart_type'):
            # Generate visualization
            chart_type = params.get('chart_type')
            limit = params.get('limit')
            
            # Build query
            if limit:
                viz_query = f"Generate {chart_type} for top {limit} priority tasks"
            else:
                viz_query = f"Generate {chart_type} for all tasks"
            
            def generate_board(params):
                result = self.visualize(
                    query=viz_query,
                    workspace_id=request.workspace_id,
                    user_id=request.user_id
                )
                return result
            
            execution_result = self.hitl_manager.execute_action(
                request_id=request_id,
                option_id=selected_option.id,
                executor_func=generate_board
            )
            
            return {
                'success': execution_result.success,
                'answer': execution_result.result.get('mermaid_code') if execution_result.success else execution_result.error,
                'chart_type': chart_type,
                'task_count': params.get('task_count'),
                'limited': limit is not None,
                'metadata': execution_result.result if execution_result.success else None
            }
        
        else:
            # Cancel
            return {
                'success': True,
                'answer': "✅ Action cancelled",
                'cancelled': True
            }


def quick_test_board_hitl():
    """Quick test of Board Agent HITL"""
    agent = BoardAgentWithHITL(llm_provider="naver")
    
    # Test large operation
    result = agent.visualize_with_hitl(
        query="Generate Gantt chart for all 150 tasks",
        workspace_id="68f71140-874c-4954-81a8-457fe912ddff",
        user_id="user_3598sVShk4DTuSUrlZgc8loUPJd"
    )
    
    print("\n" + "="*80)
    print("HITL BOARD AGENT TEST")
    print("="*80)
    print(f"\nQuery: {result['metadata']['query']}")
    print(f"Chart Type: {result['chart_type']}")
    print(f"Task Count: {result['task_count']}")
    print(f"Requires Confirmation: {result['requires_confirmation']}")
    
    if result['requires_confirmation']:
        print(f"\nRequest ID: {result['request_id']}")
        print(f"Operation: {result['operation_type']}")
        print(f"Severity: {result['severity']}")
        print(f"\nOptions:")
        for opt in result['options']:
            print(f"  - {opt['label']}")
            print(f"    {opt['description']}")
    
    return result


if __name__ == "__main__":
    quick_test_board_hitl()
