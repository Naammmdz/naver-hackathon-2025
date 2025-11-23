"""
Task Agent Prompts - SQL-Based Approach

System prompts and formatting for SQL-based task analysis.
"""

from typing import Dict, Any, List


TASK_AGENT_SYSTEM_PROMPT = """You are the Senior Project Analyst, an expert in querying and interpreting project data.

**Persona:**
- **Analytical:** You look for patterns, risks, and insights in the data.
- **Action-Oriented:** You don't just report numbers; you suggest what to do about them.
- **User-Centric:** You always present data in a human-readable format (names, not IDs).

**Your Capabilities:**
1.  **Data Extraction:** Generate precise PostgreSQL queries to retrieve task data.
2.  **Risk Detection:** Identify overdue tasks, bottlenecks, and uneven workload distribution.
3.  **Insight Generation:** Provide actionable recommendations based on the data.

**Database Context:**
You have access to a **PostgreSQL 17.5** database.
-   `tasks`: Core task data. Key columns: `id`, `title`, `status`, `priority`, `due_date`, `user_id` (creator), `assignee_id` (assigned user).
-   `users`: User profiles (id, username, email). **Crucial for mapping IDs to names.**
-   `workspaces`: Project containers.
-   `workspace_members`: Membership mapping.

**Strict Operational Rules:**
1.  **Human-Readable Names:** NEVER output raw user IDs. ALWAYS JOIN `tasks.assignee_id` with `users.id` to display `username` or `email` for task assignments.
2.  **Security First:** ALL queries MUST filter by `workspace_id`.
3.  **Read-Only:** ONLY use `SELECT` statements. No modifications allowed.
4.  **PostgreSQL Syntax:** Use valid PostgreSQL 17.5 syntax (e.g., `CASE WHEN`, `::numeric`, `NOW()`).

**Analysis Workflow:**
1.  **Understand:** Parse the user's question.
2.  **Query:** Write a SQL query to get the *exact* data needed (don't forget the JOINs!).
3.  **Analyze:** Interpret the results. Is there a problem? A trend?
4.  **Report:** Present findings clearly with emojis and structured text.

**Output Format:**
-   **Key Findings:** Bullet points of the most important data.
-   **Risks (if any):** ⚠️ Highlighting potential issues.
-   **Recommendations:** 💡 Actionable advice.
-   **Visuals:** Use emojis to make the report engaging (✅, 🔴, 🟡).
"""


def create_analysis_prompt(
    query: str,
    schema_info: str,
    workspace_id: str,
    example_queries: Dict[str, str] = None
) -> str:
    """
    Create prompt for task analysis with SQL generation
    
    Args:
        query: User's question about tasks
        schema_info: Database schema documentation
        workspace_id: Workspace ID to analyze
        example_queries: Optional example SQL queries
        
    Returns:
        Complete prompt for LLM
    """
    
    prompt = f"""# Task Analysis Request

## User Question
{query}

## Workspace Context
- Workspace ID: {workspace_id}
- Database: PostgreSQL 17.5

## Database Schema
{schema_info}

## Your Task
1. Understand what the user is asking about
2. Determine what data you need from the database
3. Generate SQL query/queries to retrieve that data
4. Format your response as follows:

### Response Format

**SQL Query:**
```sql
-- Your SQL query here
-- MUST include: WHERE workspace_id = :workspace_id
-- Use parameterized queries
```

**Expected Data:**
Briefly describe what data this query will return and why it answers the question.

**Analysis Approach:**
Explain how you will analyze the results to answer the user's question.

## PostgreSQL Common Patterns

### Percentages (IMPORTANT!)
```sql
-- CORRECT: Cast to numeric for ROUND to work
ROUND((100.0 * COUNT(*) / total_count)::numeric, 2) as percentage

-- WRONG: Will cause "function round(double precision, integer) does not exist"
ROUND(100.0 * COUNT(*) / total_count, 2)  -- ❌ ERROR
```

### Avoid Division by Zero
```sql
-- Use NULLIF to prevent division by zero
ROUND((100.0 * completed / NULLIF(total, 0))::numeric, 2)
```

### Window Functions
```sql
-- Calculate percentage using window function
SELECT status,
       COUNT(*) as count,
       ROUND((100.0 * COUNT(*) / SUM(COUNT(*)) OVER ())::numeric, 2) as percentage
```

## Example Queries (for reference)
"""

    if example_queries:
        for name, sql in example_queries.items():
            prompt += f"\n### {name}\n```sql\n{sql}\n```\n"
    
    return prompt


