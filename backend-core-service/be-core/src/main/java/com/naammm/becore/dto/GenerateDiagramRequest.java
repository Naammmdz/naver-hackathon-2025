package com.naammm.becore.dto;

import lombok.Data;

@Data
public class GenerateDiagramRequest {
    private String prompt;
    private String type; // "mermaid", "plantuml", etc.
}