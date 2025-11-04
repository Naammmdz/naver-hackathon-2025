package com.naammm.becore.websocket;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import com.naammm.becore.entity.YjsSnapshot;
import com.naammm.becore.service.YjsSnapshotService;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Manages Yjs document states for each workspace.
 * Hybrid approach: Memory cache + Database snapshots.
 *
 * - Memory: Fast access for active workspaces
 * - Database: Persistent snapshots for recovery after restart
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class YjsDocumentManager {

    private final YjsSnapshotService yjsSnapshotService;

    // Memory cache: workspaceId -> YjsDocumentState
    private final Map<String, YjsDocumentState> workspaceStates = new ConcurrentHashMap<>();

    /**
     * Get or create document state for a workspace.
     * Loads from snapshot if available, otherwise starts fresh.
     */
    public YjsDocumentState getOrCreateState(String workspaceId) {
        return workspaceStates.computeIfAbsent(workspaceId, id -> {
            log.info("[YjsDocManager] Loading/creating state for workspace: {}", id);

            YjsDocumentState state = new YjsDocumentState(id);

            // Try to load from snapshot - much more efficient than replaying all updates
            try {
                Optional<YjsSnapshot> snapshot = yjsSnapshotService.loadLatestSnapshot(id);

                if (snapshot.isPresent()) {
                    // Load snapshot and vector clock
                    state.loadSnapshot(snapshot.get().getSnapshot(), snapshot.get().getVector());
                    log.info("[YjsDocManager] Loaded snapshot for workspace: {} (updated: {})",
                            id, snapshot.get().getUpdatedAt());
                } else {
                    log.info("[YjsDocManager] No snapshot found, starting fresh for workspace: {}", id);
                }
            } catch (Exception e) {
                log.error("[YjsDocManager] Failed to load snapshot, starting with empty state: workspace={}, error={}",
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
     * Clear workspace state from memory cache only.
     */
    public void clearWorkspaceCache(String workspaceId) {
        workspaceStates.remove(workspaceId);
        log.info("[YjsDocManager] Cleared memory cache for workspace: {}", workspaceId);
    }

    /**
     * Clear workspace completely (memory + database snapshots).
     */
    public void clearWorkspaceCompletely(String workspaceId) {
        workspaceStates.remove(workspaceId);
        yjsSnapshotService.deleteSnapshots(workspaceId);
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
     * Get full statistics for a workspace (memory cache only).
     */
    public WorkspaceStats getFullStats(String workspaceId) {
        YjsDocumentState memoryState = workspaceStates.get(workspaceId);
        int memoryCount = memoryState != null ? memoryState.getUpdateCount() : 0;
        long memorySize = memoryState != null ? memoryState.getTotalSize() : 0;
        
        return new WorkspaceStats(
            workspaceId,
            memoryCount,
            memorySize,
            0, // No database update tracking
            0  // No database size tracking
        );
    }

    public record WorkspaceStats(
        String workspaceId,
        int memoryUpdateCount,
        long memorySizeBytes,
        long dbUpdateCount,
        long dbSizeBytes
    ) {}

    /**
     * Get list of active workspace IDs in memory cache.
     */
    public List<String> getActiveWorkspaceIds() {
        return List.copyOf(workspaceStates.keySet());
    }

    /**
     * Get state for a workspace (null if not in memory).
     */
    public YjsDocumentState getState(String workspaceId) {
        return workspaceStates.get(workspaceId);
    }
}
