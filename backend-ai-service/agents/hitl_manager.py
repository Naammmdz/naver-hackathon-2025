"""
HITL Manager

Manages Human-in-the-Loop workflows:
- Confirmation requests
- Action execution
- Rollback handling
- Feedback collection
"""

import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text

from agents.schemas.hitl_schemas import (
    ConfirmationRequest,
    ConfirmationResponse,
    ConfirmationStatus,
    ActionExecutionResult,
    UserFeedback,
    RollbackRequest,
    HITLConfig,
    ActionOption,
    ActionSeverity
)
from database.connection import get_db_session
from utils.logger import get_logger

logger = get_logger(__name__)


class HITLManager:
    """
    Manages Human-in-the-Loop workflows
    
    Features:
    - Request confirmation for critical actions
    - Execute approved actions
    - Rollback mechanism
    - Feedback collection
    """
    
    def __init__(self, config: Optional[HITLConfig] = None):
        """
        Initialize HITL Manager
        
        Args:
            config: HITL configuration (uses defaults if None)
        """
        self.config = config or HITLConfig()
        logger.info("HITLManager initialized")
    
    def create_confirmation_request(
        self,
        workspace_id: str,
        user_id: str,
        agent_name: str,
        title: str,
        description: str,
        options: List[ActionOption],
        context: Optional[Dict[str, Any]] = None,
        default_option: Optional[str] = None,
        timeout_seconds: Optional[int] = None
    ) -> ConfirmationRequest:
        """
        Create a confirmation request
        
        Args:
            workspace_id: Workspace ID
            user_id: User ID to ask
            agent_name: Agent requesting confirmation
            title: Request title
            description: Detailed description
            options: List of action options
            context: Additional context
            default_option: Default option if timeout
            timeout_seconds: Custom timeout
            
        Returns:
            ConfirmationRequest object
        """
        request_id = str(uuid.uuid4())
        
        # Determine timeout based on severity
        if timeout_seconds is None:
            max_severity = max(opt.severity for opt in options)
            if max_severity == ActionSeverity.CRITICAL:
                timeout_seconds = self.config.critical_timeout_seconds
            else:
                timeout_seconds = self.config.default_timeout_seconds
        
        expires_at = datetime.utcnow() + timedelta(seconds=timeout_seconds)
        
        request = ConfirmationRequest(
            request_id=request_id,
            workspace_id=workspace_id,
            user_id=user_id,
            agent_name=agent_name,
            title=title,
            description=description,
            context=context or {},
            options=options,
            default_option=default_option,
            timeout_seconds=timeout_seconds,
            expires_at=expires_at
        )
        
        # Store request in database
        self._store_request(request)
        
        logger.info(f"Created confirmation request {request_id} for user {user_id}")
        return request
    
    def _store_request(self, request: ConfirmationRequest):
        """Store confirmation request in database"""
        db = get_db_session()
        try:
            query = text("""
                INSERT INTO hitl_feedback (
                    id, workspace_id, conversation_id, user_id, agent_name, action_type,
                    feedback_data, sentiment, rating, feedback_type, created_at
                )
                VALUES (
                    :id, :workspace_id, NULL, :user_id, :agent_name, 'pending_confirmation',
                    :feedback_data, 'neutral', 3, 'confirmation', :created_at
                )
            """)
            
            import json
            from datetime import datetime
            
            # Convert Pydantic model to JSON-serializable dict
            def serialize_datetime(obj):
                if isinstance(obj, datetime):
                    return obj.isoformat()
                raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
            
            db.execute(query, {
                'id': request.request_id,
                'workspace_id': request.workspace_id,
                'user_id': request.user_id,
                'agent_name': request.agent_name,
                'feedback_data': json.dumps(request.model_dump(), default=serialize_datetime),
                'created_at': request.created_at
            })
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to store request: {str(e)}")
            raise
        finally:
            db.close()
    
    def get_request(self, request_id: str) -> Optional[ConfirmationRequest]:
        """Retrieve confirmation request"""
        db = get_db_session()
        try:
            query = text("""
                SELECT feedback_data
                FROM hitl_feedback
                WHERE id = :request_id
            """)
            
            result = db.execute(query, {'request_id': request_id}).fetchone()
            if result:
                # feedback_data is already a dict from JSONB column
                data = result[0]
                return ConfirmationRequest(**data)
            return None
        except Exception as e:
            logger.error(f"Failed to get request: {str(e)}")
            return None
        finally:
            db.close()
    
    def wait_for_response(
        self,
        request_id: str,
        poll_interval: int = 2
    ) -> ConfirmationResponse:
        """
        Wait for user response (blocking)
        
        Args:
            request_id: Request ID
            poll_interval: Polling interval in seconds
            
        Returns:
            ConfirmationResponse
        """
        import time
        
        request = self.get_request(request_id)
        if not request:
            raise ValueError(f"Request {request_id} not found")
        
        while datetime.utcnow() < request.expires_at:
            response = self._get_response(request_id)
            if response:
                return response
            
            time.sleep(poll_interval)
        
        # Timeout - handle based on config
        logger.warning(f"Request {request_id} timed out")
        return self._handle_timeout(request)
    
    def _get_response(self, request_id: str) -> Optional[ConfirmationResponse]:
        """Check if response is available"""
        db = get_db_session()
        try:
            query = text("""
                SELECT feedback_data
                FROM hitl_feedback
                WHERE id = :request_id
                AND action_type != 'pending_confirmation'
            """)
            
            result = db.execute(query, {'request_id': request_id}).fetchone()
            if result:
                import json
                data = json.loads(result[0])
                return ConfirmationResponse(**data)
            return None
        except Exception as e:
            logger.error(f"Failed to check response: {str(e)}")
            return None
        finally:
            db.close()
    
    def _handle_timeout(self, request: ConfirmationRequest) -> ConfirmationResponse:
        """Handle timeout based on configuration"""
        if self.config.timeout_action == "default" and request.default_option:
            status = ConfirmationStatus.APPROVED
            selected = request.default_option
            logger.info(f"Timeout - using default option {selected}")
        else:
            status = ConfirmationStatus.TIMEOUT
            selected = None
            logger.info(f"Timeout - rejecting request")
        
        response = ConfirmationResponse(
            request_id=request.request_id,
            status=status,
            selected_option_id=selected,
            reason="Request timed out"
        )
        
        self._store_response(response)
        return response
    
    def submit_response(self, response: ConfirmationResponse):
        """Submit user response"""
        self._store_response(response)
        logger.info(f"Response submitted for request {response.request_id}: {response.status}")
    
    def _store_response(self, response: ConfirmationResponse):
        """Store user response in database"""
        db = get_db_session()
        try:
            import json
            
            # Get existing request data
            get_query = text("SELECT feedback_data FROM hitl_feedback WHERE id = :request_id")
            result = db.execute(get_query, {'request_id': response.request_id}).fetchone()
            
            if result and result[0]:
                # Merge response into existing request data
                request_data = result[0] if isinstance(result[0], dict) else {}
                request_data['response'] = response.model_dump()
                
                update_query = text("""
                    UPDATE hitl_feedback
                    SET 
                        action_type = :status,
                        feedback_data = :combined_data,
                        processed = true,
                        processed_at = :processed_at
                    WHERE id = :request_id
                """)
                
                db.execute(update_query, {
                    'request_id': response.request_id,
                    'status': response.status.value,
                    'combined_data': json.dumps(request_data, default=str),
                    'processed_at': response.responded_at
                })
                db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to store response: {str(e)}")
            raise
        finally:
            db.close()
    
    def execute_action(
        self,
        request_id: str,
        option_id: str,
        executor_func: callable
    ) -> ActionExecutionResult:
        """
        Execute approved action
        
        Args:
            request_id: Request ID
            option_id: Option ID to execute
            executor_func: Function to execute action
            
        Returns:
            ActionExecutionResult
        """
        request = self.get_request(request_id)
        if not request:
            raise ValueError(f"Request {request_id} not found")
        
        # Find option
        option = next((opt for opt in request.options if opt.id == option_id), None)
        if not option:
            raise ValueError(f"Option {option_id} not found")
        
        logger.info(f"Executing action {option_id} for request {request_id}")
        
        try:
            # Execute action
            result_data = executor_func(option.parameters)
            
            # Create rollback if reversible
            rollback_id = None
            if option.reversible:
                rollback_id = self._create_rollback_point(request_id, option_id, result_data)
            
            result = ActionExecutionResult(
                request_id=request_id,
                option_id=option_id,
                success=True,
                result=result_data,
                rollback_available=option.reversible,
                rollback_id=rollback_id
            )
            
            logger.info(f"Action executed successfully: {request_id}")
            
        except Exception as e:
            logger.error(f"Action execution failed: {str(e)}")
            result = ActionExecutionResult(
                request_id=request_id,
                option_id=option_id,
                success=False,
                error=str(e),
                rollback_available=False
            )
        
        # Store result
        self._store_execution_result(result)
        return result
    
    def _create_rollback_point(
        self,
        request_id: str,
        option_id: str,
        result_data: Dict[str, Any]
    ) -> str:
        """Create rollback point"""
        rollback_id = str(uuid.uuid4())
        
        db = get_db_session()
        try:
            query = text("""
                INSERT INTO agent_actions (
                    id, workspace_id, agent_name, action_type,
                    action_data, success, created_at
                )
                SELECT 
                    :rollback_id,
                    workspace_id,
                    agent_name,
                    'rollback_point',
                    :rollback_data,
                    true,
                    :created_at
                FROM hitl_feedback
                WHERE id = :request_id
            """)
            
            db.execute(query, {
                'rollback_id': rollback_id,
                'request_id': request_id,
                'rollback_data': str({
                    'request_id': request_id,
                    'option_id': option_id,
                    'result': result_data
                }),
                'created_at': datetime.utcnow()
            })
            db.commit()
            
            logger.info(f"Created rollback point {rollback_id}")
            return rollback_id
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create rollback point: {str(e)}")
            raise
        finally:
            db.close()
    
    def _store_execution_result(self, result: ActionExecutionResult):
        """Store execution result"""
        db = get_db_session()
        try:
            query = text("""
                INSERT INTO agent_actions (
                    id, workspace_id, agent_name, action_type,
                    action_data, success, result_data, created_at
                )
                SELECT 
                    :result_id,
                    workspace_id,
                    agent_name,
                    'action_execution',
                    :action_data,
                    :success,
                    :result_data,
                    :created_at
                FROM hitl_feedback
                WHERE id = :request_id
            """)
            
            db.execute(query, {
                'result_id': str(uuid.uuid4()),
                'request_id': result.request_id,
                'action_data': f"Option: {result.option_id}",
                'success': result.success,
                'result_data': result.model_dump_json(),
                'created_at': result.executed_at
            })
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to store execution result: {str(e)}")
        finally:
            db.close()
    
    def rollback_action(self, rollback_request: RollbackRequest):
        """
        Rollback a previously executed action
        
        Args:
            rollback_request: Rollback request details
        """
        logger.info(f"Rolling back action {rollback_request.rollback_id}")
        
        # TODO: Implement rollback logic based on action type
        # This would require storing reverse operations
        
        raise NotImplementedError("Rollback functionality coming soon")
    
    def collect_feedback(self, feedback: UserFeedback):
        """
        Collect user feedback
        
        Args:
            feedback: User feedback
        """
        db = get_db_session()
        try:
            query = text("""
                INSERT INTO hitl_feedback (
                    id, workspace_id, conversation_id, user_id, agent_name, action_type,
                    sentiment, rating, comment, feedback_data, feedback_type, created_at
                )
                VALUES (
                    :id, :workspace_id, NULL, :user_id, :agent_name, :action_type,
                    :sentiment, :rating, :comment, :metadata, 'preference', :created_at
                )
            """)
            
            import json
            db.execute(query, {
                'id': feedback.feedback_id,
                'workspace_id': feedback.workspace_id,
                'user_id': feedback.user_id,
                'agent_name': feedback.agent_name,
                'action_type': feedback.action_type.value if feedback.action_type else 'general',
                'sentiment': feedback.sentiment.value,
                'rating': feedback.rating,
                'comment': feedback.comment,
                'metadata': json.dumps(feedback.metadata),
                'created_at': feedback.created_at
            })
            db.commit()
            
            logger.info(f"Feedback collected: {feedback.feedback_id} (rating: {feedback.rating}/5)")
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to collect feedback: {str(e)}")
            raise
        finally:
            db.close()
    
    def should_require_confirmation(self, severity: ActionSeverity) -> bool:
        """Check if action requires confirmation"""
        if not self.config.enabled:
            return False
        
        if severity == ActionSeverity.LOW and self.config.auto_execute_low:
            return False
        elif severity == ActionSeverity.MEDIUM and self.config.require_confirmation_medium:
            return True
        elif severity == ActionSeverity.HIGH and self.config.require_approval_high:
            return True
        elif severity == ActionSeverity.CRITICAL and self.config.require_reason_critical:
            return True
        
        return False
