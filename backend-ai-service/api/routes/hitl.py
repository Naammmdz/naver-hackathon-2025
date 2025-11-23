"""
HITL (Human-in-the-Loop) API Endpoints

Provides APIs for confirmation requests, user responses, and feedback.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import sys
from pathlib import Path

if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.connection import get_db_session
from agents.hitl_manager import HITLManager
from agents.schemas.hitl_schemas import (
    ActionType, ActionSeverity, ConfirmationStatus,
    ActionOption, ConfirmationRequest, ConfirmationResponse,
    UserFeedback, FeedbackSentiment
)
from utils.logger import get_logger
from sqlalchemy.orm import Session

logger = get_logger(__name__)
router = APIRouter(prefix="/hitl", tags=["HITL"])


# Dependency
def get_db():
    """Get database session"""
    db = get_db_session()
    try:
        yield db
    finally:
        db.close()


# Request/Response Models
class CreateConfirmationRequest(BaseModel):
    """Request to create confirmation"""
    workspace_id: str = Field(..., description="Workspace ID")
    user_id: str = Field(..., description="User ID")
    action_type: ActionType = Field(..., description="Type of action")
    severity: ActionSeverity = Field(..., description="Severity level")
    description: str = Field(..., description="Human-readable description")
    estimated_impact: str = Field(..., description="Expected impact description")
    options: List[Dict[str, Any]] = Field(..., description="Confirmation options")
    action_data: Dict[str, Any] = Field(default_factory=dict, description="Additional action data")
    timeout_seconds: Optional[int] = Field(None, description="Custom timeout in seconds")


class CreateConfirmationResponse(BaseModel):
    """Response after creating confirmation"""
    request_id: str
    status: ConfirmationStatus
    expires_at: datetime
    message: str


class SubmitResponseRequest(BaseModel):
    """Request to submit user response"""
    request_id: str = Field(..., description="Confirmation request ID")
    selected_option: str = Field(..., description="Selected option action key")
    user_comment: Optional[str] = Field(None, description="Optional user comment")
    modified_params: Optional[Dict[str, Any]] = Field(None, description="Modified parameters")


class SubmitResponseResponse(BaseModel):
    """Response after submitting user response"""
    request_id: str
    status: str
    message: str
    execution_result: Optional[Dict[str, Any]] = None


class PendingRequestItem(BaseModel):
    """Single pending request item"""
    request_id: str
    action_type: str
    severity: str
    description: str
    estimated_impact: str
    options: List[Dict[str, Any]]
    created_at: datetime
    expires_at: datetime
    time_remaining_seconds: int


class PendingRequestsResponse(BaseModel):
    """Response with pending requests"""
    workspace_id: str
    user_id: str
    pending_count: int
    requests: List[PendingRequestItem]


class SubmitFeedbackRequest(BaseModel):
    """Request to submit feedback"""
    workspace_id: str = Field(..., description="Workspace ID")
    user_id: str = Field(..., description="User ID")
    request_id: Optional[str] = Field(None, description="Related confirmation request ID")
    agent_name: str = Field(..., description="Agent that performed action")
    action_type: str = Field(..., description="Type of action")
    rating: int = Field(..., ge=1, le=5, description="Rating 1-5")
    sentiment: FeedbackSentiment = Field(..., description="User sentiment")
    comment: Optional[str] = Field(None, description="Freeform comment")
    action_data: Optional[Dict[str, Any]] = Field(None, description="Additional data")


class SubmitFeedbackResponse(BaseModel):
    """Response after submitting feedback"""
    feedback_id: int
    message: str


class HITLHistoryItem(BaseModel):
    """Single HITL history item"""
    request_id: str
    agent_name: Optional[str]
    action_type: str
    severity: str
    description: str
    status: str
    selected_option: Optional[str]
    rating: Optional[int]
    sentiment: Optional[str]
    comment: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]


class HITLHistoryResponse(BaseModel):
    """Response with HITL history"""
    workspace_id: str
    total_count: int
    items: List[HITLHistoryItem]
    page: int
    page_size: int


# Endpoints

@router.post("/confirm", response_model=CreateConfirmationResponse)
async def create_confirmation(
    request: CreateConfirmationRequest,
    db: Session = Depends(get_db)
):
    """
    Create a confirmation request for user approval
    
    This endpoint creates a HITL confirmation request when an agent detects
    a risky operation that requires user approval before execution.
    
    **Flow:**
    1. Agent detects risky operation
    2. Agent calls this endpoint with action details and options
    3. System stores request and returns request_id
    4. User receives notification (via WebSocket/polling)
    5. User responds via /respond endpoint
    
    **Example:**
    ```json
    {
        "workspace_id": "ws_123",
        "user_id": "user_456",
        "action_type": "task_delete",
        "severity": "high",
        "description": "Delete 15 completed tasks",
        "estimated_impact": "15 tasks will be permanently deleted",
        "options": [
            {
                "action_key": "archive",
                "label": "Archive instead",
                "description": "Move tasks to archive instead of deleting",
                "severity": "low",
                "reversible": true
            },
            {
                "action_key": "confirm_delete",
                "label": "Confirm deletion",
                "description": "Permanently delete the tasks",
                "severity": "high",
                "reversible": false
            },
            {
                "action_key": "cancel",
                "label": "Cancel",
                "description": "Do not delete",
                "severity": "low",
                "reversible": true
            }
        ]
    }
    ```
    """
    try:
        hitl_manager = HITLManager()
        
        # Convert option dicts to ActionOption objects
        options = [ActionOption(**opt) for opt in request.options]
        
        # Create confirmation request
        confirmation_request = await hitl_manager.create_confirmation_request(
            workspace_id=request.workspace_id,
            user_id=request.user_id,
            action_type=request.action_type,
            severity=request.severity,
            description=request.description,
            estimated_impact=request.estimated_impact,
            options=options,
            action_data=request.action_data,
            timeout_seconds=request.timeout_seconds
        )
        
        logger.info(
            f"Created HITL confirmation request {confirmation_request.request_id} "
            f"for user {request.user_id} in workspace {request.workspace_id}"
        )
        
        return CreateConfirmationResponse(
            request_id=confirmation_request.request_id,
            status=confirmation_request.status,
            expires_at=confirmation_request.expires_at,
            message=f"Confirmation request created. Please respond before {confirmation_request.expires_at}"
        )
        
    except Exception as e:
        logger.error(f"Error creating confirmation request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create confirmation request: {str(e)}"
        )


@router.post("/respond", response_model=SubmitResponseResponse)
async def submit_response(
    request: SubmitResponseRequest,
    db: Session = Depends(get_db)
):
    """
    Submit user response to a confirmation request
    
    This endpoint allows users to respond to HITL confirmation requests
    by selecting one of the provided options.
    
    **Flow:**
    1. User receives confirmation request
    2. User reviews options and selects one
    3. User calls this endpoint with selection
    4. System processes response and may execute action
    5. System returns execution result
    
    **Example:**
    ```json
    {
        "request_id": "req_abc123",
        "selected_option": "archive",
        "user_comment": "Prefer to keep tasks in archive for audit trail"
    }
    ```
    """
    try:
        hitl_manager = HITLManager()
        
        # Determine status
        status_val = ConfirmationStatus.APPROVED
        if request.selected_option == "cancel":
            status_val = ConfirmationStatus.REJECTED
            
        # Create response object
        response = ConfirmationResponse(
            request_id=request.request_id,
            status=status_val,
            selected_option_id=request.selected_option,
            reason=request.user_comment,
            modified_parameters=request.modified_params
        )
        
        # Submit response
        hitl_manager.submit_response(response)
        
        logger.info(
            f"User submitted response for request {request.request_id}: "
            f"selected option '{request.selected_option}'"
        )
        
        return SubmitResponseResponse(
            request_id=request.request_id,
            status="accepted",
            message=f"Response recorded. Selected option: {request.selected_option}",
            execution_result=None  # Agent will execute separately
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error submitting response: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit response: {str(e)}"
        )


@router.get("/pending/{workspace_id}/{user_id}", response_model=PendingRequestsResponse)
async def get_pending_requests(
    workspace_id: str,
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get pending confirmation requests for a user
    
    This endpoint retrieves all pending HITL confirmation requests
    that require user response.
    
    **Use cases:**
    - Polling for new confirmation requests
    - Displaying pending requests in UI
    - Checking if any actions need approval
    
    **Returns:**
    List of pending requests with:
    - Request details
    - Available options
    - Time remaining before timeout
    - Severity and impact information
    """
    try:
        hitl_manager = HITLManager()
        
        # Get pending requests from database
        query = """
            SELECT 
                feedback_data->>'request_id' as request_id,
                action_type,
                feedback_data->>'severity' as severity,
                feedback_data->>'description' as description,
                feedback_data->>'estimated_impact' as estimated_impact,
                feedback_data->'options' as options,
                created_at,
                feedback_data->>'expires_at' as expires_at
            FROM hitl_feedback
            WHERE workspace_id = %s
                AND user_id = %s
                AND processed = FALSE
                AND feedback_data->>'status' = 'pending'
                AND (feedback_data->>'expires_at')::timestamp > NOW()
            ORDER BY created_at DESC
        """
        
        from database.connection import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (workspace_id, user_id))
            rows = cursor.fetchall()
            
            pending_requests = []
            for row in rows:
                request_id, action_type, severity, description, impact, options_json, created_at, expires_at_str = row
                
                # Parse datetime
                expires_at = datetime.fromisoformat(expires_at_str)
                time_remaining = int((expires_at - datetime.now()).total_seconds())
                
                # Parse options
                import json
                options = json.loads(options_json) if isinstance(options_json, str) else options_json
                
                pending_requests.append(PendingRequestItem(
                    request_id=request_id,
                    action_type=action_type,
                    severity=severity,
                    description=description,
                    estimated_impact=impact,
                    options=options,
                    created_at=created_at,
                    expires_at=expires_at,
                    time_remaining_seconds=max(0, time_remaining)
                ))
            
            logger.info(
                f"Retrieved {len(pending_requests)} pending requests for "
                f"user {user_id} in workspace {workspace_id}"
            )
            
            return PendingRequestsResponse(
                workspace_id=workspace_id,
                user_id=user_id,
                pending_count=len(pending_requests),
                requests=pending_requests
            )
            
        finally:
            cursor.close()
            conn.close()
        
    except Exception as e:
        logger.error(f"Error retrieving pending requests: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve pending requests: {str(e)}"
        )


