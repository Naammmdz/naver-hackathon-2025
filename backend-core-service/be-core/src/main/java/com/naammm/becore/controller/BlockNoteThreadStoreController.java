package com.naammm.becore.controller;

import com.naammm.becore.dto.BlockNoteCommentDto;
import com.naammm.becore.dto.BlockNoteThreadDto;
import com.naammm.becore.service.BlockNoteThreadStoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for BlockNote ThreadStore REST API
 * Implements the REST API required by RESTYjsThreadStore
 */
@RestController
@RequestMapping("/api/blocknote/threads")
@RequiredArgsConstructor
public class BlockNoteThreadStoreController {

    private final BlockNoteThreadStoreService threadStoreService;

    /**
     * GET /api/blocknote/threads?documentId={documentId}
     * Get all threads for a document
     */
    @GetMapping
    public ResponseEntity<List<BlockNoteThreadDto>> getThreads(
            @RequestParam(required = false) String documentId
    ) {
        if (documentId == null) {
            // BlockNote might call without documentId, return empty list
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(threadStoreService.getThreads(documentId));
    }

    /**
     * GET /api/blocknote/threads/{threadId}
     * Get a single thread by ID
     */
    @GetMapping("/{threadId}")
    public ResponseEntity<BlockNoteThreadDto> getThread(@PathVariable String threadId) {
        return ResponseEntity.ok(threadStoreService.getThread(threadId));
    }

    /**
     * POST /api/blocknote/threads
     * Create a new thread
     * Body: { initialComment: { body, metadata }, metadata: { documentId } }
     */
    @PostMapping
    public ResponseEntity<BlockNoteThreadDto> createThread(
            @RequestParam(required = false) String documentId,
            @RequestBody Map<String, Object> requestBody
    ) {
        // Extract documentId from metadata if not in query param
        if (documentId == null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> metadata = (Map<String, Object>) requestBody.get("metadata");
            if (metadata != null && metadata.containsKey("documentId")) {
                documentId = (String) metadata.get("documentId");
            }
        }
        
        if (documentId == null) {
            throw new IllegalArgumentException("documentId is required");
        }
        
        return ResponseEntity.ok(threadStoreService.createThreadFromBlockNote(documentId, requestBody));
    }

    /**
     * PUT /api/blocknote/threads/{threadId}
     * Update a thread
     */
    @PutMapping("/{threadId}")
    public ResponseEntity<BlockNoteThreadDto> updateThread(
            @PathVariable String threadId,
            @RequestBody Map<String, Object> requestBody
    ) {
        return ResponseEntity.ok(threadStoreService.updateThread(threadId, requestBody));
    }

    /**
     * DELETE /api/blocknote/threads/{threadId}
     * Delete a thread
     */
    @DeleteMapping("/{threadId}")
    public ResponseEntity<Void> deleteThread(@PathVariable String threadId) {
        threadStoreService.deleteThread(threadId);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/blocknote/threads/{threadId}/addToDocument
     * Add thread to document (create mark in document)
     * Body: { selection: { prosemirror: { head, anchor }, yjs: { head, anchor } } }
     */
    @PostMapping("/{threadId}/addToDocument")
    public ResponseEntity<Void> addThreadToDocument(
            @PathVariable String threadId,
            @RequestBody Map<String, Object> requestBody
    ) {
        threadStoreService.addThreadToDocument(threadId, requestBody);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/blocknote/threads/{threadId}/comments
     * Add a comment to a thread
     * Body: { comment: { body, metadata } }
     */
    @PostMapping("/{threadId}/comments")
    public ResponseEntity<BlockNoteCommentDto> addComment(
            @PathVariable String threadId,
            @RequestBody Map<String, Object> requestBody
    ) {
        return ResponseEntity.ok(threadStoreService.addComment(threadId, requestBody));
    }

    /**
     * PUT /api/blocknote/threads/{threadId}/comments/{commentId}
     * Update a comment
     * Body: { comment: { body, metadata } }
     */
    @PutMapping("/{threadId}/comments/{commentId}")
    public ResponseEntity<Void> updateComment(
            @PathVariable String threadId,
            @PathVariable String commentId,
            @RequestBody Map<String, Object> requestBody
    ) {
        threadStoreService.updateComment(threadId, commentId, requestBody);
        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /api/blocknote/threads/{threadId}/comments/{commentId}
     * Delete a comment
     */
    @DeleteMapping("/{threadId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable String threadId,
            @PathVariable String commentId
    ) {
        threadStoreService.deleteComment(threadId, commentId);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/blocknote/threads/{threadId}/resolve
     * Resolve a thread
     */
    @PostMapping("/{threadId}/resolve")
    public ResponseEntity<Void> resolveThread(@PathVariable String threadId) {
        threadStoreService.resolveThread(threadId);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/blocknote/threads/{threadId}/unresolve
     * Unresolve a thread
     */
    @PostMapping("/{threadId}/unresolve")
    public ResponseEntity<Void> unresolveThread(@PathVariable String threadId) {
        threadStoreService.unresolveThread(threadId);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/blocknote/threads/{threadId}/comments/{commentId}/reactions
     * Add a reaction to a comment
     * Body: { emoji: string }
     */
    @PostMapping("/{threadId}/comments/{commentId}/reactions")
    public ResponseEntity<Void> addReaction(
            @PathVariable String threadId,
            @PathVariable String commentId,
            @RequestBody Map<String, Object> requestBody
    ) {
        threadStoreService.addReaction(threadId, commentId, requestBody);
        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /api/blocknote/threads/{threadId}/comments/{commentId}/reactions/{emoji}
     * Delete a reaction from a comment
     */
    @DeleteMapping("/{threadId}/comments/{commentId}/reactions/{emoji}")
    public ResponseEntity<Void> deleteReaction(
            @PathVariable String threadId,
            @PathVariable String commentId,
            @PathVariable String emoji
    ) {
        threadStoreService.deleteReaction(threadId, commentId, emoji);
        return ResponseEntity.noContent().build();
    }
}

