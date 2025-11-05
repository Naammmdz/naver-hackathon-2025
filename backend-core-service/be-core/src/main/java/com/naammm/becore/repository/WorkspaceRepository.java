package com.naammm.becore.repository;

import java.util.List;

import com.devflow.common.domain.entity.Workspace;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, String> {

    // Find all workspaces where user is owner
    List<Workspace> findByOwnerId(String ownerId);

    // Find workspaces where user is a member (including owner)
    @Query("SELECT DISTINCT w FROM Workspace w LEFT JOIN w.members m " +
           "WHERE w.ownerId = :userId OR m.userId = :userId")
    List<Workspace> findAllByUserId(@Param("userId") String userId);

    // Check if user has access to workspace
    @Query("SELECT CASE WHEN COUNT(w) > 0 THEN true ELSE false END FROM Workspace w LEFT JOIN w.members m " +
           "WHERE w.id = :workspaceId AND (w.ownerId = :userId OR m.userId = :userId)")
    boolean userHasAccess(@Param("workspaceId") String workspaceId, @Param("userId") String userId);
}
