"""
Task Graph Edges - SQL-Based Approach

Conditional routing functions for Task Agent LangGraph workflow.
"""

from agents.graphs.task_graph.state import TaskGraphState
from utils.logger import get_logger

logger = get_logger(__name__)


def check_schema_loaded(state: TaskGraphState) -> str:
    """
    Check if schema was loaded successfully
    
    Args:
        state: Current graph state
        
    Returns:
        Next node to route to
    """
    if state.get('error'):
        logger.warning("Schema loading failed")
        return "error"
    
    if not state.get('schema_info'):
        logger.warning("No schema info loaded")
        return "error"
    
    logger.info("Schema loaded successfully")
    return "generate_sql"


def check_sql_generated(state: TaskGraphState) -> str:
    """
    Check if SQL was generated successfully
    
    Args:
        state: Current graph state
        
    Returns:
        Next node to route to
    """
    if state.get('error'):
        logger.warning("SQL generation failed")
        return "error"
    
    if not state.get('generated_sql'):
        logger.warning("No SQL query generated")
        return "error"
    
    logger.info("SQL generated successfully")
    return "execute_sql"


def check_sql_executed(state: TaskGraphState) -> str:
    """
    Check if SQL executed successfully and has results
    
    Args:
        state: Current graph state
        
    Returns:
        Next node to route to
    """
    if state.get('error'):
        logger.warning("SQL execution failed")
        return "error"
    
    if not state.get('sql_success', False):
        logger.warning("SQL execution was not successful")
        return "error"
    
    row_count = state.get('row_count', 0)
    if row_count == 0:
        logger.info("No results returned from SQL query")
        return "no_results"
    
    logger.info(f"SQL executed successfully: {row_count} rows")
    return "analyze_results"


def check_analysis_complete(state: TaskGraphState) -> str:
    """
    Check if analysis completed successfully
    
    Args:
        state: Current graph state
        
    Returns:
        Next node to route to
    """
    if state.get('error'):
        logger.warning("Analysis failed")
        return "error"
    
    if not state.get('answer'):
        logger.warning("No answer generated")
        return "error"
    
    logger.info("Analysis complete")
    return "end"
