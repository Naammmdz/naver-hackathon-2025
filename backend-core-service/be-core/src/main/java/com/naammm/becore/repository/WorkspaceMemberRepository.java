package com.naammm.becore.repository;

import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.WorkspaceMember;
import com.naammm.becore.entity.WorkspaceRole;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, String> {

    // Find all members of a workspace
    List<WorkspaceMember> findByWorkspaceId(String workspaceId);

    // Find all workspaces where user is a member (with workspace eagerly loaded)
    @Query("SELECT m FROM WorkspaceMember m JOIN FETCH m.workspace WHERE m.userId = :userId")
    List<WorkspaceMember> findByUserIdWithWorkspace(@Param("userId") String userId);

    // Find workspace IDs for a user (returns only IDs, no lazy loading)
    @Query("SELECT m.workspace.id FROM WorkspaceMember m WHERE m.userId = :userId")
    List<String> findWorkspaceIdsByUserId(@Param("userId") String userId);

    // Find all workspaces where user is a member
    List<WorkspaceMember> findByUserId(String userId);

    // Find specific member in workspace
    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(String workspaceId, String userId);

    // Check if user is member of workspace
    boolean existsByWorkspaceIdAndUserId(String workspaceId, String userId);

    // Count members in workspace
    long countByWorkspaceId(String workspaceId);

    // Delete member from workspace
    void deleteByWorkspaceIdAndUserId(String workspaceId, String userId);

    // Get member role
    @Query("SELECT m.role FROM WorkspaceMember m WHERE m.workspace.id = :workspaceId AND m.userId = :userId")
    Optional<WorkspaceRole> findRoleByWorkspaceIdAndUserId(
        @Param("workspaceId") String workspaceId, 
        @Param("userId") String userId
    );
}
