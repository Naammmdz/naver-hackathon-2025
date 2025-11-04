package com.naammm.becore.repository;

import java.util.Optional;

import com.naammm.becore.entity.YjsSnapshot;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository for Yjs snapshot persistence operations.
 */
@Repository
public interface YjsSnapshotRepository extends JpaRepository<YjsSnapshot, String> {

    /**
     * Find the latest snapshot for a workspace.
     */
    @Query("SELECT s FROM YjsSnapshot s WHERE s.workspaceId = :workspaceId ORDER BY s.updatedAt DESC LIMIT 1")
    Optional<YjsSnapshot> findLatestByWorkspaceId(@Param("workspaceId") String workspaceId);

    /**
     * Delete all snapshots for a workspace.
     */
    void deleteByWorkspaceId(String workspaceId);
}