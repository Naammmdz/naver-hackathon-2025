"""
Sample Workflow: Extract Tasks from Document

Demonstrates a multi-step workflow that:
1. Reads a document using DocumentAgent
2. Extracts action items using LLM
3. Creates tasks using TaskAgent with HITL
"""

from typing import Dict, Any, List
import logging
from agents.document_agent import DocumentAgent
from agents.task_agent import TaskAgent

logger = logging.getLogger(__name__)


class ExtractTasksWorkflow:
    """
    Workflow to extract action items from a document and create tasks.
    
    This is an example of a multi-step agentic workflow with HITL.
    """
    
    def __init__(self):
        self.document_agent = DocumentAgent()
        self.task_agent = TaskAgent()
    
    def execute(
        self,
        workspace_id: str,
        document_query: str,
        user_id: str = "default-user"
    ) -> Dict[str, Any]:
        """
        Execute the workflow.
        
        Args:
            workspace_id: Workspace ID
            document_query: Query to extract tasks (e.g., "Extract action items from meeting notes")
            user_id: User ID
            
        Returns:
            HITL request for task creation or final result
        """
        logger.info(f"Starting ExtractTasksWorkflow for workspace {workspace_id}")
        
        # Step 1: Query document to extract action items
        logger.info("Step 1: Querying document for action items")
        doc_result = self.document_agent.query(
            query=document_query,
            workspace_id=workspace_id,
            user_id=user_id
        )
        
        if doc_result['confidence'] < 0.5:
            return {
                'success': False,
                'error': 'Could not extract action items from document',
                'details': doc_result
            }
        
        # Step 2: Parse action items from answer
        logger.info("Step 2: Parsing action items")
        action_items = self._parse_action_items(doc_result['answer'])
        
        if not action_items:
            return {
                'success': False,
                'error': 'No action items found in document'
            }
        
        logger.info(f"Found {len(action_items)} action items")
        
        # Step 3: Create preview for bulk task creation
        logger.info("Step 3: Creating task preview for HITL")
        task_preview = self.task_agent.bulk_create_tasks(
            workspace_id=workspace_id,
            tasks=action_items,
            with_preview=True  # Get preview for HITL
        )
        
        # Return preview for user approval
        return {
            'success': True,
            'workflow': 'extract_tasks',
            'step': 'awaiting_approval',
            'source_document': {
                'query': document_query,
                'citations': doc_result.get('citations', [])
            },
            'extracted_items': len(action_items),
            **task_preview  # Includes requires_confirmation, preview, batch_control
        }
    
    def execute_approved(
        self,
        workspace_id: str,
        params: Dict[str, Any],
        approved_indices: List[int] = None
    ) -> Dict[str, Any]:
        """
        Execute after user approval.
        
        Args:
            workspace_id: Workspace ID
            params: Original params from preview
            approved_indices: Indices of approved tasks (None = all)
            
        Returns:
            Execution result
        """
        logger.info("Executing approved task creation")
        
        tasks = params['tasks']
        
        # Filter to approved tasks only
        if approved_indices is not None:
            tasks = [tasks[i] for i in approved_indices if i < len(tasks)]
        
        # Execute task creation
        result = self.task_agent.bulk_create_ tasks(
            workspace_id=workspace_id,
            tasks=tasks,
            with_preview=False  # Execute directly
        )
        
        return {
            'success': result['status'] == 'success',
            'workflow': 'extract_tasks',
            'step': 'completed',
            'created_count': result.get('data', {}).get('created_count', 0),
            'failed_count': result.get('data', {}).get('failed_count', 0),
            'result': result
        }
    
    def _parse_action_items(self, answer: str) -> List[Dict[str, Any]]:
        """
        Parse action items from LLM answer.
        
        This is a simple implementation - in production, use structured output.
        
        Args:
            answer: LLM answer containing action items
            
        Returns:
            List of task dicts
        """
        # Simple parsing: look for bullet points or numbered lists
        lines = answer.split('\n')
        tasks = []
        
        for line in lines:
            line = line.strip()
            
            # Skip empty lines
            if not line:
                continue
            
            # Check if line looks like an action item
            if any(line.startswith(prefix) for prefix in ['- ', '* ', '• ', '1.', '2.', '3.', '4.', '5.']):
                # Extract task title (remove bullet/number)
                title = line.lstrip('-*•0123456789. ')
                
                if len(title) > 5:  # Minimum title length
                    tasks.append({
                        'title': title,
                        'description': '',
                        'status': 'TODO',
                        'priority': 'MEDIUM'
                    })
        
        return tasks


# Example usage
if __name__ == "__main__":
    workflow = ExtractTasksWorkflow()
    
    # Step 1: Extract and preview
    result = workflow.execute(
        workspace_id="workspace-123",
        document_query="Extract all action items from the meeting notes document"
    )
    
    print("Workflow Result:")
    print(f"Success: {result['success']}")
    print(f"Requires Confirmation: {result.get('requires_confirmation')}")
    print(f"Extracted Items: {result.get('extracted_items')}")
    
    if result.get('batch_control'):
        print(f"Batch Control: {result['batch_control']['total_items']} tasks")
    
    # Step 2: User approves, then execute
    # approved_result = workflow.execute_approved(
    #     workspace_id="workspace-123",
    #     params=result['params'],
    #     approved_indices=[0, 1, 2]  # Approve first 3 tasks
    # )
