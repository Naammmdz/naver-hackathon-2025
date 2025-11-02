package com.naammm.becore.controller;

import java.security.Principal;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.naammm.becore.dto.CollaborationEvent;
import com.naammm.becore.dto.UserPresence;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SubscribeMapping;
import org.springframework.stereotype.Controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
@RequiredArgsConstructor
public class CollaborationController {

    private final SimpMessagingTemplate messagingTemplate;
    
    // Track active users per workspace: workspaceId -> (userId -> UserPresence)
    private final Map<String, Map<String, UserPresence>> workspaceUsers = new ConcurrentHashMap<>();

    /**
     * User joins workspace
     * Client sends to: /app/collaboration/join/{workspaceId}
     * Broadcast to: /topic/workspace.{workspaceId}
     */
    @MessageMapping("/collaboration/join/{workspaceId}")
    @SendTo("/topic/workspace.{workspaceId}")
    public CollaborationEvent userJoined(
            @DestinationVariable String workspaceId,
            @Payload UserPresence user,
            Principal principal) {
        
        String userId = principal != null ? principal.getName() : user.getId();
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
     * Client sends to: /app/collaboration/leave/{workspaceId}
     * Broadcast to: /topic/workspace.{workspaceId}
     */
    @MessageMapping("/collaboration/leave/{workspaceId}")
    @SendTo("/topic/workspace.{workspaceId}")
    public CollaborationEvent userLeft(
            @DestinationVariable String workspaceId,
            Principal principal) {
        
        String userId = principal != null ? principal.getName() : "unknown";
        log.info("User {} left workspace {}", userId, workspaceId);
        
        // Remove user from workspace
        Map<String, UserPresence> users = workspaceUsers.get(workspaceId);
        if (users != null) {
            users.remove(userId);
            if (users.isEmpty()) {
                workspaceUsers.remove(workspaceId);
            }
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
     * Client sends to: /app/collaboration/cursor
     * Broadcast to: /topic/workspace.{workspaceId}
     */
    @MessageMapping("/collaboration/cursor")
    public void cursorMove(@Payload CollaborationEvent event, Principal principal) {
        String userId = principal != null ? principal.getName() : event.getUserId();
        event.setUserId(userId);
        event.setType("cursor-move");
        event.setTimestamp(System.currentTimeMillis());
        
        log.debug("Cursor move from user {} in workspace {}", userId, event.getWorkspaceId());
        
        // Broadcast to all users in workspace
        messagingTemplate.convertAndSend(
            "/topic/workspace." + event.getWorkspaceId(),
            event
        );
    }

    /**
     * Selection change
     * Client sends to: /app/collaboration/selection
     * Broadcast to: /topic/workspace.{workspaceId}
     */
    @MessageMapping("/collaboration/selection")
    public void selectionChange(@Payload CollaborationEvent event, Principal principal) {
        String userId = principal != null ? principal.getName() : event.getUserId();
        event.setUserId(userId);
        event.setType("selection-change");
        event.setTimestamp(System.currentTimeMillis());
        
        log.debug("Selection change from user {} in workspace {}", userId, event.getWorkspaceId());
        
        messagingTemplate.convertAndSend(
            "/topic/workspace." + event.getWorkspaceId(),
            event
        );
    }

    /**
     * Member update (invite/remove/role change)
     * Client sends to: /app/collaboration/member-update
     * Broadcast to: /topic/workspace.{workspaceId}
     */
    @MessageMapping("/collaboration/member-update")
    public void memberUpdate(@Payload CollaborationEvent event, Principal principal) {
        String userId = principal != null ? principal.getName() : event.getUserId();
        event.setUserId(userId);
        event.setType("member-update");
        event.setTimestamp(System.currentTimeMillis());
        
        log.info("Member update in workspace {} by user {}", event.getWorkspaceId(), userId);
        
        // Broadcast to all workspace members
        messagingTemplate.convertAndSend(
            "/topic/workspace." + event.getWorkspaceId(),
            event
        );
    }

    /**
     * Content change (document/task updates)
     * Client sends to: /app/collaboration/content-change
     * Broadcast to: /topic/workspace.{workspaceId}
     */
    @MessageMapping("/collaboration/content-change")
    public void contentChange(@Payload CollaborationEvent event, Principal principal) {
        String userId = principal != null ? principal.getName() : event.getUserId();
        event.setUserId(userId);
        event.setType("content-change");
        event.setTimestamp(System.currentTimeMillis());
        
        log.debug("Content change in workspace {} by user {}", event.getWorkspaceId(), userId);
        
        messagingTemplate.convertAndSend(
            "/topic/workspace." + event.getWorkspaceId(),
            event
        );
    }

    /**
     * Get active users when subscribing to workspace
     * Client subscribes to: /topic/workspace.{workspaceId}
     * Returns: Map of active users
     */
    @SubscribeMapping("/workspace.{workspaceId}")
    public Map<String, UserPresence> getActiveUsers(@DestinationVariable String workspaceId) {
        Map<String, UserPresence> users = workspaceUsers.getOrDefault(workspaceId, new ConcurrentHashMap<>());
        log.info("Client subscribed to workspace {}, active users: {}", workspaceId, users.size());
        return users;
    }

    /**
     * Heartbeat/ping to keep connection alive
     * Client sends to: /app/collaboration/ping
     */
    @MessageMapping("/collaboration/ping")
    public void ping(Principal principal) {
        String userId = principal != null ? principal.getName() : "unknown";
        log.debug("Ping from user {}", userId);
        // Just acknowledge, no need to broadcast
    }
}
