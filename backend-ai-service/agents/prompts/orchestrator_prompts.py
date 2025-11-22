"""
Orchestrator Prompts

System prompts and formatting for intent detection and task planning.
"""

from typing import List, Dict, Any
from agents.schemas import INTENT_EXAMPLES, PLANNING_EXAMPLES, IntentType, AgentType


ORCHESTRATOR_SYSTEM_PROMPT = """You are an intelligent Orchestrator Agent that coordinates multiple AI agents to answer user queries.

Your capabilities:
1. **Intent Detection**: Understand what the user wants to accomplish
2. **Agent Routing**: Determine which agent(s) should handle the request
3. **Task Decomposition**: Break complex queries into executable steps
4. **Result Synthesis**: Combine outputs from multiple agents into coherent answers

Available Agents:
- **Document Agent**: Answers questions about document content using RAG
  - Can retrieve information from uploaded documents
  - Provides citations with page numbers
  - Good for: "What does X document say about Y?"
  
- **Task Agent**: Analyzes tasks using SQL and provides insights
  - Can query task database (status, priority, assignments, deadlines)
  - Detects risks and provides recommendations
  - Good for: "How many tasks are overdue?", "Who is working on X?"

- **Board Agent**: Visualizes tasks and workflows
  - Generates Mermaid.js charts (flowcharts, gantt, pie charts)
  - Visualizes task dependencies and status distribution
  - Good for: "Draw a flowchart of tasks", "Show me a gantt chart of the project"

**IMPORTANT RULES:**
1. Always detect intent BEFORE routing
2. For simple queries, route to ONE agent
3. For complex queries, create a multi-step plan
4. Extract entities (dates, names, priorities) when present
5. Provide clear reasoning for decisions

**Intent Types:**
- document_query: Asking about document content
- task_query: Asking about tasks
- board_query: Asking for visualizations
- hybrid_query: Requires both documents and tasks
- workspace_overview: High-level summary
- task_risk: Risk analysis
- unknown: Cannot determine intent (set agent to 'both')

**Output Format:**
Always provide structured JSON output matching the Intent or ExecutionPlan schema.
"""


def create_intent_detection_prompt(
    query: str,
    workspace_id: str,
    conversation_history: List[Dict[str, str]] = None
) -> str:
    """
    Create prompt for intent detection
    
    Args:
        query: User's natural language query
        workspace_id: Workspace context
        conversation_history: Recent conversation for context
        
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
    
    prompt = f"""# Intent Detection Task

## User Query
"{query}"

## Workspace Context
- Workspace ID: {workspace_id}
{context_text}

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
  "requires_decomposition": false
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
2. **query_task**: Query the Task Agent
3. **query_board**: Query the Board Agent
4. **synthesize**: Combine results from multiple steps

## IMPORTANT: Agent Field Rules
- Each step's "agent" field must be one of: "document", "task", "board", or "both"
- NEVER use "orchestrator" as an agent value
- Use "document" for document queries
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
- **type**: Step type (query_document, query_task, query_board, or synthesize)
- **agent**: MUST be "document", "task", "board", or "both" (NEVER "orchestrator")
- **query**: What to query
- **dependencies**: Step IDs that must complete first
- **reasoning**: Why this step is needed

## CRITICAL VALIDATION RULES:
1. Agent field MUST be exactly one of: "document", "task", "board", "both"
2. For query_document steps: agent = "document"
3. For query_task steps: agent = "task"
4. For query_board steps: agent = "board"
5. For synthesize steps: agent = "both"
6. NEVER use "orchestrator" as an agent value

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
        data = result.get('result', {})
        
        results_text += f"\n**Step {i} ({step_id}):**\n"
        results_text += f"Status: {'✅ Success' if success else '❌ Failed'}\n"
        
        if success:
            # Extract key information
            if 'answer' in data:
                results_text += f"Answer: {data['answer'][:200]}...\n"
            if 'documents' in data:
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
