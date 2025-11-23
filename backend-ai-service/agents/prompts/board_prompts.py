"""
Board Agent Prompts

System prompts and templates for generating Kanban boards and Mermaid charts.
"""

from typing import List, Dict, Any
from agents.schemas.board_schemas import ChartType, VISUALIZATION_EXAMPLES


BOARD_AGENT_SYSTEM_PROMPT = """You are the Board Visualization Agent, an expert in project management visualization.
Your goal is to transform raw task data into clear, insightful, and aesthetically pleasing diagrams.

**Persona:**
- **Visual Thinker:** You understand how to best represent data visually.
- **Detail-Oriented:** You ensure every chart is syntactically correct and logically sound.
- **Helpful Guide:** You choose the best visualization type if the user is vague.

**Your Capabilities:**
1.  **Kanban Boards:** Organize tasks by status (To Do, In Progress, Done).
2.  **Gantt Charts:** Visualize timelines, schedules, and dependencies.
3.  **Flowcharts:** Map out processes and decision trees.
4.  **Timeline Diagrams:** Show high-level milestones.

**Style & Quality Guidelines:**
1.  **Clarity is King:** Avoid cluttered diagrams. Group related items logically.
2.  **Valid Syntax:** ALWAYS generate valid Mermaid.js code. A broken chart is useless.
3.  **Data Integrity:** Ensure task IDs, names, and dates match the provided data exactly.
4.  **Smart Defaults:** If the user doesn't specify a chart type, infer the best one (e.g., "schedule" -> Gantt, "status" -> Kanban/Pie).

**Mermaid Syntax Reference:**

**Gantt Chart:**
```mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1: task1, 2025-11-01, 3d
    Task 2: task2, after task1, 5d
    section Phase 2
    Task 3: crit, 2025-11-10, 2d
```

**Flowchart:**
```mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
```

**Timeline:**
```mermaid
timeline
    title Project Milestones
    2025-11 : Kickoff : Planning Complete
    2025-12 : Development : Testing
    2026-01 : Launch
```

**Output Format:**
Always provide structured JSON matching the `BoardVisualizationResponse` schema.
"""


def create_kanban_prompt(
    workspace_id: str,
    query: str,
    tasks: List[Dict[str, Any]]
) -> str:
    """
    Create prompt for Kanban board generation
    
    Args:
        workspace_id: Workspace ID
        query: User's visualization request
        tasks: List of tasks from database
        
    Returns:
        Complete prompt for LLM
    """
    
    # Format task data
    tasks_text = "\n".join([
        f"- **{task.get('title', 'Untitled')}** "
        f"(ID: {task.get('id', 'N/A')}, "
        f"Status: {task.get('status', 'unknown')}, "
        f"Assignee: {task.get('assignee_name', 'Unassigned')}, "
        f"Priority: {task.get('priority', 'N/A')})"
        for task in tasks
    ])
    
    prompt = f"""# Kanban Board Generation

## User Request
"{query}"

## Workspace Context
- Workspace ID: {workspace_id}
- Total Tasks: {len(tasks)}

## Available Tasks
{tasks_text if tasks else "No tasks available"}

## Your Task
Create a Kanban board visualization with these requirements:

1. **Organize tasks into columns** based on their status:
   - To Do (todo)
   - In Progress (in_progress)
   - In Review (in_review)
   - Blocked (blocked)
   - Done (done)

2. **For each task, include:**
   - ID and title
   - Assignee name
   - Priority (if available)
   - Due date (if available)
   - Tags/labels

3. **Provide summary statistics:**
   - Total tasks per column
   - WIP (Work In Progress) count
   - High priority tasks
   - Overdue tasks (if any)

## Output Format (JSON)
```json
{{
  "board_id": "board_{workspace_id}",
  "title": "Workspace Tasks Board",
  "columns": [
    {{
      "name": "To Do",
      "status": "todo",
      "tasks": [
        {{
          "id": "TASK-1",
          "title": "Task title here",
          "status": "todo",
          "priority": "high",
          "assignee": "John Doe",
          "due_date": "2025-11-25",
          "dependencies": [],
          "tags": ["backend", "api"]
        }}
      ],
      "wip_limit": null
    }}
  ],
  "workspace_id": "{workspace_id}"
}}
```

Generate the Kanban board now:
"""
    
    return prompt


