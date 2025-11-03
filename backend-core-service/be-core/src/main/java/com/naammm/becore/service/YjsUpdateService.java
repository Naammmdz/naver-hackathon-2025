package com.naammm.becore.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import com.naammm.becore.entity.YjsUpdate;
import com.naammm.becore.repository.YjsUpdateRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for managing Yjs update persistence.
 * Handles loading and saving Yjs CRDT updates to/from database.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class YjsUpdateService {

    private final YjsUpdateRepository yjsUpdateRepository;

    /**
     * Save a Yjs update to database.
     */
    @Transactional
    public void saveUpdate(String workspaceId, byte[] updateData, String userId) {
        if (updateData == null || updateData.length == 0) {
            log.warn("[YjsUpdateService] Attempted to save empty update for workspace: {}", workspaceId);
            return;
        }

        try {
            YjsUpdate update = YjsUpdate.builder()
                .workspaceId(workspaceId)
                .updateData(updateData)
                .updateSize(updateData.length)
                .userId(userId)
                .build();

            yjsUpdateRepository.save(update);
            
            log.debug("[YjsUpdateService] Saved update for workspace: {}, size: {} bytes", 
                     workspaceId, updateData.length);
        } catch (Exception e) {
            log.error("[YjsUpdateService] Failed to save update for workspace: {}", workspaceId, e);
            throw new RuntimeException("Failed to persist Yjs update", e);
        }
    }

    /**
     * Load all updates for a workspace from database.
     */
    @Transactional(readOnly = true)
    public List<byte[]> loadUpdates(String workspaceId) {
        try {
            List<YjsUpdate> updates = yjsUpdateRepository.findByWorkspaceIdOrderByCreatedAtAsc(workspaceId);
            
            log.info("[YjsUpdateService] Loaded {} updates for workspace: {}", 
                    updates.size(), workspaceId);
            
            return updates.stream()
                         .map(YjsUpdate::getUpdateData)
                         .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("[YjsUpdateService] Failed to load updates for workspace: {}", workspaceId, e);
            return List.of();
        }
    }

    /**
     * Get statistics for a workspace.
     */
    @Transactional(readOnly = true)
    public WorkspaceYjsStats getStats(String workspaceId) {
        long count = yjsUpdateRepository.countByWorkspaceId(workspaceId);
        long totalSize = yjsUpdateRepository.getTotalSizeByWorkspaceId(workspaceId);
        
        return new WorkspaceYjsStats(workspaceId, count, totalSize);
    }

    /**
     * Clear all updates for a workspace (for testing/cleanup).
     */
    @Transactional
    public void clearWorkspace(String workspaceId) {
        try {
            yjsUpdateRepository.deleteByWorkspaceId(workspaceId);
            log.info("[YjsUpdateService] Cleared all updates for workspace: {}", workspaceId);
        } catch (Exception e) {
            log.error("[YjsUpdateService] Failed to clear workspace: {}", workspaceId, e);
            throw new RuntimeException("Failed to clear Yjs updates", e);
        }
    }

    /**
     * Delete old updates (optimization - keep only recent history).
     * Yjs can compact updates, so we don't need infinite history.
     */
    @Transactional
    public int pruneOldUpdates(String workspaceId, int keepDays) {
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(keepDays);
            
            long countBefore = yjsUpdateRepository.countByWorkspaceId(workspaceId);
            yjsUpdateRepository.deleteByWorkspaceIdAndCreatedAtBefore(workspaceId, cutoffDate);
            long countAfter = yjsUpdateRepository.countByWorkspaceId(workspaceId);
            
            int deletedCount = (int) (countBefore - countAfter);
            
            log.info("[YjsUpdateService] Pruned {} old updates for workspace: {} (keeping last {} days)", 
                    deletedCount, workspaceId, keepDays);
            
            return deletedCount;
        } catch (Exception e) {
            log.error("[YjsUpdateService] Failed to prune old updates for workspace: {}", workspaceId, e);
            return 0;
        }
    }

    /**
     * Load updates created after a specific time (for incremental sync).
     */
    @Transactional(readOnly = true)
    public List<byte[]> loadUpdatesAfter(String workspaceId, LocalDateTime after) {
        try {
            List<YjsUpdate> updates = yjsUpdateRepository.findByWorkspaceIdAndCreatedAtAfter(workspaceId, after);
            
            log.debug("[YjsUpdateService] Loaded {} incremental updates for workspace: {} after {}", 
                     updates.size(), workspaceId, after);
            
            return updates.stream()
                         .map(YjsUpdate::getUpdateData)
                         .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("[YjsUpdateService] Failed to load incremental updates for workspace: {}", workspaceId, e);
            return List.of();
        }
    }

    /**
     * Statistics for a workspace.
     */
    public record WorkspaceYjsStats(
        String workspaceId,
        long updateCount,
        long totalSizeBytes
    ) {
        public double getTotalSizeMB() {
            return totalSizeBytes / (1024.0 * 1024.0);
        }
    }
}
