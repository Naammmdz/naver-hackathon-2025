# Phân tích Realtime và Data Storage trong Naver Hackathon 2025

## Tổng quan

Dự án này sử dụng hai hệ thống realtime khác nhau để phục vụ các nhu cầu collaboration khác nhau:

1. **Yjs CRDT** - Cho document editing, tasks, và boards
2. **STOMP WebSocket** - Cho presence tracking và member management

## 1. Yjs Realtime System

### Chức năng
- **Document Editing**: Live collaboration trên BlockNote editor
- **Task Management**: Realtime updates cho tasks và subtasks
- **Board Collaboration**: Canvas drawing và sticky notes
- **Automatic Conflict Resolution**: CRDT đảm bảo consistency

### Kiến trúc
```
Frontend (Yjs CRDT)
    ↕️ Binary WebSocket
Backend (Pure Relay)
    ↕️ Broadcast Binary
Database (PostgreSQL)
    ↕️ Persist Updates
```

### Implementation Details

#### Frontend
- **YjsContext.tsx**: Quản lý Y.Doc và WebSocketProvider
- **use-yjs-sync.ts**: Sync Yjs changes với Zustand stores
- **yjs-helper.ts**: Helper để sync từ stores → Yjs
- **Connection**: `ws://localhost:8989/ws/yjs/{workspaceId}`

#### Backend
- **YjsWebSocketHandler.java**: Nhận và broadcast binary updates
- **YjsConnectionManager.java**: Track connections per workspace
- **YjsDocumentManager.java**: Memory cache cho active workspaces
- **YjsUpdateService.java**: Persist updates vào database

#### Database Schema
```sql
CREATE TABLE yjs_updates (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(160) NOT NULL,
    update_data BYTEA NOT NULL,          -- Binary Yjs data
    update_size INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    user_id VARCHAR(160)
);
```

### Data Flow
1. User edits document → Yjs generates binary update
2. WebSocket sends update to backend
3. Backend broadcasts to all workspace users
4. Other clients apply update → UI updates instantly
5. Update persisted to database asynchronously

## 2. STOMP WebSocket System

### Chức năng
- **User Presence**: Hiển thị ai đang online
- **Cursor Tracking**: Live cursor positions
- **Member Updates**: Invite/remove/update members realtime
- **Workspace Events**: Join/leave notifications

### Implementation Details

#### Frontend
- **CollaborationContext.tsx**: WebSocket connection management
- **CollaborationPresence.tsx**: UI cho active users
- **useRealtimeWorkspaceMembers.ts**: Auto-refresh members
- **Connection**: `ws://localhost:8989/ws/collaboration`

#### Backend
- **CollaborationController.java**: STOMP message handling
- **WebSocketConfig.java**: STOMP broker configuration
- **WebSocketEventListener.java**: Connection lifecycle events

#### Event Types
```typescript
// User presence
{
  type: 'user-joined',
  userId: 'user-123',
  workspaceId: 'workspace-123',
  data: { id, email, name, avatarUrl }
}

// Cursor movement
{
  type: 'cursor-move',
  data: { cursor: { x: 100, y: 200 } }
}

// Member updates
{
  type: 'member-update',
  data: { action: 'refresh' }
}
```

## 3. REST API System

### Task APIs
```typescript
// CRUD operations
taskApi.create(payload)
taskApi.update(id, payload)
taskApi.delete(id)
taskApi.listByWorkspace(workspaceId)

// Advanced operations
taskApi.move(id, status)
taskApi.reorder(status, sourceIndex, destinationIndex)
taskApi.addSubtask(taskId, title)
taskApi.updateSubtask(taskId, subtaskId, updates)
```

### Document APIs
```typescript
// CRUD operations
documentApi.create(payload)
documentApi.update(id, payload, defaults)
documentApi.delete(id)
documentApi.listByWorkspace(workspaceId)

// Content management
documentApi.search(query)
documentApi.listByParent(parentId)
documentApi.restore(id)
```

### Board APIs
```typescript
// CRUD operations
boardApi.create(payload)
boardApi.update(id, payload)
boardApi.updateSnapshot(id, snapshot)
boardApi.listByWorkspace(workspaceId)
```

