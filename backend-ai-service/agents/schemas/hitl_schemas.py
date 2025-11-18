"""
HITL (Human-in-the-Loop) Schemas

Pydantic models for confirmation, approval, and feedback workflows.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum


class ActionType(str, Enum):
    """Types of actions requiring confirmation"""
    TASK_UPDATE = "task_update"
    TASK_DELETE = "task_delete"
    TASK_REASSIGN = "task_reassign"
    DEADLINE_CHANGE = "deadline_change"
    PRIORITY_CHANGE = "priority_change"
    STATUS_CHANGE = "status_change"
    NOTIFICATION_SEND = "notification_send"
    DOCUMENT_DELETE = "document_delete"
    BULK_OPERATION = "bulk_operation"
    CUSTOM = "custom"


class ActionSeverity(str, Enum):
    """Severity levels for actions"""
    LOW = "low"           # Auto-execute with notification
    MEDIUM = "medium"     # Require confirmation
    HIGH = "high"         # Require approval
    CRITICAL = "critical" # Require approval + reason


class ConfirmationStatus(str, Enum):
    """Status of confirmation request"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    MODIFIED = "modified"
    TIMEOUT = "timeout"


class FeedbackSentiment(str, Enum):
    """User feedback sentiment"""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


class ActionOption(BaseModel):
    """Single action option presented to user"""
    id: str = Field(..., description="Unique option ID")
    label: str = Field(..., description="User-friendly label")
    description: str = Field(..., description="Detailed description")
    action_type: ActionType = Field(..., description="Type of action")
    severity: ActionSeverity = Field(..., description="Severity level")
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Action parameters"
    )
    estimated_impact: Optional[str] = Field(
        None,
        description="Estimated impact description"
    )
    reversible: bool = Field(
        default=True,
        description="Whether action can be reversed"
    )


class ConfirmationRequest(BaseModel):
    """Request for user confirmation/approval"""
    request_id: str = Field(..., description="Unique request ID")
    workspace_id: str = Field(..., description="Workspace ID")
    user_id: str = Field(..., description="User ID")
    agent_name: str = Field(..., description="Agent requesting confirmation")
    
    # Context
    title: str = Field(..., description="Request title")
    description: str = Field(..., description="Detailed description")
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional context"
    )
    
    # Options
    options: List[ActionOption] = Field(
        description="Available action options",
        min_length=1
    )
    default_option: Optional[str] = Field(
        None,
        description="Default option ID if user doesn't respond"
    )
    
    # Timing
    timeout_seconds: int = Field(
        default=300,
        description="Timeout in seconds (default 5 minutes)"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = Field(None)


class ConfirmationResponse(BaseModel):
    """User's response to confirmation request"""
    request_id: str = Field(..., description="Original request ID")
    status: ConfirmationStatus = Field(..., description="Response status")
    selected_option_id: Optional[str] = Field(
        None,
        description="Selected option ID"
    )
    modified_parameters: Optional[Dict[str, Any]] = Field(
        None,
        description="Modified parameters if status=modified"
    )
    reason: Optional[str] = Field(
        None,
        description="Reason for approval/rejection (required for critical actions)"
    )
    responded_at: datetime = Field(default_factory=datetime.utcnow)


class ActionExecutionResult(BaseModel):
    """Result of executing an action"""
    request_id: str = Field(..., description="Original request ID")
    option_id: str = Field(..., description="Executed option ID")
    success: bool = Field(..., description="Whether execution succeeded")
    result: Optional[Dict[str, Any]] = Field(
        None,
        description="Execution result data"
    )
    error: Optional[str] = Field(None, description="Error message if failed")
    rollback_available: bool = Field(
        default=False,
        description="Whether rollback is available"
    )
    rollback_id: Optional[str] = Field(
        None,
        description="Rollback transaction ID"
    )
    executed_at: datetime = Field(default_factory=datetime.utcnow)


class UserFeedback(BaseModel):
    """User feedback on agent actions"""
    feedback_id: str = Field(..., description="Unique feedback ID")
    workspace_id: str = Field(..., description="Workspace ID")
    user_id: str = Field(..., description="User ID")
    agent_name: str = Field(..., description="Agent being rated")
    
    # Feedback content
    sentiment: FeedbackSentiment = Field(..., description="Overall sentiment")
    rating: int = Field(..., ge=1, le=5, description="Rating 1-5")
    comment: Optional[str] = Field(None, description="User comment")
    
    # Context
    action_type: Optional[ActionType] = Field(None, description="Related action type")
    request_id: Optional[str] = Field(None, description="Related request ID")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata"
    )
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RollbackRequest(BaseModel):
    """Request to rollback an action"""
    rollback_id: str = Field(..., description="Rollback transaction ID")
    reason: str = Field(..., description="Reason for rollback")
    user_id: str = Field(..., description="User requesting rollback")


