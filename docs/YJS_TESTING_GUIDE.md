# Yjs Persistence Testing Guide

## ✅ Verification Checklist

Để verify rằng Yjs persistence đã hoạt động đúng và frontend có thể lấy data từ database:

---

## Test 1: Basic Persistence Flow

### Setup:
1. Start backend: `./mvnw spring-boot:run`
2. Start frontend: `npm run dev`
3. Login và chọn workspace

### Steps:
```
1. User A mở document
   → Frontend: WebSocket connects to ws://localhost:8989/ws/yjs/{workspaceId}
   → Backend: YjsWebSocketHandler.afterConnectionEstablished()
   → Backend: documentManager.getOrCreateState(workspaceId)
   → Backend: yjsUpdateService.loadUpdates(workspaceId) 
   → Backend: Query database: SELECT * FROM yjs_updates WHERE workspace_id = ?
   → Backend: sendStoredUpdates() → Send all persisted updates to client
   → Frontend: Y.Doc receives updates → Reconstructs state
   → Frontend: BlockNote renders content ✅

2. User A types "Hello World"
   → Frontend: BlockNote → Yjs generates update
   → Frontend: WebSocket sends binary update
   → Backend: YjsWebSocketHandler.handleBinaryMessage()
   → Backend: documentManager.storeUpdate(workspaceId, update, userId)
   → Backend: Memory cache updated ✅
   → Backend: yjsUpdateService.saveUpdate() → INSERT INTO yjs_updates ✅
   → Backend: Broadcast to other users

3. User A disconnects
   → Frontend: WebSocket closes
   → Backend: Connection removed from YjsConnectionManager
   → Backend: Memory cache still exists (in RAM)
   → Database: Updates persisted ✅

4. Restart backend server
   → Backend: Memory cache cleared (RAM wiped)
   → Database: Updates still exist ✅

5. User B connects
   → Follow Step 1 flow
   → Backend loads from database
   → User B sees "Hello World" ✅
```

### Expected Result:
✅ Content survives server restart  
✅ User B sees User A's changes  
✅ Database contains binary updates  

---

## Test 2: Check Database

### Query yjs_updates table:

```sql
-- Connect to database
psql -U postgres -d naver_hackathon

-- Check if table exists
\dt yjs_updates

-- Count updates per workspace
SELECT 
    workspace_id, 
    COUNT(*) as update_count,
    SUM(update_size) as total_bytes,
    MIN(created_at) as first_update,
    MAX(created_at) as last_update
FROM yjs_updates
GROUP BY workspace_id;

-- View recent updates
SELECT 
    id,
    workspace_id,
    update_size,
    created_at,
    user_id
FROM yjs_updates
ORDER BY created_at DESC
LIMIT 10;

-- Check specific workspace
SELECT 
    COUNT(*) as count,
    SUM(update_size) as total_size
FROM yjs_updates
WHERE workspace_id = 'YOUR_WORKSPACE_ID';
```

### Expected:
- Table exists
- Updates increase when users edit
- Binary data in `update_data` column

---

## Test 3: REST API Verification

### Get workspace statistics:

```bash
# Replace {workspaceId} with actual workspace ID
curl http://localhost:8989/api/yjs/workspaces/{workspaceId}/stats | jq

# Expected response:
{
  "workspaceId": "abc123",
  "memoryUpdateCount": 150,
  "memorySizeBytes": 45000,
  "dbUpdateCount": 150,
  "dbSizeBytes": 45000,
  "memorySizeFormatted": "43.95 KB",
  "dbSizeFormatted": "43.95 KB"
}
```

### Get system statistics:

```bash
curl http://localhost:8989/api/yjs/stats | jq

# Expected response:
{
  "activeWorkspaces": 3,
  "status": "Yjs CRDT system operational"
}
```

---

## Test 4: Frontend Integration Check

### Open browser console while editing:

```javascript
// Frontend automatically logs Yjs activity:

[Yjs] Connection status: connected
[Yjs] Sync status: true
[Yjs] ✅ Fully synced with server
[DocumentEditor] Created editor for document: abc123 {hasCollaboration: true, contentLength: 5}
```

### Check Network tab:

1. Filter: `WS` (WebSocket)
2. Should see: `ws://localhost:8989/ws/yjs/{workspaceId}?token=...`
3. Status: `101 Switching Protocols`
4. Messages: Binary frames being sent/received

### Verify frontend DOES NOT call new endpoints:

Frontend không cần gọi REST API mới. Tất cả diễn ra tự động qua WebSocket:

```
Frontend                Backend
   |                       |
   |-- WebSocket Open ---->|
   |                       |--- Load from DB
   |<--- Send Updates -----|
   |                       |
   |-- User Types -------->|
   |                       |--- Save to DB
   |<--- Broadcast --------|
```

**Frontend chỉ dùng WebSocket!**  
**Backend tự động lưu vào database!**

