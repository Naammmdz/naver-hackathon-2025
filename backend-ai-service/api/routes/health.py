"""
Health Check Endpoints

Provides system health monitoring and status information.
"""

from fastapi import APIRouter, status
from pydantic import BaseModel
from typing import Dict, Any
import sys
from pathlib import Path

if str(Path(__file__).parent.parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.connection import get_db_session
from llm import LLMFactory
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    database: str
    llm_providers: Dict[str, bool]
    version: str


class ReadinessResponse(BaseModel):
    """Readiness check response"""
    ready: bool
    checks: Dict[str, bool]


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health Check",
    description="Check if the API is running and all dependencies are available"
)
async def health_check():
    """
    Health check endpoint
    
    Returns:
        System health status including database and LLM provider availability
    """
    # Check database
    db_status = "healthy"
    try:
        db = get_db_session()
        db.execute("SELECT 1")
        db.close()
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    # Check LLM providers
    try:
        factory = LLMFactory()
        llm_providers = factory.get_available_providers()
    except Exception as e:
        logger.error(f"LLM provider check failed: {e}")
        llm_providers = {}
    
    return HealthResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        database=db_status,
        llm_providers=llm_providers,
        version="1.0.0"
    )


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    status_code=status.HTTP_200_OK,
    summary="Readiness Check",
    description="Check if the API is ready to serve requests"
)
async def readiness_check():
    """
    Readiness check endpoint
    
    Returns:
        Boolean indicating if system is ready to serve requests
    """
    checks = {}
    
    # Database check
    try:
        db = get_db_session()
        db.execute("SELECT 1")
        db.close()
        checks["database"] = True
    except Exception:
        checks["database"] = False
    
    # LLM check
    try:
        factory = LLMFactory()
        providers = factory.get_available_providers()
        checks["llm"] = any(providers.values())
    except Exception:
        checks["llm"] = False
    
    ready = all(checks.values())
    
    return ReadinessResponse(
        ready=ready,
        checks=checks
    )


@router.get(
    "/liveness",
    status_code=status.HTTP_200_OK,
    summary="Liveness Check",
    description="Simple liveness probe"
)
async def liveness_check():
    """
    Liveness check endpoint
    
    Returns:
        Simple OK response if service is alive
    """
    return {"status": "alive"}
