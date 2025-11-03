package com.naammm.becore.controller;

import com.naammm.becore.service.YjsUpdateService;
import com.naammm.becore.websocket.YjsDocumentManager;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Controller for managing and monitoring Yjs updates.
 * Admin endpoints for workspace management and debugging.
 */
@Slf4j
@RestController
@RequestMapping("/api/yjs")
@RequiredArgsConstructor
public class YjsUpdateController {

    private final YjsUpdateService yjsUpdateService;
    private final YjsDocumentManager documentManager;

    /**
     * Get statistics for a workspace.
     * Returns both memory cache and database stats.
     */
    @GetMapping("/workspaces/{workspaceId}/stats")
    public ResponseEntity<WorkspaceStatsResponse> getWorkspaceStats(
            @PathVariable String workspaceId) {
        
        log.info("[YjsController] Getting stats for workspace: {}", workspaceId);
        
        YjsDocumentManager.WorkspaceStats stats = documentManager.getFullStats(workspaceId);
        
        WorkspaceStatsResponse response = new WorkspaceStatsResponse(
            stats.workspaceId(),
            stats.memoryUpdateCount(),
            stats.memorySizeBytes(),
            stats.dbUpdateCount(),
            stats.dbSizeBytes(),
            formatBytes(stats.memorySizeBytes()),
            formatBytes(stats.dbSizeBytes())
        );
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get overall system statistics.
     */
    @GetMapping("/stats")
    public ResponseEntity<SystemStatsResponse> getSystemStats() {
        log.info("[YjsController] Getting system stats");
        
        int activeWorkspaces = documentManager.getWorkspaceCount();
        
        SystemStatsResponse response = new SystemStatsResponse(
            activeWorkspaces,
            "Yjs CRDT system operational"
        );
        
        return ResponseEntity.ok(response);
    }

    /**
     * Clear workspace cache (force reload from DB on next access).
     */
    @DeleteMapping("/workspaces/{workspaceId}/cache")
    public ResponseEntity<MessageResponse> clearWorkspaceCache(
            @PathVariable String workspaceId) {
        
        log.info("[YjsController] Clearing cache for workspace: {}", workspaceId);
        
        documentManager.clearWorkspaceCache(workspaceId);
        
        return ResponseEntity.ok(new MessageResponse(
            "Cache cleared for workspace: " + workspaceId
        ));
    }

    /**
     * Clear workspace completely (memory + database).
     * WARNING: This deletes all collaboration history!
     */
    @DeleteMapping("/workspaces/{workspaceId}/all")
    public ResponseEntity<MessageResponse> clearWorkspaceCompletely(
            @PathVariable String workspaceId) {
        
        log.warn("[YjsController] COMPLETELY clearing workspace: {}", workspaceId);
        
        documentManager.clearWorkspaceCompletely(workspaceId);
        
        return ResponseEntity.ok(new MessageResponse(
            "Workspace completely cleared: " + workspaceId
        ));
    }

    /**
     * Prune old updates for optimization.
     * Keeps only recent history (default: 30 days).
     */
    @PostMapping("/workspaces/{workspaceId}/prune")
    public ResponseEntity<PruneResponse> pruneOldUpdates(
            @PathVariable String workspaceId,
            @RequestParam(defaultValue = "30") int keepDays) {
        
        log.info("[YjsController] Pruning old updates for workspace: {} (keep {} days)", 
                workspaceId, keepDays);
        
        int deletedCount = yjsUpdateService.pruneOldUpdates(workspaceId, keepDays);
        
        return ResponseEntity.ok(new PruneResponse(
            workspaceId,
            deletedCount,
            keepDays,
            "Pruned " + deletedCount + " old updates"
        ));
    }

    // Response DTOs
    
    record WorkspaceStatsResponse(
        String workspaceId,
        int memoryUpdateCount,
        long memorySizeBytes,
        long dbUpdateCount,
        long dbSizeBytes,
        String memorySizeFormatted,
        String dbSizeFormatted
    ) {}

    record SystemStatsResponse(
        int activeWorkspaces,
        String status
    ) {}

    record MessageResponse(
        String message
    ) {}

    record PruneResponse(
        String workspaceId,
        int deletedCount,
        int keepDays,
        String message
    ) {}

    // Helper methods
    
    private String formatBytes(long bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        } else if (bytes < 1024 * 1024) {
            return String.format("%.2f KB", bytes / 1024.0);
        } else if (bytes < 1024 * 1024 * 1024) {
            return String.format("%.2f MB", bytes / (1024.0 * 1024.0));
        } else {
            return String.format("%.2f GB", bytes / (1024.0 * 1024.0 * 1024.0));
        }
    }
}
