package com.naammm.becore.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateWorkspaceRequest {
    private String name;
    private String description;
    private Boolean isPublic;
    private Boolean allowInvites;
    private String defaultTaskView;
    private String defaultDocumentView;
}
