package com.naammm.becore.repository;

import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.Board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BoardRepository extends JpaRepository<Board, String> {

    // User-based queries (legacy)
    List<Board> findByUserIdOrderByUpdatedAtDesc(String userId);

    Optional<Board> findByIdAndUserId(String id, String userId);

    void deleteByIdAndUserId(String id, String userId);

    // Workspace-based queries (new)
    List<Board> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);
}
