"""
Centralized Logging Utility

Professional logging configuration for the entire application.
Provides consistent log formatting, multiple handlers, and log rotation.

Usage:
    from utils.logger import get_logger
    
    logger = get_logger(__name__)
    logger.info("Application started")
    logger.debug("Debug information", extra={"user_id": "123"})
    logger.error("Error occurred", exc_info=True)
"""

import logging
import sys
from pathlib import Path
from typing import Optional
from logging.handlers import RotatingFileHandler
import json
from datetime import datetime


# Log directory
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)


class StructuredFormatter(logging.Formatter):
    """
    Custom formatter that outputs JSON-structured logs for production.
    Falls back to human-readable format for console.
    """
    
    def __init__(self, json_format: bool = False):
        self.json_format = json_format
        super().__init__()
    
    def format(self, record: logging.LogRecord) -> str:
        if self.json_format:
            return self._format_json(record)
        else:
            return self._format_console(record)
    
    def _format_json(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "workspace_id"):
            log_data["workspace_id"] = record.workspace_id
        if hasattr(record, "session_id"):
            log_data["session_id"] = record.session_id
        if hasattr(record, "duration"):
            log_data["duration"] = record.duration
        
        return json.dumps(log_data)
    
    def _format_console(self, record: logging.LogRecord) -> str:
        """Format log record for console (human-readable)"""
        # Color codes for different log levels
        colors = {
            "DEBUG": "\033[36m",      # Cyan
            "INFO": "\033[32m",       # Green
            "WARNING": "\033[33m",    # Yellow
            "ERROR": "\033[31m",      # Red
            "CRITICAL": "\033[35m",   # Magenta
        }
        reset = "\033[0m"
        
        level_color = colors.get(record.levelname, "")
        
        # Format: [TIMESTAMP] LEVEL - module.function:line - MESSAGE
        timestamp = datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S")
        location = f"{record.module}.{record.funcName}:{record.lineno}"
        
        message = f"[{timestamp}] {level_color}{record.levelname:8}{reset} - {location:40} - {record.getMessage()}"
        
        # Add exception info if present
        if record.exc_info:
            message += f"\n{self.formatException(record.exc_info)}"
        
        return message


class LoggerManager:
    """
    Singleton manager for application loggers.
    Ensures consistent configuration across all loggers.
    """
    
    _instance = None
    _loggers = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._configured = False
        return cls._instance
    
    def configure(
        self,
        level: str = "INFO",
        console_output: bool = True,
        file_output: bool = True,
        json_format: bool = False,
        max_file_size: int = 10 * 1024 * 1024,  # 10MB
        backup_count: int = 5,
    ):
        """
        Configure logging for the entire application.
        
        Args:
            level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            console_output: Enable console output
            file_output: Enable file output
            json_format: Use JSON format for file logs
            max_file_size: Maximum size of log file before rotation (bytes)
            backup_count: Number of backup files to keep
        """
        if self._configured:
            return
        
        self.level = getattr(logging, level.upper())
        self.console_output = console_output
        self.file_output = file_output
        self.json_format = json_format
        self.max_file_size = max_file_size
        self.backup_count = backup_count
        
        self._configured = True
    
    def get_logger(self, name: str) -> logging.Logger:
        """
        Get or create a logger with the given name.
        
        Args:
            name: Logger name (typically __name__ of the module)
        
        Returns:
            Configured logger instance
        """
        if name in self._loggers:
            return self._loggers[name]
        
        # Ensure configuration
        if not self._configured:
            self.configure()
        
        # Create logger
        logger = logging.getLogger(name)
        logger.setLevel(self.level)
        logger.handlers.clear()  # Remove any existing handlers
        logger.propagate = False  # Don't propagate to root logger
        
        # Console handler (human-readable)
        if self.console_output:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(self.level)
            console_handler.setFormatter(StructuredFormatter(json_format=False))
            logger.addHandler(console_handler)
        
        # File handler - General logs (JSON or text)
        if self.file_output:
            general_log = LOG_DIR / "app.log"
            file_handler = RotatingFileHandler(
                general_log,
                maxBytes=self.max_file_size,
                backupCount=self.backup_count,
                encoding="utf-8"
            )
            file_handler.setLevel(self.level)
            file_handler.setFormatter(StructuredFormatter(json_format=self.json_format))
            logger.addHandler(file_handler)
        
        # File handler - Error logs only (always separate)
        if self.file_output:
            error_log = LOG_DIR / "error.log"
            error_handler = RotatingFileHandler(
                error_log,
                maxBytes=self.max_file_size,
                backupCount=self.backup_count,
                encoding="utf-8"
            )
            error_handler.setLevel(logging.ERROR)
            error_handler.setFormatter(StructuredFormatter(json_format=self.json_format))
            logger.addHandler(error_handler)
        
        self._loggers[name] = logger
        return logger


