# Phân tích Hệ thống Realtime và Data Storage - Naver Hackathon 2025

## Tổng quan

Dự án này sử dụng **hybrid architecture** với 3 hệ thống realtime:

1. **Yjs CRDT** - Cho document editing, tasks, boards (binary WebSocket)
2. **STOMP WebSocket** - Cho presence tracking và member management (JSON WebSocket)
3. **REST APIs** - Cho CRUD operations và data persistence

**Backend KHÔNG decode Yjs data** - chỉ lưu binary blobs để persistence và relay.

---

## 1. Yjs CRDT System

### Chức năng
- **Document Editing**: Live collaboration trên BlockNote editor
- **Task Management**: Realtime sync cho tasks và subtasks
- **Board Collaboration**: Canvas drawing và sticky notes
- **Automatic Conflict Resolution**: CRDT đảm bảo consistency

### Backend Implementation
```java
// YjsWebSocketHandler - Pure relay, KHÔNG parse business logic
protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
    byte[] update = message.getPayload().array();
    documentManager.storeUpdate(workspaceId, update, senderId); // ← Lưu binary
    connectionManager.broadcastToWorkspace(workspaceId, senderId, message); // ← Relay
}
```

### Database Schema
```sql
CREATE TABLE yjs_updates (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(160) NOT NULL,
    update_data BYTEA NOT NULL,          -- ← Binary Yjs data
    update_size INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    user_id VARCHAR(160)
);
```

---

## 2. STOMP WebSocket System

### Chức năng
- **User Presence**: Hiển thị ai đang online
- **Cursor Tracking**: Live cursor positions
- **Member Updates**: Invite/remove/update members realtime

### Event Types
```typescript
// User presence
{
  type: 'user-joined',
  userId: 'user-123',
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

---

## 3. REST API System

### Task APIs
```typescript
taskApi.create()     // → Task entity → DB
taskApi.update()     // → Task entity → DB
taskApi.delete()     // → Delete from DB
taskApi.move()       // → Update status/order
taskApi.reorder()    // → Update order indexes
```

### Document APIs
```typescript
documentApi.create()    // → Document entity → DB
documentApi.update()    // → Document entity → DB (auto-save)
documentApi.delete()    // → Soft delete (trashed)
documentApi.search()    // → Query documents
```

### Board APIs
```typescript
boardApi.create()           // → Board entity → DB
boardApi.update()           // → Update title
boardApi.updateSnapshot()   // → Update canvas data → DB
boardApi.delete()           // → Delete from DB
```

---

## 4. Data Storage Architecture

### PostgreSQL Database
- **Host**: localhost:5432
- **Database**: naver_hackathon
- **JPA**: Hibernate với ddl-auto=update

### Entity Models

#### Task Entity
```java
@Entity
@Table(name = "tasks")
public class Task {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private String title, description;
    private TaskStatus status;
    private TaskPriority priority;
    private LocalDateTime dueDate;
    @ElementCollection
    private List<String> tags;
    @OneToMany
    private List<Subtask> subtasks;
    private Integer orderIndex;
    private String userId, workspaceId;
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
    private String userId, workspaceId;
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
    private String userId, workspaceId;
}
```

---

## 5. Sync Patterns

### Document (2 luồng)

#### Luồng 1: Realtime Editing
```
BlockNote onChange → Yjs sync → Binary update → WebSocket → Backend stores binary
```

#### Luồng 2: Auto-Save
```
Content changes → scheduleSave (600ms) → documentApi.update() → DB + yjsHelper.syncDocumentToYjs()
```

### Board (2 luồng)

#### Luồng 1: Realtime Editing
```
Excalidraw changes → Yjs sync → Binary update → WebSocket → Backend stores binary
```

#### Luồng 2: Save on Change
```
Canvas changes → updateBoardContent() → boardApi.updateSnapshot() → DB + yjsHelper.syncBoardToYjs()
```

### Task (1 luồng)

#### Luồng CRUD + Sync
```
Form submit → updateTask() → taskApi.update() → DB + yjsHelper.syncTaskToYjs()
```

---

## 6. Integration Flow

### Create Task Flow
```
1. User A submit form → taskApi.create() → Backend saves to Task entity
2. API success → yjsHelper.syncTaskToYjs(created) → Yjs binary update
3. Binary update → WebSocket → Backend stores to yjs_updates table
4. Backend broadcasts → User B receives → Yjs applies → Store updates → UI re-renders
```

### Edit Document Flow
```
Realtime: BlockNote → Yjs → Binary → WebSocket → Store binary
Auto-save: Content change → 600ms → documentApi.update() → DB + Yjs sync
```

### Edit Board Flow
```
Realtime: Excalidraw → Yjs → Binary → WebSocket → Store binary
Save: Canvas change → boardApi.updateSnapshot() → DB + Yjs sync
```

---

## 7. Performance Characteristics

### Yjs System
- **Update Size**: 100-500 bytes per operation
- **Latency**: <50ms local network
- **Memory**: ~1-10 MB per active workspace
- **Persistence**: Async writes, <5ms response time

### STOMP System
- **Message Size**: JSON events, ~1-5 KB
- **Connections**: Per-user, not per-workspace

### Database
- **Connection Pool**: HikariCP, max 20 connections
- **Batch Size**: 50 cho bulk operations

---

## 8. Key Insights

### Backend không decode Yjs data
- Yjs binary updates được lưu nguyên dưới dạng BYTEA
- Backend chỉ relay, không parse business logic
- Recovery bằng cách replay binary updates vào Yjs

### Hybrid Storage Strategy
- **Relational DB**: Primary storage cho structured data
- **Yjs Binary**: Backup và realtime sync
- **Recovery**: Load từ DB → Apply binary → Reconstruct state

### Sync Patterns khác nhau
- **Document/Board**: Realtime editing + persistence backup
- **Task**: CRUD operations + realtime sync
- **Tất cả**: Đều có API calls + Yjs sync

### Live Collaboration cho tất cả
- Task, Document, Board đều live update cho tất cả clients
- Trigger khác nhau nhưng mechanism giống nhau
- Yjs đảm bảo consistency và conflict resolution

---

## 9. Future Enhancements

### Short-term
- Yjs state snapshots để giảm load time
- Compression cho large updates
- Automatic pruning scheduler

### Long-term
- Redis cho multi-server scaling
- Yjs provider plugins
- Advanced conflict resolution UI

---

## 10. Câu hỏi thường gặp

### Yjs data có được decode không?
**Không**. Backend chỉ lưu binary blobs, không parse thành task/document/board riêng biệt.

### Task có live update không?
**Có**. Task sync qua Yjs sau API success, tạo live update cho tất cả clients.

### Tất cả đều có API calls?
**Đúng**. Task, document, board đều có REST APIs để persist data vào relational DB.

### Tại sao cần cả entity và Yjs?
**Hybrid approach**: Entity cho structured data & queries, Yjs cho realtime sync & recovery.

---

*Document được tạo từ phân tích hệ thống realtime và data storage - Naver Hackathon 2025*