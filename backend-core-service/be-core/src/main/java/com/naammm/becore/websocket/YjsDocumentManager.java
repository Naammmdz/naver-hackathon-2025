package com.naammm.becore.websocket;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.naammm.becore.service.YjsUpdateService;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Manages Yjs document states for each workspace.
 * Hybrid approach: Memory cache + Database persistence.
 * 
 * - Memory: Fast access for active workspaces
 * - Database: Persistent storage for recovery after restart
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class YjsDocumentManager {

    private final YjsUpdateService yjsUpdateService;

    // Memory cache: workspaceId -> YjsDocumentState
    private final Map<String, YjsDocumentState> workspaceStates = new ConcurrentHashMap<>();

    /**
     * Get or create document state for a workspace.
     * Loads from database if not in memory.
     */
    public YjsDocumentState getOrCreateState(String workspaceId) {
        return workspaceStates.computeIfAbsent(workspaceId, id -> {
            log.info("[YjsDocManager] Loading/creating state for workspace: {}", id);
            
            YjsDocumentState state = new YjsDocumentState(id);
            
            // Try to load from database - but don't fail if DB has issues
            try {
                List<byte[]> persistedUpdates = yjsUpdateService.loadUpdates(id);
                
                // Populate state with persisted updates
                if (!persistedUpdates.isEmpty()) {
                    for (byte[] update : persistedUpdates) {
                        state.addUpdate(update);
                    }
                    log.info("[YjsDocManager] Loaded {} persisted updates for workspace: {}", 
                            persistedUpdates.size(), id);
                } else {
                    log.info("[YjsDocManager] No persisted updates found, starting fresh for workspace: {}", id);
                }
            } catch (Exception e) {
                log.error("[YjsDocManager] Failed to load persisted updates, starting with empty state: workspace={}, error={}", 
                         id, e.getMessage(), e);
                // Continue with empty state - real-time sync will still work
            }
            
            return state;
        });
    }

    /**
     * Store an update for a workspace.
     * Updates both memory cache and database.
     */
    public void storeUpdate(String workspaceId, byte[] update, String userId) {
        if (update == null || update.length == 0) {
            log.warn("[YjsDocManager] Ignoring empty update for workspace: {}", workspaceId);
            return;
        }

        // Update memory cache
        YjsDocumentState state = getOrCreateState(workspaceId);
        state.addUpdate(update);
        
        log.debug("[YjsDocManager] Stored update in memory: workspace={}, size={} bytes, total={}", 
                  workspaceId, update.length, state.getUpdateCount());

        // Persist to database asynchronously
        try {
            yjsUpdateService.saveUpdate(workspaceId, update, userId);
        } catch (Exception e) {
            log.error("[YjsDocManager] Failed to persist update to database: workspace={}", 
                     workspaceId, e);
            // Continue - memory cache still has the update
        }
    }

    /**
     * Get all updates for a workspace (for sync).
     * Returns from memory cache if available, otherwise loads from DB.
     */
    public byte[][] getAllUpdates(String workspaceId) {
        YjsDocumentState state = getOrCreateState(workspaceId);
        byte[][] updates = state.getAllUpdates();
        
        log.debug("[YjsDocManager] Retrieved {} updates for workspace: {}", updates.length, workspaceId);
        return updates;
    }

    /**
     * Clear workspace state from memory cache.
     * Note: Does NOT delete from database - use YjsUpdateService for that.
     */
    public void clearWorkspaceCache(String workspaceId) {
        workspaceStates.remove(workspaceId);
        log.info("[YjsDocManager] Cleared memory cache for workspace: {}", workspaceId);
    }

    /**
     * Clear workspace completely (memory + database).
     */
    public void clearWorkspaceCompletely(String workspaceId) {
        workspaceStates.remove(workspaceId);
        yjsUpdateService.clearWorkspace(workspaceId);
        log.info("[YjsDocManager] Completely cleared workspace: {}", workspaceId);
    }

    /**
     * Get statistics for memory cache.
     */
    public int getWorkspaceCount() {
        return workspaceStates.size();
    }

    public int getUpdateCount(String workspaceId) {
        YjsDocumentState state = workspaceStates.get(workspaceId);
        return state != null ? state.getUpdateCount() : 0;
    }

    /**
     * Get full statistics including database.
     */
    public WorkspaceStats getFullStats(String workspaceId) {
        YjsDocumentState memoryState = workspaceStates.get(workspaceId);
        int memoryCount = memoryState != null ? memoryState.getUpdateCount() : 0;
        long memorySize = memoryState != null ? memoryState.getTotalSize() : 0;
        
        YjsUpdateService.WorkspaceYjsStats dbStats = yjsUpdateService.getStats(workspaceId);
        
        return new WorkspaceStats(
            workspaceId,
            memoryCount,
            memorySize,
            dbStats.updateCount(),
            dbStats.totalSizeBytes()
        );
    }

    public record WorkspaceStats(
        String workspaceId,
        int memoryUpdateCount,
        long memorySizeBytes,
        long dbUpdateCount,
        long dbSizeBytes
    ) {}
}
