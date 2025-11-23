"""
Orchestrator Agent

Coordinates multiple AI agents (Document Agent, Task Agent) to answer complex queries.
Handles intent detection, task decomposition, execution planning, and result synthesis.
"""

import json
import logging
from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime
import uuid

from langgraph.graph import StateGraph, END
from pydantic import ValidationError

from llm.llm_factory import LLMFactory
from agents.schemas import (
    Intent, IntentType, AgentType,
    IntentDetectionRequest, IntentDetectionResponse,
    ExecutionPlan, ExecutionStep, StepType, StepResult, PlanExecutionResult
)
from agents.prompts.orchestrator_prompts import (
    ORCHESTRATOR_SYSTEM_PROMPT,
    create_intent_detection_prompt,
    create_planning_prompt,
    create_synthesis_prompt,
    ERROR_MESSAGES
)

logger = logging.getLogger(__name__)


class OrchestratorState(TypedDict):
    """State for orchestrator workflow"""
    # Input
    workspace_id: str
    query: str
    conversation_history: Optional[List[Dict[str, str]]]
    document_context: Optional[Dict[str, Any]]  # Context of the currently open document
    
    # Intent Detection
    intent: Optional[Intent]
    intent_confidence: float
    
    # Planning
    execution_plan: Optional[ExecutionPlan]
    
    # Execution
    step_results: List[StepResult]
    current_step_index: int
    
    # Synthesis
    final_answer: Optional[str]
    metadata: Dict[str, Any]
    
    # Control
    error: Optional[str]
    
    # Agent instances (injected)
    document_agent: Optional[Any]
    task_agent: Optional[Any]
    board_agent: Optional[Any]


