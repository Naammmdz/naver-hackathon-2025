"""
Board Visualization Schemas

Defines data models for Kanban boards, Mermaid charts, and task visualizations.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ChartType(str, Enum):
    """Types of charts that can be generated"""
    KANBAN = "kanban"
    GANTT = "gantt"
    FLOWCHART = "flowchart"
    SEQUENCE = "sequence"
    STATE = "state"
    TIMELINE = "timeline"
    DEPENDENCY_GRAPH = "dependency_graph"


class TaskStatus(str, Enum):
    """Task status for board visualization"""
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    BLOCKED = "blocked"
    DONE = "done"
    CANCELLED = "cancelled"


class Priority(str, Enum):
    """Task priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class BoardTask(BaseModel):
    """Task representation for board visualization"""
    
    id: str = Field(description="Unique task ID")
    title: str = Field(description="Task title")
    status: TaskStatus = Field(description="Current status")
    priority: Optional[Priority] = Field(default=None, description="Task priority")
    assignee: Optional[str] = Field(default=None, description="Person assigned")
    due_date: Optional[str] = Field(default=None, description="Due date (ISO format)")
    dependencies: List[str] = Field(default_factory=list, description="Task IDs this depends on")
    tags: List[str] = Field(default_factory=list, description="Task tags/labels")
    description: Optional[str] = Field(default=None, description="Task description")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "TASK-123",
                "title": "Implement authentication",
                "status": "in_progress",
                "priority": "high",
                "assignee": "john_doe",
                "due_date": "2025-11-25",
                "dependencies": ["TASK-100"],
                "tags": ["backend", "security"]
            }
        }


class KanbanColumn(BaseModel):
    """A column in a Kanban board"""
    
    name: str = Field(description="Column name")
    status: TaskStatus = Field(description="Status this column represents")
    tasks: List[BoardTask] = Field(default_factory=list, description="Tasks in this column")
    wip_limit: Optional[int] = Field(default=None, description="Work-in-progress limit")
    
    def task_count(self) -> int:
        """Get number of tasks in column"""
        return len(self.tasks)
    
    def is_over_limit(self) -> bool:
        """Check if column exceeds WIP limit"""
        if self.wip_limit is None:
            return False
        return self.task_count() > self.wip_limit


class KanbanBoard(BaseModel):
    """Complete Kanban board representation"""
    
    board_id: str = Field(description="Board identifier")
    title: str = Field(description="Board title")
    columns: List[KanbanColumn] = Field(description="Board columns")
    workspace_id: str = Field(description="Workspace this board belongs to")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    
    def total_tasks(self) -> int:
        """Total number of tasks across all columns"""
        return sum(col.task_count() for col in self.columns)
    
    def tasks_by_status(self) -> Dict[str, int]:
        """Count tasks by status"""
        return {col.status.value: col.task_count() for col in self.columns}


class MermaidChart(BaseModel):
    """Mermaid chart representation"""
    
    chart_type: ChartType = Field(description="Type of chart")
    title: str = Field(description="Chart title")
    mermaid_code: str = Field(description="Mermaid syntax code")
    description: Optional[str] = Field(default=None, description="Chart description")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "chart_type": "gantt",
                "title": "Sprint Timeline",
                "mermaid_code": "gantt\n    title Sprint Timeline\n    dateFormat YYYY-MM-DD\n    section Development\n    Task 1: 2025-11-01, 3d",
                "description": "Timeline for current sprint tasks"
            }
        }


class GanttTask(BaseModel):
    """Task for Gantt chart"""
    
    id: str = Field(description="Task ID")
    name: str = Field(description="Task name")
    start_date: str = Field(description="Start date (YYYY-MM-DD)")
    duration_days: int = Field(description="Duration in days", ge=1)
    status: Optional[str] = Field(default="active", description="Task status: active, done, crit")
    section: Optional[str] = Field(default="Tasks", description="Section/category")
    dependencies: List[str] = Field(default_factory=list, description="Task IDs this depends on")


class FlowchartNode(BaseModel):
    """Node in a flowchart"""
    
    id: str = Field(description="Node ID")
    label: str = Field(description="Node label/text")
    shape: str = Field(
        default="rectangle",
        description="Node shape: rectangle, rounded, diamond, circle, etc."
    )
    style: Optional[str] = Field(default=None, description="Custom styling")


class FlowchartEdge(BaseModel):
    """Edge/connection in a flowchart"""
    
    from_node: str = Field(description="Source node ID")
    to_node: str = Field(description="Target node ID")
    label: Optional[str] = Field(default=None, description="Edge label")
    style: Optional[str] = Field(default=None, description="Arrow style: solid, dotted, thick")


class BoardVisualizationRequest(BaseModel):
    """Request for board visualization"""
    
    workspace_id: str = Field(description="Workspace ID")
    chart_type: ChartType = Field(description="Type of visualization")
    query: str = Field(description="Natural language query describing what to visualize")
    filters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional filters (status, assignee, date range, etc.)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "workspace_id": "ws-123",
                "chart_type": "gantt",
                "query": "Show me a timeline of all tasks in the current sprint",
                "filters": {"status": ["in_progress", "todo"]}
            }
        }


class BoardVisualizationResponse(BaseModel):
    """Response containing board visualization"""
    
    chart_type: ChartType = Field(description="Type of chart generated")
    visualization: MermaidChart | KanbanBoard = Field(description="The visualization data")
    markdown_output: str = Field(description="Formatted markdown with embedded chart")
    summary: str = Field(description="Human-readable summary")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Generation metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "chart_type": "kanban",
                "visualization": {"board_id": "b1", "title": "Sprint Board", "columns": []},
                "markdown_output": "# Sprint Board\n\n**Total Tasks:** 15\n\n```mermaid\n...\n```",
                "summary": "Your board has 15 tasks: 3 todo, 8 in progress, 4 done",
                "metadata": {"tasks_visualized": 15, "generation_time_ms": 250}
            }
        }


# Example Mermaid templates
MERMAID_TEMPLATES = {
    "gantt": """gantt
    title {title}
    dateFormat YYYY-MM-DD
    {sections}
""",
    
    "flowchart": """flowchart TD
    {nodes}
    {edges}
""",
    
    "timeline": """timeline
    title {title}
    {events}
""",
    
    "state": """stateDiagram-v2
    {states}
    {transitions}
"""
}


# Visualization examples for prompting
VISUALIZATION_EXAMPLES = [
    {
        "query": "Show me a Kanban board of all tasks",
        "chart_type": "kanban",
        "output": {
            "columns": [
                {"name": "To Do", "status": "todo", "tasks": []},
                {"name": "In Progress", "status": "in_progress", "tasks": []},
                {"name": "Done", "status": "done", "tasks": []}
            ]
        }
    },
    {
        "query": "Create a Gantt chart for this sprint",
        "chart_type": "gantt",
        "mermaid": """gantt
    title Sprint Timeline
    dateFormat YYYY-MM-DD
    section Development
    Setup environment: 2025-11-01, 2d
    Implement features: 2025-11-03, 5d
    section Testing
    Write tests: 2025-11-06, 3d
    QA review: 2025-11-09, 2d
"""
    },
    {
        "query": "Show task dependencies as a flowchart",
        "chart_type": "flowchart",
        "mermaid": """flowchart TD
    A[Design] --> B[Development]
    A --> C[Documentation]
    B --> D[Testing]
    C --> D
    D --> E[Deployment]
"""
    }
]
