package com.naammm.becore.controller;

import java.util.List;
import java.util.Map;

import com.naammm.becore.entity.Board;
import com.naammm.becore.service.BoardService;

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
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @GetMapping
    public ResponseEntity<List<Board>> getAllBoards(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(boardService.getAllBoards());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Board> getBoardById(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String userId) {
        return boardService.getBoardById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Board> createBoard(
            @RequestBody Board board,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(boardService.createBoard(board));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Board> updateBoard(
            @PathVariable String id,
            @RequestBody Board board,
            @RequestHeader("X-User-Id") String userId) {
        try {
            return ResponseEntity.ok(boardService.updateBoard(id, board));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{id}/snapshot")
    public ResponseEntity<Board> updateSnapshot(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @RequestHeader("X-User-Id") String userId) {
        try {
            return ResponseEntity.ok(boardService.updateSnapshot(id, body.getOrDefault("snapshot", null)));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBoard(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String userId) {
        boardService.deleteBoard(id);
        return ResponseEntity.noContent().build();
    }

    // Workspace-based endpoints
    @GetMapping("/workspace/{workspaceId}")
    public ResponseEntity<List<Board>> getBoardsByWorkspace(
            @PathVariable String workspaceId,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(boardService.getBoardsByWorkspace(workspaceId));
    }
}
