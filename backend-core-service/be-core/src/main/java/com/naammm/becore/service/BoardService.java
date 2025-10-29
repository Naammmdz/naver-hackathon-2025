package com.naammm.becore.service;

import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.Board;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.BoardRepository;
import com.naammm.becore.security.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class BoardService {

    private final BoardRepository boardRepository;

    public List<Board> getAllBoards() {
        return boardRepository.findByUserIdOrderByUpdatedAtDesc(UserContext.requireUserId());
    }

    public Optional<Board> getBoardById(String id) {
        return boardRepository.findByIdAndUserId(id, UserContext.requireUserId());
    }

    public Board createBoard(Board board) {
        String userId = UserContext.requireUserId();
        board.setUserId(userId);
        if (!StringUtils.hasText(board.getTitle())) {
            board.setTitle("Untitled Board");
        }
        return boardRepository.save(board);
    }

    public Board updateBoard(String id, Board payload) {
        return boardRepository.findByIdAndUserId(id, UserContext.requireUserId())
                .map(board -> {
                    if (payload.getTitle() != null) {
                        board.setTitle(payload.getTitle());
                    }
                    if (payload.getSnapshot() != null) {
                        board.setSnapshot(payload.getSnapshot());
                    }
                    return boardRepository.save(board);
                })
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
    }

    public Board updateSnapshot(String id, String snapshot) {
        return boardRepository.findByIdAndUserId(id, UserContext.requireUserId())
                .map(board -> {
                    board.setSnapshot(snapshot);
                    return boardRepository.save(board);
                })
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
    }

    public void deleteBoard(String id) {
        Board board = boardRepository.findByIdAndUserId(id, UserContext.requireUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
        boardRepository.delete(board);
    }
}
