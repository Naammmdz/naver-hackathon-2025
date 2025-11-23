"""
Board Agent

Generates Kanban boards, Gantt charts, and Mermaid visualizations for project management.
Handles task visualization, timeline planning, and dependency graphs.
"""

import json
import logging
from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime
import uuid

from langgraph.graph import StateGraph, END

from llm.llm_factory import LLMFactory
from database.connection import get_db_session
from agents.tools.sql_execution_tool import SQLExecutionTool
from agents.schemas.board_schemas import (
    ChartType, KanbanBoard, KanbanColumn, BoardTask, TaskStatus,
    MermaidChart, BoardVisualizationRequest, BoardVisualizationResponse,
    VISUALIZATION_EXAMPLES
)
from agents.prompts.board_prompts import (
    BOARD_AGENT_SYSTEM_PROMPT,
    create_kanban_prompt,
    create_gantt_prompt,
    create_flowchart_prompt,
    create_summary_prompt,
    ERROR_MESSAGES
)

logger = logging.getLogger(__name__)


class BoardState(TypedDict):
    """State for board visualization workflow"""
    # Input
    workspace_id: str
    query: str
    chart_type: ChartType
    filters: Optional[Dict[str, Any]]
    
    # Data
    tasks: List[Dict[str, Any]]
    
    # Generation
    visualization: Optional[Dict[str, Any]]
    mermaid_code: Optional[str]
    
    # Output
    markdown_output: Optional[str]
    summary: Optional[str]
    metadata: Dict[str, Any]
    
    # Control
    error: Optional[str]