### Workspace APIs
```typescript
// Workspace management
workspaceApi.createWorkspace(input)
workspaceApi.getWorkspaces()
workspaceApi.updateWorkspace(id, input)

// Member management
workspaceApi.inviteMember(workspaceId, email, role)
workspaceApi.removeMember(workspaceId, memberId)
workspaceApi.updateMemberRole(workspaceId, memberId, role)
workspaceApi.getMembers(workspaceId)
```

## 4. Data Storage Architecture

### Database: PostgreSQL
- **Host**: localhost:5432
- **Database**: naver_hackathon
- **User**: postgres
- **JPA**: Hibernate với ddl-auto=update

### Entity Models

#### Task Entity
```java
@Entity
@Table(name = "tasks")
public class Task {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private LocalDateTime dueDate;
    
    @ElementCollection
    private List<String> tags;
    
    @OneToMany
    private List<Subtask> subtasks;
    
    private Integer orderIndex;
    private String userId;
    private String workspaceId;
}
```

#### Document Entity
```java
@Entity
@Table(name = "documents")
public class Document {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    private String title;
    @Column(columnDefinition = "TEXT")
    private String content; // JSON string
    
    private String userId;
    private String workspaceId;
    private String parentId;
    private Boolean trashed;
    private LocalDateTime trashedAt;
}
```

#### Board Entity
```java
@Entity
@Table(name = "boards")
public class Board {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    private String title;
    @Column(columnDefinition = "TEXT")
    private String snapshot; // JSON string
    
    private String userId;
    private String workspaceId;
}
```

### Yjs Persistence Strategy
- **Memory Cache**: YjsDocumentManager lưu active workspaces
- **Database Backup**: yjs_updates table lưu binary updates
- **Recovery**: Load từ DB khi user đầu tiên connect
- **Isolation**: Mỗi workspace có Y.Doc riêng

## 5. Integration Flow

### Create Task Flow
```
1. User clicks "Create Task"
2. taskApi.create() → Backend validates & saves to DB
3. Backend returns Task object
4. TaskStore updates local state
5. yjsHelper.syncTaskToYjs(task) → Yjs generates update
6. WebSocket sends binary update
7. Backend broadcasts to other users
8. Other clients receive → Yjs applies → Store updates → UI re-renders
```

### Edit Document Flow
```
1. User types in BlockNote
2. BlockNote → Yjs operations → Binary update
3. WebSocket → Backend relay → Broadcast
4. Other clients → Apply update → Editor updates
5. Async: Update persisted to yjs_updates table
```

### Invite Member Flow
```
1. User invites member via workspaceApi.inviteMember()
2. Backend creates invite & saves to DB
3. Frontend broadcasts 'member-update' via STOMP
4. All workspace users receive event
5. Frontends call workspaceApi.getMembers() → Update UI
```

## 6. Performance Characteristics

### Yjs System
- **Update Size**: 100-500 bytes per operation
- **Latency**: <50ms local network
- **Memory**: ~1-10 MB per active workspace
- **Persistence**: Async writes, <5ms response time

### STOMP System
- **Message Size**: JSON events, ~1-5 KB
- **Connections**: Per-user, not per-workspace
- **Broadcast**: To all workspace members

### Database
- **Connection Pool**: HikariCP, max 20 connections
- **Batch Size**: 50 cho bulk operations
- **Indexes**: Optimized cho workspace queries

## 7. Monitoring & Debugging

### Yjs APIs
```
GET /api/yjs/workspaces/{workspaceId}/stats
GET /api/yjs/stats
DELETE /api/yjs/workspaces/{workspaceId}/cache
POST /api/yjs/workspaces/{workspaceId}/prune?keepDays=30
```

### WebSocket Debugging
```bash
# Check backend logs
tail -f logs/spring.log | grep WebSocket

# Frontend console
localStorage.debug = 'collaboration:*'
```

## 8. Future Enhancements

### Short-term
- Yjs state snapshots để giảm load time
- Compression cho large updates
- Automatic pruning scheduler

### Long-term
- Redis cho multi-server scaling
- Yjs provider plugins
- Advanced conflict resolution UI

## Kết luận

Hệ thống sử dụng hybrid approach:
- **Yjs CRDT**: Đảm bảo realtime collaboration với conflict resolution
- **STOMP WebSocket**: Presence và member management
- **REST APIs**: Traditional CRUD operations
- **PostgreSQL**: Persistent storage với memory cache

Kiến trúc này đảm bảo performance, scalability, và user experience tốt cho collaborative workspace.