"""
HITL-Enhanced Orchestrator Agent

Orchestrator Agent with Human-in-the-Loop confirmation for multi-agent operations.

HITL Triggers:
- Multi-agent coordination requiring data modifications (MEDIUM severity)
- Cross-agent operations affecting multiple systems (HIGH severity)
- Escalation to multiple agents (HIGH severity)
- Complex workflows with irreversible actions (CRITICAL severity)

Example:
    ```python
    from agents.orchestrator_agent_hitl import OrchestratorAgentWithHITL
    
    agent = OrchestratorAgentWithHITL(
        document_agent=doc_agent,
        task_agent=task_agent
    )
    
    # Complex query requiring HITL
    result = agent.query_with_hitl(
        query="Delete all overdue tasks and archive their documents",
        workspace_id="workspace-123",
        user_id="user-456"
    )
    
    if result['requires_confirmation']:
        # User responds
        response = agent.wait_for_confirmation(result['request_id'])
        
        if response['approved']:
            execution_result = agent.execute_confirmed_plan(
                request_id=result['request_id'],
                response=response
            )
    ```
"""

from typing import Dict, Any, Optional, List
from datetime import datetime

from agents.orchestrator_agent import OrchestratorAgent
from agents.hitl_manager import HITLManager
from agents.schemas.hitl_schemas import (
    ActionOption,
    ActionType,
    ActionSeverity,
    ConfirmationResponse,
    ConfirmationStatus,
    HITLConfig
)
from agents.schemas import ExecutionPlan, ExecutionStep, StepType, IntentType
from utils.logger import get_logger

logger = get_logger(__name__)


