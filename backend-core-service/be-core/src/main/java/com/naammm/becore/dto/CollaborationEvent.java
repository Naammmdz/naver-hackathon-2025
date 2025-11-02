package com.naammm.becore.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollaborationEvent {
    private String type; // user-joined, user-left, cursor-move, selection-change, member-update, content-change
    private String userId;
    private String workspaceId;
    private Long timestamp;
    private Object data;
}