class OrchestratorAgent:
    """
    Orchestrator Agent that coordinates Document and Task agents
    
    Workflow:
    1. detect_intent: Understand user query and determine routing
    2. create_plan: Decompose query into executable steps
    3. execute_plan: Run steps in order (with dependencies)
    4. synthesize: Combine results into final answer
    """
    
    def __init__(
        self,
        llm_provider: str = "naver",
        model_name: Optional[str] = None,
        document_agent=None,
        task_agent=None,
        board_agent=None
    ):
        """
        Initialize Orchestrator Agent
        
        Args:
            llm_provider: LLM provider name
            model_name: Specific model to use
            document_agent: DocumentAgent instance
            task_agent: TaskAgent instance
            board_agent: BoardAgent instance
        """
        # Initialize LLM factory
        factory = LLMFactory()
        self.llm = factory.create_llm(
            provider=llm_provider,
            model=model_name
        )
        self.document_agent = document_agent
        self.task_agent = task_agent
        self.board_agent = board_agent
        
        # Build workflow
        self.graph = self._build_graph()
        
        logger.info(f"OrchestratorAgent initialized with {llm_provider}")
    
    def _build_graph(self) -> StateGraph:
        """Build LangGraph workflow"""
        
        workflow = StateGraph(OrchestratorState)
        
        # Add nodes
        workflow.add_node("detect_intent", self._detect_intent_node)
        workflow.add_node("create_plan", self._create_plan_node)
        workflow.add_node("execute_step", self._execute_step_node)
        workflow.add_node("synthesize", self._synthesize_node)
        workflow.add_node("handle_error", self._handle_error_node)
        
        # Set entry point
        workflow.set_entry_point("detect_intent")
        
        # Add edges with routing
        workflow.add_conditional_edges(
            "detect_intent",
            self._should_create_plan,
            {
                "plan": "create_plan",
                "error": "handle_error"
            }
        )
        
        workflow.add_conditional_edges(
            "create_plan",
            self._should_execute,
            {
                "execute": "execute_step",
                "error": "handle_error"
            }
        )
        
        workflow.add_conditional_edges(
            "execute_step",
            self._should_continue_execution,
            {
                "continue": "execute_step",
                "synthesize": "synthesize",
                "error": "handle_error"
            }
        )
        
        workflow.add_edge("synthesize", END)
        workflow.add_edge("handle_error", END)
        
        return workflow.compile()
    
    # ============================================================================
    # Node Functions
    # ============================================================================
    
    def _detect_intent_node(self, state: OrchestratorState) -> OrchestratorState:
        """
        Node 1: Detect user intent and determine agent routing
        """
        logger.info(f"Detecting intent for query: {state['query'][:100]}...")
        
        try:
            # Create prompt
            prompt = create_intent_detection_prompt(
                query=state['query'],
                workspace_id=state['workspace_id'],
                conversation_history=state.get('conversation_history'),
                document_context=state.get('document_context')
            )
            
            # Call LLM
            response = self.llm.invoke([
                {"role": "system", "content": ORCHESTRATOR_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ])
            
            # Parse JSON response
            content = response.content
            logger.info(f"Raw LLM response:\n{content[:500]}...")
            
            # Extract JSON from markdown if needed
            if "```json" in content:
                start = content.find("```json") + 7
                end = content.find("```", start)
                if end == -1:  # No closing ```
                    content = content[start:].strip()
                else:
                    content = content[start:end].strip()
            elif "```" in content:
                start = content.find("```") + 3
                end = content.find("```", start)
                if end == -1:  # No closing ```
                    content = content[start:].strip()
                else:
                    content = content[start:end].strip()
            
            # Find JSON object boundaries
            if content.startswith('{'):
                # Count braces to find end
                brace_count = 0
                for i, char in enumerate(content):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            content = content[:i+1]
                            break
            
            logger.info(f"Extracted JSON:\n{content}")
            
            intent_data = json.loads(content)
            
            # Handle empty or invalid agent
            agent_str = intent_data.get('agent', '')
            try:
                agent_enum = AgentType(agent_str)
            except ValueError:
                # Default to BOTH if invalid or empty
                logger.warning(f"Invalid agent type '{agent_str}', defaulting to BOTH")
                agent_enum = AgentType.BOTH

            # Handle invalid intent type
            intent_type_str = intent_data.get('type', '')
            try:
                intent_type_enum = IntentType(intent_type_str)
            except ValueError:
                logger.warning(f"Invalid intent type '{intent_type_str}', defaulting to DOCUMENT_QUERY for fallback")
                # Default to DOCUMENT_QUERY instead of UNKNOWN to enable document search
                intent_type_enum = IntentType.DOCUMENT_QUERY
            
            # Handle UNKNOWN intent - check if it's small talk
            if intent_type_enum == IntentType.UNKNOWN:
                requires_agents = intent_data.get('requires_agents', True)
                
                if not requires_agents:
                    # Small talk / greeting - provide direct friendly response
                    logger.info("Intent is UNKNOWN but no agents required - treating as small talk")
                    # Keep as UNKNOWN to trigger direct response in routing
                    intent_data['confidence'] = 1.0
                else:
                    # Unclear query requiring workspace data - fallback to document search
                    logger.info("Intent is UNKNOWN with agents required, defaulting to DOCUMENT_QUERY for fallback")
                    intent_type_enum = IntentType.DOCUMENT_QUERY
                    intent_data['confidence'] = 0.5

            
            # Create Intent object
            intent = Intent(
                type=intent_type_enum,
                confidence=intent_data.get('confidence', 0.0),
                agent=agent_enum,
                reasoning=intent_data.get('reasoning', 'No reasoning provided'),
                entities=intent_data.get('entities', {}),
                requires_decomposition=intent_data.get('requires_decomposition', False)
            )
            
            logger.info(f"Intent detected: {intent.type.value} (confidence: {intent.confidence:.2f})")
            
            state['intent'] = intent
            state['intent_confidence'] = intent.confidence
            
        except Exception as e:
            logger.error(f"Intent detection failed: {str(e)}")
            state['error'] = f"Intent detection failed: {str(e)}"
        
        return state
    
    def _create_plan_node(self, state: OrchestratorState) -> OrchestratorState:
        """
        Node 2: Create execution plan for the query
        """
        intent = state['intent']
        logger.info(f"Creating execution plan for intent: {intent.type.value}")
        
        try:
            # Create prompt
            prompt = create_planning_prompt(
                query=state['query'],
                intent_type=intent.type,
                agent=intent.agent,
                workspace_id=state['workspace_id']
            )
            
            # Call LLM
            response = self.llm.invoke([
                {"role": "system", "content": ORCHESTRATOR_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ])
            
            # Parse JSON response
            content = response.content
            
            # Extract JSON from markdown if needed
            if "```json" in content:
                start = content.find("```json") + 7
                end = content.find("```", start)
                if end == -1:
                    content = content[start:].strip()
                else:
                    content = content[start:end].strip()
            elif "```" in content:
                start = content.find("```") + 3
                end = content.find("```", start)
                if end == -1:
                    content = content[start:].strip()
                else:
                    content = content[start:end].strip()
            
            # Find JSON object boundaries
            if content.startswith('{'):
                brace_count = 0
                for i, char in enumerate(content):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            content = content[:i+1]
                            break
            
            plan_data = json.loads(content)
            
            # Create ExecutionPlan object
            plan = ExecutionPlan(
                plan_id=plan_data.get('plan_id', str(uuid.uuid4())),
                original_query=state['query'],
                steps=[ExecutionStep(**step) for step in plan_data['steps']],
                estimated_complexity=plan_data['estimated_complexity'],
                requires_synthesis=plan_data['requires_synthesis'],
                reasoning=plan_data['reasoning']
            )
            
            logger.info(f"Plan created: {len(plan.steps)} steps, complexity: {plan.estimated_complexity}")
            
            state['execution_plan'] = plan
            state['step_results'] = []
            state['current_step_index'] = 0
            
        except Exception as e:
            logger.error(f"Planning failed: {str(e)}")
            state['error'] = f"Planning failed: {str(e)}"
        
        return state
    
    def _execute_step_node(self, state: OrchestratorState) -> OrchestratorState:
        """
        Node 3: Execute a single step in the plan
        """
        plan = state['execution_plan']
        step_index = state['current_step_index']
        
        if step_index >= len(plan.steps):
            logger.warning(f"No more steps to execute (index: {step_index})")
            return state
        
        step = plan.steps[step_index]
        logger.info(f"Executing step {step_index + 1}/{len(plan.steps)}: {step.step_id} ({step.type.value})")
        logger.info(f"DEBUG: step.type={step.type}, type(step.type)={type(step.type)}, StepType.QUERY_BOARD={StepType.QUERY_BOARD}")
        
        try:
            # Check dependencies
            for dep_id in step.dependencies:
                dep_result = next((r for r in state['step_results'] if r.step_id == dep_id), None)
                if not dep_result or not dep_result.success:
                    raise Exception(f"Dependency {dep_id} not completed successfully")
            
            # Execute step based on type
            result = None
            
            if step.type == StepType.QUERY_DOCUMENT:
                result = self._execute_document_query(step, state)
            
            elif step.type == StepType.DOCUMENT_COMPLETION:
                result = self._execute_document_completion(step, state)
            
            elif step.type == StepType.QUERY_TASK:
                result = self._execute_task_query(step, state)
            
            elif step.type == StepType.QUERY_BOARD:
                result = self._execute_board_query(step, state)
            
            elif step.type == StepType.SYNTHESIZE:
                result = self._execute_synthesis(step, state)
            
            elif step.type == StepType.VALIDATE:
                result = self._execute_validation(step, state)
            
            else:
                raise Exception(f"Unknown step type: {step.type}")
            
            # Create StepResult
            step_result = StepResult(
                step_id=step.step_id,
                success=True,
                result=result,
                execution_time_ms=0  # TODO: Track actual time
            )
            
            logger.info(f"Step {step.step_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Step {step.step_id} failed: {str(e)}")
            step_result = StepResult(
                step_id=step.step_id,
                success=False,
                result={},
                error=str(e),
                execution_time_ms=0
            )
        
        # Add result and increment index
        state['step_results'].append(step_result)
        state['current_step_index'] += 1
        
        return state
    
    def _synthesize_node(self, state: OrchestratorState) -> OrchestratorState:
        """
        Node 4: Synthesize results into final answer
        """
        logger.info("Synthesizing final answer from step results")
        
        try:
            # Check if final_answer is already set (e.g. small talk)
            if state.get('final_answer'):
                return state

            # Check if synthesis is needed
            plan = state['execution_plan']
            if not plan.requires_synthesis and len(state['step_results']) == 1:
                # Single step, no synthesis needed
                result = state['step_results'][0]
                if result.success and 'answer' in result.result:
                    state['final_answer'] = result.result['answer']
                else:
                    state['final_answer'] = str(result.result)
                return state
            
            # Create synthesis prompt
            step_results_data = [
                {
                    'step_id': r.step_id,
                    'success': r.success,
                    'result': r.result if r.success and r.result is not None else {},
                    'error': r.error if not r.success else None
                }
                for r in state['step_results']
            ]
            
            prompt = create_synthesis_prompt(
                original_query=state['query'],
                step_results=step_results_data,
                workspace_id=state['workspace_id']
            )
            
            # Call LLM
            response = self.llm.invoke([
                {"role": "system", "content": ORCHESTRATOR_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ])
            
            state['final_answer'] = response.content
            
            # Add metadata
            state['metadata'] = {
                'steps_executed': len(state['step_results']),
                'successful_steps': sum(1 for r in state['step_results'] if r.success),
                'failed_steps': sum(1 for r in state['step_results'] if not r.success),
                'intent_type': state['intent'].type.value,
                'complexity': state['execution_plan'].estimated_complexity
            }
            
            logger.info("Synthesis completed successfully")
            
        except Exception as e:
            logger.error(f"Synthesis failed: {str(e)}")
            state['error'] = f"Synthesis failed: {str(e)}"
            state['final_answer'] = f"I encountered an error while synthesizing the answer: {str(e)}"
        
        return state
    
    def _handle_error_node(self, state: OrchestratorState) -> OrchestratorState:
        """
        Handle errors gracefully
        """
        # Check if final_answer was already set (e.g., small talk)
        if state.get('final_answer'):
            logger.info("Using pre-generated answer (small talk)")
            return state
        
        error = state.get('error') or 'Unknown error'
        logger.error(f"Handling error: {error}")
        
        # Generate user-friendly error message
        error_lower = error.lower() if error else ''
        if 'intent' in error_lower:
            state['final_answer'] = ERROR_MESSAGES['no_intent']
        elif 'planning' in error_lower:
            state['final_answer'] = ERROR_MESSAGES['planning_failed']
        else:
            state['final_answer'] = ERROR_MESSAGES['execution_failed']
        
        state['metadata'] = {
            'error': error,
            'timestamp': datetime.now().isoformat()
        }
        
        return state
    
    # ============================================================================
    # Step Execution Functions
    # ============================================================================
    
    def _execute_document_query(self, step: ExecutionStep, state: OrchestratorState) -> Dict[str, Any]:
        """Execute document query step"""
        if not self.document_agent:
            raise Exception("Document agent not available")
        
        # Inject agent instances into state
        state['document_agent'] = self.document_agent
        
        result = self.document_agent.query(
            workspace_id=state['workspace_id'],
            query=step.query
        )
        
        return result

    def _execute_document_completion(self, step: ExecutionStep, state: OrchestratorState) -> Dict[str, Any]:
        """Execute document completion step"""
        if not self.document_agent:
            raise Exception("Document agent not available")
            
        document_context = state.get('document_context')
        if not document_context:
            raise Exception("No document context available for completion")
            
        result = self.document_agent.complete_text(
            query=step.query,
            current_content=document_context.get('content', ''),
            cursor_position=document_context.get('cursor_position')
        )
        
        return result
    
    def _execute_task_query(self, step: ExecutionStep, state: OrchestratorState) -> Dict[str, Any]:
        """Execute task query step"""
        if not self.task_agent:
            raise Exception("Task agent not available")
        
        # Inject agent instances into state
        state['task_agent'] = self.task_agent
        
        result = self.task_agent.query(
            workspace_id=state['workspace_id'],
            query=step.query
        )
        
        return result
    
    def _execute_board_query(self, step: ExecutionStep, state: OrchestratorState) -> Dict[str, Any]:
        """Execute board query step"""
        if not self.board_agent:
            raise Exception("Board agent not available")
        
        # Inject agent instances into state
        state['board_agent'] = self.board_agent
        
        result = self.board_agent.query(
            workspace_id=state['workspace_id'],
            query=step.query
        )
        
        return result
    
    def _execute_synthesis(self, step: ExecutionStep, state: OrchestratorState) -> Dict[str, Any]:
        """Execute synthesis step (combine previous results)"""
        # Get previous results
        prev_results = [r.result for r in state['step_results'] if r.success]
        
        # Simple synthesis (can be enhanced)
        return {
            "synthesized": True,
            "results": prev_results,
            "answer": state.get('final_answer') # Pass final_answer if already set
        }
    
    def _execute_validation(self, step: ExecutionStep, state: OrchestratorState) -> Dict[str, Any]:
        """Execute validation step"""
        # Basic validation
        all_success = all(r.success for r in state['step_results'])
        
        return {
            "validated": all_success,
            "steps_checked": len(state['step_results'])
        }
    
    # ============================================================================
    # Routing Functions
    # ============================================================================
    
    def _try_handle_small_talk(self, state: OrchestratorState) -> bool:
        """
        Check if the query is small talk and handle it.
        Returns True if handled (and sets final_answer in state), False otherwise.
        """
        intent = state.get('intent')
        if not intent:
            return False
            
        # Short-circuit for small talk / greetings (UNKNOWN intent without agent requirement)
        if intent.type == IntentType.UNKNOWN and not intent.requires_decomposition:
            # Generate friendly direct response without agent calls
            small_talk_responses = {
                "hello": "Hello! I'm your Workspace Assistant. I can help you manage tasks, find documents, or visualize your project progress. How can I help you today?",
                "hi": "Hi there! Ready to help with your project. What do you need?",
                "hey": "Hey! How can I assist you with your workspace today?",
                "how are you": "I'm functioning perfectly and ready to assist! How can I help you with your work?",
                "thanks": "You're welcome! Let me know if you need anything else.",
                "thank you": "Happy to help! Is there anything else you need?",
                "bye": "Goodbye! Have a productive day.",
                "what can you do": "I'm your project assistant. I can:\n- **Analyze Tasks:** Show overdue items, risks, or workload.\n- **Search Documents:** Answer questions from your uploaded files.\n- **Visualize Data:** Create Kanban boards, Gantt charts, and flowcharts.\n\nJust ask!"
            }
            
            query_lower = state['query'].lower().strip()
            # Simple fuzzy matching or exact match
            response = small_talk_responses.get(query_lower)
            
            if not response:
                # Try partial matches for common greetings
                for key, val in small_talk_responses.items():
                    if key in query_lower and len(query_lower) < 20: # Only for short queries
                        response = val
                        break
            
            if not response:
                response = "I'm not sure I understood that. I can help with tasks, documents, and visualizations. Could you rephrase your request?"
                
            state['final_answer'] = response
            return True
            
        return False

    def _should_create_plan(self, state: OrchestratorState) -> str:
        """Decide if we should create a plan or handle error"""
        if state.get('error'):
            return "error"
        if not state.get('intent'):
            return "error"
            
        if self._try_handle_small_talk(state):
            return "error"
            
        intent = state['intent']

        
        if state['intent_confidence'] < 0.3:
            state['error'] = ERROR_MESSAGES['low_confidence']
            return "error"
            
        # If we have a valid intent that requires decomposition, create plan
        if intent.requires_decomposition:
            return "plan"
            
        return "plan"
    
    def _should_execute(self, state: OrchestratorState) -> str:
        """Decide if we should execute plan or handle error"""
        if state.get('error'):
            return "error"
        if not state.get('execution_plan'):
            return "error"
        return "execute"
    
    def _should_continue_execution(self, state: OrchestratorState) -> str:
        """Decide if we should continue executing steps or synthesize"""
        if state.get('error'):
            return "error"
        
        plan = state['execution_plan']
        current_index = state['current_step_index']
        
        # Check if all steps completed
        if current_index >= len(plan.steps):
            return "synthesize"
        
        # Check if critical step failed
        last_result = state['step_results'][-1] if state['step_results'] else None
        if last_result and not last_result.success:
            # Check if this failure is critical
            failed_step = plan.steps[current_index - 1]
            # If other steps depend on this one, stop
            dependent_steps = [s for s in plan.steps if failed_step.step_id in s.dependencies]
            if dependent_steps:
                state['error'] = f"Critical step {failed_step.step_id} failed"
                return "error"
        
        return "continue"
    
    # ============================================================================
    # Public API
    # ============================================================================
    
    def query(
        self,
        workspace_id: str,
        query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        document_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process user query through orchestrator workflow
        
        Args:
            workspace_id: Workspace ID
            query: User's natural language query
            conversation_history: Recent conversation context
            document_context: Context of the currently open document (id, content, etc.)
            
        Returns:
            Dict with answer, metadata, and execution details
        """
        logger.info(f"Processing query for workspace {workspace_id}: {query[:100]}...")
        
        # Initialize state
        initial_state: OrchestratorState = {
            "workspace_id": workspace_id,
            "query": query,
            "conversation_history": conversation_history,
            "document_context": document_context,
            "intent": None,
            "intent_confidence": 0.0,
            "execution_plan": None,
            "step_results": [],
            "current_step_index": 0,
            "final_answer": None,
            "metadata": {},
            "error": None,
            "document_agent": self.document_agent,
            "task_agent": self.task_agent,
            "board_agent": self.board_agent
        }
        
        # Run workflow
        final_state = self.graph.invoke(initial_state)
        
        # Build response
        response = {
            "answer": final_state.get('final_answer') or ERROR_MESSAGES['execution_failed'],
            "metadata": {
                **final_state.get('metadata', {}),
                "workspace_id": workspace_id,
                "query": query,
                "intent": final_state['intent'].dict() if final_state.get('intent') else None,
                "execution_plan": final_state['execution_plan'].dict() if final_state.get('execution_plan') else None,
                "step_results": [r.dict() for r in final_state.get('step_results', [])],
                "error": final_state.get('error')
            }
        }
        
        logger.info("Query processing completed")
        return response
