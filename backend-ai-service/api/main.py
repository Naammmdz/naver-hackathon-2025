"""
Main FastAPI Application

Provides REST API endpoints for:
- Document management (upload, ingest)
- Question answering with RAG
- Workspace management
- Health monitoring
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import sys
from pathlib import Path

# Add parent directory to path
if str(Path(__file__).parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.logger import get_logger
from api.routes import documents, query, workspaces, health, graph

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting Document RAG API Server")
    yield
    # Shutdown
    logger.info("👋 Shutting down Document RAG API Server")


# Create FastAPI app
app = FastAPI(
    title="Document RAG API",
    description="REST API for Document-based Question Answering with Retrieval-Augmented Generation",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(workspaces.router, prefix="/api/v1", tags=["Workspaces"])
app.include_router(documents.router, prefix="/api/v1", tags=["Documents"])
app.include_router(query.router, prefix="/api/v1", tags=["Query"])
app.include_router(graph.router, prefix="/api/v1", tags=["Graph"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Document RAG API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
