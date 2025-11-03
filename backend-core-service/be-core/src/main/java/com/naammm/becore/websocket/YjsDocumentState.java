package com.naammm.becore.websocket;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

/**
 * Stores Yjs document state for a single workspace
 * Keeps all updates in memory for persistence and sync
 */
@Slf4j
@Getter
public class YjsDocumentState {
    
    private final String workspaceId;
    private final List<byte[]> updates;
    private final long createdAt;
    private volatile long lastUpdateAt;

    public YjsDocumentState(String workspaceId) {
        this.workspaceId = workspaceId;
        this.updates = new CopyOnWriteArrayList<>();
        this.createdAt = System.currentTimeMillis();
        this.lastUpdateAt = this.createdAt;
    }

    /**
     * Add a new update to the document
     */
    public void addUpdate(byte[] update) {
        if (update == null || update.length == 0) {
            log.warn("[YjsState] Attempted to add empty update for workspace: {}", workspaceId);
            return;
        }
        
        updates.add(update);
        lastUpdateAt = System.currentTimeMillis();
        
        log.debug("[YjsState] Added update #{} for workspace: {}, size: {} bytes", 
                  updates.size(), workspaceId, update.length);
    }

    /**
     * Get all updates as array (for sending to clients)
     */
    public byte[][] getAllUpdates() {
        return updates.toArray(new byte[0][]);
    }

    /**
     * Get update count
     */
    public int getUpdateCount() {
        return updates.size();
    }

    /**
     * Get total size of all updates
     */
    public long getTotalSize() {
        return updates.stream()
                     .mapToLong(update -> update.length)
                     .sum();
    }

    /**
     * Clear all updates (for testing/reset)
     */
    public void clear() {
        updates.clear();
        log.info("[YjsState] Cleared all updates for workspace: {}", workspaceId);
    }

    @Override
    public String toString() {
        return String.format("YjsDocumentState[workspace=%s, updates=%d, size=%d bytes, age=%d ms]",
                           workspaceId, getUpdateCount(), getTotalSize(), 
                           System.currentTimeMillis() - createdAt);
    }
}
