"""
Orchestrator Prompts

System prompts and formatting for intent detection and task planning.
"""

from typing import List, Dict, Any
from agents.schemas import INTENT_EXAMPLES, PLANNING_EXAMPLES, IntentType, AgentType


ORCHESTRATOR_SYSTEM_PROMPT = """You are the Orchestrator Agent, the central intelligence of the workspace assistant.
Your role is to understand user requests, coordinate specialized agents (Document, Task, Board), and synthesize answers.

**Available Agents:**
- **Document Agent:** Retrieves info from files/documents. Use for content questions.
- **Task Agent:** Queries task database (SQL). Use for status, assignments, risks.
- **Board Agent:** Generates Mermaid.js charts. Use for visualizations.

**Intent Types:**
- `document_query`: Content within documents.
- `document_completion`: Autocomplete or finish text in the active document.
- `task_query`: Task status, assignees, metrics.
- `board_query`: Visual charts or diagrams.
- `hybrid_query`: Needs both documents and task data.
- `workspace_overview`: High-level summaries.
- `task_risk`: Risk/delay analysis.
- `unknown`: Greetings, small talk, out-of-scope.

**Instructions:**
1. Analyze the user's meaning.
2. Route to the most appropriate agent(s).
3. Break complex requests into a logical execution plan.
4. Extract specific entities (dates, names) for queries.
5. Output strictly valid JSON matching the provided schema.
"""


def create_intent_detection_prompt(
    query: str,
    workspace_id: str,
    conversation_history: List[Dict[str, str]] = None,
    document_context: Dict[str, Any] = None
) -> str:
    """
    Create prompt for intent detection
    
    Args:
        query: User's natural language query
        workspace_id: Workspace context
        conversation_history: Recent conversation for context
        document_context: Context of the currently open document
        
    Returns:
        Complete prompt for LLM
    """
    
    # Build examples
    examples_text = "\n\n".join([
        f"**Example {i+1}:**\n"
        f"Query: \"{ex['query']}\"\n"
        f"Intent: {ex['intent_type'].value}\n"
        f"Agent: {ex['agent'].value}\n"
        f"Reasoning: {ex['reasoning']}"
        for i, ex in enumerate(INTENT_EXAMPLES[:5])
    ])
    
    # Build conversation context
    context_text = ""
    if conversation_history and len(conversation_history) > 0:
        context_text = "\n\n**Recent Conversation:**\n"
        for msg in conversation_history[-3:]:
            role = msg.get('role', 'user')
            content = msg.get('content', '')[:100]
            context_text += f"- {role}: {content}...\n"
            
    # Build document context
    doc_context_text = ""
    if document_context:
        doc_context_text = f"\n\n**Active Document Context:**\n- ID: {document_context.get('id')}\n- Title: {document_context.get('title')}\n- Content Preview: {document_context.get('content', '')[:200]}..."
    
    prompt = f"""# Intent Detection Task

## User Query
"{query}"

## Workspace Context
- Workspace ID: {workspace_id}
{context_text}
{doc_context_text}

{doc_context_text}

## IMPORTANT: Document Completion
If the user asks to "continue writing", "complete this", "write more", "finish this paragraph", or similar, AND there is an Active Document Context:
- Set intent_type to "document_completion"
- Set agent to "document"
- Set requires_agents to true

## IMPORTANT: Check for Small Talk First
If the query is a simple greeting, casual conversation, or doesn't require any workspace data:
- Set intent_type to "unknown"
- Set agent to "both"  
- Set requires_agents to false
- The system will provide a friendly direct response

Examples of small talk: "hello", "hi", "how are you", "thanks", "bye", "what can you do"

## Examples
{examples_text}

## Your Task
Analyze the user's query and detect:
1. **Intent Type**: What does the user want to accomplish?
2. **Agent**: Which agent(s) should handle this?
3. **Entities**: Extract any entities (dates, names, priorities, etc.)
4. **Confidence**: How confident are you? (0.0 - 1.0)
5. **Reasoning**: Why did you choose this intent?

## Output Format (JSON)
```json
{{
  "type": "intent_type_here",
  "confidence": 0.95,
  "agent": "document|task|board|both",
  "reasoning": "Explanation here",
  "entities": {{}},
  "requires_decomposition": false,
  "requires_agents": true
}}
```

Analyze the query now:
"""
    
    return prompt


