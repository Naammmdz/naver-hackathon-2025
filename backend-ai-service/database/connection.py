"""
Database Connection and Session Management
"""

import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,              # Number of connections to maintain
    max_overflow=20,           # Max additional connections when pool is full
    pool_timeout=30,           # Seconds to wait for connection from pool
    pool_recycle=3600,         # Recycle connections after 1 hour
    pool_pre_ping=True,        # Verify connections before using
    echo=False,                # Set to True for SQL query logging
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


@contextmanager
def get_db() -> Generator[Session, None, None]:
    """
    Context manager for database sessions.
    
    Usage:
        with get_db() as db:
            users = db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db_session() -> Session:
    """
    Get a new database session.
    
    Note: Remember to close the session when done.
    Prefer using get_db() context manager instead.
    
    Usage:
        db = get_db_session()
        try:
            users = db.query(User).all()
            db.commit()
        finally:
            db.close()
    """
    return SessionLocal()


# Event listeners for connection management
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    """Set connection-level settings if needed"""
    pass


@event.listens_for(Engine, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Called when a connection is checked out from the pool"""
    pass


@event.listens_for(Engine, "checkin")
def receive_checkin(dbapi_conn, connection_record):
    """Called when a connection is returned to the pool"""
    pass


def init_db():
    """
    Initialize database (create all tables).
    Note: We use migrations, so this is mainly for testing.
    """
    from database.models.base import Base
    Base.metadata.create_all(bind=engine)


def close_db():
    """Close all database connections"""
    engine.dispose()


def test_connection():
    """Test database connection"""
    try:
        from sqlalchemy import text
        with get_db() as db:
            db.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"Database connection test failed: {e}")
        return False


if __name__ == "__main__":
    # Test connection
    print("Testing database connection...")
    if test_connection():
        print("✓ Database connection successful")
    else:
        print("✗ Database connection failed")