@router.post("/feedback", response_model=SubmitFeedbackResponse)
async def submit_feedback(
    request: SubmitFeedbackRequest,
    db: Session = Depends(get_db)
):
    """
    Submit feedback on an executed action
    
    This endpoint allows users to provide feedback after an action
    has been executed, helping improve agent behavior over time.
    
    **Feedback includes:**
    - Rating (1-5 stars)
    - Sentiment (positive/negative/neutral)
    - Freeform comments
    - Related request ID (optional)
    
    **Example:**
    ```json
    {
        "workspace_id": "ws_123",
        "user_id": "user_456",
        "request_id": "req_abc123",
        "agent_name": "task_agent",
        "action_type": "task_delete",
        "rating": 5,
        "sentiment": "positive",
        "comment": "Archive option worked perfectly, thanks!"
    }
    ```
    """
    try:
        hitl_manager = HITLManager()
        
        # Create feedback object
        feedback = UserFeedback(
            request_id=request.request_id,
            rating=request.rating,
            sentiment=request.sentiment,
            comment=request.comment,
            timestamp=datetime.now()
        )
        
        # Collect feedback
        await hitl_manager.collect_feedback(
            workspace_id=request.workspace_id,
            user_id=request.user_id,
            request_id=request.request_id,
            agent_name=request.agent_name,
            action_type=request.action_type,
            feedback=feedback
        )
        
        logger.info(
            f"Collected feedback from user {request.user_id}: "
            f"rating={request.rating}, sentiment={request.sentiment.value}"
        )
        
        return SubmitFeedbackResponse(
            feedback_id=0,  # Will be set by database
            message="Feedback submitted successfully. Thank you!"
        )
        
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit feedback: {str(e)}"
        )


