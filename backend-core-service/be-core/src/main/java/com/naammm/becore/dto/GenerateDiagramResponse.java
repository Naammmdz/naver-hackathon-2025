package com.naammm.becore.dto;

import lombok.Data;

@Data
public class GenerateDiagramResponse {
    private String mermaidCode;
    private String diagramType;
}