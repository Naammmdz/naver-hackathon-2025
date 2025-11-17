"""
Task Graph Nodes - SQL-Based Approach

Implements LangGraph nodes for Task Agent using SQL query generation.
Similar to Document Agent pattern but for task analysis.
"""

from typing import Dict, Any
import sys
import time
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parents[3]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from utils.logger import get_logger
from agents.graphs.task_graph.state import TaskGraphState
from agents.tools.database_schema_tool import DatabaseSchemaTool
from agents.tools.sql_execution_tool import SQLExecutionTool
from agents.prompts.task_agent_sql_prompts import (
    TASK_AGENT_SYSTEM_PROMPT,
    create_analysis_prompt,
    create_insight_extraction_prompt,
    EXAMPLE_QUERIES,
    format_sql_error
)
from llm import LLMFactory
from database.connection import get_db_session

logger = get_logger(__name__)


class TaskGraphNodes:
    """
    Nodes for Task Agent SQL-based workflow.
    
    Workflow:
    1. load_schema_node: Load database schema
    2. generate_sql_node: LLM generates SQL query
    3. execute_sql_node: Execute SQL safely
    4. analyze_results_node: LLM analyzes results
    5. generate_response_node: Format final answer
    """
    
    def __init__(
        self,
        llm_provider: str = 'openai'
    ):
        """
        Initialize task graph nodes
        
        Args:
            llm_provider: LLM provider for SQL generation and analysis
        """
        # Initialize LLM
        llm_factory = LLMFactory()
        self.llm = llm_factory.create_llm(provider=llm_provider)
        self.llm_provider = llm_provider
        
        logger.info(f"TaskGraphNodes initialized with {llm_provider} LLM")
    
    def load_schema_node(self, state: TaskGraphState) -> Dict[str, Any]:
        """
        Load database schema information
        
        Args:
            state: Current graph state
            
        Returns:
            Updated state with schema_info
        """
        logger.info("Loading database schema")
        
        try:
            db = get_db_session()
            schema_tool = DatabaseSchemaTool(db)
            
            # Get task schema documentation
            schema_info = schema_tool.get_task_schema()
            
            logger.info("Database schema loaded successfully")
            
            return {
                'schema_info': schema_info,
                'error': None
            }
            
        except Exception as e:
            error_msg = f"Error loading schema: {str(e)}"
            logger.error(error_msg)
            return {
                'schema_info': "",
                'error': error_msg
            }
    
    def generate_sql_node(self, state: TaskGraphState) -> Dict[str, Any]:
        """
        Generate SQL query using LLM based on user question
        
        Args:
            state: Current graph state
            
        Returns:
            Updated state with generated_sql
        """
        logger.info("Generating SQL query")
        
        try:
            query = state['query']
            workspace_id = state['workspace_id']
            schema_info = state['schema_info']
            
            # Create prompt for SQL generation
            prompt = create_analysis_prompt(
                query=query,
                schema_info=schema_info,
                workspace_id=workspace_id,
                example_queries=EXAMPLE_QUERIES
            )
            
            # Get LLM to generate SQL
            messages = [
                {"role": "system", "content": TASK_AGENT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ]
            
            logger.info("Invoking LLM for SQL generation")
            response = self.llm.invoke(messages)
            
            # Extract SQL from response
            # LLM should return SQL in ```sql ... ``` block
            sql_query = self._extract_sql_from_response(response.content)
            
            if not sql_query:
                error_msg = "LLM did not generate valid SQL query"
                logger.warning(error_msg)
                return {
                    'generated_sql': "",
                    'sql_success': False,
                    'error': error_msg
                }
            
            logger.info(f"Generated SQL: {sql_query[:100]}...")
            
            return {
                'generated_sql': sql_query,
                'error': None
            }
            
        except Exception as e:
            error_msg = f"Error generating SQL: {str(e)}"
            logger.error(error_msg)
            return {
                'generated_sql': "",
                'sql_success': False,
                'error': error_msg
            }
    
    def execute_sql_node(self, state: TaskGraphState) -> Dict[str, Any]:
        """
        Execute generated SQL query safely
        
        Args:
            state: Current graph state
            
        Returns:
            Updated state with sql_results
        """
        logger.info("Executing SQL query")
        
        try:
            sql_query = state['generated_sql']
            parameters = state['sql_parameters']
            
            if not sql_query:
                error_msg = "No SQL query to execute"
                logger.warning(error_msg)
                return {
                    'sql_results': [],
                    'sql_success': False,
                    'sql_error': error_msg,
                    'row_count': 0
                }
            
            # Get database session
            db = get_db_session()
            sql_tool = SQLExecutionTool(db)
            
            # Execute query
            start_time = time.time()
            result = sql_tool.execute_query(
                query=sql_query,
                parameters=parameters,
                limit=100
            )
            execution_time = int((time.time() - start_time) * 1000)
            
            if result['success']:
                logger.info(f"SQL executed successfully: {result['row_count']} rows in {execution_time}ms")
                return {
                    'sql_results': result['rows'],
                    'sql_success': True,
                    'sql_error': None,
                    'row_count': result['row_count'],
                    'query_time_ms': execution_time,
                    'error': None
                }
            else:
                logger.error(f"SQL execution failed: {result['error']}")
                return {
                    'sql_results': [],
                    'sql_success': False,
                    'sql_error': result['error'],
                    'row_count': 0,
                    'query_time_ms': execution_time,
                    'error': result['error']
                }
                
        except Exception as e:
            error_msg = f"Error executing SQL: {str(e)}"
            logger.error(error_msg)
            return {
                'sql_results': [],
                'sql_success': False,
                'sql_error': error_msg,
                'row_count': 0,
                'error': error_msg
            }
    
    def analyze_results_node(self, state: TaskGraphState) -> Dict[str, Any]:
        """
        Analyze SQL results using LLM to extract insights
        
        Args:
            state: Current graph state
            
        Returns:
            Updated state with insights, risks, recommendations
        """
        logger.info("Analyzing SQL results")
        
        try:
            query = state['query']
            workspace_id = state['workspace_id']
            sql_results = state['sql_results']
            sql_success = state['sql_success']
            
            if not sql_success:
                # Handle SQL error
                error_msg = state.get('sql_error', 'Unknown SQL error')
                return {
                    'answer': format_sql_error(error_msg),
                    'confidence': 0.0,
                    'insights': [],
                    'risks': [],
                    'recommendations': []
                }
            
            # Format results for analysis
            sql_result_obj = [{
                'success': True,
                'rows': sql_results,
                'row_count': len(sql_results),
                'query_name': 'Task Analysis Query'
            }]
            
            # Create prompt for insight extraction
            prompt = create_insight_extraction_prompt(
                query=query,
                sql_results=sql_result_obj,
                workspace_id=workspace_id
            )
            
            # Get LLM to analyze results
            messages = [
                {"role": "system", "content": TASK_AGENT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ]
            
            logger.info("Invoking LLM for result analysis")
            response = self.llm.invoke(messages)
            
            # Store full analysis as answer (already formatted by LLM)
            answer = response.content
            
            logger.info("Analysis complete")
            
            return {
                'answer': answer,
                'confidence': 0.8,  # High confidence when we have SQL results
                'error': None
            }
            
        except Exception as e:
            error_msg = f"Error analyzing results: {str(e)}"
            logger.error(error_msg)
            return {
                'answer': "Sorry, I encountered an error analyzing the results.",
                'confidence': 0.0,
                'error': error_msg
            }
    
    def no_results_handler(self, state: TaskGraphState) -> Dict[str, Any]:
        """
        Handle case when SQL returns no results
        
        Args:
            state: Current graph state
            
        Returns:
            Updated state with helpful message
        """
        logger.info("Handling no results case")
        
        workspace_id = state['workspace_id']
        
        answer = f"""## ℹ️ No Results Found

No tasks were found matching your query in workspace `{workspace_id}`.

**Possible reasons:**
- The workspace has no tasks yet
- The query filters didn't match any tasks
- Try rephrasing your question

**Suggestions:**
- Check if the workspace ID is correct
- Try broader search criteria
- Use "show all tasks" to see available tasks
"""
        
        return {
            'answer': answer,
            'confidence': 1.0,
            'error': None
        }
    
    def error_handler(self, state: TaskGraphState) -> Dict[str, Any]:
        """
        Handle errors gracefully
        
        Args:
            state: Current graph state
            
        Returns:
            Updated state with error message
        """
        error = state.get('error', 'Unknown error occurred')
        logger.error(f"Error handler triggered: {error}")
        
        answer = f"""## ❌ Error

An error occurred while analyzing tasks:

```
{error}
```

Please try:
- Rephrasing your question
- Checking the workspace ID
- Contacting support if the issue persists
"""
        
        return {
            'answer': answer,
            'confidence': 0.0
        }
    
    # Helper methods
    
    def _extract_sql_from_response(self, response: str) -> str:
        """Extract SQL query from LLM response"""
        import re
        
        # Look for SQL in ```sql ... ``` block
        sql_match = re.search(r'```sql\s+(.*?)\s+```', response, re.DOTALL | re.IGNORECASE)
        if sql_match:
            return sql_match.group(1).strip()
        
        # Look for SELECT statement directly
        select_match = re.search(r'(SELECT\s+.*?(?:;|$))', response, re.DOTALL | re.IGNORECASE)
        if select_match:
            return select_match.group(1).strip()
        
        return ""
