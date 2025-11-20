"""
Task Agent - SQL-Based Approach

Main agent for task analysis using SQL query generation.
Uses LangGraph workflow similar to Document Agent.

Workflow:
1. Load database schema
2. Generate SQL query (LLM)
3. Execute SQL safely
4. Analyze results (LLM)
5. Format response

Example:
    ```python
    from agents.task_agent import TaskAgent
    
    agent = TaskAgent()
    result = agent.query(
        query="What tasks are overdue?",
        workspace_id="workspace-123"
    )
    
    print(result['answer'])
    ```
"""

from typing import Dict, Any, Optional, List
import sys
from pathlib import Path

# Add parent directory to path
if str(Path(__file__).parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent))

from langgraph.graph import StateGraph, END
from agents.graphs.task_graph import (
    TaskGraphState,
    create_initial_state,
    TaskGraphNodes,
    check_schema_loaded,
    check_sql_generated,
    check_sql_executed,
    check_analysis_complete
)
from llm import LLMFactory
from utils.logger import get_logger

logger = get_logger(__name__)


class TaskAgent:
    """
    Task Agent for SQL-based task analysis.
    
    Uses LangGraph to orchestrate:
    - Schema loading
    - SQL generation (LLM)
    - SQL execution (safe)
    - Result analysis (LLM)
    - Response formatting
    """
    
    def __init__(
        self,
        llm_provider: str = None
    ):
        """
        Initialize Task Agent
        
        Args:
            llm_provider: LLM provider ('openai', 'naver', 'cerebras', 'gemini')
        """
        # Get default provider from config if not specified
        llm_factory = LLMFactory()
        if llm_provider is None:
            llm_provider = llm_factory.get_default_provider()
        
        self.llm_provider = llm_provider
        
        # Initialize nodes
        self.nodes = TaskGraphNodes(llm_provider=llm_provider)
        
        # Build workflow graph
        self.graph = self._build_graph()
        
        # Initialize CRUD tools for write operations
        try:
            from agents.tools import CreateTaskTool, BulkCreateTasksTool, UpdateTaskTool
            from agents.api_clients import CoreServiceClient
            
            api_client = CoreServiceClient()
            self.tools = {
                'create_task': CreateTaskTool(api_client),
                'bulk_create_tasks': BulkCreateTasksTool(api_client),
                'update_task': UpdateTaskTool(api_client)
            }
            logger.info("Task CRUD tools initialized")
        except ImportError as e:
            logger.warning(f"CRUD tools not available: {e}")
            self.tools = {}
        
        logger.info(f"TaskAgent initialized with {llm_provider} provider")
    
    def _build_graph(self) -> StateGraph:
        """
        Build LangGraph workflow
        
        Returns:
            Compiled state graph
        """
        workflow = StateGraph(TaskGraphState)
        
        # Add nodes
        workflow.add_node("load_schema", self.nodes.load_schema_node)
        workflow.add_node("generate_sql", self.nodes.generate_sql_node)
        workflow.add_node("execute_sql", self.nodes.execute_sql_node)
        workflow.add_node("analyze_results", self.nodes.analyze_results_node)
        workflow.add_node("no_results", self.nodes.no_results_handler)
        workflow.add_node("error", self.nodes.error_handler)
        
        # Set entry point
        workflow.set_entry_point("load_schema")
        
        # Add conditional edges
        workflow.add_conditional_edges(
            "load_schema",
            check_schema_loaded,
            {
                "generate_sql": "generate_sql",
                "error": "error"
            }
        )
        
        workflow.add_conditional_edges(
            "generate_sql",
            check_sql_generated,
            {
                "execute_sql": "execute_sql",
                "error": "error"
            }
        )
        
        workflow.add_conditional_edges(
            "execute_sql",
            check_sql_executed,
            {
                "analyze_results": "analyze_results",
                "no_results": "no_results",
                "error": "error"
            }
        )
        
        workflow.add_conditional_edges(
            "analyze_results",
            check_analysis_complete,
            {
                "end": END,
                "error": "error"
            }
        )
        
        # End nodes
        workflow.add_edge("no_results", END)
        workflow.add_edge("error", END)
        
        return workflow.compile()
    
    def query(
        self,
        query: str,
        workspace_id: str,
        user_id: str = "default-user",
        session_id: str = "default-session"
    ) -> Dict[str, Any]:
        """
        Main query method for task analysis
        
        Args:
            query: User's question about tasks
            workspace_id: Workspace ID to analyze
            user_id: User ID making the request
            session_id: Session ID for conversation context
            
        Returns:
            Analysis results with answer, confidence, metadata
        """
        logger.info(f"Processing task query: '{query}' for workspace: {workspace_id}")
        
        # Create initial state
        initial_state = create_initial_state(
            query=query,
            workspace_id=workspace_id,
            user_id=user_id,
            session_id=session_id
        )
        
        # Run graph
        try:
            final_state = self.graph.invoke(initial_state)
            
            result = {
                'answer': final_state.get('answer', 'No answer generated'),
                'confidence': final_state.get('confidence', 0.0),
                'generated_sql': final_state.get('generated_sql', ''),
                'row_count': final_state.get('row_count', 0),
                'query_time_ms': final_state.get('query_time_ms', 0),
                'metadata': {
                    'workspace_id': workspace_id,
                    'user_id': user_id,
                    'query': query,
                    'llm_provider': self.llm_provider,
                    'sql_success': final_state.get('sql_success', False)
                }
            }
            
            logger.info(f"Task query completed: {result['row_count']} rows, confidence: {result['confidence']}")
            return result
            
        except Exception as e:
            error_msg = f"Error processing task query: {str(e)}"
            logger.error(error_msg)
            return {
                'answer': f"❌ Error: {error_msg}",
                'confidence': 0.0,
                'generated_sql': '',
                'row_count': 0,
                'query_time_ms': 0,
                'metadata': {
                    'workspace_id': workspace_id,
                    'error': error_msg
                }
            }
    
    def visualize(self, output_path: str = "task_agent_graph.png"):
        """
        Visualize the task agent graph workflow
        
        Args:
            output_path: Path to save the graph visualization
        """
        try:
            from langchain_core.runnables.graph import MermaidDrawMethod
            
            png_bytes = self.graph.get_graph().draw_mermaid_png(
                draw_method=MermaidDrawMethod.API
            )
            
            with open(output_path, 'wb') as f:
                f.write(png_bytes)
            
            logger.info(f"Graph visualization saved to {output_path}")
            
        except Exception as e:
            logger.error(f"Error visualizing graph: {str(e)}")
            raise
    
    # ==================== CRUD Operations ====================
    
    def create_task(
        self,
        workspace_id: str,
        title: str,
        description: Optional[str] = None,
        status: str = "TODO",
        priority: str = "MEDIUM",
        assignee_id: Optional[str] = None,
        due_date: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        with_preview: bool = True
    ) -> Dict[str, Any]:
        """
        Create a new task (with optional preview for HITL).
        
        Args:
            workspace_id: Workspace ID
            title: Task title
            description: Task description
            status: Task status (TODO, IN_PROGRESS, DONE)
            priority: Priority (LOW, MEDIUM, HIGH)
            assignee_id: Assignee user ID
            due_date: Due date (ISO format)
            metadata: Optional metadata
            with_preview: If True, return preview instead of executing
            
        Returns:
            If with_preview=True: preview dict
            If with_preview=False: execution result
        """
        if 'create_task' not in self.tools:
            raise RuntimeError("Create task tool not available")
        
        tool = self.tools['create_task']
        params = {
            'workspace_id': workspace_id,
            'title': title,
            'description': description,
            'status': status,
            'priority': priority,
            'assignee_id': assignee_id,
            'due_date': due_date,
            'metadata': metadata
        }
        
        if with_preview:
            preview = tool.preview(params)
            return {
                'requires_confirmation': True,
                'preview': preview.model_dump(),
                'params': params,
                'tool_name': 'create_task'
            }
        else:
            result = tool.execute(params)
            return result.model_dump()
    
    def bulk_create_tasks(
        self,
        workspace_id: str,
        tasks: List[Dict[str, Any]],
        with_preview: bool = True
    ) -> Dict[str, Any]:
        """
        Create multiple tasks (with optional preview for HITL).
        
        Args:
            workspace_id: Workspace ID
            tasks: List of task data dicts
            with_preview: If True, return preview instead of executing
            
        Returns:
            If with_preview=True: preview dict with batch control
            If with_preview=False: execution result
        """
        if 'bulk_create_tasks' not in self.tools:
            raise RuntimeError("Bulk create tasks tool not available")
        
        tool = self.tools['bulk_create_tasks']
        params = {
            'workspace_id': workspace_id,
            'tasks': tasks
        }
        
        if with_preview:
            preview = tool.preview(params)
            
            # Create batch control for granular approval
            from agents.schemas.batch_control import BatchControl, BatchItem
            
            batch_items = []
            for i, task in enumerate(tasks):
                batch_items.append(BatchItem(
                    id=f"task-{i}",
                    preview=task
                ))
            
            batch_control = BatchControl(
                total_items=len(tasks),
                allow_partial=True,
                individual_approval=len(tasks) > 5,  # Individual approval for >5 tasks
                items=batch_items
            )
            
            return {
                'requires_confirmation': True,
                'preview': preview.model_dump(),
                'batch_control': batch_control.model_dump(),
                'params': params,
                'tool_name': 'bulk_create_tasks'
            }
        else:
            result = tool.execute(params)
            return result.model_dump()
    
    def update_task(
        self,
        task_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assignee_id: Optional[str] = None,
        due_date: Optional[str] = None,
        with_preview: bool = True
    ) -> Dict[str, Any]:
        """
        Update an existing task (with optional preview for HITL).
        
        Args:
            task_id: Task ID to update
            title: New title (optional)
            description: New description (optional)
            status: New status (optional)
            priority: New priority (optional)
            assignee_id: New assignee (optional)
            due_date: New due date (optional)
            with_preview: If True, return preview instead of executing
            
        Returns:
            If with_preview=True: preview dict
            If with_preview=False: execution result
        """
        if 'update_task' not in self.tools:
            raise RuntimeError("Update task tool not available")
        
        tool = self.tools['update_task']
        params = {
            'task_id': task_id,
            'title': title,
            'description': description,
            'status': status,
            'priority': priority,
            'assignee_id': assignee_id,
            'due_date': due_date
        }
        
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}
        
        if with_preview:
            preview = tool.preview(params)
            return {
                'requires_confirmation': True,
                'preview': preview.model_dump(),
                'params': params,
                'tool_name': 'update_task'
            }
        else:
            result = tool.execute(params)
            return result.model_dump()
    
    def execute_tool(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a tool by name (called after HITL approval).
        
        Args:
            tool_name: Name of tool to execute
            params: Tool parameters
            
        Returns:
            Execution result
        """
        if tool_name not in self.tools:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        tool = self.tools[tool_name]
        result = tool.execute(params)
        return result.model_dump()