class HITLConfig(BaseModel):
    """Configuration for HITL behavior"""
    enabled: bool = Field(default=True, description="Enable HITL system")
    
    # Auto-execution thresholds
    auto_execute_low: bool = Field(
        default=True,
        description="Auto-execute LOW severity actions"
    )
    require_confirmation_medium: bool = Field(
        default=True,
        description="Require confirmation for MEDIUM severity"
    )
    require_approval_high: bool = Field(
        default=True,
        description="Require approval for HIGH severity"
    )
    require_reason_critical: bool = Field(
        default=True,
        description="Require reason for CRITICAL severity"
    )
    
    # Timeouts
    default_timeout_seconds: int = Field(
        default=300,
        description="Default timeout (5 minutes)"
    )
    critical_timeout_seconds: int = Field(
        default=600,
        description="Timeout for critical actions (10 minutes)"
    )
    
    # Notifications
    notify_on_pending: bool = Field(
        default=True,
        description="Send notification when request is pending"
    )
    notify_on_timeout: bool = Field(
        default=True,
        description="Send notification on timeout"
    )
    
    # Fallback behavior
    timeout_action: Literal["reject", "default", "escalate"] = Field(
        default="reject",
        description="Action to take on timeout"
    )


# Example usage
HITL_EXAMPLES = {
    "task_update": {
        "title": "Update Overdue Tasks",
        "description": "I found 5 tasks that are overdue. Would you like me to take action?",
        "options": [
            {
                "id": "opt1",
                "label": "Send reminders to assignees",
                "description": "Send email reminders to all assignees of overdue tasks",
                "action_type": "notification_send",
                "severity": "low",
                "parameters": {"task_ids": ["task1", "task2"]},
                "reversible": False
            },
            {
                "id": "opt2",
                "label": "Reschedule deadlines (+3 days)",
                "description": "Automatically extend deadlines by 3 days",
                "action_type": "deadline_change",
                "severity": "medium",
                "parameters": {"extension_days": 3},
                "reversible": True
            },
            {
                "id": "opt3",
                "label": "Escalate to manager",
                "description": "Notify project manager about overdue tasks",
                "action_type": "notification_send",
                "severity": "medium",
                "parameters": {"escalate": True},
                "reversible": False
            }
        ]
    },
    "bulk_delete": {
        "title": "Bulk Delete Completed Tasks",
        "description": "Found 50 completed tasks older than 6 months. Delete them?",
        "options": [
            {
                "id": "opt1",
                "label": "Archive (recommended)",
                "description": "Move to archive instead of deleting",
                "action_type": "task_update",
                "severity": "low",
                "parameters": {"action": "archive"},
                "reversible": True
            },
            {
                "id": "opt2",
                "label": "Delete permanently",
                "description": "Permanently delete all 50 tasks",
                "action_type": "bulk_operation",
                "severity": "critical",
                "parameters": {"action": "delete", "count": 50},
                "reversible": False,
                "estimated_impact": "⚠️ Cannot be undone!"
            }
        ]
    }
}
