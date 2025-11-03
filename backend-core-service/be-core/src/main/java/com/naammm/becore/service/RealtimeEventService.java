package com.naammm.becore.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class RealtimeEventService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast a data change event to all users in a workspace
     */
    public void broadcastDataChange(String workspaceId, String entityType, String action, String entityId, String userId) {
        if (workspaceId == null || entityType == null || action == null) {
            log.warn("[Realtime] Missing required parameters for broadcast");
            return;
        }

        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", "data-change");
            event.put("entityType", entityType); // "task", "document", "board"
            event.put("action", action); // "created", "updated", "deleted"
            event.put("entityId", entityId);
            event.put("userId", userId);
            event.put("workspaceId", workspaceId);
            event.put("timestamp", System.currentTimeMillis());

            String topic = "/topic/workspace." + workspaceId;
            messagingTemplate.convertAndSend(topic, event);

            log.debug("[Realtime] Broadcasted {} {} for {} in workspace {}", 
                action, entityType, entityId, workspaceId);
        } catch (Exception e) {
            log.error("[Realtime] Failed to broadcast data change", e);
        }
    }

    /**
     * Broadcast task changes
     */
    public void broadcastTaskChange(String workspaceId, String action, String taskId, String userId) {
        broadcastDataChange(workspaceId, "task", action, taskId, userId);
    }

    /**
     * Broadcast document changes
     */
    public void broadcastDocumentChange(String workspaceId, String action, String documentId, String userId) {
        broadcastDataChange(workspaceId, "document", action, documentId, userId);
    }

    /**
     * Broadcast board changes
     */
    public void broadcastBoardChange(String workspaceId, String action, String boardId, String userId) {
        broadcastDataChange(workspaceId, "board", action, boardId, userId);
    }
}
