"""
Task Decomposition & Planning Schemas

Defines how the Orchestrator breaks down complex queries into sub-tasks.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from agents.schemas.intent_schemas import AgentType


class StepType(str, Enum):
    """Types of execution steps"""
    QUERY_DOCUMENT = "query_document"
    QUERY_TASK = "query_task"
    QUERY_BOARD = "query_board"
    SYNTHESIZE = "synthesize"
    VALIDATE = "validate"


class ExecutionStep(BaseModel):
    """A single step in the execution plan"""
    
    step_id: str = Field(
        description="Unique identifier for this step"
    )
    
    type: StepType = Field(
        description="Type of step"
    )
    
    agent: AgentType = Field(
        description="Which agent executes this step"
    )
    
    query: str = Field(
        description="Query to execute in this step"
    )
    
    dependencies: List[str] = Field(
        default_factory=list,
        description="Step IDs that must complete before this step"
    )
    
    context_keys: List[str] = Field(
        default_factory=list,
        description="Keys from previous steps needed for this step"
    )
    
    reasoning: str = Field(
        description="Why this step is needed"
    )


class ExecutionPlan(BaseModel):
    """Complete execution plan for a query"""
    
    plan_id: str = Field(
        description="Unique identifier for this plan"
    )
    
    original_query: str = Field(
        description="Original user query"
    )
    
    steps: List[ExecutionStep] = Field(
        description="Ordered list of execution steps"
    )
    
    estimated_complexity: str = Field(
        description="simple, medium, or complex"
    )
    
    requires_synthesis: bool = Field(
        default=False,
        description="Whether results need to be synthesized"
    )
    
    reasoning: str = Field(
        description="Overall plan reasoning"
    )


class StepResult(BaseModel):
    """Result from executing a single step"""
    
    step_id: str = Field(
        description="Step identifier"
    )
    
    success: bool = Field(
        description="Whether step completed successfully"
    )
    
    result: Dict[str, Any] = Field(
        description="Result data from the step"
    )
    
    error: Optional[str] = Field(
        default=None,
        description="Error message if step failed"
    )
    
    execution_time_ms: int = Field(
        description="Execution time in milliseconds"
    )


class PlanExecutionResult(BaseModel):
    """Result from executing entire plan"""
    
    plan_id: str = Field(
        description="Plan identifier"
    )
    
    success: bool = Field(
        description="Whether all steps completed successfully"
    )
    
    step_results: List[StepResult] = Field(
        description="Results from each step"
    )
    
    final_answer: str = Field(
        description="Synthesized final answer"
    )
    
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence in final answer"
    )
    
    total_time_ms: int = Field(
        description="Total execution time"
    )
    
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata"
    )


# Planning examples for few-shot prompting
PLANNING_EXAMPLES = [
    {
        "query": "What authentication methods are documented and what tasks implement them?",
        "plan": {
            "steps": [
                {
                    "step_id": "doc_query",
                    "type": "query_document",
                    "agent": "document",
                    "query": "What authentication methods are documented?",
                    "dependencies": []
                },
                {
                    "step_id": "task_query",
                    "type": "query_task",
                    "agent": "task",
                    "query": "What tasks are related to authentication?",
                    "dependencies": []
                },
                {
                    "step_id": "synthesize",
                    "type": "synthesize",
                    "agent": "both",
                    "query": "Combine document findings and task information",
                    "dependencies": ["doc_query", "task_query"]
                }
            ],
            "estimated_complexity": "medium"
        }
    },
    {
        "query": "Are there any overdue tasks?",
        "plan": {
            "steps": [
                {
                    "step_id": "task_query",
                    "type": "query_task",
                    "agent": "task",
                    "query": "Show overdue tasks",
                    "dependencies": []
                }
            ],
            "estimated_complexity": "simple"
        }
    }
]
