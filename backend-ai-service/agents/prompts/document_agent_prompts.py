"""
Document Agent Prompts

System prompts and templates for the Document Agent.
"""

from typing import List, Dict, Any


SYSTEM_PROMPT = """You are a helpful DevHolic AI assistant that answers questions based on provided document context.

Your capabilities:
- Answer questions accurately using only the provided context
- Cite sources by referencing document chunks
- Admit when you don't have enough information
- Provide clear, concise, and well-structured answers

Your limitations:
- You can only use information from the provided context
- You cannot make up information or use external knowledge
- If the context doesn't contain the answer, you must say so

Response format:
1. Provide a direct answer to the question
2. Support your answer with information from the context
3. Include citations [1], [2], etc. referring to source chunks
4. If uncertain, indicate your confidence level
"""


QUERY_REFORMULATION_PROMPT = """Given a conversation history and a follow-up question, reformulate the follow-up question to be a standalone question that contains all necessary context.

If the question is already standalone and doesn't reference previous context (e.g., doesn't use pronouns like 'it', 'that', 'they'), return it exactly as-is. Do NOT answer the question.

Chat History:
{chat_history}

Follow Up Question: {question}

Standalone Question:"""


def create_generation_prompt(
    query: str,
    chunks: List[Dict[str, Any]],
    conversation_context: str = ""
) -> str:
    """
    Create prompt for answer generation with context.
    
    Args:
        query: User's question
        chunks: Retrieved and reranked document chunks
        conversation_context: Optional conversation history and facts
        
    Returns:
        Formatted prompt for LLM
    """
        # Build context from chunks
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        chunk_text = chunk.get('text', chunk.get('chunk_text', ''))
        metadata = chunk.get('metadata', chunk.get('chunk_metadata', {}))
        chunk_index = chunk.get('chunk_index', i-1)
        
        # Extract document info
        doc_name = metadata.get('source_file', metadata.get('document_name', 'Unknown Document'))
        # Use chunk_index as location since page info not available
        location = f"Section {chunk_index + 1}"
        
        context_parts.append(
            f"[{i}] Source: {doc_name} ({location})\n"
            f"{chunk_text}\n"
        )
    
    context = "\n---\n".join(context_parts)
    
    # Add conversation context if available
    memory_section = ""
    if conversation_context:
        memory_section = f"""
CONVERSATION MEMORY:
{conversation_context}

---

"""
    
    prompt = f"""{SYSTEM_PROMPT}

{memory_section}CONTEXT:
{context}

QUESTION: {query}

Please provide a comprehensive answer to the question using the information from the context above.
{f"Consider the conversation history and your previous knowledge when answering." if conversation_context else ""}
Include citations [1], [2], etc. to reference the source chunks you use.

If the context does not contain sufficient information to answer the question, clearly state this.

ANSWER:"""
    
    return prompt


def create_fallback_response(query: str) -> str:
    """
    Create fallback response when no relevant documents found.
    
    Args:
        query: User's question
        
    Returns:
        Fallback response message
    """
    return (
        f"I apologize, but I couldn't find relevant information in the available documents "
        f"to answer your question: \"{query}\"\n\n"
        f"This could be because:\n"
        f"- The information is not present in the current document collection\n"
        f"- The question requires information from sources not yet uploaded\n"
        f"- The search didn't find matching content\n\n"
        f"Please try:\n"
        f"- Rephrasing your question\n"
        f"- Being more specific about what you're looking for\n"
        f"- Uploading relevant documents if they're not yet in the system"
    )


def create_citation_text(citations: List[Dict[str, Any]]) -> str:
    """
    Format citations for display.
    
    Args:
        citations: List of citation dictionaries
        
    Returns:
        Formatted citation text
    """
    if not citations:
        return ""
    
    citation_lines = ["\n\nSources:"]
    for i, citation in enumerate(citations, 1):
        doc_name = citation.get('document_name', 'Unknown Document')
        page = citation.get('page_number', 'N/A')
        chunk_id = citation.get('chunk_id', '')
        
        citation_lines.append(
            f"[{i}] {doc_name} (Page {page})"
        )
    
    return "\n".join(citation_lines)


def extract_citations_from_answer(answer: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract citation references from generated answer.
    
    Args:
        answer: Generated answer text
        chunks: Document chunks that were used
        
    Returns:
        List of citation dictionaries
    """
    import re
    
    # Find all citation references like [1], [2], etc.
    citation_refs = re.findall(r'\[(\d+)\]', answer)
    
    citations = []
    seen_indices = set()
    
    for ref in citation_refs:
        idx = int(ref) - 1  # Convert to 0-based index
        
        if idx < len(chunks) and idx not in seen_indices:
            chunk = chunks[idx]
            # Try both 'chunk_metadata' (from nodes) and 'metadata' (legacy)
            metadata = chunk.get('chunk_metadata', chunk.get('metadata', {}))
            chunk_index = chunk.get('chunk_index', idx)
            
            # Extract document info from metadata
            doc_name = metadata.get('document_name') or metadata.get('source_file', 'Unknown Document')
            
            # Try to get page or estimate from chunk index
            page_num = metadata.get('page_number') or metadata.get('page')
            if not page_num or page_num == 'N/A':
                # Estimate page from chunk index (rough approximation)
                # Assume ~4 chunks per page on average
                page_num = (chunk_index // 4) + 1
            
            citation = {
                'chunk_id': chunk.get('id', chunk.get('chunk_id', '')),
                'document_id': chunk.get('document_id', ''),
                'document_name': doc_name,
                'title': doc_name,  # Add title field for backward compatibility
                'page_number': page_num,
                'reference_number': int(ref)
            }
            citations.append(citation)
            seen_indices.add(idx)
    
    return citations


# Prompts for specific scenarios
RELEVANCE_CHECK_PROMPT = """Given the following question and document chunk, determine if the chunk is relevant to answering the question.

Question: {query}

Document Chunk:
{chunk_text}

Is this chunk relevant? Answer with just "Yes" or "No" and a brief explanation.
"""


QUERY_EXPANSION_PROMPT = """The initial search didn't find relevant results. Please reformulate this query to improve search results:

Original Query: {query}

Provide 2-3 alternative phrasings that might work better for document search.
"""