def create_planning_prompt(
    query: str,
    intent_type: IntentType,
    agent: AgentType,
    workspace_id: str
) -> str:
    """
    Create prompt for task decomposition and planning
    
    Args:
        query: User's query
        intent_type: Detected intent
        agent: Which agent(s) to use
        workspace_id: Workspace context
        
    Returns:
        Complete prompt for planning
    """
    
    # Determine if planning is needed
    if intent_type == IntentType.UNKNOWN:
        needs_planning = False
        planning_note = "**Note:** The intent is unknown. Create a simple single-step plan using the Document Agent to answer the user or ask for clarification."
    elif agent == AgentType.DOCUMENT or agent == AgentType.TASK or agent == AgentType.BOARD:
        needs_planning = False
        planning_note = "**Note:** This is a simple query that can be handled by a single agent. Create a single-step plan."
    else:
        needs_planning = True
        planning_note = "**Note:** This is a complex query requiring multiple agents. Create a multi-step plan with proper dependencies."
    
    # Build examples
    examples_text = "\n\n".join([
        f"**Example {i+1}:**\n"
        f"Query: \"{ex['query']}\"\n"
        f"Complexity: {ex['plan']['estimated_complexity']}\n"
        f"Steps: {len(ex['plan']['steps'])}"
        for i, ex in enumerate(PLANNING_EXAMPLES)
    ])
    
    prompt = f"""# Task Planning

## User Query
"{query}"

## Context
- Intent Type: {intent_type.value}
- Agent(s): {agent.value}
- Workspace: {workspace_id}

{planning_note}

## Planning Examples
{examples_text}

## Step Types Available
1. **query_document**: Query the Document Agent
2. **document_completion**: Generate text completion for the active document
3. **query_task**: Query the Task Agent
4. **query_board**: Query the Board Agent
5. **synthesize**: Combine results from multiple steps

## IMPORTANT: Agent Field Rules
- Each step's "agent" field must be one of: "document", "task", "board", or "both"
- NEVER use "orchestrator" as an agent value
- Use "document" for document queries AND document completion
- Use "task" for task queries
- Use "board" for board queries
- Use "both" only for synthesis steps that combine results

## Your Task
Create an execution plan with these fields:
1. **steps**: List of execution steps (ordered)
2. **estimated_complexity**: simple, medium, or complex
3. **requires_synthesis**: true if results need combining
4. **reasoning**: Overall plan explanation

Each step should have:
- **step_id**: Unique identifier (e.g., "step1", "step2")
- **type**: Step type (query_document, document_completion, query_task, query_board, or synthesize)
- **agent**: MUST be "document", "task", "board", or "both" (NEVER "orchestrator")
- **query**: What to query
- **dependencies**: Step IDs that must complete first
- **reasoning**: Why this step is needed

## CRITICAL VALIDATION RULES:
1. Agent field MUST be exactly one of: "document", "task", "board", "both"
2. For query_document steps: agent = "document"
3. For document_completion steps: agent = "document"
4. For query_task steps: agent = "task"
5. For query_board steps: agent = "board"
6. For synthesize steps: agent = "both"
7. NEVER use "orchestrator" as an agent value

## Output Format (JSON)
```json
{{
  "plan_id": "plan_{query[:20]}",
  "original_query": "{query}",
  "steps": [
    {{
      "step_id": "step1",
      "type": "query_task",
      "agent": "task",
      "query": "Find overdue tasks",
      "dependencies": [],
      "context_keys": [],
      "reasoning": "Get task data from database"
    }},
    {{
      "step_id": "step2", 
      "type": "query_document",
      "agent": "document",
      "query": "Find related documentation",
      "dependencies": ["step1"],
      "context_keys": ["task_ids"],
      "reasoning": "Get documentation for tasks"
    }},
    {{
      "step_id": "step3",
      "type": "synthesize", 
      "agent": "both",
      "query": "Combine task and document results",
      "dependencies": ["step1", "step2"],
      "context_keys": [],
      "reasoning": "Create final answer"
    }}
  ],
  "estimated_complexity": "medium",
  "requires_synthesis": true,
  "reasoning": "Multi-step plan requires both agents"
}}
```

**REMEMBER:** agent field must be "document", "task", "board", or "both" - never any other value!

Create the execution plan now:
"""
    
    return prompt


def create_synthesis_prompt(
    original_query: str,
    step_results: List[Dict[str, Any]],
    workspace_id: str
) -> str:
    """
    Create prompt for synthesizing results from multiple agents
    
    Args:
        original_query: Original user query
        step_results: Results from all execution steps
        workspace_id: Workspace context
        
    Returns:
        Prompt for synthesis
    """
    
    # Format step results
    results_text = ""
    for i, result in enumerate(step_results, 1):
        step_id = result.get('step_id', f'step{i}')
        success = result.get('success', False)
        data = result.get('result') or {}
        
        results_text += f"\n**Step {i} ({step_id}):**\n"
        results_text += f"Status: {'✅ Success' if success else '❌ Failed'}\n"
        
        if success and data:
            # Extract key information
            if data.get('answer'):
                results_text += f"Answer: {str(data['answer'])[:200]}...\n"
            if 'documents' in data and data['documents']:
                results_text += f"Documents found: {len(data['documents'])}\n"
            if 'row_count' in data:
                results_text += f"Rows returned: {data['row_count']}\n"
        else:
            results_text += f"Error: {result.get('error', 'Unknown error')}\n"
        
        results_text += "\n"
    
    prompt = f"""# Result Synthesis Task

## Original Query
"{original_query}"

## Context
- Workspace: {workspace_id}
- Steps Executed: {len(step_results)}

## Results from Agents
{results_text}

## Your Task
Synthesize these results into a coherent, comprehensive answer that:
1. Directly answers the user's original question
2. Combines information from all sources
3. Highlights key findings and insights
4. Notes any conflicts or inconsistencies
5. Provides actionable recommendations if applicable

## Output Format
Provide a well-formatted markdown answer with:
- Clear structure (headings, bullet points)
- Emojis for visual clarity (📊 🔴 ✅ etc.)
- Citations when referencing documents
- Specific data points and numbers

Generate the synthesized answer now:
"""
    
    return prompt


# Error messages
ERROR_MESSAGES = {
    'no_intent': "I couldn't determine what you're asking for. Could you rephrase your question?",
    'no_agent': "I don't have the right tools to answer this question.",
    'planning_failed': "I couldn't create a plan to answer your question. Please try a simpler query.",
    'execution_failed': "An error occurred while processing your request.",
    'low_confidence': "I'm not very confident in my answer. You might want to rephrase your question."
}
