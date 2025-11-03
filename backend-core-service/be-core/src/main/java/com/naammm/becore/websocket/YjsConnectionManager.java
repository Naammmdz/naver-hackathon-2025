package com.naammm.becore.websocket;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;

import lombok.extern.slf4j.Slf4j;

/**
 * Manages Yjs WebSocket connections grouped by workspace
 * Handles broadcasting binary updates to all clients in a workspace
 */
@Slf4j
@Component
public class YjsConnectionManager {

    // workspaceId -> Set of sessions
    private final Map<String, Set<WebSocketSession>> workspaceConnections = new ConcurrentHashMap<>();
    
    // sessionId -> workspaceId (for quick lookup on disconnect)
    private final Map<String, String> sessionToWorkspace = new ConcurrentHashMap<>();

    /**
     * Add a new connection to a workspace
     */
    public void addConnection(String workspaceId, String userId, WebSocketSession session) {
        workspaceConnections
            .computeIfAbsent(workspaceId, k -> new CopyOnWriteArraySet<>())
            .add(session);
        
        sessionToWorkspace.put(session.getId(), workspaceId);
        
        log.info("[Yjs] Added connection: workspace={}, user={}, session={}, total={}", 
            workspaceId, userId, session.getId(), 
            workspaceConnections.get(workspaceId).size());
    }

    /**
     * Remove a connection from a workspace
     */
    public void removeConnection(String workspaceId, String userId, WebSocketSession session) {
        Set<WebSocketSession> sessions = workspaceConnections.get(workspaceId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                workspaceConnections.remove(workspaceId);
                log.info("[Yjs] Workspace {} now empty, removed from manager", workspaceId);
            } else {
                log.info("[Yjs] Removed connection: workspace={}, user={}, session={}, remaining={}", 
                    workspaceId, userId, session.getId(), sessions.size());
            }
        }
        
        sessionToWorkspace.remove(session.getId());
    }

    /**
     * Broadcast binary message to all clients in workspace EXCEPT sender
     * This is pure relay - we don't parse or understand the Yjs update
     * Uses synchronized blocks per session to prevent concurrent write errors
     */
    public void broadcastToWorkspace(String workspaceId, String senderId, BinaryMessage message) {
        Set<WebSocketSession> sessions = workspaceConnections.get(workspaceId);
        if (sessions == null || sessions.isEmpty()) {
            log.debug("[Yjs] No sessions to broadcast to in workspace {}", workspaceId);
            return;
        }

        int successCount = 0;
        int failCount = 0;
        
        for (WebSocketSession session : sessions) {
            // Don't send back to sender
            if (session.getId().equals(senderId)) {
                continue;
            }
            
            if (session.isOpen()) {
                try {
                    // Synchronize on individual session to prevent concurrent writes
                    synchronized (session) {
                        session.sendMessage(message);
                    }
                    successCount++;
                } catch (IOException e) {
                    log.error("[Yjs] Failed to send to session {}: {}", session.getId(), e.getMessage());
                    failCount++;
                }
            }
        }
        
        log.debug("[Yjs] Broadcast complete: workspace={}, sent={}, failed={}, size={} bytes", 
            workspaceId, successCount, failCount, message.getPayloadLength());
    }

    /**
     * Get count of active connections in a workspace
     */
    public int getConnectionCount(String workspaceId) {
        Set<WebSocketSession> sessions = workspaceConnections.get(workspaceId);
        return sessions != null ? sessions.size() : 0;
    }

    /**
     * Get total connection count across all workspaces
     */
    public int getTotalConnectionCount() {
        return workspaceConnections.values().stream()
            .mapToInt(Set::size)
            .sum();
    }
}
