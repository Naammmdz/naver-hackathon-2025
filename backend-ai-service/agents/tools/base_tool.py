"""
Base Tool Interface

Abstract base class for all agent tools that perform write operations.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import uuid


class ToolError(Exception):
    """Exception raised by tool operations"""
    pass


class ToolResultStatus(str, Enum):
    """Status of tool execution"""
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"  # For batch operations


class ToolResult(BaseModel):
    """Result from tool execution"""
    
    status: ToolResultStatus = Field(
        description="Execution status"
    )
    
    data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Result data (created IDs, updated fields, etc.)"
    )
    
    error: Optional[str] = Field(
        default=None,
        description="Error message if failed"
    )
    
    rollback_id: Optional[str] = Field(
        default=None,
        description="ID for rollback operation"
    )
    
    rollback_metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Metadata needed for rollback"
    )
    
    execution_time_ms: int = Field(
        default=0,
        description="Execution time in milliseconds"
    )


class ToolPreview(BaseModel):
    """Preview of what a tool will do"""
    
    action: str = Field(
        description="Action being performed (e.g., 'create_task')"
    )
    
    summary: str = Field(
        description="Human-readable summary"
    )
    
    details: Dict[str, Any] = Field(
        description="Detailed preview data"
    )
    
    estimated_impact: str = Field(
        description="Description of impact"
    )
    
    risks: List[str] = Field(
        default_factory=list,
        description="Risk levels (low/medium/high)"
    )
    
    reversible: bool = Field(
        default=True,
        description="Whether operation can be rolled back"
    )
    
    estimated_time_ms: int = Field(
        default=1000,
        description="Estimated execution time"
    )


class AgentTool(ABC):
    """
    Abstract base class for agent tools.
    
    All tools must implement:
    - validate_params: Parameter validation
    - preview: Generate preview of operation
    - execute: Execute the operation
    - rollback: Undo the operation (if supported)
    """
    
    def __init__(self):
        """Initialize tool"""
        self.name = self.__class__.__name__
        self.execution_history: List[Dict[str, Any]] = []
    
    @abstractmethod
    def validate_params(self, params: Dict[str, Any]) -> bool:
        """
        Validate tool parameters
        
        Args:
            params: Parameters to validate
            
        Returns:
            True if valid
            
        Raises:
            ToolError: If parameters are invalid
        """
        pass
    
    @abstractmethod
    def preview(self, params: Dict[str, Any]) -> ToolPreview:
        """
        Generate preview of what this tool will do
        
        Args:
            params: Tool parameters
            
        Returns:
            Preview object
            
        Raises:
            ToolError: If preview generation fails
        """
        pass
    
    @abstractmethod
    def execute(self, params: Dict[str, Any]) -> ToolResult:
        """
        Execute the tool operation
        
        Args:
            params: Tool parameters
            
        Returns:
            Tool result
            
        Raises:
            ToolError: If execution fails
        """
        pass
    
    def rollback(self, rollback_id: str) -> bool:
        """
        Rollback a previous operation
        
        Args:
            rollback_id: ID from ToolResult
            
        Returns:
            True if rollback successful
            
        Raises:
            ToolError: If rollback fails
        """
        # Default implementation: not supported
        raise ToolError(f"Rollback not supported for {self.name}")
    
    def _record_execution(self, params: Dict[str, Any], result: ToolResult):
        """Record execution for history/rollback"""
        self.execution_history.append({
            'timestamp': datetime.utcnow().isoformat(),
            'params': params,
            'result': result.model_dump(),
            'rollback_id': result.rollback_id
        })
    
    def _generate_rollback_id(self) -> str:
        """Generate unique rollback ID"""
        return f"rollback-{uuid.uuid4().hex[:12]}"
