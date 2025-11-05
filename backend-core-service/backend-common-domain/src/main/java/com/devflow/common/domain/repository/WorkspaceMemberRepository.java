package com.devflow.common.domain.repository;

import com.devflow.common.domain.entity.WorkspaceMember;
import com.devflow.common.domain.entity.WorkspaceRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, String> {

    List<WorkspaceMember> findByWorkspaceId(String workspaceId);

    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(String workspaceId, String userId);

    boolean existsByWorkspaceIdAndUserId(String workspaceId, String userId);

    void deleteByWorkspaceIdAndUserId(String workspaceId, String userId);

    @Query("SELECT m.role FROM WorkspaceMember m WHERE m.workspace.id = :workspaceId AND m.userId = :userId")
    Optional<WorkspaceRole> findRoleByWorkspaceIdAndUserId(
        @Param("workspaceId") String workspaceId,
        @Param("userId") String userId
    );
}
