package com.naammm.becore.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.naammm.becore.config.RedisConfig;
import com.naammm.becore.entity.Board;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.BoardRepository;
import com.naammm.becore.security.UserContext;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class BoardService {

    private final BoardRepository boardRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final ChannelTopic metadataChannel;
    private final ObjectMapper objectMapper = new ObjectMapper();

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
                    String oldTitle = board.getTitle();
                    
                    if (payload.getTitle() != null) {
                        board.setTitle(payload.getTitle());
                    }
                    if (payload.getSnapshot() != null) {
                        board.setSnapshot(payload.getSnapshot());
                    }
                    
                    Board saved = boardRepository.save(board);
                    
                    // Publish metadata update to Redis
                    if (payload.getTitle() != null && !payload.getTitle().equals(oldTitle)) {
                        publishMetadataUpdate("board", id, "RENAME", payload.getTitle());
                    }
                    if (payload.getSnapshot() != null) {
                        publishMetadataUpdate("board", id, "CONTENT_UPDATE", null);
                    }
                    
                    return saved;
                })
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
    }

    public Board updateSnapshot(String id, String snapshot) {
        return boardRepository.findByIdAndUserId(id, UserContext.requireUserId())
                .map(board -> {
                    board.setSnapshot(snapshot);
                    Board saved = boardRepository.save(board);
                    
                    // Publish metadata update to Redis
                    publishMetadataUpdate("board", id, "CONTENT_UPDATE", null);
                    
                    return saved;
                })
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
    }

    private void publishMetadataUpdate(String type, String id, String action, Object payload) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", type);
            message.put("id", id);
            message.put("action", action);
            if (payload != null) {
                message.put("payload", payload);
            }
            
            String jsonMessage = objectMapper.writeValueAsString(message);
            redisTemplate.convertAndSend(metadataChannel.getTopic(), jsonMessage);
        } catch (JsonProcessingException e) {
            System.err.println("Failed to publish metadata update to Redis: " + e.getMessage());
        }
    }

    public void deleteBoard(String id) {
        Board board = boardRepository.findByIdAndUserId(id, UserContext.requireUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
        boardRepository.delete(board);
    }
}
