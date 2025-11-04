package com.naammm.becore.service;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import com.naammm.becore.websocket.YjsDocumentManager;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for periodic snapshot creation and management.
 * Automatically saves Yjs document snapshots at regular intervals
 * to ensure data persistence and efficient recovery.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class YjsPeriodicSnapshotService {

    private final YjsDocumentManager documentManager;
    private final YjsSnapshotService snapshotService;

    /**
     * Snapshot creation thresholds
     */
    private static final int MAX_UPDATES_BEFORE_SNAPSHOT = 100;
    private static final long MAX_TIME_BETWEEN_SNAPSHOTS_MS = 5 * 60 * 1000; // 5 minutes

    /**
     * Scheduled task to create snapshots for all active workspaces.
     * Runs every 2 minutes to balance performance and data safety.
     */
    @Scheduled(fixedRate = 2 * 60 * 1000) // 2 minutes
    public void createPeriodicSnapshots() {
        log.info("[PeriodicSnapshot] Starting periodic snapshot creation");

        try {
            List<String> activeWorkspaces = documentManager.getActiveWorkspaceIds();

            for (String workspaceId : activeWorkspaces) {
                createSnapshotIfNeeded(workspaceId);
            }

            log.info("[PeriodicSnapshot] Completed periodic snapshot creation for {} workspaces", activeWorkspaces.size());

        } catch (Exception e) {
            log.error("[PeriodicSnapshot] Failed to create periodic snapshots: {}", e.getMessage(), e);
        }
    }

    /**
     * Create snapshot for a specific workspace if needed.
     * Checks update count and time since last snapshot.
     */
    public CompletableFuture<Void> createSnapshotIfNeeded(String workspaceId) {
        return CompletableFuture.runAsync(() -> {
            try {
                var state = documentManager.getState(workspaceId);
                if (state == null) {
                    log.debug("[PeriodicSnapshot] No state found for workspace: {}", workspaceId);
                    return;
                }

                // Check if snapshot is needed
                boolean needsSnapshot = shouldCreateSnapshot(workspaceId, state);
                if (!needsSnapshot) {
                    log.debug("[PeriodicSnapshot] Snapshot not needed for workspace: {}", workspaceId);
                    return;
                }

                // Create and save snapshot
                createSnapshot(workspaceId);

            } catch (Exception e) {
                log.error("[PeriodicSnapshot] Failed to create snapshot for workspace {}: {}", workspaceId, e.getMessage(), e);
            }
        });
    }

    /**
     * Force create snapshot for a workspace immediately.
     */
    public void createSnapshot(String workspaceId) {
        try {
            log.info("[PeriodicSnapshot] Creating snapshot for workspace: {}", workspaceId);

            var state = documentManager.getState(workspaceId);
            if (state == null) {
                log.warn("[PeriodicSnapshot] Cannot create snapshot - no state found for workspace: {}", workspaceId);
                return;
            }

            // Get current state data
            byte[] snapshotData = state.getSnapshotData();
            byte[] vectorClock = state.getStateVector();

            if (snapshotData == null || snapshotData.length == 0) {
                log.warn("[PeriodicSnapshot] Cannot create snapshot - no snapshot data for workspace: {}", workspaceId);
                return;
            }

            // Save snapshot
            snapshotService.saveSnapshot(workspaceId, snapshotData, vectorClock);

            // Mark snapshot as created in state
            state.markSnapshotCreated();

            log.info("[PeriodicSnapshot] Successfully created snapshot for workspace: {}", workspaceId);

        } catch (Exception e) {
            log.error("[PeriodicSnapshot] Failed to create snapshot for workspace {}: {}", workspaceId, e.getMessage(), e);
        }
    }

    /**
     * Determine if a workspace needs a snapshot based on:
     * - Number of updates since last snapshot
     * - Time since last snapshot
     */
    private boolean shouldCreateSnapshot(String workspaceId, com.naammm.becore.websocket.YjsDocumentState state) {
        // Check update count
        int updateCount = state.getUpdateCount();
        if (updateCount >= MAX_UPDATES_BEFORE_SNAPSHOT) {
            log.debug("[PeriodicSnapshot] Workspace {} needs snapshot: {} updates >= threshold {}", 
                     workspaceId, updateCount, MAX_UPDATES_BEFORE_SNAPSHOT);
            return true;
        }

        // Check time since last snapshot
        long timeSinceLastSnapshot = System.currentTimeMillis() - state.getLastSnapshotTime();
        if (timeSinceLastSnapshot >= MAX_TIME_BETWEEN_SNAPSHOTS_MS) {
            log.debug("[PeriodicSnapshot] Workspace {} needs snapshot: {}ms >= threshold {}ms", 
                     workspaceId, timeSinceLastSnapshot, MAX_TIME_BETWEEN_SNAPSHOTS_MS);
            return true;
        }

        return false;
    }

    /**
     * Get snapshot statistics for monitoring.
     */
    public SnapshotStats getSnapshotStats() {
        List<String> activeWorkspaces = documentManager.getActiveWorkspaceIds();
        int totalSnapshots = 0;
        long totalSize = 0;

        for (String workspaceId : activeWorkspaces) {
            var state = documentManager.getState(workspaceId);
            if (state != null && state.hasSnapshot()) {
                totalSnapshots++;
                totalSize += state.getSnapshotSize();
            }
        }

        return new SnapshotStats(activeWorkspaces.size(), totalSnapshots, totalSize);
    }

    /**
     * Statistics for snapshot monitoring.
     */
    public static class SnapshotStats {
        public final int activeWorkspaces;
        public final int workspacesWithSnapshots;
        public final long totalSnapshotSize;

        public SnapshotStats(int activeWorkspaces, int workspacesWithSnapshots, long totalSnapshotSize) {
            this.activeWorkspaces = activeWorkspaces;
            this.workspacesWithSnapshots = workspacesWithSnapshots;
            this.totalSnapshotSize = totalSnapshotSize;
        }

        @Override
        public String toString() {
            return String.format("SnapshotStats[active=%d, withSnapshots=%d, totalSize=%d bytes]",
                               activeWorkspaces, workspacesWithSnapshots, totalSnapshotSize);
        }
    }
}