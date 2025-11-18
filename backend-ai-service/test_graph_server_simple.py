"""
Simple test server for graph API - Always uses demo data
No database required
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Graph API Test Server")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_demo_data():
    """Return empty graph - waiting for real documents from database"""
    return {
        "nodes": [],
        "links": []
    }

@app.get("/api/v1/graph")
async def get_workspace_graph(workspace_id: str = Query(None, description="Workspace ID")):
    """Get graph data for workspace - returns demo data for now"""
    print(f"📊 Graph request for workspace: {workspace_id}")
    return get_demo_data()

@app.get("/api/v1/graph/demo")
async def get_demo_graph():
    """Demo graph data"""
    print("📊 Demo graph request")
    return get_demo_data()

@app.get("/")
async def root():
    return {
        "name": "Graph API Test Server",
        "status": "running",
        "endpoints": ["/api/v1/graph", "/api/v1/graph/demo"]
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Graph API Test Server on http://localhost:8000")
    print("📊 Endpoints:")
    print("   - http://localhost:8000/api/v1/graph?workspace_id=xxx")
    print("   - http://localhost:8000/api/v1/graph/demo")
    print("⚠️  Using demo data (no database connection)")
    uvicorn.run(app, host="0.0.0.0", port=8000)

