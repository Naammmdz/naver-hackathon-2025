package com.naammm.becore.websocket;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

/**
 * Stores Yjs document state for a single workspace
 * Supports both incremental updates and snapshot-based recovery
 */
@Slf4j
@Getter
public class YjsDocumentState {

    private final String workspaceId;
    private final List<byte[]> updates;
    private final long createdAt;
    private volatile long lastUpdateAt;

    // Snapshot state for efficient recovery
    private volatile byte[] snapshot;
    private volatile byte[] stateVector;
    private volatile long lastSnapshotTime;

    public YjsDocumentState(String workspaceId) {
        this.workspaceId = workspaceId;
        this.updates = new CopyOnWriteArrayList<>();
        this.createdAt = System.currentTimeMillis();
        this.lastUpdateAt = this.createdAt;
        this.lastSnapshotTime = 0; // No snapshot initially
    }

    /**
     * Load state from snapshot and vector clock.
     * This replaces any existing incremental updates.
     */
    public void loadSnapshot(byte[] snapshot, byte[] stateVector) {
        if (snapshot == null || snapshot.length == 0) {
            log.warn("[YjsState] Attempted to load empty snapshot for workspace: {}", workspaceId);
            return;
        }

        this.snapshot = snapshot.clone();
        this.stateVector = stateVector != null ? stateVector.clone() : new byte[0];

        // Clear incremental updates since we have a snapshot
        updates.clear();

        lastUpdateAt = System.currentTimeMillis();

        log.info("[YjsState] Loaded snapshot for workspace: {}, snapshot size: {} bytes, vector size: {} bytes",
                workspaceId, snapshot.length, this.stateVector.length);
    }

    /**
     * Update snapshot and vector clock (called after applying updates)
     */
    public void updateSnapshot(byte[] snapshot, byte[] stateVector) {
        this.snapshot = snapshot != null ? snapshot.clone() : this.snapshot;
        this.stateVector = stateVector != null ? stateVector.clone() : this.stateVector;
        lastUpdateAt = System.currentTimeMillis();
    }

    /**
     * Add a new update to this state
     */
    public void addUpdate(byte[] update) {
        if (update == null || update.length == 0) {
            return;
        }
        updates.add(update);
        lastUpdateAt = System.currentTimeMillis();
        log.debug("[YjsState] Added update to workspace {}: {} bytes, total={}", 
                 workspaceId, update.length, updates.size());
    }

    /**
     * Get combined updates as single byte array
     */
    public byte[] getCombinedUpdates() {
        if (updates.isEmpty()) {
            return new byte[0];
        }

        int totalLength = 0;
        for (byte[] update : updates) {
            totalLength += update.length;
        }

        byte[] result = new byte[totalLength];
        int offset = 0;
        for (byte[] update : updates) {
            System.arraycopy(update, 0, result, offset, update.length);
            offset += update.length;
        }

        return result;
    }

    /**
     * Get all updates as array (for sending to clients)
     */
    public byte[][] getAllUpdates() {
        return updates.toArray(new byte[0][]);
    }

    /**
     * Check if two state vectors are equal
     */
    private boolean vectorsEqual(byte[] v1, byte[] v2) {
        if (v1 == null && v2 == null) return true;
        if (v1 == null || v2 == null) return false;
        if (v1.length != v2.length) return false;

        for (int i = 0; i < v1.length; i++) {
            if (v1[i] != v2[i]) return false;
        }
        return true;
    }

    /**
     * Concatenate multiple updates into a single byte array
     */
    private byte[] concatenateUpdates(byte[][] updates) {
        if (updates.length == 0) return new byte[0];
        if (updates.length == 1) return updates[0].clone();

        int totalLength = 0;
        for (byte[] update : updates) {
            totalLength += update.length;
        }

        byte[] result = new byte[totalLength];
        int offset = 0;
        for (byte[] update : updates) {
            System.arraycopy(update, 0, result, offset, update.length);
            offset += update.length;
        }

        return result;
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
     * Calculate delta update from a specific vector clock
     * This is used for efficient sync with clients that have partial state
     * 
     * For now, this is a simplified implementation that returns:
     * - All combined updates if no snapshot exists
     * - Full snapshot as fallback (proper delta calculation requires Yjs Java library)
     */
    public byte[] calculateDelta(byte[] fromVector) {
        if (snapshot == null) {
            // If no snapshot, return all updates as delta
            log.debug("[YjsState] No snapshot available, returning all updates for workspace: {}", workspaceId);
            return getCombinedUpdates();
        }

        // TODO: Implement proper Yjs delta calculation when Yjs Java library is available
        // For now, return full snapshot as delta fallback
        log.debug("[YjsState] Returning full snapshot as delta for workspace: {} (Yjs delta calculation not yet implemented)", workspaceId);
        return snapshot.clone();
    }

    /**
     * Get snapshot data for persistence
     */
    public byte[] getSnapshotData() {
        return snapshot;
    }

    /**
     * Get current state vector
     */
    public byte[] getStateVector() {
        return stateVector;
    }

    /**
     * Mark that a snapshot has been created
     */
    public void markSnapshotCreated() {
        this.lastSnapshotTime = System.currentTimeMillis();
        log.debug("[YjsState] Marked snapshot created for workspace: {}", workspaceId);
    }

    /**
     * Check if this state has a snapshot
     */
    public boolean hasSnapshot() {
        return snapshot != null && snapshot.length > 0;
    }

    /**
     * Get snapshot size in bytes
     */
    public long getSnapshotSize() {
        return snapshot != null ? snapshot.length : 0;
    }

    /**
     * Get time of last snapshot creation
     */
    public long getLastSnapshotTime() {
        return lastSnapshotTime;
    }

    @Override
    public String toString() {
        return String.format("YjsDocumentState[workspace=%s, updates=%d, size=%d bytes, snapshot=%s, age=%d ms]",
                           workspaceId, getUpdateCount(), getTotalSize(), 
                           hasSnapshot() ? snapshot.length + " bytes" : "none",
                           System.currentTimeMillis() - createdAt);
    }
}
