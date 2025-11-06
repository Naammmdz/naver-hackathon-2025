package com.naammm.becore.service;

import java.util.Map;

import com.naammm.becore.dto.GenerateDiagramRequest;
import com.naammm.becore.dto.GenerateDiagramResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    public GenerateDiagramResponse generateDiagram(GenerateDiagramRequest request) {
        try {
            // Create prompt for Gemini
            String prompt = createMermaidPrompt(request.getPrompt());

            // Call Gemini API
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");

            Map<String, Object> requestBody = Map.of(
                "contents", new Object[]{
                    Map.of("parts", new Object[]{
                        Map.of("text", prompt)
                    })
                }
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            String url = geminiApiUrl + "?key=" + geminiApiKey;
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.POST, entity, (Class<Map<String, Object>>) (Class<?>) Map.class);

            // Extract Mermaid code from response
            String mermaidCode = extractMermaidCode(response.getBody());

            GenerateDiagramResponse responseDto = new GenerateDiagramResponse();
            responseDto.setMermaidCode(mermaidCode);
            responseDto.setDiagramType("mermaid");

            return responseDto;

        } catch (Exception e) {
            log.error("Error generating diagram", e);
            throw new RuntimeException("Failed to generate diagram", e);
        }
    }

    private String createMermaidPrompt(String userPrompt) {
        return String.format(
            "Generate a Mermaid diagram code for the following requirement. " +
            "Return ONLY the Mermaid code without any explanation or markdown formatting:\n\n%s\n\n" +
            "Examples of supported diagram types:\n" +
            "- Flowcharts: graph TD\n" +
            "- Sequence diagrams: sequenceDiagram\n" +
            "- Gantt charts: gantt\n" +
            "- Class diagrams: classDiagram\n" +
            "- State diagrams: stateDiagram\n" +
            "- Entity Relationship: erDiagram\n\n" +
            "Choose the most appropriate diagram type for the requirement.",
            userPrompt
        );
    }

    @SuppressWarnings("unchecked")
    private String extractMermaidCode(Map<String, Object> response) {
        try {
            // Parse Gemini response to extract text
            // Handle both List and Map[] formats for candidates
            Object candidatesObj = response.get("candidates");
            Map<String, Object> candidate = null;
            
            if (candidatesObj instanceof java.util.List) {
                java.util.List<?> candidatesList = (java.util.List<?>) candidatesObj;
                candidate = (Map<String, Object>) candidatesList.get(0);
            } else if (candidatesObj instanceof Map[]) {
                candidate = ((Map[]) candidatesObj)[0];
            } else {
                throw new RuntimeException("Unexpected candidates format");
            }

            Map<String, Object> content = (Map<String, Object>) candidate.get("content");
            
            // Handle both List and Map[] formats for parts
            Object partsObj = content.get("parts");
            Map<String, Object> part = null;
            
            if (partsObj instanceof java.util.List) {
                java.util.List<?> partsList = (java.util.List<?>) partsObj;
                part = (Map<String, Object>) partsList.get(0);
            } else if (partsObj instanceof Map[]) {
                part = ((Map[]) partsObj)[0];
            } else {
                throw new RuntimeException("Unexpected parts format");
            }

            String text = (String) part.get("text");

            // Clean up the response (remove markdown formatting if any)
            return text.trim()
                .replaceAll("^```mermaid\\s*", "")
                .replaceAll("^```\\s*", "")
                .replaceAll("\\s*```$", "")
                .trim();

        } catch (Exception e) {
            log.error("Error parsing Gemini response: {}", e.getMessage());
            log.error("Response structure: {}", response);
            throw new RuntimeException("Failed to parse AI response", e);
        }
    }
}