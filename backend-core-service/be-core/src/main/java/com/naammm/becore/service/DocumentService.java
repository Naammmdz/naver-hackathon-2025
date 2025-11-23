package com.naammm.becore.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.naammm.becore.config.RedisConfig;
import com.naammm.becore.entity.Document;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.DocumentChunkRepository;
import com.naammm.becore.repository.DocumentCommentRepository;
import com.naammm.becore.repository.DocumentRepository;
import com.naammm.becore.repository.TaskDocRepository;
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
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final TaskDocRepository taskDocRepository;
    private final DocumentCommentRepository documentCommentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final WorkspaceRepository workspaceRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final ChannelTopic metadataChannel;
    private final ObjectMapper objectMapper;
    private final GlobalSearchService globalSearchService;
    private final com.naammm.becore.client.AIServiceClient aiServiceClient;

    public List<Document> getAllDocuments() {
        String userId = UserContext.requireUserId();
        return documentRepository.findByUserIdAndTrashedFalseOrderByUpdatedAtDesc(userId);
    }

    public List<Document> getAllDocumentsInWorkspace(String workspaceId) {
        String userId = UserContext.requireUserId();
        if (!workspaceRepository.userHasAccess(workspaceId, userId)) {
            throw new SecurityException("Access denied");
        }
        return documentRepository.findByWorkspaceIdAndTrashedFalseOrderByUpdatedAtDesc(workspaceId);
    }

    public Optional<Document> getDocumentById(String id) {
        String userId = UserContext.requireUserId();
        return documentRepository.findById(id).filter(doc -> {
            String workspaceId = doc.getWorkspaceId();
            if (workspaceId == null || workspaceId.isBlank()) {
                return doc.getUserId().equals(userId);
            }
            return workspaceRepository.userHasAccess(workspaceId, userId);
        });
    }

    public List<Document> getDocumentsByParentId(String parentId) {
        String userId = UserContext.requireUserId();
        return documentRepository.findByUserIdAndParentIdAndTrashedFalseOrderByUpdatedAtDesc(userId, parentId);
    }

    public List<Document> getTrashedDocuments() {
        String userId = UserContext.requireUserId();
        return documentRepository.findByUserIdAndTrashedTrueOrderByUpdatedAtDesc(userId);
    }

    public Document createDocument(Document document) {
        String userId = UserContext.requireUserId();
        document.setUserId(userId);
        Document saved = documentRepository.save(document);
        globalSearchService.indexDocument(saved);
        
        // Trigger AI indexing if workspace exists
        if (saved.getWorkspaceId() != null && !saved.getWorkspaceId().isBlank()) {
            aiServiceClient.reindexDocument(saved.getWorkspaceId(), saved.getId());
        }
        
        return saved;
    }

    public Document updateDocument(String id, Document updatedDocument) {
        String userId = UserContext.requireUserId();
        return documentRepository.findById(id)
                .map(document -> {
                    String workspaceId = document.getWorkspaceId();
                    if (workspaceId == null || workspaceId.isBlank()) {
                        if (!document.getUserId().equals(userId)) {
                            throw new SecurityException("Access denied");
                        }
                    } else if (!workspaceRepository.userHasAccess(workspaceId, userId)) {
                        throw new SecurityException("Access denied");
                    }
                    String oldTitle = document.getTitle();
                    
                    if (updatedDocument.getTitle() != null) {
                        document.setTitle(updatedDocument.getTitle());
                    }
                    if (updatedDocument.getContent() != null) {
                        document.setContent(updatedDocument.getContent());
                    }
                    if (updatedDocument.getIcon() != null) {
                        document.setIcon(updatedDocument.getIcon());
                    }
                    document.setParentId(updatedDocument.getParentId());
                    
                    Document saved = documentRepository.save(document);
                    
                    // Publish metadata update to Redis if title changed
                    if (updatedDocument.getTitle() != null && !updatedDocument.getTitle().equals(oldTitle)) {
                        publishMetadataUpdate(id, "RENAME", updatedDocument.getTitle());
                    }
                    
                    globalSearchService.indexDocument(saved);
                    
                    // Trigger AI indexing if workspace exists
                    if (saved.getWorkspaceId() != null && !saved.getWorkspaceId().isBlank()) {
                        aiServiceClient.reindexDocument(saved.getWorkspaceId(), saved.getId());
                    }
                    
                    return saved;
                })
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
    }

    private void publishMetadataUpdate(String docId, String action, String payload) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("docId", docId);
            message.put("action", action);
            message.put("payload", payload);
            
            String jsonMessage = objectMapper.writeValueAsString(message);
            redisTemplate.convertAndSend(metadataChannel.getTopic(), jsonMessage);
        } catch (JsonProcessingException e) {
            // Log error but don't fail the request
            System.err.println("Failed to publish metadata update to Redis: " + e.getMessage());
        }
    }

    public void deleteDocument(String id) {
        String userId = UserContext.requireUserId();
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        String workspaceId = document.getWorkspaceId();
        if (workspaceId == null || workspaceId.isBlank()) {
            if (!document.getUserId().equals(userId)) {
                throw new SecurityException("Access denied");
            }
        } else if (!workspaceRepository.userHasAccess(workspaceId, userId)) {
            throw new SecurityException("Access denied");
        }
        document.setTrashed(true);
        document.setTrashedAt(LocalDateTime.now());
        documentRepository.save(document);
        globalSearchService.indexDocument(document);
    }

    public void permanentlyDeleteDocument(String id) {
        String userId = UserContext.requireUserId();
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        String workspaceId = document.getWorkspaceId();
        if (workspaceId == null || workspaceId.isBlank()) {
            if (!document.getUserId().equals(userId)) {
                throw new SecurityException("Access denied");
            }
        } else if (!workspaceRepository.userHasAccess(workspaceId, userId)) {
            throw new SecurityException("Access denied");
        }

        // Recursively delete children
        List<Document> children = documentRepository.findByParentId(id);
        for (Document child : children) {
            permanentlyDeleteDocument(child.getId());
        }

        taskDocRepository.deleteByDocId(id);
        documentCommentRepository.deleteByDocumentId(id);
        documentChunkRepository.deleteByDocumentId(id);
        documentRepository.delete(document);
        globalSearchService.deleteDocument(document.getId());
    }

    public void restoreDocument(String id) {
        String userId = UserContext.requireUserId();
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        String workspaceId = document.getWorkspaceId();
        if (workspaceId == null || workspaceId.isBlank()) {
            if (!document.getUserId().equals(userId)) {
                throw new SecurityException("Access denied");
            }
        } else if (!workspaceRepository.userHasAccess(workspaceId, userId)) {
            throw new SecurityException("Access denied");
        }
        document.setTrashed(false);
        document.setTrashedAt(null);
        Document saved = documentRepository.save(document);
        globalSearchService.indexDocument(saved);
        
        // Trigger AI indexing if workspace exists
        if (saved.getWorkspaceId() != null && !saved.getWorkspaceId().isBlank()) {
            aiServiceClient.reindexDocument(saved.getWorkspaceId(), saved.getId());
        }
    }

    public List<Document> searchDocuments(String search) {
        String userId = UserContext.requireUserId();
        if (!StringUtils.hasText(search)) {
            return documentRepository.findByUserIdAndTrashedFalseOrderByUpdatedAtDesc(userId);
        }
        return documentRepository.searchDocuments(userId, search.trim());
    }
}
