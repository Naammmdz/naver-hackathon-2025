"""
Batch Control Schemas for HITL

Enhanced schemas for granular control over batch operations.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum


class BatchItemStatus(str, Enum):
    """Status of individual batch item"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SKIPPED = "skipped"


class BatchItem(BaseModel):
    """Individual item in a batch operation"""
    
    id: str = Field(
        description="Unique item ID within batch"
    )
    
    preview: Dict[str, Any] = Field(
        description="Preview data for this item"
    )
    
    status: BatchItemStatus = Field(
        default=BatchItemStatus.PENDING,
        description="Item status"
    )
    
    approved: Optional[bool] = Field(
        default=None,
        description="Whether item is approved"
    )
    
    skip: bool = Field(
        default=False,
        description="Skip this item"
    )
    
    modified_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Modified data if user edited"
    )
    
    error: Optional[str] = Field(
        None,
        description="Error message if item failed"
    )


class BatchControl(BaseModel):
    """Control structure for bulk operations"""
    
    total_items: int = Field(
        description="Total number of items in batch"
    )
    
    allow_partial: bool = Field(
        default=True,
        description="Allow some items to fail"
    )
    
    individual_approval: bool = Field(
        default=False,
        description="Require approval for each item individually"
    )
    
    items: List[BatchItem] = Field(
        description="List of batch items"
    )
    
    approved_count: int = Field(
        default=0,
        description="Number of approved items"
    )
    
    rejected_count: int = Field(
        default=0,
        description="Number of rejected items"
    )
    
    def get_approved_items(self) -> List[BatchItem]:
        """Get list of approved items"""
        return [item for item in self.items if item.approved is True]
    
    def get_rejected_items(self) -> List[BatchItem]:
        """Get list of rejected items"""
        return [item for item in self.items if item.approved is False or item.skip]
    
    def approve_all(self):
        """Approve all items"""
        for item in self.items:
            if not item.skip:
                item.approved = True
                item.status = BatchItemStatus.APPROVED
        self.approved_count = len(self.get_approved_items())
    
    def reject_all(self):
        """Reject all items"""
        for item in self.items:
            item.approved = False
            item.status = BatchItemStatus.REJECTED
        self.rejected_count = len(self.get_rejected_items())
