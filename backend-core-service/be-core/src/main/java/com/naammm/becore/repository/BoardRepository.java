package com.naammm.becore.repository;

import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BoardRepository extends JpaRepository<Board, String> {

    List<Board> findByUserIdOrderByUpdatedAtDesc(String userId);

    List<Board> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);

    Optional<Board> findByIdAndUserId(String id, String userId);

    void deleteByIdAndUserId(String id, String userId);

    void deleteByWorkspaceId(String workspaceId);
}
