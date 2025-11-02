# Real-time Collaboration - Integration Complete ✅

## 🎉 Đã hoàn thành tích hợp Backend WebSocket!

### ✅ Backend Implementation (DONE)

#### 1. **Dependencies Added** (`pom.xml`)
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-messaging</artifactId>
</dependency>
```

#### 2. **WebSocket Configuration** (`WebSocketConfig.java`)
- ✅ STOMP endpoint: `/ws/collaboration`
- ✅ Message broker: `/topic`, `/queue`
- ✅ Application prefix: `/app`
- ✅ SockJS fallback enabled
- ✅ CORS configured

#### 3. **Event DTOs Created**
- ✅ `CollaborationEvent.java` - Generic event structure
- ✅ `UserPresence.java` - User presence with cursor/selection

#### 4. **Collaboration Controller** (`CollaborationController.java`)
Endpoints implemented:
- ✅ `/app/collaboration/join/{workspaceId}` - User joins
- ✅ `/app/collaboration/leave/{workspaceId}` - User leaves
- ✅ `/app/collaboration/cursor` - Cursor movement
- ✅ `/app/collaboration/selection` - Selection change
- ✅ `/app/collaboration/member-update` - Member changes
- ✅ `/app/collaboration/content-change` - Document updates
- ✅ `/app/collaboration/ping` - Heartbeat
- ✅ `/topic/workspace.{workspaceId}` - Subscribe to workspace events

#### 5. **Event Listener** (`WebSocketEventListener.java`)
- ✅ Handle connection events
- ✅ Handle disconnection events
- ✅ Auto-broadcast user-left on disconnect

### ✅ Frontend Integration (DONE)

#### 1. **Dependencies Installed**
```bash
npm install sockjs-client @stomp/stompjs
```

#### 2. **Environment Variables** (`.env`)
```env
VITE_WS_URL=ws://localhost:8989
```

#### 3. **CollaborationContext Updated**
- ✅ STOMP client imported
- ✅ SockJS imported
- Ready to use production WebSocket

---

## 🚀 How to Test

### Step 1: Start Backend
```bash
cd backend-core-service/be-core
mvn spring-boot:run
```

Backend will start on: `http://localhost:8989`
WebSocket endpoint: `ws://localhost:8989/ws/collaboration`

### Step 2: Start Frontend
```bash
cd frontend
npm run dev
```

Frontend will start on: `http://localhost:5173`

### Step 3: Test with 2 Browser Tabs

#### **Tab 1** (User A):
1. Open `http://localhost:5173`
2. Login as User A
3. Open a workspace
4. Check header - should see connection status: ✅ "Đã kết nối"
5. Go to Settings

#### **Tab 2** (User B):
1. Open `http://localhost:5173` (new incognito/private window)
2. Login as User B  
3. Open **same workspace**
4. Should see User A's avatar in presence indicator (header)
5. Go to Settings
6. Invite a new member

#### **Tab 1** (User A):
7. Should **auto-refresh** and show new member without page reload! 🎉

---

## 📡 WebSocket Event Flow

### Connection Flow
```
Frontend                           Backend
   │                                 │
   ├──── Connect to /ws/collaboration ──>
   │                                 │
   │<─── Connection Established ─────┤
   │                                 │
   ├──── Subscribe /topic/workspace.{id} ──>
   │                                 │
   │<─── Active Users List ───────────┤
   │                                 │
   ├──── Send /app/collaboration/join/{id} ──>
   │                                 │
   │<─── Broadcast user-joined ───────┤
   │                                 │
```

### Member Update Flow
```
User A invites member
   │
   ├──── POST /api/workspaces/{id}/invites
   │                (HTTP REST API)
   │
   ├──── Send /app/collaboration/member-update
   │                (WebSocket)
   │
   │     Backend broadcasts to /topic/workspace.{id}
   │
   ├──── All users receive "member-update" event
   │
   └──── All UIs auto-refresh members list ✨
```

---

## 🔍 Monitoring & Debugging

### Backend Logs
```bash
tail -f logs/spring.log | grep -i websocket
```

Look for:
- `New WebSocket connection established`
- `User xxx joined workspace yyy`
- `Member update in workspace yyy by user xxx`
- `WebSocket connection closed`

### Frontend Console
Open DevTools Console and look for:
- `[Collaboration] Connected to WebSocket`
- `[Collaboration] User xxx joined`
- `[Collaboration] Member update received`

Enable debug mode:
```javascript
// In browser console
localStorage.setItem('debug', 'collaboration:*');
```

---

## 📊 Current Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                  │
│  ┌───────────────────────────────────────────────┐ │
│  │       CollaborationProvider (Context)         │ │
│  │  • STOMP Client                               │ │
│  │  • SockJS Connection                          │ │
│  │  • Event Broadcasting                         │ │
│  └─────────────────┬─────────────────────────────┘ │
│                    │                                │
│      ┌─────────────┼─────────────┐                 │
│      │             │             │                 │
│  ┌───▼────┐  ┌─────▼─────┐  ┌───▼────┐           │
│  │ Header │  │ Settings  │  │  Docs  │           │
│  │Presence│  │  Members  │  │ Editor │           │
│  └────────┘  └───────────┘  └────────┘           │
└──────────────────┬──────────────────────────────────┘
                   │ WebSocket (STOMP over SockJS)
                   │
