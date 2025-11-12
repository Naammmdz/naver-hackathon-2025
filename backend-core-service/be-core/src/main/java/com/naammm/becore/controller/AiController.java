package com.naammm.becore.controller;

import com.naammm.becore.dto.GenerateDiagramRequest;
import com.naammm.becore.dto.GenerateDiagramResponse;
import com.naammm.becore.dto.ParseTaskRequest;
import com.naammm.becore.dto.ParseTaskResponse;
import com.naammm.becore.service.AiService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AiController {

    private final AiService aiService;

    @PostMapping("/generate-diagram")
    public ResponseEntity<GenerateDiagramResponse> generateDiagram(@RequestBody GenerateDiagramRequest request) {
        GenerateDiagramResponse response = aiService.generateDiagram(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/parse-task")
    public ResponseEntity<ParseTaskResponse> parseTask(@RequestBody ParseTaskRequest request) {
        ParseTaskResponse response = aiService.parseTask(request);
        return ResponseEntity.ok(response);
    }
}