package com.naammm.becore.listener;

import com.naammm.becore.dto.CollaborationEvent;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        log.info("New WebSocket connection established: sessionId={}", sessionId);
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        
        // Get user info from session attributes
        String username = null;
        String workspaceId = null;
        
        if (headerAccessor.getSessionAttributes() != null) {
            username = (String) headerAccessor.getSessionAttributes().get("username");
            workspaceId = (String) headerAccessor.getSessionAttributes().get("workspaceId");
        }
        
        log.info("WebSocket connection closed: sessionId={}, username={}, workspaceId={}", 
                sessionId, username, workspaceId);
        
        // Broadcast user left event if we have user and workspace info
        if (username != null && workspaceId != null) {
            CollaborationEvent leaveEvent = CollaborationEvent.builder()
                    .type("user-left")
                    .userId(username)
                    .workspaceId(workspaceId)
                    .timestamp(System.currentTimeMillis())
                    .build();
            
            messagingTemplate.convertAndSend(
                "/topic/workspace." + workspaceId, 
                leaveEvent
            );
            
            log.info("Broadcasted user-left event for user {} in workspace {}", username, workspaceId);
        }
    }
}
