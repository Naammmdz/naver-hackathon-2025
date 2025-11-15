"""
Fact Extractor - Extract and store key facts from conversations.

This module provides functionality to:
1. Identify key facts from Q&A pairs
2. Extract entities, topics, and insights
3. Store facts in long-term memory
4. Update existing facts with new information
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from langchain_core.language_models.chat_models import BaseChatModel
import sys
from pathlib import Path

# Add parent directory to path for utils import  
if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.models import LongTermMemory
from database.repositories.ai_repository import LongTermMemoryRepository
from llm.llm_factory import LLMFactory
from utils.logger import get_logger

logger = get_logger(__name__)


class FactExtractor:
    """
    Extract and manage facts from conversations.
    
    Facts are key pieces of information that should be remembered
    long-term across conversation sessions.
    """
    
    def __init__(self, db: Session, llm: Optional[BaseChatModel] = None):
        """
        Initialize FactExtractor.
        
        Args:
            db: Database session
            llm: Language model for fact extraction (optional, will use factory if not provided)
        """
        self.db = db
        self.repo = LongTermMemoryRepository(db)
        
        # Use provided LLM or create from factory
        if llm:
            self.llm = llm
        else:
            llm_factory = LLMFactory()
            # Use default provider from config instead of hardcoded 'openai'
            default_provider = llm_factory.get_default_provider()
            self.llm = llm_factory.create_llm(
                provider=default_provider,
                temperature=0.0
            )
    
    def extract_facts(
        self,
        question: str,
        answer: str,
        workspace_id: str,
        user_id: str,
        session_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[LongTermMemory]:
        """
        Extract facts from a Q&A pair.
        
        Args:
            question: User question
            answer: Assistant answer
            workspace_id: Workspace ID
            user_id: User ID (stored in metadata)
            session_id: Session ID (stored in metadata)
            metadata: Optional metadata
            
        Returns:
            List of extracted facts
        """
        # Construct prompt for fact extraction
        prompt = self._build_extraction_prompt(question, answer)
        
        # Extract facts using LLM
        response = self.llm.invoke(prompt)
        facts_text = str(response.content) if response.content else ""
        
        # Parse facts from response
        facts = self._parse_facts(facts_text)
        
        # Store facts in database
        stored_facts = []
        for fact in facts:
            # Build source context
            source_ctx = {
                "question": question,
                "answer": answer[:200],  # Truncate for storage
                "user_id": user_id,
                "session_id": session_id
            }
            if metadata:
                source_ctx.update(metadata)
            
            fact_obj = self.store_fact(
                workspace_id=workspace_id,
                knowledge_type=fact.get("type", "general"),
                key=fact.get("entity", "unknown"),
                value=fact.get("content", ""),
                source="conversation",
                confidence_score=fact.get("confidence", 0.8),
                memory_metadata=source_ctx
            )
            stored_facts.append(fact_obj)
        
        return stored_facts
    
    def _build_extraction_prompt(self, question: str, answer: str) -> str:
        """Build prompt for fact extraction."""
        return f"""Extract key facts from this Q&A pair that should be remembered long-term.

QUESTION:
{question}

ANSWER:
{answer}

Extract facts in this format (one per line):
TYPE: <definition|concept|example|procedure|entity>
ENTITY: <main subject/topic>
CONTENT: <the factual information>
CONFIDENCE: <0.0-1.0>

Rules:
- Only extract factual, verifiable information
- Skip conversational filler or opinions
- Focus on definitions, concepts, examples, procedures
- Use confidence score: 1.0 for direct facts, 0.7-0.9 for inferred facts
- Extract 1-5 facts maximum

