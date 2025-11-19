package com.naammm.becore.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for BlockNote Reaction format
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BlockNoteReactionDto {
    /**
     * Emoji string
     */
    private String emoji;
    
    /**
     * Timestamp when first user reacted
     */
    private Long createdAt;
    
    /**
     * User IDs who reacted with this emoji
     */
    private List<String> userIds;
}

