"""
Intent Detection Schemas

Defines intents that the Orchestrator can recognize and route.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class IntentType(str, Enum):
    """Types of user intents"""
    
    # Document-related intents (READ)
    DOCUMENT_QUERY = "document_query"  # Ask about document content
    DOCUMENT_SEARCH = "document_search"  # Search across documents
    DOCUMENT_SUMMARY = "document_summary"  # Summarize documents
    
    # Document-related intents (WRITE)
    DOCUMENT_CREATE = "document_create"  # Create new document
    DOCUMENT_UPDATE = "document_update"  # Update existing document
    DOCUMENT_COMPLETION = "document_completion"  # Autocomplete/Finish text
    
    # Task-related intents (READ)
    TASK_QUERY = "task_query"  # Ask about tasks
    TASK_ANALYSIS = "task_analysis"  # Analyze task data
    TASK_RISK = "task_risk"  # Identify risks
    
    # Task-related intents (WRITE)
    TASK_CREATE = "task_create"  # Create new task(s)
    TASK_UPDATE = "task_update"  # Update existing task(s)
    
    # Board-related intents
    BOARD_QUERY = "board_query"  # Ask for visualizations
    BOARD_CREATE = "board_create"  # Save visualization

    # Multi-agent intents
    HYBRID_QUERY = "hybrid_query"  # Requires both agents
    WORKSPACE_OVERVIEW = "workspace_overview"  # Overview of workspace
    
    # Unknown
    UNKNOWN = "unknown"


class AgentType(str, Enum):
    """Available agents"""
    DOCUMENT = "document"
    TASK = "task"
    BOARD = "board"
    BOTH = "both"


class Intent(BaseModel):
    """Detected user intent"""
    
    type: IntentType = Field(
        description="Type of intent detected"
    )
    
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Confidence score for intent detection"
    )
    
    agent: AgentType = Field(
        description="Which agent(s) should handle this intent"
    )
    
    reasoning: str = Field(
        description="Explanation of why this intent was detected"
    )
    
    entities: Dict[str, Any] = Field(
        default_factory=dict,
        description="Extracted entities (dates, names, priorities, etc.)"
    )
    
    requires_decomposition: bool = Field(
        default=False,
        description="Whether query needs to be broken into sub-queries"
    )


class IntentDetectionRequest(BaseModel):
    """Request for intent detection"""
    
    query: str = Field(
        description="User's natural language query"
    )
    
    workspace_id: str = Field(
        description="Workspace context"
    )
    
    session_id: Optional[str] = Field(
        default=None,
        description="Conversation session ID"
    )
    
    conversation_history: Optional[List[Dict[str, str]]] = Field(
        default=None,
        description="Recent conversation history for context"
    )


class IntentDetectionResponse(BaseModel):
    """Response from intent detection"""
    
    intent: Intent = Field(
        description="Detected intent"
    )
    
    query: str = Field(
        description="Original query"
    )
    
    workspace_id: str = Field(
        description="Workspace ID"
    )


# Intent examples for few-shot prompting
INTENT_EXAMPLES = [
    {
        "query": "What does the design document say about authentication?",
        "intent_type": IntentType.DOCUMENT_QUERY,
        "agent": AgentType.DOCUMENT,
        "reasoning": "User asking about specific content in documents"
    },
    {
        "query": "How many high priority tasks are overdue?",
        "intent_type": IntentType.TASK_QUERY,
        "agent": AgentType.TASK,
        "reasoning": "User asking about task status and priorities"
    },
    {
        "query": "Show me tasks related to the API documentation",
        "intent_type": IntentType.HYBRID_QUERY,
        "agent": AgentType.BOTH,
        "reasoning": "Requires finding tasks AND checking document content"
    },
    {
        "query": "What are the biggest risks in the project right now?",
        "intent_type": IntentType.TASK_RISK,
        "agent": AgentType.TASK,
        "reasoning": "User asking for risk analysis of tasks"
    },
    {
        "query": "Give me an overview of the workspace",
        "intent_type": IntentType.WORKSPACE_OVERVIEW,
        "agent": AgentType.BOTH,
        "reasoning": "Requires summary of both documents and tasks"
    },
    {
        "query": "Summarize the requirements document",
        "intent_type": IntentType.DOCUMENT_SUMMARY,
        "agent": AgentType.DOCUMENT,
        "reasoning": "User requesting document summarization"
    },
    {
        "query": "Who is working on authentication tasks?",
        "intent_type": IntentType.TASK_ANALYSIS,
        "agent": AgentType.TASK,
        "reasoning": "User asking about task assignments"
    },
    {
        "query": "Hello, how can you help me?",
        "intent_type": IntentType.UNKNOWN,
        "agent": AgentType.BOTH,
        "reasoning": "General greeting or open-ended question"
    },
    {
        "query": "Continue writing the next paragraph",
        "intent_type": IntentType.DOCUMENT_COMPLETION,
        "agent": AgentType.DOCUMENT,
        "reasoning": "User asking to generate content for the active document"
    }
]
