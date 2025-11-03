package com.naammm.becore.repository;

import java.time.LocalDateTime;
import java.util.List;

import com.naammm.becore.entity.YjsUpdate;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * Repository for managing Yjs CRDT updates persistence.
 */
@Repository
public interface YjsUpdateRepository extends JpaRepository<YjsUpdate, String> {

    /**
     * Find all updates for a workspace, ordered by creation time.
     * This is used to reconstruct the full Yjs document state.
     */
    @Query("SELECT y FROM YjsUpdate y WHERE y.workspaceId = :workspaceId ORDER BY y.createdAt ASC")
    List<YjsUpdate> findByWorkspaceIdOrderByCreatedAtAsc(@Param("workspaceId") String workspaceId);

    /**
     * Count updates for a workspace.
     */
    @Query("SELECT COUNT(y) FROM YjsUpdate y WHERE y.workspaceId = :workspaceId")
    long countByWorkspaceId(@Param("workspaceId") String workspaceId);

    /**
     * Get total size of all updates for a workspace (for monitoring).
     */
    @Query("SELECT COALESCE(SUM(y.updateSize), 0) FROM YjsUpdate y WHERE y.workspaceId = :workspaceId")
    long getTotalSizeByWorkspaceId(@Param("workspaceId") String workspaceId);

    /**
     * Delete all updates for a workspace (for cleanup/testing).
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM YjsUpdate y WHERE y.workspaceId = :workspaceId")
    void deleteByWorkspaceId(@Param("workspaceId") String workspaceId);

    /**
     * Delete old updates for a workspace (for optimization).
     * Keep only recent updates to prevent DB bloat.
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM YjsUpdate y WHERE y.workspaceId = :workspaceId AND y.createdAt < :before")
    void deleteByWorkspaceIdAndCreatedAtBefore(
        @Param("workspaceId") String workspaceId, 
        @Param("before") LocalDateTime before
    );

    /**
     * Find updates created after a specific time (for incremental sync).
     */
    @Query("SELECT y FROM YjsUpdate y WHERE y.workspaceId = :workspaceId AND y.createdAt > :after ORDER BY y.createdAt ASC")
    List<YjsUpdate> findByWorkspaceIdAndCreatedAtAfter(
        @Param("workspaceId") String workspaceId,
        @Param("after") LocalDateTime after
    );
}