def create_gantt_prompt(
    workspace_id: str,
    query: str,
    tasks: List[Dict[str, Any]]
) -> str:
    """
    Create prompt for Gantt chart generation
    
    Args:
        workspace_id: Workspace ID
        query: User's visualization request
        tasks: List of tasks with dates
        
    Returns:
        Complete prompt for LLM
    """
    
    # Format task data with dates
    tasks_text = "\n".join([
        f"- **{task.get('title', 'Untitled')}** "
        f"(Start: {task.get('start_date', 'N/A')}, "
        f"Due: {task.get('due_date', 'N/A')}, "
        f"Status: {task.get('status', 'unknown')})"
        for task in tasks if task.get('start_date') or task.get('due_date')
    ])
    
    prompt = f"""# Gantt Chart Generation

## User Request
"{query}"

## Workspace Context
- Workspace ID: {workspace_id}
- Tasks with dates: {len([t for t in tasks if t.get('start_date') or t.get('due_date')])}

## Available Tasks
{tasks_text if tasks_text else "No tasks with date information"}

## Your Task
Create a Gantt chart using Mermaid syntax with these requirements:

1. **Use valid Mermaid Gantt syntax:**
   - dateFormat YYYY-MM-DD
   - Organize into logical sections (e.g., by status, team, or phase)
   - Use task dependencies where applicable

2. **Task Status Indicators:**
   - Active tasks: normal format
   - Critical tasks: add `crit` flag
   - Completed tasks: add `done` flag

3. **Include:**
   - Task start dates
   - Task durations (in days)
   - Task dependencies (if any)
   - Section grouping

## Mermaid Gantt Example
```mermaid
gantt
    title Sprint Timeline
    dateFormat YYYY-MM-DD
    section Development
    Task 1: task1, 2025-11-01, 3d
    Task 2: task2, after task1, 5d
    section Testing
    Task 3: crit, 2025-11-08, 2d
```

## Output Format (JSON)
```json
{{
  "chart_type": "gantt",
  "title": "Project Timeline",
  "mermaid_code": "gantt\\n    title Project Timeline\\n    dateFormat YYYY-MM-DD\\n    section Development\\n    Task 1: 2025-11-01, 3d",
  "description": "Timeline showing task schedules and dependencies",
  "metadata": {{
    "tasks_count": {len(tasks)},
    "date_range": "2025-11-01 to 2025-11-30"
  }}
}}
```

Generate the Gantt chart now:
"""
    
    return prompt


def create_flowchart_prompt(
    workspace_id: str,
    query: str,
    tasks: List[Dict[str, Any]]
) -> str:
    """
    Create prompt for flowchart/dependency graph generation
    
    Args:
        workspace_id: Workspace ID
        query: User's visualization request
        tasks: List of tasks with dependencies
        
    Returns:
        Complete prompt for LLM
    """
    
    # Format task dependencies
    tasks_text = "\n".join([
        f"- **{task.get('title', 'Untitled')}** "
        f"(ID: {task.get('id', 'N/A')}, "
        f"Depends on: {', '.join(task.get('dependencies', [])) if task.get('dependencies') else 'None'})"
        for task in tasks
    ])
    
    prompt = f"""# Flowchart/Dependency Graph Generation

## User Request
"{query}"

## Workspace Context
- Workspace ID: {workspace_id}
- Total Tasks: {len(tasks)}

## Task Dependencies
{tasks_text if tasks else "No task dependency information"}

## Your Task
Create a flowchart showing task dependencies using Mermaid syntax:

1. **Use flowchart TD (top-down) or LR (left-right)**
2. **Node shapes:**
   - `[Task Name]` - Rectangle for tasks
   - `{{Task Name}}` - Diamond for decision points
   - `([Task Name])` - Rounded for milestones

3. **Connections:**
   - `-->` for normal flow
   - `-.->` for optional/weak dependencies
   - `==>` for critical path

4. **Labels:**
   - Add labels to edges if needed: `A -->|label| B`

## Mermaid Flowchart Example
```mermaid
flowchart TD
    A[Design Phase] --> B[Development]
    A --> C[Documentation]
    B --> D{{Code Review}}
    C --> D
    D -->|Approved| E[Testing]
    D -->|Rejected| B
    E --> F([Release])
```

## Output Format (JSON)
```json
{{
  "chart_type": "flowchart",
  "title": "Task Dependencies",
  "mermaid_code": "flowchart TD\\n    A[Task 1] --> B[Task 2]\\n    B --> C[Task 3]",
  "description": "Dependency graph showing task relationships",
  "metadata": {{
    "nodes_count": {len(tasks)},
    "has_cycles": false
  }}
}}
```

Generate the flowchart now:
"""
    
    return prompt


def create_summary_prompt(
    visualization_data: Dict[str, Any],
    chart_type: ChartType
) -> str:
    """
    Create prompt for generating human-readable summary
    
    Args:
        visualization_data: The generated visualization data
        chart_type: Type of chart
        
    Returns:
        Prompt for summary generation
    """
    
    prompt = f"""# Visualization Summary Generation

## Chart Type
{chart_type.value}

## Visualization Data
```json
{visualization_data}
```

## Your Task
Create a concise, human-readable summary of this visualization that:

1. **Highlights key insights:**
   - Total counts and statistics
   - Important patterns or trends
   - Potential blockers or risks
   - Notable achievements

2. **Uses emojis for clarity:**
   - 📊 for statistics
   - ✅ for completed items
   - ⚠️ for warnings
   - 🔴 for critical issues
   - 📅 for dates

3. **Keeps it brief:**
   - 2-3 sentences maximum
   - Focus on actionable information

## Example Summaries

**Kanban:**
"📊 Your board has 15 tasks: 3 in To Do, 8 In Progress, 4 Done. ⚠️ 2 high-priority tasks are in progress."

**Gantt:**
"📅 Timeline spans Nov 1-30 with 12 tasks across 3 phases. ✅ Development phase is 60% complete."

**Flowchart:**
"🔄 Dependency graph shows 8 tasks with 3 critical path items. ⚠️ Task-5 is blocking 3 downstream tasks."

Generate a summary for this {chart_type.value} chart:
"""
    
    return prompt


# Error messages
ERROR_MESSAGES = {
    'no_tasks': "No tasks found for visualization. Please ensure tasks exist in the workspace.",
    'no_dates': "Cannot create timeline: no tasks have date information.",
    'invalid_mermaid': "Generated Mermaid syntax is invalid. Please try again.",
    'generation_failed': "Failed to generate visualization. Please try a different query."
}
