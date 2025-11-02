package com.naammm.becore.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateWorkspaceRequest {
    private String name;
    private String description;
    private Boolean isPublic;
    private Boolean allowInvites;
    private String defaultTaskView;
    private String defaultDocumentView;
}
