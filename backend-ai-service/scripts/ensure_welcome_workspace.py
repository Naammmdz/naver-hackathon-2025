import sys
import os
from pathlib import Path
import uuid
from datetime import datetime
import logging

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables from .env
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

# Override DATABASE_URL for local execution if needed
if "DATABASE_URL" not in os.environ or "neon.tech" in os.environ.get("DATABASE_URL", ""):
    # Default to local docker mapping
    os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5439/postgres"
    print(f"Set DATABASE_URL to {os.environ['DATABASE_URL']}")

# Ensure Naver keys are mapped correctly
if "CLIENT_ID" in os.environ and "NAVER_CLIENT_ID" not in os.environ:
    os.environ["NAVER_CLIENT_ID"] = os.environ["CLIENT_ID"]
if "CLIENT_SECRET" in os.environ and "NAVER_CLIENT_SECRET" not in os.environ:
    os.environ["NAVER_CLIENT_SECRET"] = os.environ["CLIENT_SECRET"]

from database.connection import get_db_session
from database.models import Workspace, Document, Task, WorkspaceMember, User
from database.repositories.workspace import WorkspaceRepository
from database.repositories.document import DocumentRepository
from database.repositories.task import TaskRepository
# Lazy import to avoid heavy dependencies at startup if not needed
# from api.routes.documents import index_document_content
from sqlalchemy.orm import Session
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ensure_welcome_workspace():
    db = get_db_session()
    try:
        # Get all users
        # Note: User model might not be fully defined in AI service if it's managed by Core
        # We'll use raw SQL to get user IDs to be safe, or try the model if it exists
        try:
            users = db.query(User).all()
            user_ids = [u.id for u in users]
        except Exception:
            logger.info("Could not query User model, falling back to raw SQL")
            result = db.execute(text("SELECT id FROM users"))
            user_ids = [row[0] for row in result]

        logger.info(f"Found {len(user_ids)} users")

        for user_id in user_ids:
            logger.info(f"Checking user: {user_id}")
            
            # Check for "Welcome" workspace
            # We look for a workspace named "Welcome" where the user is a member (or owner)
            # Actually, the Java logic checks if the user has ANY workspace. 
            # But here we specifically want to ensure "Welcome" exists.
            
            # Find workspaces for user
            query = text("""
                SELECT w.id, w.name 
                FROM workspaces w
                JOIN workspace_members wm ON w.id = wm.workspace_id
                WHERE wm.user_id = :user_id AND w.name = 'Welcome'
            """)
            result = db.execute(query, {"user_id": user_id}).fetchone()
            
            workspace_id = None
            if result:
                workspace_id = result[0]
                logger.info(f"✅ User {user_id} already has 'Welcome' workspace: {workspace_id}")
            else:
                logger.info(f"⚠️ User {user_id} missing 'Welcome' workspace. Creating...")
                
                # Create Workspace
                workspace_id = str(uuid.uuid4())
                new_workspace = Workspace(
                    id=workspace_id,
                    name="Welcome",
                    description="Your personal playground to explore the platform.",
                    owner_id=user_id,
                    is_public=False,
                    allow_invites=True,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                db.add(new_workspace)
                
                # Add Member
                member_id = str(uuid.uuid4())
                new_member = WorkspaceMember(
                    id=member_id,
                    workspace_id=workspace_id,
                    user_id=user_id,
                    role="admin", # Owner is admin
                    joined_at=datetime.now()
                )
                db.add(new_member)
                db.commit()
                logger.info(f"Created workspace {workspace_id}")

            # Ensure "Getting Started" document exists
            doc_repo = DocumentRepository(db)
            existing_docs = db.query(Document).filter(
                Document.workspace_id == workspace_id,
                Document.title == "👋 Getting Started"
            ).all()
            
            doc_id = None
            # BlockNote JSON format
            import json
            doc_content_blocks = [
                {
                    "type": "heading",
                    "content": [{"type": "text", "text": "Welcome to Your New Workspace!", "styles": {}}],
                    "props": {"level": 1}
                },
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "This is a demo document to help you get started.", "styles": {}}]
                },
                {
                    "type": "heading",
                    "content": [{"type": "text", "text": "Features", "styles": {}}],
                    "props": {"level": 2}
                },
                {
                    "type": "bulletListItem",
                    "content": [
                        {"type": "text", "text": "Real-time Collaboration", "styles": {"bold": True}},
                        {"type": "text", "text": ": Edit documents with your team.", "styles": {}}
                    ]
                },
                {
                    "type": "bulletListItem",
                    "content": [
                        {"type": "text", "text": "Task Management", "styles": {"bold": True}},
                        {"type": "text", "text": ": Track progress with Kanban boards.", "styles": {}}
                    ]
                },
                {
                    "type": "bulletListItem",
                    "content": [
                        {"type": "text", "text": "Whiteboards", "styles": {"bold": True}},
                        {"type": "text", "text": ": Brainstorm ideas visually.", "styles": {}}
                    ]
                },
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "Try editing this document or create a new one!", "styles": {}}]
                }
            ]
            doc_content = json.dumps(doc_content_blocks)
            
            # Extract text for indexing
            doc_text_for_indexing = ""
            for block in doc_content_blocks:
                if "content" in block and isinstance(block["content"], list):
                    for item in block["content"]:
                        if "text" in item:
                            doc_text_for_indexing += item["text"]
                    doc_text_for_indexing += "\n"
            
            if existing_docs:
                doc_id = existing_docs[0].id
                logger.info(f"✅ 'Getting Started' document exists: {doc_id}")
            else:
                logger.info("Creating 'Getting Started' document...")
                doc_id = str(uuid.uuid4())
                new_doc = Document(
                    id=doc_id,
                    title="👋 Getting Started",
                    content=doc_content,
                    user_id=user_id,
                    workspace_id=workspace_id,
                    icon="👋",
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                    trashed=False
                )
                db.add(new_doc)
                db.commit()
                logger.info(f"Created document {doc_id}")

            # Index the document content
            try:
                from api.routes.documents import index_document_content
                logger.info(f"Indexing document {doc_id}...")
                result = index_document_content(
                    document_id=doc_id,
                    workspace_id=workspace_id,
                    content=doc_text_for_indexing, # Use extracted text for indexing
                    title="Getting Started",
                    db=db
                )
                logger.info(f"Indexing result: {result}")
            except ImportError as e:
                logger.warning(f"Could not import index_document_content (missing dependencies?): {e}")
            except Exception as e:
                logger.error(f"Failed to index document: {e}")

            # Ensure Sample Tasks
            task_repo = TaskRepository(db)
            existing_tasks = db.query(Task).filter(Task.workspace_id == workspace_id).count()
            
            if existing_tasks == 0:
                logger.info("Creating sample tasks...")
                task1 = Task(
                    id=str(uuid.uuid4()),
                    title="Explore the platform",
                    description="Click around and see what you can do.",
                    status="Completed", # Changed from Done
                    priority="Low",
                    user_id=user_id,
                    assignee_id=user_id,
                    workspace_id=workspace_id,
                    order_index=0,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                task2 = Task(
                    id=str(uuid.uuid4()),
                    title="Invite your team",
                    description="Go to Settings > Members to invite others.",
                    status="Todo",
                    priority="High",
                    user_id=user_id,
                    workspace_id=workspace_id,
                    order_index=1,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                db.add(task1)
                db.add(task2)
                db.commit()
                logger.info("Created sample tasks")
            else:
                logger.info("Sample tasks already exist")

    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    try:
        ensure_welcome_workspace()
    except Exception as e:
        logger.error(f"Critical error in ensure_welcome_workspace: {e}", exc_info=True)
        # We exit with 0 to allow the container to start even if this script fails
        # The error is logged for debugging
        sys.exit(0)
