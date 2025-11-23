"""
Database Schema Tool

Provides database schema information to agents for SQL query generation.
"""

from typing import Dict, Any, List
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session
from utils.logger import get_logger

logger = get_logger(__name__)


class DatabaseSchemaTool:
    """Tool for providing database schema information to agents"""
    
    # Task-related table schemas
    TASK_SCHEMA = """
# DATABASE SCHEMA FOR TASK ANALYSIS

## Table: tasks
Main task table storing all tasks in workspaces.

**Columns:**
- id: VARCHAR (Primary Key) - Unique task identifier
- workspace_id: VARCHAR (Foreign Key) - References workspaces.id
- user_id: VARCHAR - User who created the task (Creator)
- assignee_id: VARCHAR - User assigned to the task (Assignee)
- title: VARCHAR - Task title
- description: VARCHAR - Task description (nullable)
- status: VARCHAR - Task status (Todo, In_Progress, Blocked, Done)
- priority: VARCHAR - Task priority (Low, Medium, High, Critical)
- due_date: TIMESTAMP - Task due date (nullable)
- order_index: INTEGER - Order/position in lists
- created_at: TIMESTAMP - When task was created
- updated_at: TIMESTAMP - When task was last updated

**Status Values:** 'Todo', 'In_Progress', 'Blocked', 'Done'
**Priority Values:** 'Low', 'Medium', 'High', 'Critical'

**Indexes:**
- PRIMARY KEY: id
- INDEX: workspace_id
- INDEX: user_id
- INDEX: assignee_id
- INDEX: status
- INDEX: due_date

**Sample Query:**
```sql
-- Get all overdue high-priority tasks with assignee names
SELECT t.id, t.title, t.status, t.priority, t.due_date, 
       u.username as assignee_name,
       EXTRACT(DAY FROM NOW() - t.due_date) as days_overdue
FROM tasks t
LEFT JOIN users u ON u.id = t.assignee_id
WHERE t.workspace_id = 'workspace-123'
  AND t.due_date < NOW()
  AND t.priority IN ('High', 'Critical')
  AND t.status != 'Done'
ORDER BY t.due_date ASC;
```

---

## Table: subtasks
Subtasks belonging to parent tasks.

**Columns:**
- id: VARCHAR (Primary Key) - Unique subtask identifier
- task_id: VARCHAR (Foreign Key) - References tasks.id
- title: VARCHAR - Subtask title
- done: BOOLEAN - Completion status

**Indexes:**
- PRIMARY KEY: id
- INDEX: task_id

**Sample Query:**
```sql
-- Get task completion progress (with subtasks)
SELECT t.id, t.title, 
       COUNT(st.id) as total_subtasks,
       SUM(CASE WHEN st.done THEN 1 ELSE 0 END) as completed_subtasks,
       ROUND((100.0 * SUM(CASE WHEN st.done THEN 1 ELSE 0 END) / NULLIF(COUNT(st.id), 0))::numeric, 2) as completion_percentage
FROM tasks t
LEFT JOIN subtasks st ON st.task_id = t.id
WHERE t.workspace_id = 'workspace-123'
GROUP BY t.id, t.title;
```

---

## Table: task_tags
Tags associated with tasks (many-to-many relationship).

**Columns:**
- task_id: VARCHAR (Foreign Key) - References tasks.id
- tag: VARCHAR - Tag name

**Indexes:**
- INDEX: task_id
- INDEX: tag

**Sample Query:**
```sql
-- Get tasks by tag
SELECT t.id, t.title, t.status, tt.tag
FROM tasks t
JOIN task_tags tt ON tt.task_id = t.id
WHERE t.workspace_id = 'workspace-123'
  AND tt.tag IN ('urgent', 'bug', 'feature')
ORDER BY t.priority DESC;
```

---

## Table: documents
Document storage.

**Columns:**
- id: VARCHAR (Primary Key)
- workspace_id: VARCHAR (Foreign Key)
- user_id: VARCHAR (Creator)
- parent_id: VARCHAR (Parent document for nesting)
- title: VARCHAR
- content: TEXT
- icon: VARCHAR
- trashed: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

**Indexes:**
- PRIMARY KEY: id
- INDEX: workspace_id
- INDEX: user_id
- INDEX: parent_id

---

## Table: task_docs
Links between tasks and documents.

**Columns:**
- id: VARCHAR (Primary Key) - Unique link identifier
- task_id: VARCHAR (Foreign Key) - References tasks.id
- doc_id: VARCHAR (Foreign Key) - References documents.id
- user_id: VARCHAR - User who created the link
- relation_type: VARCHAR - Type of relationship (reference, attachment, etc.)
- note: VARCHAR - Additional notes (nullable)
- created_by: VARCHAR - User who created the link
- created_at: TIMESTAMP - When link was created

**Sample Query:**
```sql
-- Get tasks with their linked documents
SELECT t.id, t.title, d.title as doc_title, td.relation_type
FROM tasks t
JOIN task_docs td ON td.task_id = t.id
JOIN documents d ON d.id = td.doc_id
WHERE t.workspace_id = 'workspace-123';
```

---

## Table: boards
Kanban/Whiteboard storage.

**Columns:**
- id: VARCHAR (Primary Key)
- workspace_id: VARCHAR (Foreign Key)
- user_id: VARCHAR (Creator)
- title: VARCHAR
- snapshot: TEXT (JSON content)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

**Indexes:**
- PRIMARY KEY: id
- INDEX: workspace_id
- INDEX: user_id

---

## Table: users
User information for readable names in reports.

**Columns:**
- id: VARCHAR (Primary Key) - User identifier (matches user_id in other tables)
- email: VARCHAR (UNIQUE) - User email
- username: VARCHAR (UNIQUE) - User's username
- first_name: VARCHAR - First name
- last_name: VARCHAR - Last name
- image_url: VARCHAR - Profile picture URL (nullable)
- metadata: TEXT - Additional user metadata
- created_at: TIMESTAMP - Account creation date
- updated_at: TIMESTAMP - Last update

**Indexes:**
- PRIMARY KEY: id
- UNIQUE: email
- UNIQUE: username
- INDEX: username

**Sample Query:**
```sql
-- Get tasks with readable user names instead of IDs
SELECT t.id, t.title, t.status, t.priority, 
       u.username as assigned_to, u.email
FROM tasks t
LEFT JOIN users u ON u.id = t.assignee_id
WHERE t.workspace_id = 'workspace-123'
ORDER BY t.priority DESC;
```

---

## Table: workspaces
Workspace information (for context).

**Columns:**
- id: VARCHAR (Primary Key)
- name: VARCHAR - Workspace name
- description: VARCHAR
- owner_id: VARCHAR - Workspace owner
- is_public: BOOLEAN
- allow_invites: BOOLEAN
- default_task_view: VARCHAR
- default_document_view: VARCHAR
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

---

## Table: workspace_members
Users who are members of workspaces.

**Columns:**
- id: VARCHAR (Primary Key)
- workspace_id: VARCHAR (Foreign Key)
- user_id: VARCHAR

- role: VARCHAR - User role (owner, admin, member)
- joined_at: TIMESTAMP

**Sample Query:**
```sql
-- Get task distribution by user WITH READABLE NAMES
SELECT u.username, u.email, wm.role,
       COUNT(t.id) as total_tasks,
       SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) as completed_tasks,
       SUM(CASE WHEN t.status = 'In_Progress' THEN 1 ELSE 0 END) as in_progress_tasks
FROM workspace_members wm
LEFT JOIN users u ON u.id = wm.user_id
LEFT JOIN tasks t ON t.user_id = wm.user_id AND t.workspace_id = wm.workspace_id
WHERE wm.workspace_id = 'workspace-123'
GROUP BY u.username, u.email, wm.role
ORDER BY total_tasks DESC;
```

---

## COMMON ANALYSIS PATTERNS

### 1. Overdue Tasks Analysis (WITH READABLE USER NAMES)
```sql
SELECT 
    t.id, t.title, t.status, t.priority,
    t.due_date,
    EXTRACT(DAY FROM NOW() - t.due_date) as days_overdue,
    u.username as assigned_to,
    u.email
FROM tasks t
LEFT JOIN users u ON u.id = t.user_id
WHERE t.workspace_id = :workspace_id
  AND t.due_date < NOW()
  AND t.status != 'Done'
ORDER BY t.priority DESC, days_overdue DESC;
```

### 2. Task Status Distribution
```sql
SELECT 
    status,
    COUNT(*) as count,
    ROUND((100.0 * COUNT(*) / SUM(COUNT(*)) OVER ())::numeric, 2) as percentage
FROM tasks
WHERE workspace_id = :workspace_id
GROUP BY status
ORDER BY count DESC;
```

### 3. Priority Distribution (WITH USER NAMES)
```sql
SELECT 
    t.priority,
    COUNT(*) as count,
    SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN t.status = 'Todo' THEN 1 ELSE 0 END) as blocked,
    STRING_AGG(DISTINCT u.username, ', ') as users
FROM tasks t
LEFT JOIN users u ON u.id = t.user_id
WHERE t.workspace_id = :workspace_id
GROUP BY t.priority
ORDER BY 
    CASE t.priority
        WHEN 'High' THEN 1
        WHEN 'Medium' THEN 2
        WHEN 'Low' THEN 3
        ELSE 4
    END;
```

### 4. User Workload Analysis (WITH READABLE NAMES)
```sql
SELECT 
    u.username,
    u.email,
    COUNT(*) as total_tasks,
    SUM(CASE WHEN t.status = 'In_Progress' THEN 1 ELSE 0 END) as in_progress,
    SUM(CASE WHEN t.status = 'Todo' THEN 1 ELSE 0 END) as todo,
    SUM(CASE WHEN t.due_date < NOW() AND t.status != 'Done' THEN 1 ELSE 0 END) as overdue
FROM tasks t
LEFT JOIN users u ON u.id = t.user_id
WHERE t.workspace_id = :workspace_id
GROUP BY u.username, u.email
HAVING SUM(CASE WHEN t.status = 'In_Progress' THEN 1 ELSE 0 END) > 5
ORDER BY in_progress DESC;
```

### 5. Blocked Tasks Analysis (WITH USER INFO)
```sql
SELECT 
    t.id, t.title, t.priority, t.created_at,
    u.username as assigned_to,
    EXTRACT(DAY FROM NOW() - t.updated_at) as days_since_update,
    COUNT(st.id) as total_subtasks,
    SUM(CASE WHEN st.done THEN 1 ELSE 0 END) as completed_subtasks
FROM tasks t
LEFT JOIN users u ON u.id = t.user_id
LEFT JOIN subtasks st ON st.task_id = t.id
WHERE t.workspace_id = :workspace_id
  AND (t.description LIKE '%blocked%' OR t.description LIKE '%waiting%')
GROUP BY t.id, t.title, t.priority, t.created_at, t.updated_at, u.username
ORDER BY days_since_update DESC;
```

### 6. Stalled In-Progress Tasks (WITH USER NAMES)
```sql
SELECT 
    t.id, t.title, t.priority, t.status,
    u.username as assigned_to,
    t.updated_at,
    EXTRACT(DAY FROM NOW() - t.updated_at) as days_stalled
FROM tasks t
LEFT JOIN users u ON u.id = t.user_id
WHERE t.workspace_id = :workspace_id
  AND t.status = 'In_Progress'
  AND t.updated_at < NOW() - INTERVAL '7 days'
ORDER BY days_stalled DESC;
```

### 7. Task Completion Trend
```sql
SELECT 
    DATE(updated_at) as date,
    COUNT(*) as tasks_completed
FROM tasks
WHERE workspace_id = :workspace_id
  AND status = 'Done'
  AND updated_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(updated_at)
ORDER BY date DESC;
```

---

## SQL QUERY GUIDELINES

### Safety Rules:
1. **ALWAYS** filter by `workspace_id` in WHERE clause
2. **NEVER** use DELETE, UPDATE, INSERT, DROP, TRUNCATE, ALTER
3. **ALWAYS** use parameterized queries (:workspace_id, :user_id)
4. **LIMIT** result sets to reasonable sizes (default 100)
5. **Use** appropriate JOINs (LEFT JOIN for optional relations)

### Performance Tips:
1. Use indexes: workspace_id, user_id, status, due_date
2. Avoid SELECT * - specify needed columns
3. Use aggregations (COUNT, SUM, AVG) wisely
4. Add ORDER BY for consistent results
5. Use EXPLAIN for complex queries

### Date/Time Functions:
- `NOW()` - Current timestamp
- `CURRENT_DATE` - Current date
- `EXTRACT(DAY FROM date)` - Extract days
- `INTERVAL '7 days'` - Time intervals
- `DATE(timestamp)` - Convert to date

### String Functions:
- `LOWER(column)` - Lowercase
- `UPPER(column)` - Uppercase
- `LIKE '%pattern%'` - Pattern matching
- `CONCAT(str1, str2)` - Concatenate

### Aggregation Functions:
- `COUNT(*)` - Count rows
- `SUM(column)` - Sum values
- `AVG(column)` - Average
- `MIN(column)` - Minimum
- `MAX(column)` - Maximum
- `GROUP BY` - Group results
- `HAVING` - Filter groups
"""

    def __init__(self, db: Session):
        """
        Initialize database schema tool
        
        Args:
            db: Database session
        """
        self.db = db
        logger.info("Initialized DatabaseSchemaTool")
    
    def get_task_schema(self) -> str:
        """
        Get complete task-related database schema documentation
        
        Returns:
            Comprehensive schema documentation string
        """
        logger.info("Retrieving task schema documentation")
        return self.TASK_SCHEMA
    
    def get_table_info(self, table_name: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific table
        
        Args:
            table_name: Name of the table
            
        Returns:
            Table metadata (columns, types, constraints)
        """
        logger.info(f"Getting info for table: {table_name}")
        
        inspector = inspect(self.db.bind)
        
        # Get columns
        columns = inspector.get_columns(table_name)
        
        # Get primary keys
        pk_constraint = inspector.get_pk_constraint(table_name)
        primary_keys = pk_constraint.get('constrained_columns', [])
        
        # Get foreign keys
        foreign_keys = inspector.get_foreign_keys(table_name)
        
        # Get indexes
        indexes = inspector.get_indexes(table_name)
        
        return {
            'table_name': table_name,
            'columns': columns,
            'primary_keys': primary_keys,
            'foreign_keys': foreign_keys,
            'indexes': indexes
        }
    
    def get_sample_data(self, table_name: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get sample data from a table
        
        Args:
            table_name: Name of the table
            limit: Number of sample rows
            
        Returns:
            List of sample rows as dictionaries
        """
        logger.info(f"Getting {limit} sample rows from {table_name}")
        
        query = text(f"SELECT * FROM {table_name} LIMIT :limit")
        result = self.db.execute(query, {"limit": limit})
        
        rows = []
        for row in result:
            rows.append(dict(row._mapping))
        
        return rows
    
    def get_table_statistics(self, workspace_id: str) -> Dict[str, Any]:
        """
        Get statistics about task-related tables for a workspace
        
        Args:
            workspace_id: Workspace ID
            
        Returns:
            Table statistics (row counts, distributions)
        """
        logger.info(f"Getting table statistics for workspace: {workspace_id}")
        
        stats = {}
        
        # Tasks count
        result = self.db.execute(
            text("SELECT COUNT(*) FROM tasks WHERE workspace_id = :workspace_id"),
            {"workspace_id": workspace_id}
        )
        stats['total_tasks'] = result.scalar()
        
        # Status distribution
        result = self.db.execute(
            text("""
                SELECT status, COUNT(*) as count 
                FROM tasks 
                WHERE workspace_id = :workspace_id 
                GROUP BY status
            """),
            {"workspace_id": workspace_id}
        )
        stats['status_distribution'] = {row[0]: row[1] for row in result}
        
        # Priority distribution
        result = self.db.execute(
            text("""
                SELECT priority, COUNT(*) as count 
                FROM tasks 
                WHERE workspace_id = :workspace_id 
                GROUP BY priority
            """),
            {"workspace_id": workspace_id}
        )
        stats['priority_distribution'] = {row[0]: row[1] for row in result}
        
        # Subtasks count
        result = self.db.execute(
            text("""
                SELECT COUNT(*) 
                FROM subtasks st 
                JOIN tasks t ON t.id = st.task_id 
                WHERE t.workspace_id = :workspace_id
            """),
            {"workspace_id": workspace_id}
        )
        stats['total_subtasks'] = result.scalar()
        
        return stats
