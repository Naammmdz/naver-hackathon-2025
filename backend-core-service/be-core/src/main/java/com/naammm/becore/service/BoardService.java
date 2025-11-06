package com.naammm.becore.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.naammm.becore.config.RedisConfig;
import com.naammm.becore.entity.Board;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.BoardRepository;
import com.naammm.becore.repository.WorkspaceRepository;
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
    private final WorkspaceRepository workspaceRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final ChannelTopic metadataChannel;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<Board> getAllBoards() {
        return boardRepository.findByUserIdOrderByUpdatedAtDesc(UserContext.requireUserId());
    }

    public List<Board> getAllBoardsInWorkspace(String workspaceId) {
        String userId = UserContext.requireUserId();
        if (!workspaceRepository.userHasAccess(workspaceId, userId)) {
            throw new SecurityException("Access denied");
        }
        return boardRepository.findByWorkspaceIdOrderByUpdatedAtDesc(workspaceId);
    }

    public Optional<Board> getBoardById(String id) {
        String userId = UserContext.requireUserId();
        return boardRepository.findById(id).filter(board -> {
            String workspaceId = board.getWorkspaceId();
            if (workspaceId == null || workspaceId.isBlank()) {
                return board.getUserId().equals(userId);
            }
            return workspaceRepository.userHasAccess(workspaceId, userId);
        });
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
        String userId = UserContext.requireUserId();
        return boardRepository.findById(id)
                .map(board -> {
                    String workspaceId = board.getWorkspaceId();
                    if (workspaceId == null || workspaceId.isBlank()) {
                        if (!board.getUserId().equals(userId)) {
                            throw new SecurityException("Access denied");
                        }
                    } else if (!workspaceRepository.userHasAccess(workspaceId, userId)) {
                        throw new SecurityException("Access denied");
                    }
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
        String userId = UserContext.requireUserId();
        return boardRepository.findById(id)
                .map(board -> {
                    String workspaceId = board.getWorkspaceId();
                    if (workspaceId == null || workspaceId.isBlank()) {
                        if (!board.getUserId().equals(userId)) {
                            throw new SecurityException("Access denied");
                        }
                    } else if (!workspaceRepository.userHasAccess(workspaceId, userId)) {
                        throw new SecurityException("Access denied");
                    }
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
        String userId = UserContext.requireUserId();
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
        String workspaceId = board.getWorkspaceId();
        if (workspaceId == null || workspaceId.isBlank()) {
            if (!board.getUserId().equals(userId)) {
                throw new SecurityException("Access denied");
            }
        } else if (!workspaceRepository.userHasAccess(workspaceId, userId)) {
            throw new SecurityException("Access denied");
        }
        boardRepository.delete(board);
    }
}
