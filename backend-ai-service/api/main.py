w"""
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
from api.routes import documents, query, workspaces, health, graph, tasks, boards, hitl, indexing

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
    title="Agentic AI Project Management API",
    description="""
    REST API for AI-powered project management with multiple specialized agents:
    
    **Document Agent**: Question answering with RAG (Retrieval-Augmented Generation)
    - Upload documents (PDF, DOCX, TXT, MD, HTML)
    - Ask questions and get answers with citations
    - Multi-turn conversations with memory
    
    **Task Agent**: Task analysis and risk detection
    - Analyze task distribution and workload
    - Detect overdue and blocked tasks
    - Get insights and recommendations
    - Natural language SQL query generation
    
    **Board Agent**: Task visualization and project boards
    - Generate Kanban boards for task tracking
    - Create Gantt charts for timeline planning
    - Visualize task dependencies with flowcharts
    - Support for multiple chart types (Mermaid.js)
    """,
    version="2.0.0",
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
app.include_router(indexing.router, prefix="/api/v1/documents", tags=["Document Indexing"])
app.include_router(query.router, prefix="/api/v1", tags=["Query"])
app.include_router(graph.router, prefix="/api/v1", tags=["Graph"])
app.include_router(tasks.router, prefix="/api/v1", tags=["Task Analysis"])
app.include_router(boards.router, prefix="/api/v1", tags=["Board Visualization"])
app.include_router(hitl.router, prefix="/api/v1", tags=["HITL"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Agentic AI Project Management API",
        "version": "2.0.0",
        "status": "running",
        "agents": {
            "document_agent": "✅ Available - Document Q&A with RAG",
            "task_agent": "✅ Available - Task analysis and insights"
        },
        "docs": "/docs",
        "endpoints": {
            "documents": "/api/v1/workspaces/{workspace_id}/documents",
            "query": "/api/v1/workspaces/{workspace_id}/query",
            "tasks": "/api/v1/workspaces/{workspace_id}/tasks/analyze"
        }
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