FACTS:"""
    
    def _parse_facts(self, facts_text: str) -> List[Dict[str, Any]]:
        """
        Parse facts from LLM response.
        
        Args:
            facts_text: Raw text from LLM
            
        Returns:
            List of parsed facts
        """
        facts = []
        current_fact = {}
        
        lines = facts_text.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('---'):
                # End of current fact
                if current_fact:
                    facts.append(current_fact)
                    current_fact = {}
                continue
            
            # Parse field
            if ':' in line:
                field, value = line.split(':', 1)
                field = field.strip().lower()
                value = value.strip()
                
                if field == 'type':
                    current_fact['type'] = value
                elif field == 'entity':
                    current_fact['entity'] = value
                elif field == 'content':
                    current_fact['content'] = value
                elif field == 'confidence':
                    try:
                        current_fact['confidence'] = float(value)
                    except ValueError:
                        current_fact['confidence'] = 0.8
        
        # Add last fact if exists
        if current_fact:
            facts.append(current_fact)
        
        return facts
    
    def store_fact(
        self,
        workspace_id: str,
        knowledge_type: str,
        key: str,
        value: str,
        source: str = "conversation",
        confidence_score: float = 0.8,
        memory_metadata: Optional[Dict[str, Any]] = None
    ) -> LongTermMemory:
        """
        Store a fact in long-term memory.
        Uses upsert logic: updates if exists, creates if new.
        
        Args:
            workspace_id: Workspace ID
            knowledge_type: Type of knowledge (definition, concept, example, etc.)
            key: Main entity/topic
            value: The actual fact content
            source: Source of the knowledge
            confidence_score: Confidence in the fact (0-1)
            memory_metadata: Additional metadata
            
        Returns:
            Created or updated LongTermMemory object
        """
        # Check if fact already exists
        existing = self.db.query(LongTermMemory).filter(
            LongTermMemory.workspace_id == workspace_id,
            LongTermMemory.knowledge_type == knowledge_type,
            LongTermMemory.key == key
        ).first()
        
        if existing:
            # Update existing fact with new information
            # Merge metadata
            merged_metadata = existing.memory_metadata or {}
            if memory_metadata:
                merged_metadata.update(memory_metadata)
            
            # Update with higher confidence or newer value
            if confidence_score >= existing.confidence_score:
                return self.repo.update(
                    existing.id,
                    value=value,
                    source=source,
                    confidence_score=confidence_score,
                    memory_metadata=merged_metadata
                )
            else:
                # Keep existing but update metadata
                return self.repo.update(
                    existing.id,
                    memory_metadata=merged_metadata
                )
        else:
            # Create new fact
            return self.repo.create(
                workspace_id=workspace_id,
                knowledge_type=knowledge_type,
                key=key,
                value=value,
                source=source,
                confidence_score=confidence_score,
                memory_metadata=memory_metadata or {},
                access_count=0
            )
    
    def get_facts_by_entity(
        self,
        workspace_id: str,
        user_id: str,
        entity: str,
        limit: int = 10
    ) -> List[LongTermMemory]:
        """
        Retrieve facts about a specific entity.
        
        Args:
            workspace_id: Workspace ID
            user_id: User ID (used in metadata filter)
            entity: Entity to search for
            limit: Maximum facts to return
            
        Returns:
            List of relevant facts
        """
        facts = self.db.query(LongTermMemory).filter(
            LongTermMemory.workspace_id == workspace_id,
            LongTermMemory.key.ilike(f"%{entity}%")
        ).order_by(
            LongTermMemory.confidence_score.desc(),
            LongTermMemory.created_at.desc()
        ).limit(limit).all()
        
        return facts
    
    def get_facts_by_type(
        self,
        workspace_id: str,
        user_id: str,
        fact_type: str,
        limit: int = 10
    ) -> List[LongTermMemory]:
        """
        Retrieve facts of a specific type.
        
        Args:
            workspace_id: Workspace ID
            user_id: User ID (used in metadata filter)
            fact_type: Type of facts to retrieve
            limit: Maximum facts to return
            
        Returns:
            List of facts
        """
        facts = self.db.query(LongTermMemory).filter(
            LongTermMemory.workspace_id == workspace_id,
            LongTermMemory.knowledge_type == fact_type
        ).order_by(
            LongTermMemory.created_at.desc()
        ).limit(limit).all()
        
        return facts
    
    def search_facts(
        self,
        workspace_id: str,
        user_id: str,
        query: str,
        limit: int = 10
    ) -> List[LongTermMemory]:
        """
        Search facts by content.
        
        Args:
            workspace_id: Workspace ID
            user_id: User ID (used in metadata filter)
            query: Search query
            limit: Maximum facts to return
            
        Returns:
            List of matching facts
        """
        facts = self.db.query(LongTermMemory).filter(
            LongTermMemory.workspace_id == workspace_id,
            LongTermMemory.value.ilike(f"%{query}%")
        ).order_by(
            LongTermMemory.confidence_score.desc(),
            LongTermMemory.created_at.desc()
        ).limit(limit).all()
        
        return facts
    
    def update_fact_confidence(
        self,
        fact_id: str,
        new_confidence: float
    ) -> Optional[LongTermMemory]:
        """
        Update confidence score of a fact.
        
        Args:
            fact_id: Fact ID
            new_confidence: New confidence score
            
        Returns:
            Updated fact or None
        """
        fact = self.repo.get_by_id(fact_id)
        if fact:
            return self.repo.update(
                fact_id,
                confidence_score=new_confidence
            )
        return None
    
    def delete_low_confidence_facts(
        self,
        workspace_id: str,
        user_id: str,
        threshold: float = 0.3
    ) -> int:
        """
        Delete facts below confidence threshold.
        
        Args:
            workspace_id: Workspace ID
            user_id: User ID (optional, for filtering by metadata)
            threshold: Minimum confidence to keep
            
        Returns:
            Number of deleted facts
        """
        query = self.db.query(LongTermMemory).filter(
            LongTermMemory.workspace_id == workspace_id,
            LongTermMemory.confidence_score < threshold
        )
        
        # Filter by user_id in metadata if provided
        if user_id:
            query = query.filter(
                LongTermMemory.memory_metadata['user_id'].astext == user_id
            )
        
        facts = query.all()
        
        count = len(facts)
        for fact in facts:
            self.repo.delete(fact.id)
        
        return count


def create_fact_extractor(db: Session, llm: Optional[BaseChatModel] = None) -> FactExtractor:
    """
    Factory function to create FactExtractor.
    
    Args:
        db: Database session
        llm: Optional language model
        
    Returns:
        FactExtractor instance
    """
    return FactExtractor(db, llm)


def extract_and_store_facts(
    db: Session,
    question: str,
    answer: str,
    workspace_id: str,
    user_id: str,
    session_id: str,
    metadata: Optional[Dict[str, Any]] = None,
    llm: Optional[BaseChatModel] = None
) -> List[LongTermMemory]:
    """
    Convenience function to extract and store facts from Q&A.
    
    Args:
        db: Database session
        question: User question
        answer: Assistant answer
        workspace_id: Workspace ID
        user_id: User ID
        session_id: Session ID
        metadata: Optional metadata
        llm: Optional language model
        
    Returns:
        List of stored facts
    """
    extractor = create_fact_extractor(db, llm)
    return extractor.extract_facts(
        question=question,
        answer=answer,
        workspace_id=workspace_id,
        user_id=user_id,
        session_id=session_id,
        metadata=metadata
    )
