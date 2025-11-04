package com.naammm.becore.websocket;

import com.naammm.becore.repository.WorkspaceMemberRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Yjs WebSocket Handler with persistence
 * Stores updates and sends full state to new clients for proper sync
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class YjsWebSocketHandler extends BinaryWebSocketHandler {

    private final YjsConnectionManager connectionManager;
    private final YjsDocumentManager documentManager;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @Value("${yjs.persistence.enabled:true}")
    private boolean yjsPersistenceEnabled;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String workspaceId = extractWorkspaceId(session);
        String userId = extractUserId(session);
        
        if (workspaceId == null || userId == null) {
            log.warn("[Yjs] Connection rejected - missing workspaceId or userId");
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        // CHECK: User must be member of workspace
        boolean isMember = workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId);
        if (!isMember) {
            log.warn("[Yjs] Connection rejected - userId: {} is not a member of workspaceId: {}", 
                    userId, workspaceId);
            session.close(new CloseStatus(4003, "Not a workspace member"));
            return;
        }

        connectionManager.addConnection(workspaceId, userId, session);
        log.info("[Yjs] Client connected: workspaceId={}, userId={}, sessionId={}", 
            workspaceId, userId, session.getId());
        
        // Send all stored updates to new client for sync (only if persistence enabled)
        // Wrap in try-catch to prevent connection crash on DB errors
        if (yjsPersistenceEnabled) {
            try {
                sendStoredUpdates(session, workspaceId);
            } catch (Exception e) {
                log.error("[Yjs] Failed to send stored updates, but keeping connection open: workspaceId={}, error={}", 
                         workspaceId, e.getMessage(), e);
                // Don't close connection - allow real-time sync to work even if DB load fails
            }
        } else {
            log.info("[Yjs] Yjs persistence disabled - skipping stored updates sync for workspace: {}", workspaceId);
        }
    }

    /**
     * Send stored Yjs state to a newly connected client for sync.
     * Uses snapshot-based approach for efficient sync instead of replaying all updates.
     * 
     * Priority order:
     * 1. Send snapshot (if available) - most efficient
     * 2. Send all updates (fallback) - maintains compatibility
     */
    private void sendStoredUpdates(WebSocketSession session, String workspaceId) {
        try {
            YjsDocumentState state = documentManager.getState(workspaceId);
            
            if (state == null) {
                log.debug("[Yjs] No state available for workspace: {}", workspaceId);
                return;
            }

            // Try snapshot-based sync first (more efficient)
            if (state.hasSnapshot()) {
                sendSnapshot(session, workspaceId, state);
                return;
            }

            // Fallback: send all updates (legacy behavior)
            sendAllUpdates(session, workspaceId, state);
            
        } catch (Exception e) {
            log.error("[Yjs] Failed to send stored state: {}", e.getMessage(), e);
        }
    }

    /**
     * Send snapshot to client for efficient sync.
     */
    private void sendSnapshot(WebSocketSession session, String workspaceId, YjsDocumentState state) {
        try {
            byte[] snapshot = state.getSnapshotData();
            
            if (snapshot == null || snapshot.length == 0) {
                log.warn("[Yjs] Snapshot exists but is empty for workspace: {}", workspaceId);
                sendAllUpdates(session, workspaceId, state);
                return;
            }

            log.info("[Yjs] Sending snapshot to new client: workspaceId={}, size={} bytes, sessionId={}", 
                    workspaceId, snapshot.length, session.getId());
            
            // Synchronize on session to prevent concurrent sends
            synchronized (session) {
                if (!session.isOpen()) {
                    log.warn("[Yjs] Session closed before sending snapshot: workspaceId={}", workspaceId);
                    return;
                }
                
                session.sendMessage(new BinaryMessage(snapshot));
            }
            
            log.info("[Yjs] Successfully sent snapshot to sessionId={}", session.getId());
            
        } catch (java.io.IOException e) {
            // Client disconnected - this is expected
            log.debug("[Yjs] Client disconnected during snapshot send: sessionId={}", session.getId());
        } catch (Exception e) {
            log.error("[Yjs] Failed to send snapshot: {}", e.getMessage(), e);
            // Fallback to sending updates
            sendAllUpdates(session, workspaceId, state);
        }
    }

    /**
     * Send all updates to client (fallback method).
     * Uses synchronized block to prevent concurrent sends causing BINARY_PARTIAL_WRITING errors.
     */
    private void sendAllUpdates(WebSocketSession session, String workspaceId, YjsDocumentState state) {
        try {
            byte[][] updates = state.getAllUpdates();
            
            if (updates.length == 0) {
                log.debug("[Yjs] No stored updates for workspace: {}", workspaceId);
                return;
            }

            log.info("[Yjs] Sending {} stored updates to new client: sessionId={}", 
                    updates.length, session.getId());
            
            // Synchronize on session to prevent concurrent sends
            synchronized (session) {
                // Send updates in batches to avoid overwhelming the buffer
                int batchSize = 100;
                for (int i = 0; i < updates.length; i += batchSize) {
                    int end = Math.min(i + batchSize, updates.length);
                    
                    for (int j = i; j < end; j++) {
                        if (!session.isOpen()) {
                            log.warn("[Yjs] Session closed while sending updates, stopping at {}/{}", 
                                    j, updates.length);
                            return;
                        }
                        
                        try {
                            session.sendMessage(new BinaryMessage(updates[j]));
                        } catch (java.io.IOException e) {
                            // Client disconnected (Broken pipe) - this is expected
                            log.debug("[Yjs] Client disconnected during update send: sessionId={}, update={}/{}", 
                                    session.getId(), j + 1, updates.length);
                            return;
                        }
                    }
                    
                    // Small delay between batches to let the buffer drain
                    if (end < updates.length) {
                        Thread.sleep(10);
                    }
                }
            }
            
            log.info("[Yjs] Successfully sent all {} updates to sessionId={}", 
                    updates.length, session.getId());
                    
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("[Yjs] Interrupted while sending updates: {}", e.getMessage());
        } catch (Exception e) {
            log.error("[Yjs] Failed to send stored updates: {}", e.getMessage(), e);
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        String workspaceId = extractWorkspaceId(session);
        String senderId = extractUserId(session);
        
        if (workspaceId == null) {
            log.warn("[Yjs] Received message without workspaceId, ignoring");
            return;
        }

        byte[] update = message.getPayload().array();
        
        // Store update for persistence (memory + database) - only if enabled
        if (yjsPersistenceEnabled) {
            documentManager.storeUpdate(workspaceId, update, senderId);
        } else {
            log.debug("[Yjs] Persistence disabled - skipping update storage: workspaceId={}, senderId={}", 
                workspaceId, senderId);
        }
        
        log.debug("[Yjs] Relaying update: workspaceId={}, senderId={}, size={} bytes", 
            workspaceId, senderId, update.length);
        
        // Broadcast to all clients in workspace
        connectionManager.broadcastToWorkspace(workspaceId, senderId, message);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String workspaceId = extractWorkspaceId(session);
        String userId = extractUserId(session);
        
        if (workspaceId != null && userId != null) {
            connectionManager.removeConnection(workspaceId, userId, session);
            log.info("[Yjs] Client disconnected: workspaceId={}, userId={}, sessionId={}", 
                workspaceId, userId, session.getId());
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        // Broken pipe is expected when client disconnects abruptly - don't log as error
        if (exception instanceof java.io.IOException && 
            exception.getMessage() != null && 
            exception.getMessage().contains("Broken pipe")) {
            log.debug("[Yjs] Client disconnected abruptly: sessionId={}", session.getId());
        } else {
            log.error("[Yjs] Transport error for session {}: {}", session.getId(), exception.getMessage());
        }
        
        // Try to close gracefully, ignore if already closed
        try {
            if (session.isOpen()) {
                session.close(CloseStatus.SERVER_ERROR);
            }
        } catch (Exception e) {
            log.debug("[Yjs] Failed to close session after transport error: {}", e.getMessage());
        }
    }

    /**
     * Extract workspaceId from session URI
     * Expected format: /ws/yjs/{workspaceId}?token=xxx
     */
    private String extractWorkspaceId(WebSocketSession session) {
        String uri = session.getUri().getPath();
        String[] parts = uri.split("/");
        if (parts.length >= 4 && "yjs".equals(parts[2])) {
            return parts[3];
        }
        return null;
    }

    /**
     * Extract userId from session attributes (set by interceptor after auth)
     */
    private String extractUserId(WebSocketSession session) {
        return (String) session.getAttributes().get("userId");
    }
}
