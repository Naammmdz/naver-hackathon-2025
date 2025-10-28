package com.naammm.becore.service;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import com.naammm.becore.entity.Board;
import com.naammm.becore.repository.BoardRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class BoardService {

    private final BoardRepository boardRepository;

    public List<Board> getAllBoards() {
        return boardRepository.findAll(Sort.by(Sort.Direction.DESC, "updatedAt"));
    }

    public Optional<Board> getBoardById(String id) {
        return boardRepository.findById(id);
    }

    public Board createBoard(Board board) {
        if (board.getTitle() == null || board.getTitle().trim().isEmpty()) {
            board.setTitle("Untitled Board");
        }
        return boardRepository.save(board);
    }

    public Board updateBoard(String id, Board payload) {
        return boardRepository.findById(id)
                .map(board -> {
                    if (payload.getTitle() != null) {
                        board.setTitle(payload.getTitle());
                    }
                    if (payload.getSnapshot() != null) {
                        board.setSnapshot(payload.getSnapshot());
                    }
                    return boardRepository.save(board);
                })
                .orElseThrow(() -> new RuntimeException("Board not found"));
    }

    public Board updateSnapshot(String id, String snapshot) {
        return boardRepository.findById(id)
                .map(board -> {
                    board.setSnapshot(snapshot);
                    return boardRepository.save(board);
                })
                .orElseThrow(() -> new RuntimeException("Board not found"));
    }

    public void deleteBoard(String id) {
        boardRepository.deleteById(id);
    }
}
