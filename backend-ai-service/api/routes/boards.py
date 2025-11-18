"""
Board Visualization Endpoints

Provides APIs for generating task visualizations (Kanban, Gantt, Flowchart).
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import sys
from pathlib import Path

if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.connection import get_db_session
from database.repositories import WorkspaceRepository
from agents.board_agent import BoardAgent
from agents.schemas.board_schemas import ChartType
from utils.logger import get_logger
from sqlalchemy.orm import Session

logger = get_logger(__name__)
router = APIRouter()


# Dependency
def get_db():
    """Get database session"""
    db = get_db_session()
    try:
        yield db
    finally:
        db.close()


# Request/Response Models
class BoardVisualizationRequest(BaseModel):
    """Request model for board visualization"""
    chart_type: ChartType = Field(
        ...,
        description="Type of chart to generate (kanban, gantt, flowchart, etc.)"
    )
    query: str = Field(
        default="Generate visualization",
        description="Natural language description of what to visualize",
        min_length=1,
        max_length=500
    )
    filters: Optional[Dict[str, List[str]]] = Field(
        default=None,
        description="Optional filters (status, priority, assignee)",
        examples=[
            {"status": ["todo", "in_progress"]},
            {"priority": ["high", "medium"]},
            {"status": ["in_progress"], "priority": ["high"]}
        ]
    )


class BoardVisualizationResponse(BaseModel):
    """Response model for board visualization"""
    chart_type: str = Field(
        ...,
        description="Type of chart generated"
    )
    mermaid_code: Optional[str] = Field(
        None,
        description="Mermaid.js code for the visualization"
    )
    markdown_output: str = Field(
        ...,
        description="Complete markdown output with visualization"
    )
    summary: str = Field(
        ...,
        description="Human-readable summary of the visualization"
    )
    tasks_count: int = Field(
        ...,
        description="Number of tasks included in visualization"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the visualization"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Response timestamp"
    )


# Endpoints
@router.post(
    "/workspaces/{workspace_id}/boards/visualize",
    response_model=BoardVisualizationResponse,
    summary="Generate Board Visualization",
    description="Generate Kanban boards, Gantt charts, or flowcharts for workspace tasks",
    tags=["Board Visualization"]
)
async def create_board_visualization(
    workspace_id: str,
    request: BoardVisualizationRequest,
    db: Session = Depends(get_db)
):
    """
    Generate task visualizations for project management.
    
    The Board Agent will:
    1. Load tasks from the workspace
    2. Apply filters if specified
    3. Generate visualization using LLM and Mermaid.js
    4. Create human-readable summary
    
    **Chart Types:**
    - **kanban**: Kanban board with columns (To Do, In Progress, Done)
    - **gantt**: Gantt chart showing task timeline
    - **flowchart**: Dependency flowchart showing task relationships
    - **sequence**: Sequence diagram for task flow
    - **state**: State diagram for task lifecycle
    - **timeline**: Timeline view of tasks
    
    **Filters:**
    - status: Filter by task status (e.g., ["todo", "in_progress"])
    - priority: Filter by priority (e.g., ["high", "medium"])
    - assignee: Filter by assignee name
    
    **Response includes:**
    - Mermaid.js code for rendering the chart
    - Complete markdown output
    - AI-generated summary and insights
    - Task count and metadata
    """
    try:
        logger.info(f"Board visualization request for workspace {workspace_id}: {request.chart_type}")
        
        # Verify workspace exists
        workspace_repo = WorkspaceRepository(db)
        workspace = workspace_repo.get_by_id(workspace_id)
        
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace {workspace_id} not found"
            )
        
        # Initialize Board Agent
        agent = BoardAgent()
        
        # Generate visualization
        result = agent.visualize(
            workspace_id=workspace_id,
            chart_type=request.chart_type,
            query=request.query,
            filters=request.filters
        )
        
        # Extract visualization data
        visualization = result.get('visualization', {})
        
        # Build response - handle both Kanban (dict) and Mermaid (string) visualizations
        if isinstance(visualization, dict):
            # Kanban board format
            mermaid_code = None
            tasks_count = sum(len(col.get('tasks', [])) for col in visualization.get('columns', []))
        else:
            # Mermaid chart format (in markdown_output)
            mermaid_code = result.get('markdown_output', '')
            # Extract mermaid code from markdown
            if '```mermaid' in mermaid_code:
                start = mermaid_code.find('```mermaid') + 10
                end = mermaid_code.find('```', start)
                if end > start:
                    mermaid_code = mermaid_code[start:end].strip()
            tasks_count = result.get('metadata', {}).get('tasks_loaded', 0)
        
        # Extract response data
        response_data = {
            "chart_type": request.chart_type.value,
            "mermaid_code": mermaid_code,
            "markdown_output": result.get('markdown_output', ''),
            "summary": result.get('summary', ''),
            "tasks_count": tasks_count,
            "metadata": result.get('metadata', {}),
            "timestamp": datetime.utcnow()
        }
        
        logger.info(f"Board visualization completed: {response_data['tasks_count']} tasks")
        
        return BoardVisualizationResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Board visualization failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Visualization generation failed: {str(e)}"
        )


@router.get(
    "/workspaces/{workspace_id}/boards/chart-types",
    summary="List Available Chart Types",
    description="Get list of supported visualization chart types",
    tags=["Board Visualization"]
)
async def get_chart_types(workspace_id: str):
    """
    List all available chart types for board visualization.
    
    Returns information about each chart type including:
    - Type identifier
    - Description
    - Use cases
    - Example filters
    """
    chart_types = [
        {
            "type": "kanban",
            "name": "Kanban Board",
            "description": "Visual board with columns for task status",
            "use_cases": ["Sprint planning", "Task tracking", "Workflow visualization"],
            "example_filters": {"status": ["todo", "in_progress", "done"]}
        },
        {
            "type": "gantt",
            "name": "Gantt Chart",
            "description": "Timeline view showing task schedules and deadlines",
            "use_cases": ["Project timeline", "Deadline tracking", "Schedule planning"],
            "example_filters": {"status": ["todo", "in_progress"]}
        },
        {
            "type": "flowchart",
            "name": "Flowchart",
            "description": "Dependency graph showing task relationships",
            "use_cases": ["Dependency analysis", "Task flow", "Bottleneck identification"],
            "example_filters": None
        },
        {
            "type": "sequence",
            "name": "Sequence Diagram",
            "description": "Sequential flow of task execution",
            "use_cases": ["Process flow", "Task sequence", "Workflow steps"],
            "example_filters": {"status": ["in_progress"]}
        },
        {
            "type": "state",
            "name": "State Diagram",
            "description": "Task lifecycle and state transitions",
            "use_cases": ["Status tracking", "Workflow states", "Task lifecycle"],
            "example_filters": None
        },
        {
            "type": "timeline",
            "name": "Timeline",
            "description": "Chronological view of tasks",
            "use_cases": ["Historical view", "Progress tracking", "Milestone tracking"],
            "example_filters": {"priority": ["high"]}
        }
    ]
    
    return {
        "workspace_id": workspace_id,
        "chart_types": chart_types,
        "total_types": len(chart_types)
    }