class OrchestratorAgentWithHITL(OrchestratorAgent):
    """
    Orchestrator Agent with HITL support for complex multi-agent operations.
    
    Adds confirmation layer for:
    - Multi-agent coordination
    - Data modifications across agents
    - Escalations
    - Complex workflows
    """
    
    def __init__(
        self,
        llm_provider: str = "naver",
        model_name: Optional[str] = None,
        document_agent=None,
        task_agent=None,
        hitl_config: Optional[HITLConfig] = None
    ):
        """
        Initialize HITL-enhanced Orchestrator Agent
        
        Args:
            llm_provider: LLM provider
            model_name: Specific model
            document_agent: Document agent instance
            task_agent: Task agent instance
            hitl_config: HITL configuration
        """
        super().__init__(
            llm_provider=llm_provider,
            model_name=model_name,
            document_agent=document_agent,
            task_agent=task_agent
        )
        
        self.hitl_manager = HITLManager(
            config=hitl_config or HITLConfig(
                auto_execute_low=False,  # Orchestrator always requires confirmation
                require_confirmation_medium=True,
                require_approval_high=True,
                require_reason_critical=True
            )
        )
        
        logger.info("OrchestratorAgentWithHITL initialized with HITL support")
    
    def _analyze_plan_risk(self, plan: ExecutionPlan, query: str) -> Optional[Dict[str, Any]]:
        """
        Analyze execution plan for risky operations
        
        Args:
            plan: Execution plan
            query: Original user query
            
        Returns:
            Risk analysis dict or None if safe
        """
        # Count agents involved
        agent_types = set()
        has_deletions = False
        has_modifications = False
        
        for step in plan.steps:
            agent_types.add(step.agent.value)
            
            # Analyze step query/reasoning for risky operations
            step_text = f"{step.query} {step.reasoning}".lower()
            
            if any(word in step_text for word in ['delete', 'remove', 'drop']):
                has_deletions = True
            if any(word in step_text for word in ['update', 'modify', 'change', 'set']):
                has_modifications = True
        
        query_lower = query.lower()
        
        # CRITICAL: Multiple agents + deletions
        if len(agent_types) > 1 and has_deletions:
            return {
                'type': ActionType.BULK_OPERATION,
                'severity': ActionSeverity.CRITICAL,
                'reason': f'Multi-agent operation with deletions',
                'estimated_impact': f'Affects {len(agent_types)} systems with irreversible deletions',
                'agents_involved': list(agent_types),
                'has_deletions': True
            }
        
        # HIGH: Multiple agents + modifications
        if len(agent_types) > 1 and has_modifications:
            return {
                'type': ActionType.TASK_UPDATE,
                'severity': ActionSeverity.HIGH,
                'reason': f'Multi-agent coordination with modifications',
                'estimated_impact': f'Affects {len(agent_types)} systems with data changes',
                'agents_involved': list(agent_types),
                'has_modifications': True
            }
        
        # HIGH: Escalation keywords
        if any(word in query_lower for word in ['escalate', 'urgent', 'critical', 'emergency']):
            return {
                'type': ActionType.NOTIFICATION_SEND,
                'severity': ActionSeverity.HIGH,
                'reason': 'Escalation request detected',
                'estimated_impact': 'Will notify stakeholders and potentially trigger alerts',
                'agents_involved': list(agent_types)
            }
        
        # MEDIUM: Multi-agent coordination
        if len(agent_types) > 1:
            return {
                'type': ActionType.TASK_UPDATE,
                'severity': ActionSeverity.MEDIUM,
                'reason': 'Multi-agent coordination required',
                'estimated_impact': f'Involves {len(agent_types)} agents: {", ".join(agent_types)}',
                'agents_involved': list(agent_types)
            }
        
        # MEDIUM: Single agent with deletions
        if has_deletions:
            return {
                'type': ActionType.TASK_DELETE,
                'severity': ActionSeverity.MEDIUM,
                'reason': 'Operation involves deletions',
                'estimated_impact': 'Data will be permanently removed',
                'has_deletions': True
            }
        
        # MEDIUM: Complex workflow (>4 steps)
        if len(plan.steps) > 4:
            return {
                'type': ActionType.BULK_OPERATION,
                'severity': ActionSeverity.MEDIUM,
                'reason': f'Complex workflow with {len(plan.steps)} steps',
                'estimated_impact': 'Long execution time with multiple operations',
                'step_count': len(plan.steps)
            }
        
        # Safe operation
        return None
    
    def _create_orchestrator_options(
        self,
        risk: Dict[str, Any],
        plan: ExecutionPlan,
        query: str
    ) -> List[ActionOption]:
        """
        Create confirmation options for orchestrator operations
        
        Args:
            risk: Risk analysis
            plan: Execution plan
            query: Original query
            
        Returns:
            List of action options
        """
        severity = risk['severity']
        
        # For CRITICAL operations
        if severity == ActionSeverity.CRITICAL:
            return [
                ActionOption(
                    id="execute_full",
                    label="⚠️ Execute complete plan",
                    description=f"Execute all {len(plan.steps)} steps as planned",
                    action_type=risk['type'],
                    severity=severity,
                    parameters={'plan': plan.model_dump(), 'query': query, 'mode': 'full'},
                    reversible=False,
                    estimated_impact=risk.get('estimated_impact')
                ),
                ActionOption(
                    id="execute_safe_only",
                    label="✅ Execute safe steps only",
                    description="Skip deletion steps, execute read/modify operations only",
                    action_type=ActionType.TASK_UPDATE,
                    severity=ActionSeverity.MEDIUM,
                    parameters={'plan': plan.model_dump(), 'query': query, 'mode': 'safe'},
                    reversible=True,
                    estimated_impact="No deletions, reversible operations only"
                ),
                ActionOption(
                    id="preview_plan",
                    label="👁️ Preview execution plan",
                    description="Show what would be executed without running",
                    action_type=risk['type'],
                    severity=ActionSeverity.LOW,
                    parameters={'plan': plan.model_dump(), 'query': query, 'mode': 'preview'},
                    reversible=False,
                    estimated_impact="No changes, view-only"
                ),
                ActionOption(
                    id="cancel",
                    label="❌ Cancel",
                    description="Do not execute",
                    action_type=risk['type'],
                    severity=ActionSeverity.LOW,
                    parameters={},
                    reversible=True
                )
            ]
        
        # For HIGH/MEDIUM operations
        return [
            ActionOption(
                id="execute_plan",
                label="✅ Execute plan",
                description=f"Execute {len(plan.steps)} steps across {len(risk.get('agents_involved', []))} agent(s)",
                action_type=risk['type'],
                severity=severity,
                parameters={'plan': plan.model_dump(), 'query': query, 'mode': 'full'},
                reversible=True if severity == ActionSeverity.MEDIUM else False,
                estimated_impact=risk.get('estimated_impact')
            ),
            ActionOption(
                id="step_by_step",
                label="🔄 Execute step-by-step",
                description="Execute one step at a time with confirmation",
                action_type=risk['type'],
                severity=ActionSeverity.LOW,
                parameters={'plan': plan.model_dump(), 'query': query, 'mode': 'step_by_step'},
                reversible=True,
                estimated_impact="Full control over each operation"
            ),
            ActionOption(
                id="preview_plan",
                label="👁️ Preview plan",
                description="Show execution plan details",
                action_type=risk['type'],
                severity=ActionSeverity.LOW,
                parameters={'plan': plan.model_dump(), 'query': query, 'mode': 'preview'},
                reversible=False,
                estimated_impact="No changes"
            ),
            ActionOption(
                id="cancel",
                label="❌ Cancel",
                description="Do not execute",
                action_type=risk['type'],
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
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Process query with HITL confirmation for risky operations
        
        Args:
            query: User query
            workspace_id: Workspace ID
            user_id: User ID
            conversation_history: Conversation context
            
        Returns:
            Result with requires_confirmation flag
        """
        logger.info(f"Processing HITL-enhanced orchestrator query: '{query}'")
        
        # First, detect intent and create plan
        from agents.schemas import IntentDetectionRequest
        
        intent_request = IntentDetectionRequest(
            workspace_id=workspace_id,
            query=query,
            conversation_history=conversation_history
        )
        
        # Detect intent
        intent_result = self._detect_intent_node({
            'workspace_id': workspace_id,
            'query': query,
            'conversation_history': conversation_history,
            'intent': None,
            'intent_confidence': 0.0,
            'execution_plan': None,
            'step_results': [],
            'current_step_index': 0,
            'final_answer': None,
            'metadata': {},
            'error': None,
            'document_agent': self.document_agent,
            'task_agent': self.task_agent
        })
        
        if intent_result.get('error'):
            return {
                'success': False,
                'answer': f"❌ Error detecting intent: {intent_result['error']}",
                'error': intent_result['error']
            }
        
        # Create execution plan
        plan_result = self._create_plan_node(intent_result)
        
        if plan_result.get('error') or not plan_result.get('execution_plan'):
            return {
                'success': False,
                'answer': "❌ Error creating execution plan",
                'error': plan_result.get('error', 'No plan created')
            }
        
        plan = plan_result['execution_plan']
        
        # Analyze risk
        risk = self._analyze_plan_risk(plan, query)
        
        if risk is None:
            # Safe operation - execute without HITL
            logger.info("Safe operation detected - executing without HITL")
            result = self.query(workspace_id, query, conversation_history)
            return {
                **result,
                'requires_confirmation': False,
                'operation_type': 'safe_query'
            }
        
        # Risky operation - create HITL request
        logger.warning(f"Risky operation detected: {risk['type']} ({risk['severity']})")
        
        options = self._create_orchestrator_options(risk, plan, query)
        
        confirmation_request = self.hitl_manager.create_confirmation_request(
            workspace_id=workspace_id,
            user_id=user_id,
            agent_name="OrchestratorAgent",
            title=f"⚠️ Multi-Agent Operation Confirmation",
            description=f"{risk['reason']}\n\n**Query:** {query}\n**Impact:** {risk.get('estimated_impact', 'Unknown')}\n**Agents:** {', '.join(risk.get('agents_involved', []))}",
            options=options,
            context={
                'query': query,
                'plan': plan.model_dump(),
                'risk_analysis': risk,
                'detected_at': datetime.utcnow().isoformat()
            },
            default_option="preview_plan" if risk['severity'] == ActionSeverity.CRITICAL else "cancel",
            timeout_seconds=600 if risk['severity'] == ActionSeverity.CRITICAL else 300
        )
        
        # Format plan preview
        plan_preview = self._format_plan_preview(plan)
        
        return {
            'answer': f"⏳ Confirmation required for multi-agent operation",
            'requires_confirmation': True,
            'request_id': confirmation_request.request_id,
            'operation_type': risk['type'].value,
            'severity': risk['severity'].value,
            'plan_preview': plan_preview,
            'agents_involved': risk.get('agents_involved', []),
            'step_count': len(plan.steps),
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
                'risk_analysis': risk
            }
        }
    
    def query_with_crud(
        self,
        query: str,
        workspace_id: str,
        user_id: str = "default-user",
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Alias for query_with_hitl for API compatibility.
        Process query with HITL confirmation for risky operations including CRUD.
        
        Args:
            query: User query
            workspace_id: Workspace ID
            user_id: User ID
            conversation_history: Conversation context
            
        Returns:
            Result with requires_confirmation flag
        """
        return self.query_with_hitl(query, workspace_id, user_id, conversation_history)
    
    def _format_plan_preview(self, plan: ExecutionPlan) -> str:
        """Format execution plan for preview"""
        preview = f"📋 Execution Plan ({len(plan.steps)} steps):\n\n"
        
        for i, step in enumerate(plan.steps, 1):
            preview += f"{i}. **{step.agent.value}** - {step.type.value}\n"
            preview += f"   {step.query}\n"
            if step.dependencies:
                preview += f"   ⚠️ Depends on step(s): {', '.join(map(str, step.dependencies))}\n"
            preview += "\n"
        
        return preview
    
    def execute_confirmed_plan(
        self,
        request_id: str,
        response: ConfirmationResponse
    ) -> Dict[str, Any]:
        """
        Execute plan after user confirmation
        
        Args:
            request_id: Confirmation request ID
            response: User response
            
        Returns:
            Execution result
        """
        if response.status != ConfirmationStatus.APPROVED:
            logger.info(f"Plan {request_id} not approved: {response.status}")
            return {
                'success': False,
                'answer': f"Plan {response.status.value}",
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
        mode = params.get('mode', 'full')
        
        # Preview mode
        if mode == 'preview':
            plan_data = params.get('plan', {})
            plan = ExecutionPlan(**plan_data) if plan_data else None
            
            if plan:
                preview = self._format_plan_preview(plan)
                return {
                    'success': True,
                    'answer': preview,
                    'preview': True,
                    'plan': plan_data
                }
            else:
                return {
                    'success': False,
                    'answer': "No plan to preview",
                    'error': 'no_plan'
                }
        
        # Execute plan
        query = params.get('query', '')
        
        def execute_orchestrator_plan(params):
            result = self.query(
                query=query,
                workspace_id=request.workspace_id,
                conversation_history=None
            )
            return result
        
        execution_result = self.hitl_manager.execute_action(
            request_id=request_id,
            option_id=selected_option.id,
            executor_func=execute_orchestrator_plan
        )
        
        return {
            'success': execution_result.success,
            'answer': execution_result.result.get('answer') if execution_result.success else execution_result.error,
            'mode': mode,
            'rollback_available': execution_result.rollback_available,
            'rollback_id': execution_result.rollback_id,
            'metadata': execution_result.result if execution_result.success else None
        }


def quick_test_orchestrator_hitl():
    """Quick test of Orchestrator Agent HITL"""
    from agents.document_agent import DocumentAgent
    from agents.task_agent import TaskAgent
    
    # Initialize agents
    doc_agent = DocumentAgent(llm_provider="naver")
    task_agent = TaskAgent(llm_provider="naver")
    
    agent = OrchestratorAgentWithHITL(
        llm_provider="naver",
        document_agent=doc_agent,
        task_agent=task_agent
    )
    
    # Test complex multi-agent query
    result = agent.query_with_hitl(
        query="Find all overdue tasks and archive their related documents",
        workspace_id="68f71140-874c-4954-81a8-457fe912ddff",
        user_id="user_3598sVShk4DTuSUrlZgc8loUPJd"
    )
    
    print("\n" + "="*80)
    print("HITL ORCHESTRATOR AGENT TEST")
    print("="*80)
    print(f"\nQuery: {result['metadata']['query']}")
    print(f"Requires Confirmation: {result['requires_confirmation']}")
    
    if result['requires_confirmation']:
        print(f"\nRequest ID: {result['request_id']}")
        print(f"Operation: {result['operation_type']}")
        print(f"Severity: {result['severity']}")
        print(f"Agents Involved: {', '.join(result['agents_involved'])}")
        print(f"Step Count: {result['step_count']}")
        
        print(f"\n{result['plan_preview']}")
        
        print("Options:")
        for opt in result['options']:
            print(f"  - {opt['label']}")
            print(f"    {opt['description']}")
    
    return result


if __name__ == "__main__":
    quick_test_orchestrator_hitl()
