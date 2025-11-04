package com.naammm.becore.controller;

import java.util.List;
import java.util.Map;

import com.naammm.becore.entity.Board;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.security.UserContext;
import com.naammm.becore.service.BoardService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @GetMapping
    public ResponseEntity<List<Board>> getAllBoards(
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId) {
        String userId = headerUserId != null ? headerUserId : queryUserId;
        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            UserContext.setUserId(userId);
            return ResponseEntity.ok(boardService.getAllBoards());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } finally {
            UserContext.clear();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Board> getBoardById(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId) {
        String userId = headerUserId != null ? headerUserId : queryUserId;
        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            UserContext.setUserId(userId);
            return boardService.getBoardById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } finally {
            UserContext.clear();
        }
    }

    @PostMapping
    public ResponseEntity<Board> createBoard(
            @RequestBody Board board,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId) {
        String userId = headerUserId != null ? headerUserId : queryUserId;
        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            UserContext.setUserId(userId);
            return ResponseEntity.ok(boardService.createBoard(board));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } finally {
            UserContext.clear();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Board> updateBoard(
            @PathVariable String id,
            @RequestBody Board board,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId) {
        String userId = headerUserId != null ? headerUserId : queryUserId;
        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            UserContext.setUserId(userId);
            return ResponseEntity.ok(boardService.updateBoard(id, board));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } finally {
            UserContext.clear();
        }
    }

    @PatchMapping("/{id}/snapshot")
    public ResponseEntity<Board> updateSnapshot(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId) {
        String userId = headerUserId != null ? headerUserId : queryUserId;
        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            UserContext.setUserId(userId);
            return ResponseEntity.ok(boardService.updateSnapshot(id, body.getOrDefault("snapshot", null)));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } finally {
            UserContext.clear();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBoard(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId) {
        String userId = headerUserId != null ? headerUserId : queryUserId;
        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        // Set user context for service layer
        UserContext.setUserId(userId);
        try {
            boardService.deleteBoard(id);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } finally {
            UserContext.clear();
        }
    }

    // Workspace-based endpoints
    @GetMapping("/workspace/{workspaceId}")
    public ResponseEntity<List<Board>> getBoardsByWorkspace(
            @PathVariable String workspaceId,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId) {
        String userId = headerUserId != null ? headerUserId : queryUserId;
        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            UserContext.setUserId(userId);
            return ResponseEntity.ok(boardService.getBoardsByWorkspace(workspaceId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } finally {
            UserContext.clear();
        }
    }
}
