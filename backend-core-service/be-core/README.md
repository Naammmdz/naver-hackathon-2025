# Backend Core Service

A Spring Boot REST API backend for the Naver Hackathon 2025 frontend application. This service provides CRUD operations for tasks, documents, and task-document relationships.

## Features

- **Task Management**: Create, read, update, delete tasks with subtasks, priorities, due dates, and tags
- **Document Management**: Manage documents with hierarchical structure and soft delete functionality
- **Task-Document Linking**: Link tasks with documents using different relation types (reference, reflection, resource)
- **Filtering & Search**: Advanced filtering and search capabilities for tasks and documents

## Technology Stack

- **Java 21**
- **Spring Boot 3.5.7**
- **Spring Data JPA**
- **PostgreSQL**
- **Lombok**
- **Maven**

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/{id}` - Get task by ID
- `GET /api/tasks/status/{status}` - Get tasks by status
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `PATCH /api/tasks/{id}/status` - Move task to different status
- `PATCH /api/tasks/reorder` - Reorder tasks within status
- `POST /api/tasks/{taskId}/subtasks` - Add subtask
- `PUT /api/tasks/{taskId}/subtasks/{subtaskId}` - Update subtask
- `DELETE /api/tasks/{taskId}/subtasks/{subtaskId}` - Delete subtask
- `GET /api/tasks/filter` - Filter tasks with query parameters

### Documents
- `GET /api/documents` - Get all documents
- `GET /api/documents/{id}` - Get document by ID
- `GET /api/documents/parent/{parentId}` - Get documents by parent ID
- `GET /api/documents/trashed` - Get trashed documents
- `POST /api/documents` - Create new document
- `PUT /api/documents/{id}` - Update document
- `DELETE /api/documents/{id}` - Soft delete document
- `DELETE /api/documents/{id}/permanent` - Permanently delete document
- `PATCH /api/documents/{id}/restore` - Restore document
- `GET /api/documents/search?q={query}` - Search documents

### Task-Document Relations
- `GET /api/task-docs` - Get all task-doc relations
- `GET /api/task-docs/{id}` - Get relation by ID
- `GET /api/task-docs/task/{taskId}` - Get relations by task ID
- `GET /api/task-docs/document/{docId}` - Get relations by document ID
- `GET /api/task-docs/task/{taskId}/relation/{relationType}` - Get relations by task and type
- `POST /api/task-docs` - Create new relation
- `PUT /api/task-docs/{id}` - Update relation
- `DELETE /api/task-docs/{id}` - Delete relation
- `DELETE /api/task-docs/task/{taskId}` - Delete all relations for task
- `DELETE /api/task-docs/document/{docId}` - Delete all relations for document

## Database Schema

The application uses PostgreSQL with the following main tables:
- `tasks` - Task entities
- `subtasks` - Subtask entities
- `task_tags` - Task tags (many-to-many)
- `documents` - Document entities
- `task_docs` - Task-document relations
- `yjs_updates` - **NEW**: Yjs CRDT persistence for realtime collaboration
- `workspaces` - Workspace entities
- `workspace_members` - Workspace member relations

### Yjs Persistence (NEW)

The backend now persists Yjs CRDT updates to database for data durability:

```sql
-- Table stores binary Yjs updates
CREATE TABLE yjs_updates (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(160) NOT NULL,
    update_data BYTEA NOT NULL,
    update_size INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    user_id VARCHAR(160)
);
```

**Why?** Without persistence, Yjs updates only exist in memory. When server restarts or all users disconnect, collaboration data is lost. This table ensures updates survive restarts and can be recovered.

See `docs/YJS_PERSISTENCE_IMPLEMENTATION.md` for full details.

## Configuration

The application is configured to use H2 in-memory database for development. For production, update `src/main/resources/application.properties` with PostgreSQL credentials:

```properties
# For PostgreSQL (production)
spring.datasource.url=jdbc:postgresql://localhost:5432/naver_hackathon
spring.datasource.username=postgres
spring.datasource.password=password
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

# For H2 (development - default)
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console
```

## Running the Application

1. Ensure PostgreSQL is running
2. Update database configuration in `application.properties`
3. **Create yjs_updates table** (if not auto-created):
   ```bash
   psql -U postgres -d naver_hackathon -f src/main/resources/db/migration/V6__Create_yjs_updates_table.sql
   ```
4. Run with Maven:
   ```bash
   ./mvnw spring-boot:run
   ```

The application will start on port 8989.

### Yjs Management Endpoints (NEW)

Monitor and manage Yjs CRDT persistence:

```bash
# Get workspace statistics
curl http://localhost:8989/api/yjs/workspaces/{workspaceId}/stats

# Get system statistics
curl http://localhost:8989/api/yjs/stats

# Clear workspace cache (force reload from DB)
curl -X DELETE http://localhost:8989/api/yjs/workspaces/{workspaceId}/cache

# Prune old updates (keep last 30 days)
curl -X POST http://localhost:8989/api/yjs/workspaces/{workspaceId}/prune?keepDays=30
```

## CORS Configuration

CORS is configured to allow requests from any origin (`*`). For production, update the allowed origins in the controller annotations or application properties.

## Development

- The application uses JPA with `ddl-auto=update` for automatic schema updates
- Logging is configured for DEBUG level on the application package
- Lombok is used for reducing boilerplate code