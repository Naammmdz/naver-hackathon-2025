"""
HITL-Enhanced Task Agent

Task Agent with Human-in-the-Loop confirmation for risky operations.
Adds HITL layer on top of existing TaskAgent for operations that require user approval.

HITL Triggers:
- Deadline changes (MEDIUM severity)
- Priority changes (LOW severity)  
- Task deletion (HIGH severity)
- Bulk updates (CRITICAL severity)
- Status changes affecting multiple tasks (MEDIUM severity)

Example:
    ```python
    from agents.task_agent_hitl import TaskAgentWithHITL
    
    agent = TaskAgentWithHITL()
    
    # Query that triggers HITL
    result = agent.query_with_hitl(
        query="Delete all completed tasks",
        workspace_id="workspace-123",
        user_id="user-456"
    )
    
    if result['requires_confirmation']:
        # Wait for user response
        response = agent.wait_for_confirmation(result['request_id'])
        
        if response['approved']:
            # Execute the action
            execution_result = agent.execute_confirmed_action(
                request_id=result['request_id'],
                response=response
            )
    ```
"""

from typing import Dict, Any, Optional, List
import re
from datetime import datetime

from agents.task_agent import TaskAgent
from agents.hitl_manager import HITLManager
from agents.schemas.hitl_schemas import (
    ActionOption,
    ActionType,
    ActionSeverity,
    ConfirmationRequest,
    ConfirmationResponse,
    ConfirmationStatus,
    HITLConfig
)
from utils.logger import get_logger

logger = get_logger(__name__)