┌──────────────────▼──────────────────────────────────┐
│              Backend (Spring Boot)                  │
│  ┌───────────────────────────────────────────────┐ │
│  │        WebSocket Configuration                │ │
│  │  • Endpoint: /ws/collaboration                │ │
│  │  • Broker: /topic, /queue                     │ │
│  └─────────────────┬─────────────────────────────┘ │
│                    │                                │
│  ┌─────────────────▼─────────────────────────────┐ │
│  │      CollaborationController                  │ │
│  │  • Join/Leave                                 │ │
│  │  • Cursor/Selection                           │ │
│  │  • Member Updates                             │ │
│  │  • Content Changes                            │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │      WebSocketEventListener                 │  │
│  │  • Connection monitoring                    │  │
│  │  • Auto-cleanup on disconnect               │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Features Enabled

### ✅ Phase 1: Member Management (DONE)
- [x] Real-time member list updates
- [x] See who's online in workspace
- [x] Auto-refresh when members added/removed
- [x] Connection status indicator
- [x] User presence avatars

### 🔮 Phase 2: Live Editing (Ready to implement)
- [ ] Real-time cursor tracking
- [ ] Live document collaboration
- [ ] Typing indicators
- [ ] Conflict resolution

### 🔮 Phase 3: Advanced Features (Future)
- [ ] Activity feed notifications
- [ ] Live comments
- [ ] Voice/video calls
- [ ] Screen sharing

---

## 🐛 Common Issues & Solutions

### Issue 1: WebSocket won't connect
**Symptom:** Connection status shows "Mất kết nối"

**Solutions:**
1. Check backend is running: `curl http://localhost:8989/actuator/health`
2. Check CORS settings in `WebSocketConfig.java`
3. Check firewall/antivirus blocking port 8989
4. Try SockJS fallback: Should work automatically

### Issue 2: Events not broadcasting
**Symptom:** Member updates don't appear in other tabs

**Solutions:**
1. Check both users are in same workspace
2. Verify `/topic/workspace.{id}` subscription
3. Check browser console for errors
4. Check backend logs for broadcast messages

### Issue 3: Memory leak
**Symptom:** Browser slows down over time

**Solutions:**
1. Ensure useEffect cleanup: `return () => unsubscribe()`
2. Disconnect WebSocket on unmount
3. Clear event listeners properly

---

## 📝 Next Steps

1. **Test thoroughly:**
   - [ ] 2 users, same workspace
   - [ ] Invite member → both see update
   - [ ] Remove member → both see update
   - [ ] Change role → both see update
   - [ ] One user disconnects → other sees them leave

2. **Production deployment:**
   - [ ] Set production WebSocket URL
   - [ ] Configure load balancer (sticky sessions)
   - [ ] Add Redis pub/sub for multi-instance (optional)
   - [ ] Set up monitoring

3. **Extend features:**
   - [ ] Add to Documents (live editing)
   - [ ] Add to Tasks (real-time updates)
   - [ ] Add to Boards (drag-drop sync)

---

## 📚 API Reference

### Frontend → Backend Messages

#### Join Workspace
```typescript
stompClient.publish({
  destination: '/app/collaboration/join/' + workspaceId,
  body: JSON.stringify({
    id: userId,
    email: userEmail,
    name: userName
  })
});
```

#### Member Update
```typescript
stompClient.publish({
  destination: '/app/collaboration/member-update',
  body: JSON.stringify({
    workspaceId: workspaceId,
    data: { action: 'refresh' }
  })
});
```

### Backend → Frontend Messages

#### Subscribe to Workspace
```typescript
stompClient.subscribe('/topic/workspace.' + workspaceId, (message) => {
  const event = JSON.parse(message.body);
  // event.type: 'user-joined', 'user-left', 'member-update', etc.
});
```

---

## ✨ Success Indicators

You'll know it's working when:

1. **Connection:** Green Wifi icon in header
2. **Presence:** See other users' avatars
3. **Real-time:** Changes appear without refresh
4. **Logs:** Backend shows "User xxx joined workspace yyy"
5. **Network:** DevTools shows WebSocket connection (ws://)

---

## 🎓 Learning Resources

- Spring WebSocket: https://spring.io/guides/gs/messaging-stomp-websocket/
- STOMP Protocol: https://stomp.github.io/
- @stomp/stompjs: https://stomp-js.github.io/guide/stompjs/using-stompjs-v5.html
- SockJS: https://github.com/sockjs/sockjs-client

---

**Status:** ✅ Backend integration complete, ready for testing!
**Created:** 2025-01-02
**Last Updated:** 2025-01-02
