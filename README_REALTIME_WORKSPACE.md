# Realtime Workspace Integration - Tasks, Documents, Boards

Hệ thống realtime collaborative đã được tích hợp cho toàn bộ workspace, bao gồm Tasks, Documents, và Boards.

## Kiến trúc Workspace Realtime

### Workspace-Level Yjs Document
Mỗi workspace có một Yjs document riêng (`workspace-{id}`) để sync:
- **Tasks**: Task metadata và order trong các columns
- **Boards**: Board metadata và canvas content
- **Documents**: Individual document content (đã có từ trước)

### Data Structures trong Yjs

```typescript
Y.Doc {
  tasks: Y.Map<Task>           // Tất cả tasks trong workspace
  taskOrders: Y.Map<Y.Array>  // Order của tasks trong mỗi column
  boards: Y.Map<Board>        // Board metadata
  boardContent: Y.Map<BoardSnapshot>  // Board canvas content
}
```

## Frontend Integration

### 1. Workspace Yjs Provider
`useWorkspaceYjs` hook tạo kết nối Yjs cho toàn bộ workspace:

```tsx
import { useWorkspaceYjs } from '@/hooks/useWorkspaceYjs';

const { tasksMap, taskOrdersMap, boardsMap, boardContentMap } = useWorkspaceYjs({
  workspaceId: activeWorkspaceId,
  enabled: !!activeWorkspaceId,
});
```

### 2. Task Sync
`useTaskYjsSync` tự động sync tasks giữa Zustand store và Yjs:

- **Zustand → Yjs**: Khi task được update trong store, tự động sync vào Yjs
- **Yjs → Zustand**: Khi có update từ Yjs, tự động update store

### 3. Board Sync
`useBoardYjsSync` tự động sync boards:

- Board metadata (title, etc.)
- Board canvas content (Excalidraw snapshot)

### 4. Document Sync
Documents vẫn sử dụng `YjsDocumentEditor` với document-level Yjs (`document-{id}`).

## Backend Integration

### Metadata Updates via Redis

Backend publish metadata updates vào Redis channel `metadata-channel`:

#### Task Updates
```json
{
  "type": "task",
  "id": "task-123",
  "action": "UPDATE" | "STATUS_CHANGE" | "MOVE",
  "payload": "..."
}
```

#### Board Updates
```json
{
  "type": "board",
  "id": "board-123",
  "action": "RENAME" | "CONTENT_UPDATE",
  "payload": "..."
}
```

#### Document Updates
```json
{
  "docId": "doc-123",
  "action": "RENAME",
  "payload": "New Name"
}
```

Hocuspocus server listens Redis và broadcast stateless messages đến clients.

## Data Flow

### Task Updates
1. User A updates task → `updateTask()` → Zustand store
2. `useTaskYjsSync` syncs to Yjs → Hocuspocus → Broadcast
3. User B receives update → Yjs → Zustand store → UI updates

### Board Canvas Updates
1. User A draws on canvas → Excalidraw updates → `updateBoardContent()`
2. `useBoardYjsSync` syncs to Yjs → Hocuspocus → Broadcast
3. User B sees canvas update realtime

### Document Content
1. User A types → BlockNote → Yjs document (`document-{id}`)
2. Hocuspocus syncs → User B sees typing

## Usage

### AppWrapper Integration
Realtime sync được tự động enable trong `AppWrapper`:

```tsx
// Workspace Yjs connection
const { tasksMap, taskOrdersMap, boardsMap, boardContentMap } = useWorkspaceYjs({
  workspaceId: activeWorkspaceId,
  enabled: !!activeWorkspaceId && isSignedIn,
});

// Auto-sync tasks
useTaskYjsSync({
  tasksMap,
  taskOrdersMap,
  enabled: !!tasksMap && !!taskOrdersMap && isYjsConnected,
});

// Auto-sync boards
useBoardYjsSync({
  boardsMap,
  boardContentMap,
  enabled: !!boardsMap && !!boardContentMap && isYjsConnected,
});
```

## Testing

1. **Multi-user Task Updates**:
   - Mở 2 browser windows cùng workspace
   - User A tạo/update task → User B thấy ngay

2. **Board Collaboration**:
   - Mở 2 browser windows
   - User A vẽ trên canvas → User B thấy realtime

3. **Document Editing**:
   - Mở 2 browser windows
   - User A types → User B thấy cursor và text

## Performance Considerations

- **Debouncing**: Task/Board updates có thể cần debounce để tránh quá nhiều syncs
- **Batch Updates**: Nhiều updates cùng lúc được batch trong Yjs
- **Connection Status**: UI hiển thị connection status để user biết khi nào realtime sync active

## Troubleshooting

### Tasks không sync
- Kiểm tra `tasksMap` và `taskOrdersMap` có null không
- Kiểm tra workspace Yjs connection (`isYjsConnected`)
- Xem console logs cho errors

### Boards không sync
- Kiểm tra `boardsMap` và `boardContentMap`
- Verify board content được update đúng format

### Permission Issues
- Kiểm tra `/api/internal/check-permission` endpoint
- Verify JWT token có hợp lệ
- Check workspace membership