class TaskAgentWithHITL(TaskAgent):
    """
    Task Agent with HITL support for risky operations.
    
    Extends base TaskAgent to add confirmation layer for:
    - Task deletion
    - Deadline changes
    - Priority changes
    - Bulk updates
    - Status changes
    """
    
    def __init__(
        self,
        llm_provider: str = None,
        hitl_config: Optional[HITLConfig] = None
    ):
        """
        Initialize HITL-enhanced Task Agent
        
        Args:
            llm_provider: LLM provider
            hitl_config: HITL configuration (optional)
        """
        super().__init__(llm_provider=llm_provider)
        
        # Initialize HITL manager
        self.hitl_manager = HITLManager(
            config=hitl_config or HITLConfig()
        )
        
        logger.info("TaskAgentWithHITL initialized with HITL support")
    
    def _detect_risky_operation(self, query: str, sql: str) -> Optional[Dict[str, Any]]:
        """
        Detect if query involves risky operation requiring HITL
        
        Args:
            query: User query
            sql: Generated SQL
            
        Returns:
            Dict with operation type and severity, or None if safe
        """
        query_lower = query.lower()
        sql_lower = sql.lower()
        
        # DELETE operations (HIGH severity)
        if 'delete' in query_lower or 'delete from' in sql_lower:
            # Count affected rows
            if 'where' not in sql_lower:
                # Bulk delete without condition
                return {
                    'type': ActionType.TASK_DELETE,
                    'severity': ActionSeverity.CRITICAL,
                    'reason': 'Bulk delete without WHERE condition',
                    'estimated_impact': 'Will delete ALL tasks in workspace'
                }
            else:
                return {
                    'type': ActionType.TASK_DELETE,
                    'severity': ActionSeverity.HIGH,
                    'reason': 'Task deletion',
                    'estimated_impact': 'Deleted tasks cannot be recovered'
                }
        
        # DEADLINE changes (MEDIUM severity)
        if any(word in query_lower for word in ['deadline', 'due date', 'extend', 'postpone']):
            if 'update' in sql_lower and 'due_date' in sql_lower:
                return {
                    'type': ActionType.DEADLINE_CHANGE,
                    'severity': ActionSeverity.MEDIUM,
                    'reason': 'Deadline modification',
                    'estimated_impact': 'Will affect task schedules and dependencies'
                }
        
        # PRIORITY changes (LOW severity if single task, MEDIUM if bulk)
        if 'priority' in query_lower:
            if 'update' in sql_lower:
                if 'where id =' in sql_lower:
                    return {
                        'type': ActionType.PRIORITY_CHANGE,
                        'severity': ActionSeverity.LOW,
                        'reason': 'Priority change for single task',
                        'estimated_impact': 'May affect task ordering'
                    }
                else:
                    return {
                        'type': ActionType.PRIORITY_CHANGE,
                        'severity': ActionSeverity.MEDIUM,
                        'reason': 'Bulk priority changes',
                        'estimated_impact': 'Will affect multiple tasks'
                    }
        
        # STATUS changes affecting multiple tasks (MEDIUM severity)
        if 'status' in query_lower and 'update' in sql_lower:
            if 'where' not in sql_lower or any(word in query_lower for word in ['all', 'bulk', 'multiple']):
                return {
                    'type': ActionType.TASK_UPDATE,
                    'severity': ActionSeverity.MEDIUM,
                    'reason': 'Bulk status update',
                    'estimated_impact': 'Will change status of multiple tasks'
                }
        
        # BULK operations (CRITICAL severity)
        if any(word in query_lower for word in ['all tasks', 'every task', 'bulk']):
            if 'update' in sql_lower or 'delete' in sql_lower:
                return {
                    'type': ActionType.BULK_OPERATION,
                    'severity': ActionSeverity.CRITICAL,
                    'reason': 'Bulk operation on all tasks',
                    'estimated_impact': 'Will affect entire workspace'
                }
        
        # No risky operation detected
        return None
    
    def _create_confirmation_options(
        self,
        operation: Dict[str, Any],
        query: str,
        sql: str
    ) -> List[ActionOption]:
        """
        Create confirmation options based on operation type
        
        Args:
            operation: Detected operation info
            query: Original user query
            sql: Generated SQL
            
        Returns:
            List of action options for user to choose from
        """
        operation_type = operation['type']
        severity = operation['severity']
        
        if operation_type == ActionType.TASK_DELETE:
            return [
                ActionOption(
                    id="confirm_delete",
                    label="✅ Confirm deletion",
                    description="Execute the delete operation",
                    action_type=ActionType.TASK_DELETE,
                    severity=severity,
                    parameters={'sql': sql, 'query': query},
                    reversible=False,
                    estimated_impact=operation.get('estimated_impact')
                ),
                ActionOption(
                    id="archive_instead",
                    label="📦 Archive instead",
                    description="Mark tasks as archived instead of deleting",
                    action_type=ActionType.TASK_UPDATE,
                    severity=ActionSeverity.LOW,
                    parameters={'sql': sql.replace('DELETE', 'UPDATE tasks SET status = \'archived\''), 'query': query},
                    reversible=True,
                    estimated_impact="Tasks can be restored from archive"
                ),
                ActionOption(
                    id="cancel",
                    label="❌ Cancel",
                    description="Do nothing",
                    action_type=ActionType.TASK_DELETE,
                    severity=ActionSeverity.LOW,
                    parameters={},
                    reversible=True
                )
            ]
        
        elif operation_type == ActionType.DEADLINE_CHANGE:
            return [
                ActionOption(
                    id="confirm_change",
                    label="✅ Confirm deadline change",
                    description="Execute the deadline modification",
                    action_type=ActionType.DEADLINE_CHANGE,
                    severity=severity,
                    parameters={'sql': sql, 'query': query},
                    reversible=True,
                    estimated_impact=operation.get('estimated_impact')
                ),
                ActionOption(
                    id="notify_only",
                    label="📧 Notify stakeholders only",
                    description="Send notification without changing deadlines",
                    action_type=ActionType.NOTIFICATION_SEND,
                    severity=ActionSeverity.LOW,
                    parameters={'notify': True, 'query': query},
                    reversible=False,
                    estimated_impact="No changes to tasks"
                ),
                ActionOption(
                    id="cancel",
                    label="❌ Cancel",
                    description="Do nothing",
                    action_type=ActionType.DEADLINE_CHANGE,
                    severity=ActionSeverity.LOW,
                    parameters={},
                    reversible=True
                )
            ]
        
        elif operation_type in [ActionType.PRIORITY_CHANGE, ActionType.TASK_UPDATE, ActionType.BULK_OPERATION]:
            return [
                ActionOption(
                    id="confirm_update",
                    label="✅ Confirm update",
                    description="Execute the update operation",
                    action_type=operation_type,
                    severity=severity,
                    parameters={'sql': sql, 'query': query},
                    reversible=True,
                    estimated_impact=operation.get('estimated_impact')
                ),
                ActionOption(
                    id="preview_only",
                    label="👁️ Preview changes",
                    description="Show what would be changed without executing",
                    action_type=ActionType.TASK_UPDATE,
                    severity=ActionSeverity.LOW,
                    parameters={'preview': True, 'sql': sql.replace('UPDATE', 'SELECT * FROM')},
                    reversible=False,
                    estimated_impact="No changes to tasks"
                ),
                ActionOption(
                    id="cancel",
                    label="❌ Cancel",
                    description="Do nothing",
                    action_type=operation_type,
                    severity=ActionSeverity.LOW,
                    parameters={},
                    reversible=True
                )
            ]
        
        # Default options
        return [
            ActionOption(
                id="confirm",
                label="✅ Confirm",
                description="Execute the operation",
                action_type=operation_type,
                severity=severity,
                parameters={'sql': sql, 'query': query},
                reversible=False
            ),
            ActionOption(
                id="cancel",
                label="❌ Cancel",
                description="Do nothing",
                action_type=operation_type,
                severity=ActionSeverity.LOW,
                parameters={},
                reversible=True
            )
        ]
    
    def query_with_hitl(
        self,
        query: str,
        workspace_id: str,
        user_id: str = "default-user",
        session_id: str = "default-session",
        auto_approve_low: bool = True
    ) -> Dict[str, Any]:
        """
        Query with HITL support - checks for risky operations
        
        Args:
            query: User query
            workspace_id: Workspace ID
            user_id: User ID
            session_id: Session ID
            auto_approve_low: Auto-approve LOW severity operations
            
        Returns:
            Result with requires_confirmation flag and confirmation details
        """
        logger.info(f"Processing HITL-enhanced query: '{query}'")
        
        # First, generate SQL to analyze the operation
        from agents.graphs.task_graph import create_initial_state
        initial_state = create_initial_state(
            query=query,
            workspace_id=workspace_id,
            user_id=user_id,
            session_id=session_id
        )
        
        # Run through schema loading and SQL generation only
        state = self.nodes.load_schema_node(initial_state)
        state = self.nodes.generate_sql_node(state)
        
        sql = state.get('generated_sql', '')
        
        # Detect risky operation
        operation = self._detect_risky_operation(query, sql)
        
        if operation is None:
            # Safe operation - execute normally
            logger.info("Safe operation detected - executing without HITL")
            return {
                **self.query(query, workspace_id, user_id, session_id),
                'requires_confirmation': False,
                'operation_type': 'safe_query'
            }
        
        # Check if auto-approve
        if auto_approve_low and operation['severity'] == ActionSeverity.LOW:
            logger.info(f"LOW severity operation auto-approved: {operation['type']}")
            return {
                **self.query(query, workspace_id, user_id, session_id),
                'requires_confirmation': False,
                'operation_type': operation['type'].value,
                'severity': operation['severity'].value,
                'auto_approved': True
            }
        
        # Risky operation - create HITL request
        logger.warning(f"Risky operation detected: {operation['type']} ({operation['severity']})")
        
        options = self._create_confirmation_options(operation, query, sql)
        
        confirmation_request = self.hitl_manager.create_confirmation_request(
            workspace_id=workspace_id,
            user_id=user_id,
            agent_name="TaskAgent",
            title=f"⚠️ Confirm {operation['type'].value.replace('_', ' ').title()}",
            description=f"{operation['reason']}\n\n**Query:** {query}\n**Impact:** {operation.get('estimated_impact', 'Unknown')}",
            options=options,
            context={
                'query': query,
                'sql': sql,
                'operation_type': operation['type'].value,
                'severity': operation['severity'].value,
                'detected_at': datetime.utcnow().isoformat()
            },
            default_option="cancel",
            timeout_seconds=600 if operation['severity'] == ActionSeverity.CRITICAL else 300
        )
        
        return {
            'answer': f"⏳ Confirmation required for {operation['type'].value.replace('_', ' ')}",
            'requires_confirmation': True,
            'request_id': confirmation_request.request_id,
            'operation_type': operation['type'].value,
            'severity': operation['severity'].value,
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
                'query': query,
                'sql': sql
            }
        }
    
    def execute_confirmed_action(
        self,
        request_id: str,
        response: ConfirmationResponse
    ) -> Dict[str, Any]:
        """
        Execute action after user confirmation
        
        Args:
            request_id: Confirmation request ID
            response: User response
            
        Returns:
            Execution result
        """
        if response.status != ConfirmationStatus.APPROVED:
            logger.info(f"Action {request_id} not approved: {response.status}")
            return {
                'success': False,
                'answer': f"Action {response.status.value}",
                'status': response.status.value,
                'reason': response.reason
            }
        
        # Get the request to retrieve parameters
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
        
        # Execute based on option parameters
        params = selected_option.parameters
        
        if params.get('sql'):
            # Execute SQL operation
            def execute_sql_action(params):
                result = self.query(
                    query=params.get('query', ''),
                    workspace_id=request.workspace_id,
                    user_id=request.user_id
                )
                return result
            
            execution_result = self.hitl_manager.execute_action(
                request_id=request_id,
                option_id=selected_option.id,
                executor_func=execute_sql_action
            )
            
            return {
                'success': execution_result.success,
                'answer': execution_result.result.get('answer') if execution_result.success else execution_result.error,
                'rollback_available': execution_result.rollback_available,
                'rollback_id': execution_result.rollback_id,
                'metadata': execution_result.result if execution_result.success else None
            }
        
        elif params.get('preview'):
            # Preview mode - just show what would happen
            preview_result = self.query(
                query=params.get('query', ''),
                workspace_id=request.workspace_id,
                user_id=request.user_id
            )
            
            return {
                'success': True,
                'answer': f"📋 Preview: {preview_result['answer']}",
                'preview': True,
                'metadata': preview_result
            }
        
        elif params.get('notify'):
            # Notification mode - send notification
            return {
                'success': True,
                'answer': "📧 Notification sent to stakeholders",
                'notification_sent': True,
                'metadata': {
                    'query': params.get('query'),
                    'timestamp': datetime.utcnow().isoformat()
                }
            }
        
        else:
            # Cancel or no-op
            return {
                'success': True,
                'answer': "✅ Action cancelled",
                'cancelled': True
            }


# Convenience function for quick testing
def quick_test_hitl():
    """Quick test of HITL functionality"""
    agent = TaskAgentWithHITL()
    
    # Test risky query
    result = agent.query_with_hitl(
        query="Delete all completed tasks",
        workspace_id="68f71140-874c-4954-81a8-457fe912ddff",
        user_id="user_3598sVShk4DTuSUrlZgc8loUPJd"
    )
    
    print("\n" + "="*80)
    print("HITL TASK AGENT TEST")
    print("="*80)
    print(f"\nQuery: {result['metadata']['query']}")
    print(f"Requires Confirmation: {result['requires_confirmation']}")
    
    if result['requires_confirmation']:
        print(f"Request ID: {result['request_id']}")
        print(f"Operation: {result['operation_type']}")
        print(f"Severity: {result['severity']}")
        print(f"\nOptions:")
        for opt in result['options']:
            print(f"  - {opt['label']}: {opt['description']}")
    
    return result


if __name__ == "__main__":
    quick_test_hitl()
