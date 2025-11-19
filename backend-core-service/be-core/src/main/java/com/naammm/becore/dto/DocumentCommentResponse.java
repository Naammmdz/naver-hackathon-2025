package com.naammm.becore.dto;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class DocumentCommentResponse {
    String id;
    String documentId;
    String workspaceId;
    String parentId;
    String content;
    boolean resolved;
    String resolvedBy;
    LocalDateTime resolvedAt;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    String authorId;
    CommentPermissions permissions;
    String reference; // Reference to the block/position in the document (JSON string)
}

