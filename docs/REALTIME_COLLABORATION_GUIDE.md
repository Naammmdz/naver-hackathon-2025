# Real-time Collaboration Integration Guide

## 📋 Tổng quan

Hệ thống real-time collaboration đã được thiết kế để cho phép nhiều users làm việc cùng lúc trong workspace. Infrastructure frontend đã sẵn sàng, cần tích hợp backend WebSocket.

---

## 🏗️ Architecture Hiện tại

### Frontend (✅ Đã hoàn thành)

```
┌─────────────────────────────────────────────────────────┐
│                      AppWrapper                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │          CollaborationProvider                    │ │
│  │  - WebSocket connection management                │ │
│  │  - User presence tracking                         │ │
│  │  - Event broadcasting                             │ │
│  │  - Auto-reconnect logic                           │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐   ┌──────▼──────┐  ┌─────▼──────┐
    │  Header   │   │   Settings  │  │   Docs     │
    │ Presence  │   │   Members   │  │  Editor    │
    └───────────┘   └─────────────┘  └────────────┘
```

### Components đã implement:

1. **CollaborationContext** (`contexts/CollaborationContext.tsx`)
   - WebSocket connection lifecycle
   - User presence state
   - Event pub/sub system
   - Mock mode cho development

2. **CollaborationPresence** (`components/layout/CollaborationPresence.tsx`)
   - Hiển thị active users
   - Connection status indicator
   - User avatars với colors

3. **useRealtimeWorkspaceMembers** (`hooks/use-realtime-workspace.ts`)
   - Auto-reload members khi có update
   - Broadcast member changes

4. **WorkspaceSettings** (`pages/WorkspaceSettings.tsx`)
   - Integrated với realtime hook
   - Broadcast khi invite/remove/update members

---

## 🔧 Backend Implementation Steps

