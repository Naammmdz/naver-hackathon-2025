package com.naammm.becore.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * DTO for BlockNote Thread format
 * Based on BlockNote ThreadStore API specification
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BlockNoteThreadDto {
    /**
     * Thread ID (same as root comment ID)
     */
    private String id;
    
    /**
     * Timestamp when thread was created
     */
    private Long createdAt;
    
    /**
     * Timestamp when thread was last updated
     */
    private Long updatedAt;
    
    /**
     * Comments in this thread
     */
    private List<BlockNoteCommentDto> comments;
    
    /**
     * Whether the thread is resolved
     */
    private Boolean resolved;
    
    /**
     * User ID who resolved the thread
     */
    private String resolvedBy;
    
    /**
     * Timestamp when thread was resolved
     */
    private Long resolvedAt;
    
    /**
     * Additional metadata
     */
    private Map<String, Object> metadata;
    
    /**
     * Reference to the block/position in the document
     * Format: { "selection": { "prosemirror": { "head": number, "anchor": number }, "yjs": { "head": any, "anchor": any } } }
     * This is used to restore the comment mark in the document when loading threads
     */
    private Map<String, Object> reference;
}

