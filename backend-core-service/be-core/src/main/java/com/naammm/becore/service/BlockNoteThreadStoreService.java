package com.naammm.becore.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.naammm.becore.dto.*;
import com.naammm.becore.entity.DocumentComment;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.DocumentCommentRepository;
import com.naammm.becore.repository.DocumentRepository;
import com.naammm.becore.security.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service to handle BlockNote ThreadStore API
 * Converts between our comment format and BlockNote Thread format
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class BlockNoteThreadStoreService {

    private final DocumentCommentRepository commentRepository;
    private final DocumentRepository documentRepository;
    private final DocumentCommentService commentService;
    private final ObjectMapper objectMapper;

    /**
     * Get all threads for a document (BlockNote format)
     */
    public List<BlockNoteThreadDto> getThreads(String documentId) {
        String userId = UserContext.requireUserId();
        
        // Verify document exists and user has access
        documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        
        // Get all comments for this document
        var envelope = commentService.getComments(documentId);
        List<DocumentCommentResponse> comments = envelope.getComments();
        
        // Group comments into threads (root comments become threads)
        Map<String, List<DocumentCommentResponse>> threadsMap = new HashMap<>();
        List<DocumentCommentResponse> rootComments = new ArrayList<>();
        
        for (DocumentCommentResponse comment : comments) {
            if (comment.getParentId() == null) {
                // Root comment = thread
                rootComments.add(comment);
                threadsMap.put(comment.getId(), new ArrayList<>());
            } else {
                // Reply comment
                threadsMap.computeIfAbsent(comment.getParentId(), k -> new ArrayList<>()).add(comment);
            }
        }
        
        // Convert to BlockNote Thread format
        return rootComments.stream()
                .map(rootComment -> convertToThread(rootComment, threadsMap.get(rootComment.getId())))
                .collect(Collectors.toList());
    }

    /**
     * Get a single thread by ID
     */
    public BlockNoteThreadDto getThread(String threadId) {
        String userId = UserContext.requireUserId();
        
        DocumentComment rootComment = commentRepository.findById(threadId)
                .orElseThrow(() -> new ResourceNotFoundException("Thread not found"));
        
        // Get all comments for this document and find the thread
        DocumentCommentsEnvelope envelope = commentService.getComments(rootComment.getDocumentId());
        List<DocumentCommentResponse> allComments = envelope.getComments();
        
        // Find root comment and replies
        DocumentCommentResponse rootCommentResponse = allComments.stream()
                .filter(c -> threadId.equals(c.getId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Thread not found"));
        
        List<DocumentCommentResponse> replies = allComments.stream()
                .filter(c -> threadId.equals(c.getParentId()))
                .collect(Collectors.toList());
        
        return convertToThread(rootCommentResponse, replies);
    }

    /**
     * Create a new thread from BlockNote format
     * BlockNote sends: { initialComment: { body, metadata }, metadata: { documentId } }
     */
    public BlockNoteThreadDto createThreadFromBlockNote(String documentId, Map<String, Object> requestBody) {
        String userId = UserContext.requireUserId();
        
        log.info("Creating thread for document {} by user {}", documentId, userId);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> initialCommentMap = (Map<String, Object>) requestBody.get("initialComment");
        if (initialCommentMap == null) {
            throw new IllegalArgumentException("initialComment is required");
        }
        
        Object body = initialCommentMap.get("body");
        String content = convertBodyToString(body);
        
        // Create root comment (thread)
        // Note: Reference will be saved later when BlockNote calls addThreadToDocument
        DocumentCommentResponse rootComment = commentService.createComment(documentId, 
                CreateDocumentCommentRequest.builder()
                        .content(content)
                        .build());
        
        log.info("Thread created with ID: {}", rootComment.getId());
        log.info("Note: Reference will be saved when BlockNote calls addThreadToDocument");
        
        return convertToThread(rootComment, new ArrayList<>());
    }

    /**
     * Update a thread
     */
    public BlockNoteThreadDto updateThread(String threadId, Map<String, Object> requestBody) {
        String userId = UserContext.requireUserId();
        
        DocumentComment rootComment = commentRepository.findById(threadId)
                .orElseThrow(() -> new ResourceNotFoundException("Thread not found"));
        
        // Update resolved status if provided
        if (requestBody.containsKey("resolved")) {
            Boolean resolved = (Boolean) requestBody.get("resolved");
            commentService.updateComment(threadId, UpdateDocumentCommentRequest.builder()
                    .resolved(resolved)
                    .build());
        }
        
        return getThread(threadId);
    }

    /**
     * Delete a thread
     */
    public void deleteThread(String threadId) {
        String userId = UserContext.requireUserId();
        
        DocumentComment rootComment = commentRepository.findById(threadId)
                .orElseThrow(() -> new ResourceNotFoundException("Thread not found"));
        
        // Delete all replies first
        List<DocumentComment> replies = commentRepository.findByParentId(threadId);
        for (DocumentComment reply : replies) {
            commentService.deleteComment(reply.getId());
        }
        
        // Delete root comment (thread)
        commentService.deleteComment(threadId);
    }

    /**
     * Add a thread to the document (create mark in document)
     * BlockNote calls this to mark the thread in the document.
     * This is a no-op on the backend - BlockNote handles mark creation in the document.
     */
    public void addThreadToDocument(String threadId, Map<String, Object> requestBody) {
        String userId = UserContext.requireUserId();
        
        // Verify thread exists
        DocumentComment thread = commentRepository.findById(threadId)
                .orElseThrow(() -> new ResourceNotFoundException("Thread not found"));
        
        // Save reference (selection info) to database for later restoration
        // BlockNote automatically stores reference in document marks, but we also save it to DB
        // so we can restore it when loading threads if the document marks are missing
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            String referenceJson = objectMapper.writeValueAsString(requestBody);
            log.info("Saving reference for thread {}: {}", threadId, referenceJson);
            thread.setReference(referenceJson);
            commentRepository.save(thread);
            log.info("Thread {} reference saved to database successfully", threadId);
        } catch (Exception e) {
            log.error("Failed to save reference for thread {}: {}", threadId, e.getMessage(), e);
        }
        
        log.info("Thread {} added to document by BlockNote (reference stored in document marks and database)", threadId);
    }

    /**
     * Add a comment to a thread
     */
    public BlockNoteCommentDto addComment(String threadId, Map<String, Object> requestBody) {
        String userId = UserContext.requireUserId();
        
        DocumentComment rootComment = commentRepository.findById(threadId)
                .orElseThrow(() -> new ResourceNotFoundException("Thread not found"));
        
        @SuppressWarnings("unchecked")
        Map<String, Object> commentMap = (Map<String, Object>) requestBody.get("comment");
        if (commentMap == null) {
            throw new IllegalArgumentException("comment is required");
        }
        
        Object body = commentMap.get("body");
        String content = convertBodyToString(body);
        
        DocumentCommentResponse comment = commentService.createComment(rootComment.getDocumentId(),
                CreateDocumentCommentRequest.builder()
                        .content(content)
                        .parentId(threadId)
                        .build());
        
        return convertToComment(comment);
    }

    /**
     * Update a comment
     */
    public void updateComment(String threadId, String commentId, Map<String, Object> requestBody) {
        String userId = UserContext.requireUserId();
        
        @SuppressWarnings("unchecked")
        Map<String, Object> commentMap = (Map<String, Object>) requestBody.get("comment");
        if (commentMap == null) {
            throw new IllegalArgumentException("comment is required");
        }
        
        String content = null;
        if (commentMap.containsKey("body")) {
            Object body = commentMap.get("body");
            content = convertBodyToString(body);
        }
        
        commentService.updateComment(commentId, UpdateDocumentCommentRequest.builder()
                .content(content)
                .build());
    }

    /**
     * Delete a comment
     */
    public void deleteComment(String threadId, String commentId) {
        String userId = UserContext.requireUserId();
        commentService.deleteComment(commentId);
    }

    /**
     * Resolve a thread
     */
    public void resolveThread(String threadId) {
        String userId = UserContext.requireUserId();
        commentService.updateComment(threadId, UpdateDocumentCommentRequest.builder()
                .resolved(true)
                .build());
    }

    /**
     * Unresolve a thread
     */
    public void unresolveThread(String threadId) {
        String userId = UserContext.requireUserId();
        commentService.updateComment(threadId, UpdateDocumentCommentRequest.builder()
                .resolved(false)
                .build());
    }

    /**
     * Add a reaction to a comment
     */
    public void addReaction(String threadId, String commentId, Map<String, Object> requestBody) {
        String userId = UserContext.requireUserId();
        // Reactions not yet implemented in our system
        // This is a placeholder for future implementation
        log.debug("Add reaction not yet implemented: threadId={}, commentId={}, userId={}", threadId, commentId, userId);
    }

    /**
     * Delete a reaction from a comment
     */
    public void deleteReaction(String threadId, String commentId, String emoji) {
        String userId = UserContext.requireUserId();
        // Reactions not yet implemented in our system
        // This is a placeholder for future implementation
        log.debug("Delete reaction not yet implemented: threadId={}, commentId={}, emoji={}, userId={}", threadId, commentId, emoji, userId);
    }

    /**
     * Convert DocumentCommentResponse to BlockNoteThreadDto
     */
    private BlockNoteThreadDto convertToThread(DocumentCommentResponse rootComment, List<DocumentCommentResponse> replies) {
        List<BlockNoteCommentDto> comments = new ArrayList<>();
        
        // Add root comment
        comments.add(convertToComment(rootComment));
        
        // Add replies
        for (DocumentCommentResponse reply : replies) {
            comments.add(convertToComment(reply));
        }
        
        // Parse reference JSON string to Map if present
        Map<String, Object> reference = null;
        if (rootComment.getReference() != null && !rootComment.getReference().isEmpty()) {
            try {
                reference = objectMapper.readValue(rootComment.getReference(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception e) {
                log.warn("Failed to parse reference for thread {}: {}", rootComment.getId(), e.getMessage());
            }
        }
        
        return BlockNoteThreadDto.builder()
                .id(rootComment.getId())
                .createdAt(rootComment.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
                .updatedAt(rootComment.getUpdatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
                .comments(comments)
                .resolved(rootComment.isResolved())
                .resolvedBy(rootComment.getResolvedBy())
                .resolvedAt(rootComment.getResolvedAt() != null 
                        ? rootComment.getResolvedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                        : null)
                .metadata(new HashMap<>())
                .reference(reference)
                .build();
    }

    /**
     * Convert DocumentCommentResponse to BlockNoteCommentDto
     */
    private BlockNoteCommentDto convertToComment(DocumentCommentResponse comment) {
        // Parse content as BlockNote blocks
        List<Map<String, Object>> body = parseContentToBlocks(comment.getContent());
        
        return BlockNoteCommentDto.builder()
                .id(comment.getId())
                .userId(comment.getAuthorId())
                .createdAt(comment.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
                .updatedAt(comment.getUpdatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
                .body(body)
                .reactions(new ArrayList<>()) // Reactions not yet implemented
                .metadata(new HashMap<>())
                .build();
    }

    /**
     * Convert BlockNote body (blocks) to string content
     * Store as JSON string of blocks (not plain text) to preserve BlockNote format
     */
    private String convertBodyToString(Object body) {
        if (body == null) {
            return "[]"; // Empty blocks array
        }
        
        try {
            // If body is already a string, check if it's JSON
            if (body instanceof String) {
                String bodyStr = (String) body;
                // Try to parse as JSON to validate
                try {
                    objectMapper.readValue(bodyStr, new TypeReference<List<Map<String, Object>>>() {});
                    return bodyStr; // Already valid JSON blocks
                } catch (Exception e) {
                    // Not JSON, treat as plain text and convert to blocks
                    return objectMapper.writeValueAsString(createParagraphBlockFromText(bodyStr));
                }
            }
            
            // If body is a list of blocks, serialize to JSON string
            if (body instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> blocks = (List<Map<String, Object>>) body;
                // Remove 'id' fields before saving
                List<Map<String, Object>> cleanedBlocks = removeIdFromBlocks(blocks);
                return objectMapper.writeValueAsString(cleanedBlocks);
            }
            
            // Otherwise, serialize to JSON string
            return objectMapper.writeValueAsString(body);
        } catch (Exception e) {
            log.warn("Failed to convert body to string, using JSON: {}", e.getMessage());
            try {
                return objectMapper.writeValueAsString(body);
            } catch (Exception ex) {
                return "[]"; // Return empty blocks array on error
            }
        }
    }

    /**
     * Extract text content from a BlockNote block recursively
     */
    private void extractTextFromBlock(Map<String, Object> block, StringBuilder text) {
        if (block == null) {
            return;
        }
        
        // Extract text from content array
        Object contentObj = block.get("content");
        if (contentObj instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) contentObj;
            for (Map<String, Object> item : content) {
                if ("text".equals(item.get("type"))) {
                    Object textValue = item.get("text");
                    if (textValue != null) {
                        text.append(textValue).append(" ");
                    }
                }
            }
        }
        
        // Recursively process children
        Object childrenObj = block.get("children");
        if (childrenObj instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> children = (List<Map<String, Object>>) childrenObj;
            for (Map<String, Object> child : children) {
                extractTextFromBlock(child, text);
            }
        }
    }

    /**
     * Parse string content to BlockNote blocks
     * If content is already JSON blocks, parse it. Otherwise, create a simple paragraph block.
     */
    private List<Map<String, Object>> parseContentToBlocks(String content) {
        if (content == null || content.isEmpty()) {
            return createEmptyParagraphBlock();
        }
        
        try {
            // Try to parse as JSON blocks
            List<Map<String, Object>> blocks = objectMapper.readValue(content, new TypeReference<List<Map<String, Object>>>() {});
            if (blocks != null && !blocks.isEmpty()) {
                // Remove 'id' fields from blocks (BlockNote requirement)
                return removeIdFromBlocks(blocks);
            }
        } catch (Exception e) {
            // Not JSON, treat as plain text
        }
        
        // Create a simple paragraph block from plain text
        return createParagraphBlockFromText(content);
    }

    /**
     * Create an empty paragraph block
     */
    private List<Map<String, Object>> createEmptyParagraphBlock() {
        Map<String, Object> block = new HashMap<>();
        block.put("type", "paragraph");
        block.put("props", Map.of(
                "backgroundColor", "default",
                "textColor", "default",
                "textAlignment", "left"
        ));
        block.put("content", new ArrayList<>());
        block.put("children", new ArrayList<>());
        return List.of(block);
    }

    /**
     * Create a paragraph block from plain text
     */
    private List<Map<String, Object>> createParagraphBlockFromText(String text) {
        Map<String, Object> textItem = new HashMap<>();
        textItem.put("type", "text");
        textItem.put("text", text);
        textItem.put("styles", new HashMap<>());
        
        Map<String, Object> block = new HashMap<>();
        block.put("type", "paragraph");
        block.put("props", Map.of(
                "backgroundColor", "default",
                "textColor", "default",
                "textAlignment", "left"
        ));
        block.put("content", List.of(textItem));
        block.put("children", new ArrayList<>());
        
        return List.of(block);
    }

    /**
     * Recursively remove 'id' fields from blocks
     */
    private List<Map<String, Object>> removeIdFromBlocks(List<Map<String, Object>> blocks) {
        List<Map<String, Object>> cleaned = new ArrayList<>();
        for (Map<String, Object> block : blocks) {
            Map<String, Object> cleanedBlock = new HashMap<>(block);
            cleanedBlock.remove("id");
            
            // Clean children recursively
            Object childrenObj = cleanedBlock.get("children");
            if (childrenObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> children = (List<Map<String, Object>>) childrenObj;
                cleanedBlock.put("children", removeIdFromBlocks(children));
            }
            
            cleaned.add(cleanedBlock);
        }
        return cleaned;
    }
}

