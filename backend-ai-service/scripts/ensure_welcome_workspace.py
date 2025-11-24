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

            # Ensure specific user is added as admin
            target_email = "thanh.nx225460@sis.hust.edu.vn"
            try:
                target_user_id = None
                # Try to find user by email
                result = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": target_email}).fetchone()
                if result:
                    target_user_id = result[0]
                else:
                    # Create user if missing
                    logger.info(f"User {target_email} not found. Creating...")
                    target_user_id = str(uuid.uuid4())
                    new_user = User(
                        id=target_user_id,
                        email=target_email,
                        name="Thanh NX", # Default name
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                    db.add(new_user)
                    db.commit()
                    logger.info(f"Created user {target_email} with ID {target_user_id}")
                
                if target_user_id:
                    # Check if already a member
                    member_check = db.execute(text(
                        "SELECT 1 FROM workspace_members WHERE workspace_id = :wid AND user_id = :uid"
                    ), {"wid": workspace_id, "uid": target_user_id}).fetchone()
                    
                    if not member_check:
                        logger.info(f"Adding {target_email} as admin to workspace {workspace_id}")
                        new_admin_member = WorkspaceMember(
                            id=str(uuid.uuid4()),
                            workspace_id=workspace_id,
                            user_id=target_user_id,
                            role="admin",
                            joined_at=datetime.now()
                        )
                        db.add(new_admin_member)
                        db.commit()
            except Exception as e:
                logger.warning(f"Failed to add target admin user: {e}")

            # Ensure 'tagiangnamttg@gmail.com' is added as member
            member_email = "tagiangnamttg@gmail.com"
            try:
                member_user_id = None
                result = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": member_email}).fetchone()
                if result:
                    member_user_id = result[0]
                else:
                    logger.info(f"User {member_email} not found. Creating...")
                    member_user_id = str(uuid.uuid4())
                    new_member_user = User(
                        id=member_user_id,
                        email=member_email,
                        name="Giang Nam",
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                    db.add(new_member_user)
                    db.commit()
                    logger.info(f"Created user {member_email} with ID {member_user_id}")
                
                if member_user_id:
                    member_check = db.execute(text(
                        "SELECT 1 FROM workspace_members WHERE workspace_id = :wid AND user_id = :uid"
                    ), {"wid": workspace_id, "uid": member_user_id}).fetchone()
                    
                    if not member_check:
                        logger.info(f"Adding {member_email} as member to workspace {workspace_id}")
                        new_workspace_member = WorkspaceMember(
                            id=str(uuid.uuid4()),
                            workspace_id=workspace_id,
                            user_id=member_user_id,
                            role="member",
                            joined_at=datetime.now()
                        )
                        db.add(new_workspace_member)
                        db.commit()
            except Exception as e:
                logger.warning(f"Failed to add target member user: {e}")

            # Document Creation Helper
            import json
            from api.routes.documents import index_document_content

            def ensure_doc(title, content_blocks, parent_id=None, icon=None):
                existing = db.query(Document).filter(
                    Document.workspace_id == workspace_id,
                    Document.title == title
                ).first()
                
                doc_id = None
                if existing:
                    doc_id = existing.id
                    logger.info(f"✅ Document '{title}' exists: {doc_id}")
                    # Update parent_id if needed (to fix hierarchy if it changed)
                    if existing.parent_id != parent_id:
                        existing.parent_id = parent_id
                        db.commit()
                else:
                    logger.info(f"Creating document '{title}'...")
                    doc_id = str(uuid.uuid4())
                    doc_content = json.dumps(content_blocks)
                    new_doc = Document(
                        id=doc_id,
                        title=title,
                        content=doc_content,
                        user_id=user_id,
                        workspace_id=workspace_id,
                        parent_id=parent_id,
                        icon=icon,
                        created_at=datetime.now(),
                        updated_at=datetime.now(),
                        trashed=False
                    )
                    db.add(new_doc)
                    db.commit()
                    logger.info(f"Created document {doc_id}")

                    # Indexing
                    doc_text_for_indexing = ""
                    for block in content_blocks:
                        if "content" in block and isinstance(block["content"], list):
                            for item in block["content"]:
                                if "text" in item:
                                    doc_text_for_indexing += item["text"]
                            doc_text_for_indexing += "\n"
                    
                    try:
                        logger.info(f"Indexing document {doc_id}...")
                        result = index_document_content(
                            document_id=doc_id,
                            workspace_id=workspace_id,
                            content=doc_text_for_indexing,
                            title=title,
                            db=db
                        )
                        logger.info(f"Indexing result: {result}")
                    except Exception as e:
                        logger.error(f"Failed to index document: {e}")
                
                return doc_id

            # 1. Getting Started (Root)
            gs_blocks = [
                {"type": "heading", "content": [{"type": "text", "text": "Welcome to Your New Workspace!", "styles": {}}], "props": {"level": 1}},
                {"type": "paragraph", "content": [{"type": "text", "text": "This is a demo document to help you get started.", "styles": {}}]},
                {"type": "heading", "content": [{"type": "text", "text": "Features", "styles": {}}], "props": {"level": 2}},
                {"type": "bulletListItem", "content": [{"type": "text", "text": "Real-time Collaboration", "styles": {"bold": True}}, {"type": "text", "text": ": Edit documents with your team.", "styles": {}}]},
                {"type": "bulletListItem", "content": [{"type": "text", "text": "Task Management", "styles": {"bold": True}}, {"type": "text", "text": ": Track progress with Kanban boards.", "styles": {}}]}
            ]
            gs_id = ensure_doc("👋 Getting Started", gs_blocks, icon="👋")

            # 2. Project Overview (Child of Getting Started)
            overview_blocks = [
                {"type": "heading", "content": [{"type": "text", "text": "Project Overview", "styles": {}}], "props": {"level": 1}},
                {"type": "paragraph", "content": [{"type": "text", "text": "This project aims to revolutionize the way we work.", "styles": {}}]},
                {"type": "heading", "content": [{"type": "text", "text": "Goals", "styles": {}}], "props": {"level": 2}},
                {"type": "bulletListItem", "content": [{"type": "text", "text": "Improve efficiency", "styles": {}}]},
                {"type": "bulletListItem", "content": [{"type": "text", "text": "Enhance collaboration", "styles": {}}]}
            ]
            ensure_doc("📋 Project Overview", overview_blocks, parent_id=gs_id, icon="📋")

            # 3. Team Guidelines (Child of Getting Started)
            guidelines_blocks = [
                {"type": "heading", "content": [{"type": "text", "text": "Team Guidelines", "styles": {}}], "props": {"level": 1}},
                {"type": "paragraph", "content": [{"type": "text", "text": "Please follow these guidelines for effective communication.", "styles": {}}]},
                {"type": "bulletListItem", "content": [{"type": "text", "text": "Be respectful", "styles": {}}]},
                {"type": "bulletListItem", "content": [{"type": "text", "text": "Communicate clearly", "styles": {}}]}
            ]
            ensure_doc("🛡️ Team Guidelines", guidelines_blocks, parent_id=gs_id, icon="🛡️")

            # 4. Meeting Notes (Root)
            notes_blocks = [
                {"type": "heading", "content": [{"type": "text", "text": "Meeting Notes", "styles": {}}], "props": {"level": 1}},
                {"type": "paragraph", "content": [{"type": "text", "text": "Folder for all meeting notes.", "styles": {}}]}
            ]
            notes_id = ensure_doc("📅 Meeting Notes", notes_blocks, icon="📅")

            # 5. Kickoff Meeting (Child of Meeting Notes)
            kickoff_blocks = [
                {"type": "heading", "content": [{"type": "text", "text": "Kickoff Meeting", "styles": {}}], "props": {"level": 1}},
                {"type": "paragraph", "content": [{"type": "text", "text": "Date: 2025-11-24", "styles": {}}]},
                {"type": "heading", "content": [{"type": "text", "text": "Agenda", "styles": {}}], "props": {"level": 2}},
                {"type": "bulletListItem", "content": [{"type": "text", "text": "Introduction", "styles": {}}]},
                {"type": "bulletListItem", "content": [{"type": "text", "text": "Scope definition", "styles": {}}]}
            ]
            ensure_doc("🚀 Kickoff Meeting", kickoff_blocks, parent_id=notes_id, icon="🚀")

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
