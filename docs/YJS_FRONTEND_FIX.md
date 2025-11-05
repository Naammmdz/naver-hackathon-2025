# Yjs Frontend Integration Fix

## Problem Identified

The Yjs frontend implementation was **incomplete** - it could **receive** updates from the backend but couldn't **send** local changes back to the server. This meant:

- ✅ Backend → Frontend sync worked (one-way)
- ❌ Frontend → Backend sync was missing (no bidirectional collaboration)
- ❌ Changes made by one client would not propagate to other clients

## Root Cause

The `YjsContext.tsx` implementation had:

1. **WebSocket message receiving** (`ws.onmessage`) - ✅ Working
2. **No Y.Doc update listener** - ❌ Missing
3. **No WebSocket sending of local changes** - ❌ Missing

This is a critical omission because Yjs CRDT requires both:
- Listening to remote updates: `Y.applyUpdate(doc, remoteUpdate, "remote")`
- Listening to local updates: `doc.on("update", handler)`
- Sending local updates: `ws.send(localUpdate)`

## Solution Implemented

### 1. Added Y.Doc Update Listener

```typescript
// Listen for local Y.Doc updates and send to server
const updateHandler = (update: Uint8Array, origin: unknown) => {
  // Don't send updates that came from remote (to avoid loops)
  if (origin === "remote") {
    return;
  }
  
  // Send binary update to server
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(update);
  }
};

doc.on("update", updateHandler);
```