### Step 1: Add WebSocket Dependencies

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-messaging</artifactId>
</dependency>
```

### Step 2: WebSocket Configuration

```java
// config/WebSocketConfig.java
package com.naammm.becore.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple broker for pub/sub
        config.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages from client
        config.setApplicationDestinationPrefixes("/app");
        // Prefix for user-specific messages
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/collaboration")
                .setAllowedOrigins("http://localhost:5173", "http://localhost:3000")
                .withSockJS();
    }
}
```

### Step 3: Collaboration Event Models

```java
// dto/CollaborationEvent.java
package com.naammm.becore.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollaborationEvent {
    private String type; // user-joined, user-left, cursor-move, member-update, etc.
    private String userId;
    private String workspaceId;
    private Long timestamp;
    private Object data;
}
```

```java
// dto/UserPresence.java
package com.naammm.becore.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPresence {
    private String id;
    private String email;
    private String name;
    private String avatarUrl;
    private CursorPosition cursor;
    private Selection selection;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CursorPosition {
        private double x;
        private double y;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Selection {
        private int start;
        private int end;
    }
}
```

### Step 4: WebSocket Controller

```java
// controller/CollaborationController.java
package com.naammm.becore.controller;

import com.naammm.becore.dto.CollaborationEvent;
import com.naammm.becore.dto.UserPresence;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SubscribeMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Controller
@RequiredArgsConstructor
public class CollaborationController {

    private final SimpMessagingTemplate messagingTemplate;
    
    // Track active users per workspace
    private final Map<String, Map<String, UserPresence>> workspaceUsers = new ConcurrentHashMap<>();

    /**
     * User joins workspace
     */
    @MessageMapping("/collaboration/join")
    @SendTo("/topic/workspace.{workspaceId}")
    public CollaborationEvent userJoined(
            @DestinationVariable String workspaceId,
            @Payload UserPresence user,
            Principal principal) {
        
        String userId = principal.getName();
        log.info("User {} joined workspace {}", userId, workspaceId);
        
        // Add user to workspace
        workspaceUsers
            .computeIfAbsent(workspaceId, k -> new ConcurrentHashMap<>())
            .put(userId, user);
        
        return CollaborationEvent.builder()
                .type("user-joined")
                .userId(userId)
                .workspaceId(workspaceId)
                .timestamp(System.currentTimeMillis())
                .data(user)
                .build();
    }

    /**
     * User leaves workspace
     */
    @MessageMapping("/collaboration/leave")
    @SendTo("/topic/workspace.{workspaceId}")
    public CollaborationEvent userLeft(
            @DestinationVariable String workspaceId,
            Principal principal) {
        
        String userId = principal.getName();
        log.info("User {} left workspace {}", userId, workspaceId);
        
        // Remove user from workspace
        Map<String, UserPresence> users = workspaceUsers.get(workspaceId);
        if (users != null) {
            users.remove(userId);
        }
        
        return CollaborationEvent.builder()
                .type("user-left")
                .userId(userId)
                .workspaceId(workspaceId)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * Cursor movement
     */
    @MessageMapping("/collaboration/cursor")
    public void cursorMove(
            @Payload CollaborationEvent event,
            Principal principal) {
        
        String userId = principal.getName();
        event.setUserId(userId);
        event.setTimestamp(System.currentTimeMillis());
        
        // Broadcast to all users in workspace except sender
        messagingTemplate.convertAndSend(
            "/topic/workspace." + event.getWorkspaceId(),
            event
        );
    }

    /**
     * Selection change
     */
    @MessageMapping("/collaboration/selection")
    public void selectionChange(
            @Payload CollaborationEvent event,
            Principal principal) {
        
        String userId = principal.getName();
        event.setUserId(userId);
        event.setTimestamp(System.currentTimeMillis());
        
        messagingTemplate.convertAndSend(
            "/topic/workspace." + event.getWorkspaceId(),
            event
        );
    }

    /**
     * Member update (invite/remove/role change)
     */
    @MessageMapping("/collaboration/member-update")
    public void memberUpdate(
            @Payload CollaborationEvent event,
            Principal principal) {
        
        String userId = principal.getName();
        event.setUserId(userId);
        event.setTimestamp(System.currentTimeMillis());
        
        log.info("Member update in workspace {} by user {}", event.getWorkspaceId(), userId);
        
        // Broadcast to all workspace members
        messagingTemplate.convertAndSend(
            "/topic/workspace." + event.getWorkspaceId(),
            event
        );
    }

    /**
     * Get active users when subscribing
     */
    @SubscribeMapping("/workspace.{workspaceId}")
    public Map<String, UserPresence> getActiveUsers(@DestinationVariable String workspaceId) {
        return workspaceUsers.getOrDefault(workspaceId, new ConcurrentHashMap<>());
    }

    /**
     * Heartbeat/ping
     */
    @MessageMapping("/collaboration/ping")
    public void ping(Principal principal) {
        // Just acknowledge, no need to broadcast
        log.debug("Ping from user {}", principal.getName());
    }
}
```

### Step 5: WebSocket Security

```java
// config/WebSocketSecurityConfig.java
package com.naammm.becore.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.messaging.MessageSecurityMetadataSourceRegistry;
import org.springframework.security.config.annotation.web.socket.AbstractSecurityWebSocketMessageBrokerConfigurer;

@Configuration
public class WebSocketSecurityConfig extends AbstractSecurityWebSocketMessageBrokerConfigurer {

    @Override
    protected void configureInbound(MessageSecurityMetadataSourceRegistry messages) {
        messages
            .simpDestMatchers("/app/**").authenticated()
            .simpSubscribeDestMatchers("/topic/**", "/queue/**").authenticated()
            .anyMessage().authenticated();
    }

    @Override
    protected boolean sameOriginDisabled() {
        return true; // Disable CSRF for WebSocket
    }
}
```

### Step 6: Connection Event Listener

```java
// listener/WebSocketEventListener.java
package com.naammm.becore.listener;

import com.naammm.becore.dto.CollaborationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        log.info("New WebSocket connection: sessionId={}", sessionId);
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        String workspaceId = (String) headerAccessor.getSessionAttributes().get("workspaceId");
        
        log.info("WebSocket disconnected: sessionId={}, username={}", sessionId, username);
        
        if (username != null && workspaceId != null) {
            // Broadcast user left event
            CollaborationEvent event = CollaborationEvent.builder()
                    .type("user-left")
                    .userId(username)
                    .workspaceId(workspaceId)
                    .timestamp(System.currentTimeMillis())
                    .build();
            
            messagingTemplate.convertAndSend("/topic/workspace." + workspaceId, event);
        }
    }
}
```

---

## 🔌 Frontend Integration (Already Done)

### 1. Environment Variables

```env
# .env
VITE_WS_URL=ws://localhost:8989
```

### 2. Update CollaborationContext

File đã có mock mode. Khi backend sẵn sàng:

```typescript
// contexts/CollaborationContext.tsx
const isDevelopment = import.meta.env.DEV;

if (isDevelopment) {
  // Mock mode - current implementation
} else {
  // Production WebSocket - sẽ tự động connect khi có backend
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8989';
  const ws = new WebSocket(`${wsUrl}/ws/collaboration?workspaceId=${activeWorkspaceId}&userId=${userId}`);
}
```

---

## 🧪 Testing Flow

### 1. Manual Test (2 Browser Tabs)

**Tab 1:**
```
1. Login as User A
2. Open workspace
3. See connection status: "Đã kết nối"
4. Open WorkspaceSettings
```

**Tab 2:**
```
1. Login as User B
2. Open same workspace
3. Should see User A in presence indicator
4. Invite a member
```

**Tab 1:**
```
5. Should auto-refresh and see new member (no page reload needed)
```

### 2. Event Flow Test

```
User A joins workspace
└─> Backend receives: user-joined
    └─> Broadcast to /topic/workspace.{id}
        └─> User B receives event
            └─> Frontend updates activeUsers state
                └─> CollaborationPresence shows User A avatar

