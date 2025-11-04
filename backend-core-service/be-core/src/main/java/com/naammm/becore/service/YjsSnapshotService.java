package com.naammm.becore.service;

import java.util.Optional;

import com.naammm.becore.entity.YjsSnapshot;
import com.naammm.becore.repository.YjsSnapshotRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for managing Yjs snapshot persistence.
 * Handles periodic snapshots and state recovery for collaborative documents.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class YjsSnapshotService {

    private final YjsSnapshotRepository snapshotRepository;

    /**
     * Save a snapshot for a workspace (system-generated, no user).
     * This replaces any existing snapshot for the workspace.
     */
    @Transactional
    public void saveSnapshot(String workspaceId, byte[] snapshot, byte[] vector) {
        saveSnapshot(workspaceId, snapshot, vector, "system");
    }

    /**
     * Save a snapshot for a workspace.
     * This replaces any existing snapshot for the workspace.
     */
    @Transactional
    public void saveSnapshot(String workspaceId, byte[] snapshot, byte[] vector, String userId) {
        log.debug("Saving snapshot for workspace: {}", workspaceId);

        // Delete existing snapshot for this workspace
        snapshotRepository.deleteByWorkspaceId(workspaceId);

        // Save new snapshot
        YjsSnapshot yjsSnapshot = YjsSnapshot.builder()
                .workspaceId(workspaceId)
                .snapshot(snapshot)
                .vector(vector)
                .userId(userId)
                .build();

        snapshotRepository.save(yjsSnapshot);

        log.info("Saved snapshot for workspace: {} (size: {} bytes, vector: {} bytes)",
                workspaceId, snapshot.length, vector.length);
    }

    /**
     * Load the latest snapshot for a workspace.
     */
    @Transactional(readOnly = true)
    public Optional<YjsSnapshot> loadLatestSnapshot(String workspaceId) {
        Optional<YjsSnapshot> snapshot = snapshotRepository.findLatestByWorkspaceId(workspaceId);

        if (snapshot.isPresent()) {
            log.debug("Loaded snapshot for workspace: {} (updated: {})",
                    workspaceId, snapshot.get().getUpdatedAt());
        } else {
            log.debug("No snapshot found for workspace: {}", workspaceId);
        }

        return snapshot;
    }

    /**
     * Check if a workspace has a snapshot.
     */
    @Transactional(readOnly = true)
    public boolean hasSnapshot(String workspaceId) {
        return snapshotRepository.findLatestByWorkspaceId(workspaceId).isPresent();
    }

    /**
     * Delete all snapshots for a workspace.
     */
    @Transactional
    public void deleteSnapshots(String workspaceId) {
        snapshotRepository.deleteByWorkspaceId(workspaceId);
        log.info("Deleted all snapshots for workspace: {}", workspaceId);
    }
}