@router.get("/history/{workspace_id}", response_model=HITLHistoryResponse)
async def get_hitl_history(
    workspace_id: str,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get HITL history for a workspace
    
    This endpoint retrieves historical HITL confirmation requests
    and their outcomes for analysis and auditing.
    
    **Query Parameters:**
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    
    **Returns:**
    Paginated list of HITL history items with:
    - Request details
    - User response
    - Execution outcome
    - Feedback (if provided)
    
    **Use cases:**
    - Audit trail for important actions
    - Analyzing user decision patterns
    - Improving risk detection algorithms
    """
    try:
        # Validate pagination
        if page < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Page must be >= 1"
            )
        if page_size < 1 or page_size > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Page size must be between 1 and 100"
            )
        
        offset = (page - 1) * page_size
        
        # Get history from database
        query = """
            SELECT 
                feedback_data->>'request_id' as request_id,
                agent_name,
                action_type,
                feedback_data->>'severity' as severity,
                feedback_data->>'description' as description,
                feedback_data->>'status' as status,
                feedback_data->>'selected_option' as selected_option,
                rating,
                sentiment,
                comment,
                created_at,
                processed_at
            FROM hitl_feedback
            WHERE workspace_id = %s
                AND action_type IS NOT NULL
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        
        count_query = """
            SELECT COUNT(*)
            FROM hitl_feedback
            WHERE workspace_id = %s
                AND action_type IS NOT NULL
        """
        
        from database.connection import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get total count
            cursor.execute(count_query, (workspace_id,))
            total_count = cursor.fetchone()[0]
            
            # Get history items
            cursor.execute(query, (workspace_id, page_size, offset))
            rows = cursor.fetchall()
            
            history_items = []
            for row in rows:
                request_id, agent_name, action_type, severity, description, \
                status, selected_option, rating, sentiment, comment, \
                created_at, processed_at = row
                
                history_items.append(HITLHistoryItem(
                    request_id=request_id or f"hist_{created_at.timestamp()}",
                    agent_name=agent_name,
                    action_type=action_type,
                    severity=severity or "unknown",
                    description=description or "",
                    status=status or "completed",
                    selected_option=selected_option,
                    rating=rating,
                    sentiment=sentiment,
                    comment=comment,
                    created_at=created_at,
                    processed_at=processed_at
                ))
            
            logger.info(
                f"Retrieved {len(history_items)} history items (page {page}/{(total_count + page_size - 1) // page_size}) "
                f"for workspace {workspace_id}"
            )
            
            return HITLHistoryResponse(
                workspace_id=workspace_id,
                total_count=total_count,
                items=history_items,
                page=page,
                page_size=page_size
            )
            
        finally:
            cursor.close()
            conn.close()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving HITL history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve HITL history: {str(e)}"
        )
