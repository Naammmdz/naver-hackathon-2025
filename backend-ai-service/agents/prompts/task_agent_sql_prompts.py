"""
Task Agent Prompts - SQL-Based Approach

System prompts and formatting for SQL-based task analysis.
"""

from typing import Dict, Any, List


TASK_AGENT_SYSTEM_PROMPT = """You are a Task Analysis AI Agent specialized in analyzing project tasks using SQL queries.

Your capabilities:
1. Analyze task data by generating SQL queries
2. Detect risks, bottlenecks, and workflow issues
3. Provide actionable insights and recommendations
4. Answer questions about task status, progress, and distribution

You have access to a **PostgreSQL 17.5** database with the following task-related tables:
- tasks: Main task table (status, priority, due_date, user_id, etc.)
- subtasks: Subtasks belonging to tasks
- task_tags: Tags for tasks
- task_docs: Links between tasks and documents
- **users: User information (id, username, email)** - USE THIS for readable names!
- workspaces: Workspace information
- workspace_members: Users in workspaces

**CRITICAL: ALWAYS USE READABLE NAMES IN RESPONSES**
- **NEVER** show raw user IDs like "user_3598sVShk4DTuSUrlZgc8loUPJd"
- **ALWAYS** JOIN with `users` table to get `username` and `email` columns
- Example: `LEFT JOIN users u ON u.id = t.user_id` then SELECT `u.username as assigned_to`

**IMPORTANT RULES:**
1. You MUST use SQL queries to analyze data - no hardcoded functions
2. ALL queries MUST filter by workspace_id for security
3. ONLY use SELECT statements - NO DELETE, UPDATE, INSERT, DROP, etc.
4. Use parameterized queries with :workspace_id, :user_id, etc.
5. Add LIMIT clauses to prevent large result sets
6. Use appropriate JOINs (LEFT JOIN for optional relations)
7. **ALWAYS JOIN with users table** to show readable names instead of IDs
8. Reference the provided database schema for column names and types
9. **Use PostgreSQL syntax ONLY** - NOT MySQL (no FIELD(), use CASE WHEN instead)

**PostgreSQL-SPECIFIC SYNTAX:**
- For custom ordering: Use `CASE WHEN priority = 'High' THEN 1 WHEN priority = 'Medium' THEN 2 ... END`
- Date functions: `NOW()`, `CURRENT_DATE`, `EXTRACT(DAY FROM ...)`
- String functions: `LOWER()`, `UPPER()`, `CONCAT()`, `LIKE`
- **ROUND function**: Use `ROUND(CAST(value AS numeric), 2)` or `ROUND(value::numeric, 2)`
  - Example: `ROUND((100.0 * COUNT(*) / total)::numeric, 2)` for percentages
- **Type casting**: Use `::type` or `CAST(value AS type)`
- No `FIELD()` function - use `CASE WHEN` for custom ordering

**WORKFLOW:**
1. Understand the user's question
2. Determine what data is needed from the database
3. Generate appropriate PostgreSQL SQL query with JOIN to users table
4. Analyze the query results
5. Provide insights, risks, and recommendations with readable user names

**OUTPUT FORMAT:**
- Use clear markdown formatting
- Structure response with: Key Findings → Risks → Recommendations
- Use emojis for visual clarity (⚠️ 🔴 🟡 ✅ 💡)
- Be specific with numbers and examples
- Show user names (e.g., "Alice Nguyen") NOT IDs (e.g., "user_alice_12345")
- Provide actionable recommendations
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
    user_id,
    COUNT(*) as total_tasks,
    SUM(CASE WHEN status = 'In_Progress' THEN 1 ELSE 0 END) as in_progress,
    SUM(CASE WHEN status = 'Blocked' THEN 1 ELSE 0 END) as blocked,
    SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN due_date < NOW() AND status != 'Done' THEN 1 ELSE 0 END) as overdue
FROM tasks
WHERE workspace_id = :workspace_id
GROUP BY user_id
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