User A invites member
└─> Frontend calls inviteMember() API
    └─> Backend creates member
        └─> Frontend broadcasts member-update via WebSocket
            └─> All users in workspace receive event
                └─> All frontends call loadMembers()
                    └─> UI updates without reload
```

---

## 📊 Event Types & Data Structure

### Frontend → Backend

```typescript
// user-joined
{
  type: 'user-joined',
  workspaceId: 'workspace-123',
  data: {
    id: 'user-123',
    email: 'user@example.com',
    name: 'User Name'
  }
}

// cursor-move
{
  type: 'cursor-move',
  workspaceId: 'workspace-123',
  data: {
    cursor: { x: 100, y: 200 }
  }
}

// member-update
{
  type: 'member-update',
  workspaceId: 'workspace-123',
  data: {
    action: 'refresh'
  }
}
```

### Backend → Frontend

```typescript
// Broadcast to all workspace members
{
  type: 'user-joined',
  userId: 'user-123',
  workspaceId: 'workspace-123',
  timestamp: 1699999999999,
  data: {
    id: 'user-123',
    email: 'user@example.com',
    name: 'User Name',
    color: '#FF6B6B'
  }
}
```

---

## 🚀 Deployment Checklist

### Backend
- [ ] Add WebSocket dependencies
- [ ] Create WebSocketConfig
- [ ] Implement CollaborationController
- [ ] Add WebSocketEventListener
- [ ] Configure CORS for WebSocket
- [ ] Test with 2+ users

### Frontend
- [x] CollaborationProvider implemented
- [x] CollaborationPresence component
- [x] useRealtimeWorkspaceMembers hook
- [x] WorkspaceSettings integration
- [ ] Set VITE_WS_URL in production
- [ ] Test reconnection logic
- [ ] Load test (10+ concurrent users)

### Infrastructure
- [ ] WebSocket load balancer config (sticky sessions)
- [ ] Redis pub/sub for multi-instance (optional)
- [ ] Monitoring & alerts for WebSocket connections
- [ ] Rate limiting for events

---

## 🔮 Future Enhancements

### Phase 2: Real-time Document Editing
```typescript
// Operational Transformation or CRDT
- Live cursor tracking in editor
- Character-by-character updates
- Conflict resolution
- Version history
```

### Phase 3: Advanced Features
```typescript
- Typing indicators: "User X is typing..."
- Live comments & annotations
- Activity feed: real-time notifications
- Voice/video call integration
- Screen sharing for collaboration
```

### Phase 4: Performance Optimization
```typescript
- Message batching (reduce WebSocket traffic)
- Delta updates (only send changes)
- Compression (gzip WebSocket messages)
- Edge caching for presence data
```

---

## 🐛 Troubleshooting

### Connection Issues

**Problem:** WebSocket không connect
```bash
# Check backend logs
tail -f logs/spring.log | grep WebSocket

# Check frontend console
> localStorage.debug = 'collaboration:*'
```

**Solution:**
- Verify CORS settings
- Check firewall rules
- Ensure port 8989 is open

### Memory Leaks

**Problem:** Too many event listeners
```typescript
// Always cleanup in useEffect
useEffect(() => {
  const unsubscribe = onEvent(handler);
  return unsubscribe; // ✅ Important!
}, []);
```

### Reconnection Loops

**Problem:** Infinite reconnect attempts
```typescript
// Add exponential backoff
let retryDelay = 1000;
const maxRetries = 5;

reconnectTimeoutRef.current = setTimeout(() => {
  retryDelay = Math.min(retryDelay * 2, 30000);
  connect();
}, retryDelay);
```

---

## 📚 Resources

- Spring WebSocket Docs: https://docs.spring.io/spring-framework/docs/current/reference/html/web.html#websocket
- STOMP Protocol: https://stomp.github.io/
- SockJS: https://github.com/sockjs/sockjs-client
- MDN WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

---

## ✅ Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| CollaborationContext | ✅ Ready | Mock mode active |
| CollaborationPresence | ✅ Ready | Shows in header |
| useRealtimeWorkspaceMembers | ✅ Ready | Auto-refresh members |
| WorkspaceSettings Integration | ✅ Ready | Broadcasts updates |
| Backend WebSocket | ⏳ Pending | Need to implement |
| Testing | ⏳ Pending | After backend ready |
| Production Deployment | ⏳ Pending | After testing |

---

**Next Step:** Implement backend WebSocket theo Step 1-6 ở trên, sau đó test với 2 browser tabs.
