"""
Conversation Memory

Manages short-term memory through conversation history storage and retrieval.
Provides context from previous turns in multi-turn conversations.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import sys
from pathlib import Path

# Add parent directory to path for utils import
if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.models.ai_models import Conversation
from database.repositories.ai_repository import ConversationRepository
from utils.logger import get_logger

logger = get_logger(__name__)


class ConversationMemory:
    """
    Short-term memory manager for conversations.
    
    Features:
    - Store conversation turns (user/assistant messages)
    - Retrieve recent context for current session
    - Summarize long conversations
    - Clear old conversations
    
    Example:
        memory = ConversationMemory(db_session)
        
        # Store user message
        memory.add_message(
            session_id="session-123",
            role="user",
            content="What is agentic AI?"
        )
        
        # Store assistant response
        memory.add_message(
            session_id="session-123",
            role="assistant",
            content="Agentic AI refers to..."
        )
        
        # Get conversation context
        context = memory.get_context("session-123", last_n=5)
    """
    
    def __init__(self, db: Session):
        """
        Initialize conversation memory.
        
        Args:
            db: Database session
        """
        self.db = db
        self.repo = ConversationRepository(db)
    
    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        workspace_id: str,
        user_id: str,
        intent: Optional[str] = None,
        agent_used: Optional[str] = None,
        confidence_score: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Conversation:
        """
        Add a message to conversation history.
        
        Args:
            session_id: Unique session identifier
            role: Message role (user, assistant, system)
            content: Message content
            workspace_id: Workspace ID
            user_id: User ID
            intent: Optional intent classification
            agent_used: Optional agent that generated response
            confidence_score: Optional confidence score
            metadata: Optional additional metadata
            
        Returns:
            Created Conversation object
        """
        return self.repo.create(
            workspace_id=workspace_id,
            user_id=user_id,
            session_id=session_id,
            role=role,
            content=content,
            intent=intent,
            agent_used=agent_used,
            confidence_score=confidence_score,
            conversation_metadata=metadata or {},
            timestamp=datetime.utcnow()
        )
    
    def get_context(
        self,
        session_id: str,
        last_n: int = 10,
        include_system: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get recent conversation context for a session.
        
        Args:
            session_id: Session identifier
            last_n: Number of recent messages to retrieve
            include_system: Whether to include system messages
            
        Returns:
            List of conversation messages as dicts
        """
        messages = self.repo.get_by_session(session_id, limit=last_n)
        
        context = []
        for msg in messages:
            if not include_system and msg.role == 'system':
                continue
            
            context.append({
                'role': msg.role,
                'content': msg.content,
                'timestamp': msg.timestamp,
                'intent': msg.intent,
                'agent_used': msg.agent_used,
                'confidence_score': float(msg.confidence_score) if msg.confidence_score else None,
                'metadata': msg.conversation_metadata
            })
        
        return context
    
    def format_for_reformulation(
        self,
        session_id: str,
        last_n: int = 5
    ) -> str:
        """
        Format conversation history for query reformulation.
        
        Returns a concise format with USER/ASSISTANT messages only.
        
        Args:
            session_id: Session identifier
            last_n: Number of recent messages to include
            
        Returns:
            Formatted chat history string
        """
        try:
            messages = self.get_context(session_id, last_n=last_n, include_system=False)
            
            if not messages:
                return ""
            
            formatted = []
            for msg in messages:
                role = msg.get('role', 'UNKNOWN').upper()
                content = msg.get('content', '')
                if role and content:
                    formatted.append(f"{role}: {content}")
            
            return "\n".join(formatted)
        except Exception as e:
            from utils.logger import get_logger
            logger = get_logger(__name__)
            logger.warning(f"Error formatting conversation for reformulation: {e}")
            return ""
    
    def format_for_prompt(
        self,
        session_id: str,
        last_n: int = 5
    ) -> str:
        """
        Format conversation history for LLM prompt.
        
        Args:
            session_id: Session identifier
            last_n: Number of recent messages
            
        Returns:
            Formatted conversation history string
        """
        context = self.get_context(session_id, last_n=last_n)
        
        if not context:
            return ""
        
        formatted = "Previous conversation:\n"
        for msg in context:
            role = msg['role'].upper()
            content = msg['content']
            formatted += f"{role}: {content}\n"
        
        return formatted
    
    def get_last_user_message(self, session_id: str) -> Optional[str]:
        """
        Get the most recent user message.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Last user message content or None
        """
        context = self.get_context(session_id, last_n=10)
        
        for msg in reversed(context):
            if msg['role'] == 'user':
                return msg['content']
        
        return None
    
    def count_turns(self, session_id: str) -> int:
        """
        Count number of turns (user + assistant pairs) in session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Number of conversation turns
        """
        messages = self.repo.get_by_session(session_id, limit=1000)
        return len([m for m in messages if m.role in ['user', 'assistant']]) // 2
    
    def clear_session(self, session_id: str) -> int:
        """
        Delete all messages in a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Number of messages deleted
        """
        return self.repo.delete_session(session_id)
    
    def summarize_session(
        self,
        session_id: str,
        llm_provider: Any = None
    ) -> Optional[str]:
        """
        Generate summary of conversation session.
        
        Args:
            session_id: Session identifier
            llm_provider: Optional LLM provider for summarization
            
        Returns:
            Summary text or None
        """
        context = self.get_context(session_id, last_n=50)
        
        if not context:
            return None
        
        if not llm_provider:
            # Simple summary without LLM
            num_messages = len(context)
            num_turns = self.count_turns(session_id)
            first_msg = context[0]['content'][:50]
            return f"{num_turns} turns, {num_messages} messages. Started with: {first_msg}..."
        
        # Use LLM for better summary
        conversation_text = self.format_for_prompt(session_id, last_n=50)
        
        summary_prompt = f"""Summarize this conversation in 2-3 sentences:

{conversation_text}

Summary:"""
        
        # Call LLM (implementation depends on llm_provider interface)
        # summary = llm_provider.generate(summary_prompt)
        # return summary
        
        # For now, return simple summary
        return f"Conversation with {len(context)} messages"


# Convenience functions

def create_conversation_memory(db: Session) -> ConversationMemory:
    """
    Factory function to create ConversationMemory instance.
    
    Args:
        db: Database session
        
    Returns:
        ConversationMemory instance
    """
    return ConversationMemory(db)


def store_qa_pair(
    memory: ConversationMemory,
    session_id: str,
    workspace_id: str,
    user_id: str,
    question: str,
    answer: str,
    agent_name: Optional[str] = None,
    confidence: Optional[float] = None
):
    """
    Store a question-answer pair in conversation memory.
    
    Args:
        memory: ConversationMemory instance
        session_id: Session ID
        workspace_id: Workspace ID
        user_id: User ID
        question: User question
        answer: Assistant answer
        agent_name: Optional agent name
        confidence: Optional confidence score
    """
    # Store question
    memory.add_message(
        session_id=session_id,
        role="user",
        content=question,
        workspace_id=workspace_id,
        user_id=user_id
    )
    
    # Store answer
    memory.add_message(
        session_id=session_id,
        role="assistant",
        content=answer,
        workspace_id=workspace_id,
        user_id=user_id,
        agent_used=agent_name,
        confidence_score=confidence
    )
