package com.naammm.becore.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.WorkspaceInvite;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkspaceInviteRepository extends JpaRepository<WorkspaceInvite, String> {

    List<WorkspaceInvite> findByWorkspaceId(String workspaceId);

    Optional<WorkspaceInvite> findByWorkspaceIdAndEmail(String workspaceId, String email);

    List<WorkspaceInvite> findByEmail(String email);

    // Delete expired invites
    void deleteByExpiresAtBefore(LocalDateTime dateTime);
}
