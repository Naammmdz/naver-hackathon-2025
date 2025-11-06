package com.naammm.becore.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.naammm.becore.config.RedisConfig;
import com.naammm.becore.entity.Document;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.DocumentRepository;
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
    private final RedisTemplate<String, String> redisTemplate;
    private final ChannelTopic metadataChannel;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<Document> getAllDocuments() {
        String userId = UserContext.requireUserId();
        return documentRepository.findByUserIdAndTrashedFalseOrderByUpdatedAtDesc(userId);
    }

    public Optional<Document> getDocumentById(String id) {
        String userId = UserContext.requireUserId();
        return documentRepository.findByIdAndUserId(id, userId);
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
        return documentRepository.save(document);
    }

    public Document updateDocument(String id, Document updatedDocument) {
        String userId = UserContext.requireUserId();
        return documentRepository.findByIdAndUserId(id, userId)
                .map(document -> {
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
        Document document = documentRepository.findByIdAndUserId(id, UserContext.requireUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        document.setTrashed(true);
        document.setTrashedAt(LocalDateTime.now());
        documentRepository.save(document);
    }

    public void permanentlyDeleteDocument(String id) {
        Document document = documentRepository.findByIdAndUserId(id, UserContext.requireUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        documentRepository.delete(document);
    }

    public void restoreDocument(String id) {
        Document document = documentRepository.findByIdAndUserId(id, UserContext.requireUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        document.setTrashed(false);
        document.setTrashedAt(null);
        documentRepository.save(document);
    }

    public List<Document> searchDocuments(String search) {
        String userId = UserContext.requireUserId();
        if (!StringUtils.hasText(search)) {
            return documentRepository.findByUserIdAndTrashedFalseOrderByUpdatedAtDesc(userId);
        }
        return documentRepository.searchDocuments(userId, search.trim());
    }
}
