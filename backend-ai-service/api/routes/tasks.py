"""
Task Analysis Endpoints

Provides APIs for analyzing tasks using Task Agent.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import sys
from pathlib import Path

if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.connection import get_db_session
from database.repositories import WorkspaceRepository
from agents.task_agent import TaskAgent
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
class TaskAnalysisRequest(BaseModel):
    """Request model for task analysis"""
    query: str = Field(
        ...,
        description="Question about tasks (e.g., 'What tasks are overdue?', 'Show priority distribution')",
        min_length=1,
        max_length=500,
        examples=["What tasks are overdue?", "Show me task distribution by priority"]
    )
    user_id: Optional[str] = Field(
        default="default-user",
        description="User ID making the request"
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Session ID for conversation context"
    )


class TaskAnalysisResponse(BaseModel):
    """Response model for task analysis"""
    answer: str = Field(
        ...,
        description="AI-generated analysis and insights"
    )
    confidence: float = Field(
        ...,
        description="Confidence score (0.0 to 1.0)",
        ge=0.0,
        le=1.0
    )
    generated_sql: str = Field(
        ...,
        description="SQL query that was generated and executed"
    )
    row_count: int = Field(
        ...,
        description="Number of rows returned by the query"
    )
    query_time_ms: int = Field(
        ...,
        description="Query execution time in milliseconds"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the analysis"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Response timestamp"
    )


# Endpoints
@router.post(
    "/workspaces/{workspace_id}/tasks/analyze",
    response_model=TaskAnalysisResponse,
    summary="Analyze Tasks",
    description="Ask questions about tasks and get AI-powered analysis with insights",
    tags=["Task Analysis"]
)
async def analyze_tasks(
    workspace_id: str,
    request: TaskAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze tasks using natural language queries.
    
    The Task Agent will:
    1. Generate appropriate SQL query based on your question
    2. Execute the query safely against the database
    3. Analyze results and provide insights
    4. Detect risks and suggest improvements
    
    **Example queries:**
    - "What tasks are overdue?"
    - "Show me task distribution by priority"
    - "Who has the most tasks in progress?"
    - "Which tasks are blocked or stalled?"
    - "Analyze workload distribution across team"
    
    **Response includes:**
    - AI-generated answer with insights and recommendations
    - The SQL query that was executed
    - Confidence score
    - Performance metrics
    """
    try:
        logger.info(f"Task analysis request for workspace {workspace_id}: {request.query}")
        
        # Verify workspace exists
        workspace_repo = WorkspaceRepository(db)
        workspace = workspace_repo.get_by_id(workspace_id)
        
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace {workspace_id} not found"
            )
        
        # Initialize Task Agent
        agent = TaskAgent()
        
        # Generate session ID if not provided
        session_id = request.session_id or f"session_{datetime.utcnow().timestamp()}"
        
        # Execute analysis
        result = agent.query(
            query=request.query,
            workspace_id=workspace_id,
            user_id=request.user_id,
            session_id=session_id
        )
        
        # Build response
        response = TaskAnalysisResponse(
            answer=result['answer'],
            confidence=result['confidence'],
            generated_sql=result['generated_sql'],
            row_count=result['row_count'],
            query_time_ms=result['query_time_ms'],
            metadata=result['metadata']
        )
        
        logger.info(f"Task analysis completed: {result['row_count']} rows, confidence: {result['confidence']}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Error analyzing tasks: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )


@router.get(
    "/workspaces/{workspace_id}/tasks/examples",
    summary="Get Example Queries",
    description="Get example task analysis queries to help users get started",
    tags=["Task Analysis"]
)
async def get_example_queries(workspace_id: str):
    """
    Get a list of example queries that work well with the Task Agent.
    
    Useful for:
    - Showing users what's possible
    - Quick testing
    - Learning the query patterns
    """
    examples = {
        "overview": [
            "Give me an overview of all tasks",
            "How many tasks do we have?",
            "Show me task distribution by status"
        ],
        "priority": [
            "Show me task distribution by priority",
            "What are the high priority tasks?",
            "Which tasks are critical?"
        ],
        "deadlines": [
            "What tasks are overdue?",
            "Show me tasks due this week",
            "Which tasks are approaching their deadlines?"
        ],
        "team": [
            "Who has the most tasks?",
            "Show me workload distribution",
            "Which team members are overloaded?",
            "What tasks is Alice working on?"
        ],
        "risks": [
            "What tasks are blocked?",
            "Show me stalled tasks",
            "Which tasks haven't been updated recently?",
            "What are the biggest risks in our project?"
        ],
        "analysis": [
            "Analyze task completion trends",
            "Compare workload across team members",
            "What's our team velocity?",
            "Show me bottlenecks in the workflow"
        ]
    }
    
    return {
        "workspace_id": workspace_id,
        "categories": examples,
        "total_examples": sum(len(v) for v in examples.values()),
        "note": "You can ask questions in natural language. These are just examples to get you started!"
    }
