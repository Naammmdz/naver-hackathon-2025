package com.naammm.becore.service;

import com.naammm.becore.entity.Board;
import com.naammm.becore.repository.BoardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class BoardService {

    private final BoardRepository boardRepository;

    public List<Board> getAllBoards() {
        return boardRepository.findAll();
    }

    public Optional<Board> getBoardById(String id) {
        return boardRepository.findById(id);
    }

    public Board createBoard(Board board) {
        return boardRepository.save(board);
    }

    public Board updateBoard(String id, Board boardDetails) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Board not found with id: " + id));
        board.setTitle(boardDetails.getTitle());
        board.setSnapshot(boardDetails.getSnapshot());
        return boardRepository.save(board);
    }

    public void deleteBoard(String id) {
        boardRepository.deleteById(id);
    }
}