def create_insight_extraction_prompt(
    query: str,
    sql_results: List[Dict[str, Any]],
    workspace_id: str
) -> str:
    """
    Create prompt for extracting insights from SQL query results
    
    Args:
        query: Original user question
        sql_results: Results from SQL query execution
        workspace_id: Workspace ID
        
    Returns:
        Prompt for insight extraction
    """
    
    # Format results for the prompt
    results_text = ""
    for result in sql_results:
        if result['success']:
            results_text += f"\n## Query: {result.get('query_name', 'Query')}\n"
            results_text += f"Rows returned: {result['row_count']}\n\n"
            
            if result['row_count'] > 0:
                results_text += "Sample Data:\n```json\n"
                # Show first 5 rows
                for i, row in enumerate(result['rows'][:5]):
                    results_text += f"{row}\n"
                if result['row_count'] > 5:
                    results_text += f"... and {result['row_count'] - 5} more rows\n"
                results_text += "```\n"
            else:
                results_text += "No data found.\n"
        else:
            results_text += f"\n## Query Error\n{result['error']}\n"
    
    prompt = f"""# Task Analysis - Insight Extraction

## Original Question
{query}

## Workspace ID
{workspace_id}

## SQL Query Results
{results_text}

## Your Task
Analyze the query results and provide a comprehensive response:

### Required Sections:

1. **📊 Key Findings**
   - Summarize the most important insights from the data
   - Use specific numbers and percentages
   - Highlight patterns or trends

2. **⚠️ Risks Identified**
   - Identify potential problems or concerns
   - Categorize by severity (🔴 Critical, 🟠 High, 🟡 Medium)
   - Be specific about which tasks/areas are affected

3. **💡 Recommendations**
   - Provide actionable next steps
   - Prioritize recommendations
   - Be specific and practical

### Guidelines:
- Be concise but informative
- Use bullet points for clarity
- Include relevant data points
- Focus on actionability
- Use emojis for visual organization
"""
    
    return prompt


def format_task_summary(rows: List[Dict[str, Any]]) -> str:
    """
    Format task query results as readable summary
    
    Args:
        rows: Task rows from database
        
    Returns:
        Formatted summary text
    """
    if not rows:
        return "No tasks found."
    
    summary = f"**Total Tasks:** {len(rows)}\n\n"
    
    # Group by status
    status_groups = {}
    for row in rows:
        status = row.get('status', 'Unknown')
        if status not in status_groups:
            status_groups[status] = []
        status_groups[status].append(row)
    
    for status, tasks in status_groups.items():
        summary += f"### {status} ({len(tasks)})\n"
        for task in tasks[:5]:  # Show first 5
            title = task.get('title', 'Untitled')
            priority = task.get('priority', 'Unknown')
            summary += f"- [{priority}] {title}\n"
        if len(tasks) > 5:
            summary += f"... and {len(tasks) - 5} more\n"
        summary += "\n"
    
    return summary


def format_sql_error(error_message: str) -> str:
    """
    Format SQL error message for user
    
    Args:
        error_message: Raw error message
        
    Returns:
        Formatted error message
    """
    return f"""## ❌ Query Error

Unfortunately, there was an error executing the SQL query:

```
{error_message}
```

**Common Issues:**
- Missing workspace_id filter
- Invalid table or column names
- Syntax errors in SQL
- Forbidden SQL operations (UPDATE, DELETE, etc.)

Please try rephrasing your question or check the database schema.
"""


# Example SQL queries for common analyses
EXAMPLE_QUERIES = {
    "Overdue Tasks": """
SELECT 
    id, title, status, priority,
    due_date,
    EXTRACT(DAY FROM NOW() - due_date) as days_overdue,
    user_id
FROM tasks
WHERE workspace_id = :workspace_id
  AND due_date < NOW()
  AND status != 'Done'
ORDER BY priority DESC, days_overdue DESC
LIMIT 50;
""",
    
    "Blocked Tasks": """
SELECT 
    t.id, t.title, t.priority, t.description,
    EXTRACT(DAY FROM NOW() - t.updated_at) as days_since_update,
    COUNT(st.id) as total_subtasks,
    SUM(CASE WHEN st.done THEN 1 ELSE 0 END) as completed_subtasks
FROM tasks t
LEFT JOIN subtasks st ON st.task_id = t.id
WHERE t.workspace_id = :workspace_id
  AND t.status = 'Blocked'
GROUP BY t.id, t.title, t.priority, t.description, t.updated_at
ORDER BY days_since_update DESC
LIMIT 50;
""",
    
    "Status Distribution": """
SELECT 
    status,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM tasks
WHERE workspace_id = :workspace_id
GROUP BY status
ORDER BY count DESC;
""",
    
    "Priority Analysis": """
-- PostgreSQL: Use CASE WHEN for custom ordering (NOT FIELD())
SELECT 
    priority,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'Blocked' THEN 1 ELSE 0 END) as blocked,
    SUM(CASE WHEN due_date < NOW() AND status != 'Done' THEN 1 ELSE 0 END) as overdue,
    ROUND(100.0 * SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) / COUNT(*), 2) as completion_rate
FROM tasks
WHERE workspace_id = :workspace_id
GROUP BY priority
ORDER BY CASE 
    WHEN priority = 'Critical' THEN 1
    WHEN priority = 'High' THEN 2
    WHEN priority = 'Medium' THEN 3
    WHEN priority = 'Low' THEN 4
    ELSE 5
END;
""",
    
    "User Workload": """
SELECT 
    u.username as assignee,
    COUNT(*) as total_tasks,
    SUM(CASE WHEN t.status = 'In_Progress' THEN 1 ELSE 0 END) as in_progress,
    SUM(CASE WHEN t.status = 'Blocked' THEN 1 ELSE 0 END) as blocked,
    SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN t.due_date < NOW() AND t.status != 'Done' THEN 1 ELSE 0 END) as overdue
FROM tasks t
LEFT JOIN users u ON u.id = t.assignee_id
WHERE t.workspace_id = :workspace_id
GROUP BY u.username
ORDER BY in_progress DESC, overdue DESC
LIMIT 50;
""",
    
    "Task Completion Trend": """
SELECT 
    DATE(updated_at) as date,
    COUNT(*) as tasks_completed
FROM tasks
WHERE workspace_id = :workspace_id
  AND status = 'Done'
  AND updated_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(updated_at)
ORDER BY date DESC;
"""
}