---

## Test 5: Multi-User Collaboration

### Setup:
- Open 2 browser windows (or incognito mode)
- Both users connect to same workspace

### Steps:

```
Window 1 (User A):
1. Open document
2. Type "Hello from User A"
3. Close window

Window 2 (User B):
1. Open same document
2. Should see "Hello from User A" ✅
3. Type "Hello from User B"
4. Close window

Window 3 (User C - after restart):
1. Restart backend server
2. Open same document
3. Should see both messages ✅
```

---

## Test 6: Verify Persistence After Server Down

### Critical test for data durability:

```bash
# 1. Edit documents in frontend
# Type some content in a document

# 2. Check database has updates
psql -U postgres -d naver_hackathon -c "SELECT COUNT(*) FROM yjs_updates;"

# 3. Stop backend
# Press Ctrl+C in terminal running backend

# 4. Verify database still has data
psql -U postgres -d naver_hackathon -c "SELECT COUNT(*) FROM yjs_updates;"
# Should return same count ✅

# 5. Restart backend
./mvnw spring-boot:run

# 6. Reconnect frontend
# Refresh browser

# 7. Open same document
# Content should be restored ✅
```

---

## Debug Commands

### Check backend logs:

```bash
# Should see these logs when working correctly:

[YjsDocManager] Loading/creating state for workspace: abc123
[YjsUpdateService] Loaded 150 updates for workspace: abc123
[Yjs] Sending 150 stored updates to new client: sessionId=xyz
[YjsDocManager] Stored update in memory: workspace=abc123, size=1234 bytes, total=151
[YjsUpdateService] Saved update for workspace: abc123, size: 1234 bytes
```

### Check for errors:

```bash
# Should NOT see these:
[ERROR] Failed to persist update to database
[ERROR] Failed to load updates for workspace
[WARN] Attempted to save empty update
```

---

## Common Issues & Fixes

### Issue 1: Table not created

**Symptom**: `ERROR: relation "yjs_updates" does not exist`

**Fix**:
```bash
# Manual create table
psql -U postgres -d naver_hackathon -f backend-core-service/be-core/src/main/resources/db/migration/V6__Create_yjs_updates_table.sql
```

### Issue 2: Content not persisting

**Symptom**: Content lost after server restart

**Debug**:
```bash
# Check if updates are being saved
psql -U postgres -d naver_hackathon -c "SELECT COUNT(*), MAX(created_at) FROM yjs_updates;"

# If count = 0, check backend logs for errors
```

### Issue 3: Foreign key constraint

**Symptom**: `ERROR: insert or update on table "yjs_updates" violates foreign key constraint`

**Fix**:
```sql
-- Remove foreign key constraint temporarily
ALTER TABLE yjs_updates DROP CONSTRAINT IF EXISTS fk_yjs_updates_workspace;
```

### Issue 4: Binary data encoding

**Symptom**: `ERROR: invalid byte sequence for encoding "UTF8"`

**Check**:
```sql
-- Verify BYTEA column type
\d+ yjs_updates

-- Should show: update_data | bytea
```

---

## Performance Monitoring

### Check update accumulation:

```sql
-- Updates per workspace over time
SELECT 
    workspace_id,
    COUNT(*) as total_updates,
    pg_size_pretty(SUM(update_size)::bigint) as total_size,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour
FROM yjs_updates
GROUP BY workspace_id
ORDER BY total_updates DESC;
```

### Check database size:

```sql
-- Table size
SELECT pg_size_pretty(pg_total_relation_size('yjs_updates'));

-- Index sizes
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass))
FROM pg_indexes
WHERE tablename = 'yjs_updates';
```

---

## Success Criteria

✅ **yjs_updates table exists** in database  
✅ **Updates inserted** when users edit documents  
✅ **Content survives** server restart  
✅ **Multi-user collaboration** works in real-time  
✅ **Memory cache** loads from database on first connection  
✅ **REST API** returns correct statistics  
✅ **Frontend logs** show successful sync  
✅ **No SQL errors** in backend logs  

---

## Summary

### What Frontend Does:
1. ✅ Connect WebSocket to `ws://localhost:8989/ws/yjs/{workspaceId}`
2. ✅ Send/receive binary Yjs updates
3. ✅ **KHÔNG cần gọi REST API mới!**

### What Backend Does:
1. ✅ Receive binary updates from WebSocket
2. ✅ **Tự động save vào database** (YjsUpdateService)
3. ✅ Load from database when workspace connects
4. ✅ Broadcast to all connected users

### Data Flow:
```
User Edit → WebSocket → Backend → Database (automatic!)
                                ↓
                          Memory Cache
                                ↓
                          Broadcast → Other Users
```

**Frontend đã tự động sử dụng persistence!**  
**Không cần code thêm ở frontend!** 🎉

Chỉ cần verify bằng tests ở trên là đủ!
