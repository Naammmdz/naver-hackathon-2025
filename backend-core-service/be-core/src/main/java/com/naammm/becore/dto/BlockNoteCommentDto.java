package com.naammm.becore.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * DTO for BlockNote Comment format
 * Based on BlockNote ThreadStore API specification
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BlockNoteCommentDto {
    /**
     * Comment ID
     */
    private String id;
    
    /**
     * User ID of the author
     */
    private String userId;
    
    /**
     * Timestamp when comment was created
     */
    private Long createdAt;
    
    /**
     * Timestamp when comment was last updated
     */
    private Long updatedAt;
    
    /**
     * Comment body as BlockNote blocks (array)
     * This is a BlockNote document structure
     */
    private List<Map<String, Object>> body;
    
    /**
     * Reactions to the comment
     */
    private List<BlockNoteReactionDto> reactions;
    
    /**
     * Additional metadata
     */
    private Map<String, Object> metadata;
    
    /**
     * Timestamp when comment was deleted (for soft deletes)
     */
    private Long deletedAt;
}