**Why this works:**
- Any local change to the Y.Doc (via `useYjsAdapter` stores) triggers the `"update"` event
- The handler receives a binary update (Uint8Array) representing the change
- We check if `origin === "remote"` to avoid echoing back updates we received from the server
- We send the update as a binary WebSocket message (matching backend's `handleBinaryMessage`)

### 2. Added Origin Parameter to Remote Updates

```typescript
// Before (wrong):
Y.applyUpdate(doc, update);

// After (correct):
Y.applyUpdate(doc, update, "remote");
```

**Why this is critical:**
- When we receive an update from the server and apply it, Y.Doc triggers the `"update"` event
- Without the `"remote"` origin marker, our update handler would send it back to the server
- This creates an infinite loop: receive → apply → send → receive → apply → send...
- The origin parameter lets us distinguish local changes from remote ones

### 3. Cleanup Update Listener on Disconnect

```typescript
ws.onclose = () => {
  // Clean up Y.Doc update listener
  doc.off("update", updateHandler);
  
  wsRef.current = null;
  setStatus("disconnected");
  scheduleReconnect();
};
```

**Why this matters:**
- Prevents memory leaks
- Ensures we don't try to send on a closed WebSocket
- Properly tears down the connection when workspace changes or component unmounts

## Backend Protocol Compatibility

The backend `YjsWebSocketHandler` expects:

```java
@Override
protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
    final byte[] update = toByteArray(message.getPayload());
    documentManager.applyLocalUpdate(context.workspaceId(), update, ...);
    broadcastToWorkspace(context.workspaceId(), context.sessionId(), update);
}
```

Our frontend now sends updates in exactly this format:
- Binary WebSocket message (not text)
- Raw Uint8Array from Y.Doc (no JSON encoding)
- Matches the backend's expectation perfectly

## Complete Sync Flow

### Before Fix (One-Way Only)
```
Backend → WebSocket → Frontend ✅
Frontend → (nowhere) ❌
```

### After Fix (Bidirectional)
```
Client A                    Backend                     Client B
   │                           │                           │
   │ (local change to Y.Doc)   │                           │
   │ ─────────────────────────>│                           │
   │                           │ (merge & broadcast)       │
   │                           │ ─────────────────────────>│
   │                           │                           │ (apply update)
   │                           │                           │ (UI updates)
   │                           │                           │
   │                           │<───────────────────────── │ (local change)
   │ (receive broadcast)       │                           │
   │<─────────────────────────│                           │
   │ (apply update)            │                           │
   │ (UI updates)              │                           │
```

## Testing the Fix

### 1. Start All Services
```bash
# Backend Core Service (port 8989)
cd backend-core-service/be-core
./mvnw spring-boot:run

# Backend Realtime Service (port 8090)
cd backend-core-service/backend-realtime-service
./mvnw spring-boot:run

# Node Codec Service (port 50051)
cd node-codec
npm start

# Frontend (port 5173)
cd frontend
npm run dev
```

### 2. Test Real-Time Collaboration

1. Open two browser windows side-by-side
2. Sign in to the same workspace in both
3. In **Window A**: Create a new task
4. **Window B** should immediately see the new task (no refresh needed)
5. In **Window B**: Edit the task title
6. **Window A** should see the title update in real-time
7. Check browser console for WebSocket logs showing bidirectional sync

### 3. Expected Logs

**Frontend Console:**
```
WebSocket connected to: ws://localhost:8090/ws/yjs?workspaceId=...
Received binary update: 42 bytes
Sent local update: 38 bytes
```

**Backend Logs:**
```
Client abc123... joined realtime workspace ... (role=OWNER, connections=2)
Applying local update: 38 bytes from client abc123...
Broadcasting update to 1 other clients
```

## Architecture Summary

### Frontend Components

1. **YjsContext.tsx** (Provider)
   - Manages WebSocket connection lifecycle
   - Handles doc creation and cleanup
   - **NOW: Listens to Y.Doc updates and sends to backend** ✅
   - Applies remote updates with "remote" origin
   - Implements reconnection logic

2. **useYjsAdapter.ts** (Hook)
   - Syncs Zustand stores with Y.Doc shared types
   - Converts store changes → Y.Doc updates (triggers `doc.on("update")`)
   - Converts Y.Doc updates → store changes (via `observeDeep`)
   - Handles hydration and conflict resolution

3. **RealtimeProvider.tsx** (Wrapper)
   - Integrates with Clerk authentication
   - Fetches JWT tokens for WebSocket auth
   - Passes workspaceId, userId, authToken to YjsProvider

4. **AppWrapper.tsx** (Application)
   - Uses useYjsAdapter for tasks, documents, boards stores
   - Displays connection status indicators
   - Coordinates data loading and workspace switching

### Backend Services

1. **YjsWebSocketHandler.java** (WebSocket)
   - Authenticates connections via Clerk JWT
   - Validates workspace membership
   - Receives binary updates from clients
   - Broadcasts to other clients in workspace room
   - Persists snapshots via YjsDocumentManager

2. **YjsDocumentManager.java** (CRDT)
   - Maintains in-memory Y.Doc per workspace
   - Merges incoming updates
   - Computes deltas for new clients
   - Delegates to GrpcYjsCodec for encoding

3. **GrpcYjsCodec.java** (gRPC Client)
   - Calls node-codec service for Yjs operations
   - Encodes state vectors and updates
   - Merges updates from multiple sources

4. **server.js** (Node Codec)
   - gRPC service implementing Yjs CRDT operations
   - MergeUpdates, EncodeStateAsUpdate, EncodeStateVector
   - Uses native Yjs library for efficient processing

## Key Learnings

1. **Y.applyUpdate origin parameter is critical** - Without it, you get infinite loops
2. **Binary vs Text WebSocket** - CRDT updates must be binary for efficiency
3. **Update handlers must be cleaned up** - Use `doc.off()` to prevent memory leaks
4. **WebSocket readyState check** - Always check `ws.readyState === WebSocket.OPEN` before sending
5. **Yjs requires bidirectional sync** - Receiving updates alone is not enough for collaboration

## Performance Considerations

### Update Batching
The current implementation sends every update immediately. For production, consider:
- Debouncing rapid updates (e.g., while typing)
- Using `Y.encodeStateAsUpdate(doc, lastSyncedState)` for delta sync
- Implementing exponential backoff for reconnections

### Bandwidth Optimization
- Yjs updates are already delta-based (efficient)
- Binary protocol reduces overhead vs JSON
- Node-codec compresses updates using Yjs native encoding

### Offline Support
- IndexedDB persistence already implemented (`enableIndexedDB: true`)
- Local changes queued while disconnected
- Syncs when connection restored

## Future Enhancements

1. **Awareness Protocol** - Show which users are currently editing
2. **Cursor Sharing** - Display collaborator cursors in real-time
3. **Presence Indicators** - Show online/offline status
4. **Conflict UI** - Visual indicators when conflicts are auto-resolved
5. **Undo/Redo** - Yjs UndoManager for local undo history

## References

- [Yjs Documentation](https://docs.yjs.dev/)
- [Y-WebSocket Provider](https://github.com/yjs/y-websocket)
- [CRDT Explained](https://crdt.tech/)
- [Spring WebSocket](https://docs.spring.io/spring-framework/reference/web/websocket.html)
