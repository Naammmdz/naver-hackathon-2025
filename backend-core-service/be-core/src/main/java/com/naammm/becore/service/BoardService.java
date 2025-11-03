package com.naammm.becore.service;

import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.Board;
import com.naammm.becore.entity.WorkspaceMember;
import com.naammm.becore.entity.WorkspaceRole;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.BoardRepository;
import com.naammm.becore.repository.WorkspaceMemberRepository;
import com.naammm.becore.repository.WorkspaceRepository;
import com.naammm.becore.security.UserContext;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class BoardService {

    private final BoardRepository boardRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final RealtimeEventService realtimeEventService;

    public List<Board> getAllBoards() {
        return boardRepository.findByUserIdOrderByUpdatedAtDesc(UserContext.requireUserId());
    }

    public Optional<Board> getBoardById(String id) {
        String userId = UserContext.requireUserId();
        return boardRepository.findById(id)
                .filter(board -> canAccessBoard(board, userId));
    }

    public Board createBoard(Board board) {
        String userId = UserContext.requireUserId();
        board.setUserId(userId);
        if (!StringUtils.hasText(board.getTitle())) {
            board.setTitle("Untitled Board");
        }
        if (StringUtils.hasText(board.getWorkspaceId())) {
            ensureCanModifyWorkspace(board.getWorkspaceId(), userId);
        }
        
        Board savedBoard = boardRepository.save(board);
        
        // Broadcast realtime event if board belongs to workspace
        if (StringUtils.hasText(savedBoard.getWorkspaceId())) {
            realtimeEventService.broadcastBoardChange(
                savedBoard.getWorkspaceId(),
                "created",
                savedBoard.getId(),
                userId
            );
        }
        
        return savedBoard;
    }

    public Board updateBoard(String id, Board payload) {
        String userId = UserContext.requireUserId();
        Board board = getBoardForCurrentUser(id, userId);

        if (StringUtils.hasText(board.getWorkspaceId())) {
            ensureCanModifyWorkspace(board.getWorkspaceId(), userId);
        }

        if (payload.getTitle() != null) {
            board.setTitle(payload.getTitle());
        }
        if (payload.getSnapshot() != null) {
            board.setSnapshot(payload.getSnapshot());
        }
        
        Board savedBoard = boardRepository.save(board);
        
        // Broadcast realtime event
        if (StringUtils.hasText(savedBoard.getWorkspaceId())) {
            realtimeEventService.broadcastBoardChange(
                savedBoard.getWorkspaceId(),
                "updated",
                savedBoard.getId(),
                userId
            );
        }
        
        return savedBoard;
    }

    public Board updateSnapshot(String id, String snapshot) {
        String userId = UserContext.requireUserId();
        Board board = getBoardForCurrentUser(id, userId);
        if (StringUtils.hasText(board.getWorkspaceId())) {
            ensureCanModifyWorkspace(board.getWorkspaceId(), userId);
        }
        board.setSnapshot(snapshot);
        
        Board savedBoard = boardRepository.save(board);
        
        // Broadcast realtime event for snapshot update
        if (StringUtils.hasText(savedBoard.getWorkspaceId())) {
            realtimeEventService.broadcastBoardChange(
                savedBoard.getWorkspaceId(),
                "updated",
                savedBoard.getId(),
                userId
            );
        }
        
        return savedBoard;
    }

    public void deleteBoard(String id) {
        String userId = UserContext.requireUserId();
        Board board = getBoardForCurrentUser(id, userId);
        if (StringUtils.hasText(board.getWorkspaceId())) {
            ensureCanModifyWorkspace(board.getWorkspaceId(), userId);
        }
        
        String workspaceId = board.getWorkspaceId();
        boardRepository.delete(board);
        
        // Broadcast realtime event
        if (StringUtils.hasText(workspaceId)) {
            realtimeEventService.broadcastBoardChange(
                workspaceId,
                "deleted",
                id,
                userId
            );
        }
    }

    // Workspace-based methods with smart auto-detect
    public List<Board> getBoardsByWorkspace(String workspaceId) {
        String userId = UserContext.requireUserId();
        
        // Validate workspace exists and user has access
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found: " + workspaceId));
        
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new SecurityException("Access denied to workspace: " + workspaceId);
        }
        
        // Smart detection: Single member (personal workspace) vs multi-member (shared workspace)
        long memberCount = workspaceMemberRepository.countByWorkspaceId(workspaceId);
        log.info("[BoardService] Workspace {} has {} members, userId={}", workspaceId, memberCount, userId);
        
        if (memberCount <= 1) {
            // Personal workspace mode - show only user's boards
            log.info("[BoardService] Using PERSONAL mode for workspace {}", workspaceId);
            return boardRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        } else {
            // Shared workspace mode - show all workspace boards
            log.info("[BoardService] Using SHARED mode for workspace {}", workspaceId);
            return boardRepository.findByWorkspaceIdOrderByUpdatedAtDesc(workspaceId);
        }
    }

    private Board getBoardForCurrentUser(String id, String userId) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));

        if (canAccessBoard(board, userId)) {
            return board;
        }

        throw new SecurityException("Access denied to board");
    }

    private boolean canAccessBoard(Board board, String userId) {
        if (userId.equals(board.getUserId())) {
            return true;
        }

        if (StringUtils.hasText(board.getWorkspaceId())) {
            return workspaceMemberRepository.existsByWorkspaceIdAndUserId(board.getWorkspaceId(), userId);
        }

        return false;
    }

    private WorkspaceRole requireWorkspaceRole(String workspaceId, String userId) {
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found: " + workspaceId));

        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new SecurityException("Access denied to workspace: " + workspaceId));
        return member.getRole();
    }

    private void ensureCanModifyWorkspace(String workspaceId, String userId) {
        WorkspaceRole role = requireWorkspaceRole(workspaceId, userId);
        if (role == WorkspaceRole.VIEWER) {
            throw new SecurityException("Viewer role cannot modify workspace boards");
        }
    }
}