class BoardAgent:
    """
    Board Visualization Agent
    
    Generates visual representations of tasks using:
    - Kanban boards
    - Gantt charts
    - Flowcharts/dependency graphs
    - Timelines
    
    Workflow:
    1. load_tasks: Fetch tasks from database
    2. generate_visualization: Create chart/board
    3. format_output: Generate markdown with embedded Mermaid
    4. create_summary: Add human-readable summary
    """
    
    def __init__(
        self,
        llm_provider: str = "naver",
        model_name: Optional[str] = None
    ):
        """
        Initialize Board Agent
        
        Args:
            llm_provider: LLM provider name
            model_name: Specific model to use
        """
        factory = LLMFactory()
        self.llm = factory.create_llm(
            provider=llm_provider,
            model=model_name
        )
        
        # Build workflow
        self.graph = self._build_graph()
        
        logger.info(f"BoardAgent initialized with {llm_provider}")
    
    def _build_graph(self) -> StateGraph:
        """Build LangGraph workflow"""
        
        workflow = StateGraph(BoardState)
        
        # Add nodes
        workflow.add_node("load_tasks", self._load_tasks_node)
        workflow.add_node("generate_visualization", self._generate_visualization_node)
        workflow.add_node("format_output", self._format_output_node)
        workflow.add_node("create_summary", self._create_summary_node)
        workflow.add_node("handle_error", self._handle_error_node)
        
        # Set entry point
        workflow.set_entry_point("load_tasks")
        
        # Add edges with routing
        workflow.add_conditional_edges(
            "load_tasks",
            self._should_generate,
            {
                "generate": "generate_visualization",
                "error": "handle_error"
            }
        )
        
        workflow.add_conditional_edges(
            "generate_visualization",
            self._should_format,
            {
                "format": "format_output",
                "error": "handle_error"
            }
        )
        
        workflow.add_edge("format_output", "create_summary")
        workflow.add_edge("create_summary", END)
        workflow.add_edge("handle_error", END)
        
        return workflow.compile()
    
    # ============================================================================
    # Node Functions
    # ============================================================================
    
    def _load_tasks_node(self, state: BoardState) -> BoardState:
        """
        Node 1: Load tasks from database
        """
        logger.info(f"Loading tasks for workspace {state['workspace_id']}")
        
        try:
            # Get database session
            db = get_db_session()
            sql_tool = SQLExecutionTool(db)
            
            # Build SQL query to fetch tasks (using :workspace_id instead of %(workspace_id)s)
            sql = """
            SELECT 
                t.id, t.title, t.status, t.priority,
                t.due_date,
                u.username as assignee_name
            FROM tasks t
            LEFT JOIN users u ON u.id = t.assignee_id
            WHERE t.workspace_id = :workspace_id
            ORDER BY t.created_at DESC
            """
            
            # Execute query
            result = sql_tool.execute_query(
                query=sql,
                parameters={"workspace_id": state['workspace_id']}
            )
            
            # Close database session
            db.close()
            
            if result.get('success'):
                tasks = result.get('rows', [])
            else:
                logger.error(f"SQL execution failed: {result.get('error')}")
                tasks = []
            
            # Apply filters if provided
            filters = state.get('filters')
            if filters and tasks:
                # Filter by status (case-insensitive)
                if 'status' in filters:
                    status_filters = [s.lower().replace('_', ' ') for s in filters['status']]
                    tasks = [t for t in tasks if t.get('status', '').lower().replace('_', ' ') in status_filters]
                
                # Filter by assignee
                if 'assignee' in filters:
                    tasks = [t for t in tasks if t.get('assignee_name') == filters['assignee']]
                
                # Filter by priority (case-insensitive)
                if 'priority' in filters:
                    priority_filters = [p.lower() for p in filters['priority']]
                    tasks = [t for t in tasks if t.get('priority', '').lower() in priority_filters]
            
            logger.info(f"Loaded {len(tasks)} tasks")
            state['tasks'] = tasks
            state['metadata'] = {'tasks_loaded': len(tasks)}
            
        except Exception as e:
            logger.error(f"Failed to load tasks: {str(e)}")
            state['error'] = f"Failed to load tasks: {str(e)}"
        
        return state
    
    def _generate_visualization_node(self, state: BoardState) -> BoardState:
        """
        Node 2: Generate visualization based on chart type
        """
        chart_type = state['chart_type']
        logger.info(f"Generating {chart_type.value} visualization")
        
        try:
            if chart_type == ChartType.KANBAN:
                visualization = self._generate_kanban(state)
            elif chart_type == ChartType.GANTT:
                visualization = self._generate_gantt(state)
            elif chart_type == ChartType.FLOWCHART:
                visualization = self._generate_flowchart(state)
            else:
                raise ValueError(f"Unsupported chart type: {chart_type}")
            
            state['visualization'] = visualization
            logger.info(f"{chart_type.value} visualization generated successfully")
            
        except Exception as e:
            logger.error(f"Visualization generation failed: {str(e)}")
            state['error'] = f"Visualization generation failed: {str(e)}"
        
        return state
    
    def _format_output_node(self, state: BoardState) -> BoardState:
        """
        Node 3: Format output as markdown with embedded Mermaid
        """
        logger.info("Formatting output as markdown")
        
        try:
            visualization = state['visualization']
            chart_type = state['chart_type']
            
            # Generate markdown based on chart type
            if chart_type == ChartType.KANBAN:
                markdown = self._format_kanban_markdown(visualization)
            else:
                # For Mermaid charts
                mermaid_code = visualization.get('mermaid_code', '')
                title = visualization.get('title', 'Visualization')
                
                markdown = f"""# {title}

```mermaid
{mermaid_code}
```
"""
            
            state['markdown_output'] = markdown
            logger.info("Markdown formatting completed")
            
        except Exception as e:
            logger.error(f"Formatting failed: {str(e)}")
            state['error'] = f"Formatting failed: {str(e)}"
        
        return state
    
    def _create_summary_node(self, state: BoardState) -> BoardState:
        """
        Node 4: Create human-readable summary
        """
        logger.info("Creating visualization summary")
        
        try:
            visualization = state['visualization']
            chart_type = state['chart_type']
            
            # Create prompt for summary
            prompt = create_summary_prompt(visualization, chart_type)
            
            # Call LLM
            response = self.llm.invoke([
                {"role": "system", "content": BOARD_AGENT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ])
            
            summary = response.content.strip()
            state['summary'] = summary
            
            logger.info("Summary created successfully")
            
        except Exception as e:
            logger.error(f"Summary creation failed: {str(e)}")
            # Use fallback summary
            state['summary'] = f"Visualization generated with {len(state.get('tasks', []))} tasks"
        
        return state
    
    def _handle_error_node(self, state: BoardState) -> BoardState:
        """Handle errors gracefully"""
        error = state.get('error') or 'Unknown error'
        logger.error(f"Handling error: {error}")
        
        # Generate user-friendly error message
        error_lower = error.lower() if isinstance(error, str) else ''
        
        if 'no tasks' in error_lower or ('tasks_loaded' in state.get('metadata', {}) and state['metadata']['tasks_loaded'] == 0):
            state['summary'] = ERROR_MESSAGES['no_tasks']
        elif 'date' in error_lower:
            state['summary'] = ERROR_MESSAGES['no_dates']
        else:
            state['summary'] = ERROR_MESSAGES['generation_failed']
        
        state['markdown_output'] = f"## ❌ Error\n\n{state['summary']}"
        
        return state
    
    # ============================================================================
    # Chart Generation Functions
    # ============================================================================
    
    def _generate_kanban(self, state: BoardState) -> Dict[str, Any]:
        """Generate Kanban board"""
        
        prompt = create_kanban_prompt(
            workspace_id=state['workspace_id'],
            query=state['query'],
            tasks=state['tasks']
        )
        
        # Call LLM
        response = self.llm.invoke([
            {"role": "system", "content": BOARD_AGENT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ])
        
        # Parse JSON response
        content = response.content
        if "```json" in content:
            start = content.find("```json") + 7
            end = content.find("```", start)
            if end == -1:
                content = content[start:].strip()
            else:
                content = content[start:end].strip()
        
        # Find JSON boundaries
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
        
        board_data = json.loads(content)
        return board_data
    
    def _generate_gantt(self, state: BoardState) -> Dict[str, Any]:
        """Generate Gantt chart"""
        
        prompt = create_gantt_prompt(
            workspace_id=state['workspace_id'],
            query=state['query'],
            tasks=state['tasks']
        )
        
        # Call LLM
        response = self.llm.invoke([
            {"role": "system", "content": BOARD_AGENT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ])
        
        # Parse JSON response (similar to kanban)
        content = response.content
        if "```json" in content:
            start = content.find("```json") + 7
            end = content.find("```", start)
            content = content[start:end].strip() if end != -1 else content[start:].strip()
        
        chart_data = json.loads(content)
        return chart_data
    
    def _generate_flowchart(self, state: BoardState) -> Dict[str, Any]:
        """Generate flowchart/dependency graph"""
        
        prompt = create_flowchart_prompt(
            workspace_id=state['workspace_id'],
            query=state['query'],
            tasks=state['tasks']
        )
        
        # Call LLM
        response = self.llm.invoke([
            {"role": "system", "content": BOARD_AGENT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ])
        
        # Parse JSON response
        content = response.content
        if "```json" in content:
            start = content.find("```json") + 7
            end = content.find("```", start)
            content = content[start:end].strip() if end != -1 else content[start:].strip()
        
        chart_data = json.loads(content)
        return chart_data
    
    def _format_kanban_markdown(self, board_data: Dict[str, Any]) -> str:
        """Format Kanban board as markdown"""
        
        title = board_data.get('title', 'Kanban Board')
        columns = board_data.get('columns', [])
        
        markdown = f"# {title}\n\n"
        
        # Add statistics
        total_tasks = sum(len(col.get('tasks', [])) for col in columns)
        markdown += f"**Total Tasks:** {total_tasks}\n\n"
        
        # Add columns
        for col in columns:
            col_name = col.get('name', 'Column')
            tasks = col.get('tasks', [])
            markdown += f"## {col_name} ({len(tasks)})\n\n"
            
            for task in tasks:
                task_id = task.get('id', 'N/A')
                task_title = task.get('title', 'Untitled')
                assignee = task.get('assignee', 'Unassigned')
                priority = task.get('priority', '')
                
                priority_emoji = {
                    'critical': '🔴',
                    'high': '🟠',
                    'medium': '🟡',
                    'low': '🟢'
                }.get(priority, '')
                
                markdown += f"- {priority_emoji} **{task_title}** (`{task_id}`)\n"
                markdown += f"  - Assignee: {assignee}\n"
                if priority:
                    markdown += f"  - Priority: {priority}\n"
                markdown += "\n"
        
        return markdown
    
    # ============================================================================
    # Routing Functions
    # ============================================================================
    
    def _should_generate(self, state: BoardState) -> str:
        """Decide if we should generate visualization"""
        if state.get('error'):
            return "error"
        if not state.get('tasks'):
            state['error'] = "No tasks available"
            return "error"
        return "generate"
    
    def _should_format(self, state: BoardState) -> str:
        """Decide if we should format output"""
        if state.get('error'):
            return "error"
        if not state.get('visualization'):
            return "error"
        return "format"
    
    # ============================================================================
    # Public API
    # ============================================================================
    
    def visualize(
        self,
        workspace_id: str,
        query: str,
        chart_type: ChartType,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate board visualization
        
        Args:
            workspace_id: Workspace ID
            query: Natural language query
            chart_type: Type of visualization
            filters: Optional filters
            
        Returns:
            Dict with visualization, markdown, and summary
        """
        logger.info(f"Creating {chart_type.value} visualization for workspace {workspace_id}")
        
        # Initialize state
        initial_state: BoardState = {
            "workspace_id": workspace_id,
            "query": query,
            "chart_type": chart_type,
            "filters": filters,
            "tasks": [],
            "visualization": None,
            "mermaid_code": None,
            "markdown_output": None,
            "summary": None,
            "metadata": {},
            "error": None
        }
        
        # Run workflow
        final_state = self.graph.invoke(initial_state)
        
        # Build response
        response = {
            "chart_type": chart_type.value,
            "visualization": final_state.get('visualization'),
            "markdown_output": final_state.get('markdown_output', ''),
            "summary": final_state.get('summary', ''),
            "metadata": {
                **final_state.get('metadata', {}),
                "workspace_id": workspace_id,
                "query": query,
                "error": final_state.get('error')
            }
        }
        
        logger.info("Visualization completed")
        return response