# Global logger manager instance
_manager = LoggerManager()


def get_logger(
    name: str,
    level: Optional[str] = None,
    console_output: Optional[bool] = None,
    file_output: Optional[bool] = None,
    json_format: Optional[bool] = None,
) -> logging.Logger:
    """
    Get a configured logger instance.
    
    Args:
        name: Logger name (typically __name__ of the module)
        level: Override default logging level for this logger
        console_output: Override console output setting
        file_output: Override file output setting
        json_format: Override JSON format setting
    
    Returns:
        Configured logger instance
    
    Examples:
        >>> logger = get_logger(__name__)
        >>> logger.info("Application started")
        
        >>> logger = get_logger(__name__, level="DEBUG")
        >>> logger.debug("Detailed debug info")
        
        >>> logger.info("User action", extra={
        ...     "user_id": "123",
        ...     "workspace_id": "ws_456"
        ... })
    """
    # Configure manager with overrides if provided
    config_kwargs = {}
    if level is not None:
        config_kwargs["level"] = level
    if console_output is not None:
        config_kwargs["console_output"] = console_output
    if file_output is not None:
        config_kwargs["file_output"] = file_output
    if json_format is not None:
        config_kwargs["json_format"] = json_format
    
    if config_kwargs:
        _manager.configure(**config_kwargs)
    
    return _manager.get_logger(name)


def configure_logging(
    level: str = "INFO",
    console_output: bool = True,
    file_output: bool = True,
    json_format: bool = False,
) -> None:
    """
    Configure global logging settings.
    
    Should be called once at application startup.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        console_output: Enable console output
        file_output: Enable file output  
        json_format: Use JSON format for file logs
    
    Example:
        >>> # In main.py or __init__.py
        >>> from utils.logger import configure_logging
        >>> configure_logging(level="DEBUG", json_format=True)
    """
    _manager.configure(
        level=level,
        console_output=console_output,
        file_output=file_output,
        json_format=json_format,
    )


# Convenience functions for common logging patterns
class LogContext:
    """
    Context manager for logging with additional context.
    
    Example:
        >>> logger = get_logger(__name__)
        >>> with LogContext(logger, user_id="123", workspace_id="ws_456"):
        ...     logger.info("Processing document")
        ...     # Logs will include user_id and workspace_id
    """
    
    def __init__(self, logger: logging.Logger, **context):
        self.logger = logger
        self.context = context
        self.old_factory = None
    
    def __enter__(self):
        # Save old factory
        self.old_factory = logging.getLogRecordFactory()
        
        # Create new factory that adds context
        context = self.context
        
        def record_factory(*args, **kwargs):
            record = self.old_factory(*args, **kwargs)
            for key, value in context.items():
                setattr(record, key, value)
            return record
        
        logging.setLogRecordFactory(record_factory)
        return self.logger
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Restore old factory
        logging.setLogRecordFactory(self.old_factory)


def log_execution_time(logger: logging.Logger):
    """
    Decorator to log function execution time.
    
    Example:
        >>> logger = get_logger(__name__)
        >>> @log_execution_time(logger)
        ... def process_document(doc_id):
        ...     # ... processing ...
        ...     pass
    """
    import time
    from functools import wraps
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            logger.debug(f"Starting {func.__name__}")
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                logger.info(
                    f"Completed {func.__name__}",
                    extra={"duration": f"{duration:.2f}s"}
                )
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error(
                    f"Failed {func.__name__} after {duration:.2f}s: {e}",
                    exc_info=True
                )
                raise
        
        return wrapper
    return decorator
