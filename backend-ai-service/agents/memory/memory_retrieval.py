"""
Memory Retrieval - Retrieve relevant conversation history and facts.

This module provides functionality to:
1. Retrieve recent conversation context
2. Search conversation history semantically
3. Retrieve relevant facts from long-term memory
4. Combine and rank memory sources
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from database.models import Conversation, LongTermMemory
from database.repositories.ai_repository import ConversationRepository, LongTermMemoryRepository
from agents.memory.conversation_memory import ConversationMemory
from agents.memory.fact_extractor import FactExtractor


class MemoryRetrieval:
    """
    Retrieve and combine relevant memories for context augmentation.
    
    Provides unified access to:
    - Recent conversation history
    - Semantic conversation search
    - Long-term facts
    """
    
    def __init__(self, db: Session):
        """
        Initialize MemoryRetrieval.
        
        Args:
            db: Database session
        """
        self.db = db
        self.conversation_memory = ConversationMemory(db)
        self.fact_extractor = FactExtractor(db)
        self.conversation_repo = ConversationRepository(db)
        self.ltm_repo = LongTermMemoryRepository(db)
    
    def get_full_context(
        self,
        workspace_id: str,
        user_id: str,
        session_id: str,
        query: Optional[str] = None,
        max_recent_messages: int = 10,
        max_facts: int = 5,
        max_history: int = 5
    ) -> Dict[str, Any]:
        """
        Get comprehensive memory context for a query.
        
        Args:
            workspace_id: Workspace ID
            user_id: User ID
            session_id: Current session ID
            query: Optional query for semantic search
            max_recent_messages: Max recent messages from current session
            max_facts: Max relevant facts to retrieve
            max_history: Max relevant past conversations
            
        Returns:
            Dictionary with all memory context
        """
        context = {
            "recent_conversation": [],
            "relevant_facts": [],
            "past_conversations": [],
            "session_summary": None
        }
        
        # 1. Recent conversation from current session
        recent = self.conversation_memory.get_context(
            session_id=session_id,
            last_n=max_recent_messages
        )
        context["recent_conversation"] = [
            {
                "role": msg["role"],
                "content": msg["content"],
                "timestamp": msg["timestamp"].isoformat() if msg.get("timestamp") else None
            }
            for msg in recent
        ]
        
        # 2. Session summary if available
        if recent:
            summary = self.conversation_memory.summarize_session(session_id)
            context["session_summary"] = summary
        
        # 3. Relevant facts from long-term memory
        if query:
            facts = self.search_relevant_facts(
                workspace_id=workspace_id,
                user_id=user_id,
                query=query,
                limit=max_facts
            )
            context["relevant_facts"] = [
                {
                    "entity": fact.key,
                    "type": fact.knowledge_type,
                    "content": fact.value,
                    "confidence": float(fact.confidence_score),
                    "source": fact.source
                }
                for fact in facts
            ]
        
        # 4. Relevant past conversations
        if query:
            past = self.search_past_conversations(
                workspace_id=workspace_id,
                user_id=user_id,
                session_id=session_id,
                query=query,
                limit=max_history
            )
            context["past_conversations"] = [
                {
                    "session_id": conv.session_id,
                    "role": conv.role,
                    "content": conv.content[:200],  # Truncate
                    "timestamp": conv.timestamp.isoformat() if conv.timestamp else None
                }
                for conv in past
            ]
        
        return context
    
    def format_context_for_prompt(
        self,
        context: Dict[str, Any],
        include_facts: bool = True,
        include_history: bool = True
    ) -> str:
        """
        Format memory context for LLM prompt.
        
        Args:
            context: Context from get_full_context()
            include_facts: Include long-term facts
            include_history: Include past conversations
            
        Returns:
            Formatted context string
        """
        parts = []
        
        # Recent conversation
        if context.get("recent_conversation"):
            parts.append("## Current Conversation")
            for msg in context["recent_conversation"]:
                role = msg["role"].upper()
                content = msg["content"]
                parts.append(f"{role}: {content}")
        
        # Session summary
        if context.get("session_summary"):
            parts.append("\n## Session Summary")
            parts.append(context["session_summary"])
        
        # Relevant facts
        if include_facts and context.get("relevant_facts"):
            parts.append("\n## Relevant Knowledge")
            for fact in context["relevant_facts"]:
                entity = fact["entity"]
                content = fact["content"]
                confidence = fact["confidence"]
                parts.append(f"- {entity}: {content} (confidence: {confidence:.2f})")
        
        # Past conversations
        if include_history and context.get("past_conversations"):
            parts.append("\n## Related Past Discussions")
            for conv in context["past_conversations"]:
                role = conv["role"].upper()
                content = conv["content"]
                parts.append(f"- {role}: {content}...")
        
        return "\n".join(parts)
    
    def search_relevant_facts(
        self,
        workspace_id: str,
        user_id: str,
        query: str,
        limit: int = 5
    ) -> List[LongTermMemory]:
        """
        Search for facts relevant to query.
        
        Args:
            workspace_id: Workspace ID
            user_id: User ID
            query: Search query
            limit: Maximum facts to return
            
        Returns:
            List of relevant facts, ranked by confidence
        """
        # Simple text search (can be enhanced with embeddings later)
        query_lower = query.lower()
        
        # Search in both key and value
        facts = self.db.query(LongTermMemory).filter(
            LongTermMemory.workspace_id == workspace_id,
            or_(
                LongTermMemory.key.ilike(f"%{query_lower}%"),
                LongTermMemory.value.ilike(f"%{query_lower}%")
            )
        ).order_by(
            LongTermMemory.confidence_score.desc(),
            LongTermMemory.access_count.desc(),
            LongTermMemory.created_at.desc()
        ).limit(limit).all()
        
        # Update access count
        for fact in facts:
            fact.access_count += 1
            fact.last_accessed_at = datetime.utcnow()
        self.db.commit()
        
        return facts
    
    def search_past_conversations(
        self,
        workspace_id: str,
        user_id: str,
        session_id: str,
        query: str,
        limit: int = 5,
        days_back: int = 30
    ) -> List[Conversation]:
        """
        Search past conversations (excluding current session).
        
        Args:
            workspace_id: Workspace ID
            user_id: User ID
            session_id: Current session ID (to exclude)
            query: Search query
            limit: Maximum conversations to return
            days_back: How many days to search back
            
        Returns:
            List of relevant conversations
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        query_lower = query.lower()
        
        conversations = self.db.query(Conversation).filter(
            Conversation.workspace_id == workspace_id,
            Conversation.user_id == user_id,
            Conversation.session_id != session_id,  # Exclude current session
            Conversation.timestamp >= cutoff_date,
            Conversation.content.ilike(f"%{query_lower}%")
        ).order_by(
            Conversation.timestamp.desc()
        ).limit(limit).all()
        
        return conversations
    
    def get_recent_sessions(
        self,
        workspace_id: str,
        user_id: str,
        limit: int = 5,
        days_back: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Get recent conversation sessions.
        
        Args:
            workspace_id: Workspace ID
            user_id: User ID
            limit: Maximum sessions to return
            days_back: How many days to search back
            
        Returns:
            List of session summaries
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Get distinct sessions
        sessions = self.db.query(
            Conversation.session_id,
            self.db.func.min(Conversation.timestamp).label("started_at"),
            self.db.func.max(Conversation.timestamp).label("last_activity"),
            self.db.func.count(Conversation.id).label("message_count")
        ).filter(
            Conversation.workspace_id == workspace_id,
            Conversation.user_id == user_id,
            Conversation.timestamp >= cutoff_date
        ).group_by(
            Conversation.session_id
        ).order_by(
            self.db.text("last_activity DESC")
        ).limit(limit).all()
        
        session_summaries = []
        for session in sessions:
            # Get first user message as preview
            first_msg = self.db.query(Conversation).filter(
                Conversation.session_id == session.session_id,
                Conversation.role == "user"
            ).order_by(
                Conversation.timestamp.asc()
            ).first()
            
            session_summaries.append({
                "session_id": session.session_id,
                "started_at": session.started_at.isoformat() if session.started_at else None,
                "last_activity": session.last_activity.isoformat() if session.last_activity else None,
                "message_count": session.message_count,
                "preview": first_msg.content[:100] if first_msg else "No messages"
            })
        
        return session_summaries
    
    def get_facts_for_entity(
        self,
        workspace_id: str,
        user_id: str,
        entity: str,
        limit: int = 10
    ) -> List[LongTermMemory]:
        """
        Get all facts about a specific entity.
        
        Args:
            workspace_id: Workspace ID
            user_id: User ID
            entity: Entity name
            limit: Maximum facts
            
        Returns:
            List of facts about entity
        """
        return self.fact_extractor.get_facts_by_entity(
            workspace_id=workspace_id,
            user_id=user_id,
            entity=entity,
            limit=limit
        )
    
    def get_conversation_topics(
        self,
        workspace_id: str,
        user_id: str,
        days_back: int = 30
    ) -> List[Tuple[str, int]]:
        """
        Get most discussed topics from long-term memory.
        
        Args:
            workspace_id: Workspace ID
            user_id: User ID
            days_back: How many days to analyze
            
        Returns:
            List of (entity, count) tuples
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Count facts by entity
        topics = self.db.query(
            LongTermMemory.key,
            self.db.func.count(LongTermMemory.id).label("count")
        ).filter(
            LongTermMemory.workspace_id == workspace_id,
            LongTermMemory.created_at >= cutoff_date
        ).group_by(
            LongTermMemory.key
        ).order_by(
            self.db.text("count DESC")
        ).limit(20).all()
        
        return [(topic.key, topic.count) for topic in topics]
    
    def clear_old_conversations(
        self,
        workspace_id: str,
        user_id: str,
        days_to_keep: int = 90
    ) -> int:
        """
        Delete old conversation history.
        
        Args:
            workspace_id: Workspace ID
            user_id: User ID
            days_to_keep: Keep conversations from last N days
            
        Returns:
            Number of deleted conversations
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        old_conversations = self.db.query(Conversation).filter(
            Conversation.workspace_id == workspace_id,
            Conversation.user_id == user_id,
            Conversation.timestamp < cutoff_date
        ).all()
        
        count = len(old_conversations)
        for conv in old_conversations:
            self.db.delete(conv)
        
        self.db.commit()
        return count


def create_memory_retrieval(db: Session) -> MemoryRetrieval:
    """
    Factory function to create MemoryRetrieval.
    
    Args:
        db: Database session
        
    Returns:
        MemoryRetrieval instance
    """
    return MemoryRetrieval(db)


def get_context_for_query(
    db: Session,
    workspace_id: str,
    user_id: str,
    session_id: str,
    query: str,
    max_recent: int = 10,
    max_facts: int = 5,
    max_history: int = 5
) -> str:
    """
    Convenience function to get formatted context for a query.
    
    Args:
        db: Database session
        workspace_id: Workspace ID
        user_id: User ID
        session_id: Session ID
        query: User query
        max_recent: Max recent messages
        max_facts: Max facts
        max_history: Max historical conversations
        
    Returns:
        Formatted context string for LLM
    """
    retrieval = create_memory_retrieval(db)
    context = retrieval.get_full_context(
        workspace_id=workspace_id,
        user_id=user_id,
        session_id=session_id,
        query=query,
        max_recent_messages=max_recent,
        max_facts=max_facts,
        max_history=max_history
    )
    return retrieval.format_context_for_prompt(context)
