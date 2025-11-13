package com.naammm.becore.service;

import java.util.Map;

import com.naammm.becore.dto.GenerateDiagramRequest;
import com.naammm.becore.dto.GenerateDiagramResponse;
import com.naammm.becore.dto.ParseTaskRequest;
import com.naammm.becore.dto.ParseTaskResponse;
import com.naammm.becore.entity.TaskPriority;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    public GenerateDiagramResponse generateDiagram(GenerateDiagramRequest request) {
        try {
            // Create prompt for Gemini
            String prompt = createMermaidPrompt(request.getPrompt());

            // Call Gemini API with retry and fallback
            Map<String, Object> responseBody = callGeminiWithRetry(prompt, geminiApiUrl);

            // Extract Mermaid code from response
            String mermaidCode = extractMermaidCode(responseBody);

            GenerateDiagramResponse responseDto = new GenerateDiagramResponse();
            responseDto.setMermaidCode(mermaidCode);
            responseDto.setDiagramType("mermaid");

            return responseDto;

        } catch (Exception e) {
            log.error("Error generating diagram", e);
            throw new RuntimeException("Failed to generate diagram", e);
        }
    }

    public ParseTaskResponse parseTask(ParseTaskRequest request) {
        try {
            String prompt = createTaskParsePrompt(request.getPrompt());

            Map<String, Object> responseBody = callGeminiWithRetry(prompt, geminiApiUrl);

            String json = extractText(responseBody).trim();
            // Strip markdown fences if present
            json = json.replaceAll("^```json\\s*", "")
                       .replaceAll("^```\\s*", "")
                       .replaceAll("\\s*```$", "")
                       .trim();

            JsonNode root = objectMapper.readTree(json);
            ParseTaskResponse dto = new ParseTaskResponse();
            ParseTaskResponse.Task task = new ParseTaskResponse.Task();
            task.setTitle(getAsText(root, "title", "New Task"));
            task.setDescription(getAsText(root, "description", null));
            // dueAt expected yyyy-MM-dd
            String dueStr = getAsText(root, "dueAt", null);
            // Normalize dueAt to ISO local 'yyyy-MM-dd\'T\'HH:mm'
            DateTimeFormatter isoLocalMinutes = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
            LocalDateTime dueDateTime;
            if (dueStr != null && !dueStr.isBlank()) {
                // Accept either date-only or datetime
                if (dueStr.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
                    dueDateTime = LocalDate.parse(dueStr).atTime(9, 0); // default 09:00
                } else {
                    // Try parse 'yyyy-MM-ddTHH:mm' or fallback to now+1h
                    try {
                        dueDateTime = LocalDateTime.parse(dueStr);
                    } catch (Exception e) {
                        try {
                            dueDateTime = LocalDateTime.parse(dueStr, isoLocalMinutes);
                        } catch (Exception ex) {
                            dueDateTime = LocalDate.now().atTime(9, 0);
                        }
                    }
                }
            } else {
                dueDateTime = LocalDate.now().atTime(9, 0);
            }
            // Ensure not in the past (relative to now)
            LocalDateTime now = LocalDateTime.now();
            if (dueDateTime.isBefore(now)) {
                // Push to next day same time
                dueDateTime = dueDateTime.plusDays(1).truncatedTo(ChronoUnit.MINUTES);
            }
            task.setDueAt(dueDateTime.format(isoLocalMinutes));
            String priorityStr = getAsText(root, "priority", "Medium");
            TaskPriority priority;
            try {
                priority = TaskPriority.valueOf(capitalize(priorityStr));
            } catch (Exception e) {
                priority = TaskPriority.Medium;
            }
            task.setPriority(priority);
            // tags
            var tagsNode = root.get("tags");
            var tags = new ArrayList<String>();
            if (tagsNode != null && tagsNode.isArray()) {
                for (JsonNode n : tagsNode) {
                    if (n.isTextual()) {
                        tags.add(n.asText());
                    }
                }
            }
            task.setTags(tags);
            dto.setTask(task);
            return dto;
        } catch (Exception e) {
            log.error("Error parsing task", e);
            throw new RuntimeException("Failed to parse task", e);
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

    private String createTaskParsePrompt(String userPrompt) {
        LocalDate today = LocalDate.now();
        return String.format(
            "You are a precise task parser. Today is %s.\n" +
            "- Interpret relative dates/times (e.g., \"tomorrow\", \"next Monday\", \"3pm\", \"09:30\") relative to today.\n" +
            "- Output STRICT JSON only (no backticks, no explanations).\n" +
            "- Date/time rules:\n" +
            "  * Return field \"dueAt\" as LOCAL datetime in format \"yyyy-MM-dd'T'HH:mm\" (24h clock).\n" +
            "  * If user specifies only a date, set time to 09:00.\n" +
            "  * If parsed datetime is in the past, choose the next valid upcoming datetime (usually next day same time).\n" +
            "- Priority must be one of: Low, Medium, High.\n" +
            "- Include tags as an array of strings without '#'.\n" +
            "- Include \"subtasks\" as an array of 3–8 concrete, small, actionable steps to complete the task. Each item is a short imperative sentence.\n" +
            "JSON schema:\n" +
            "{ \"title\": string, \"description\": string, \"dueAt\": \"yyyy-MM-dd'T'HH:mm\", \"priority\": \"Low|Medium|High\", \"tags\": string[], \"subtasks\": string[] }\n\n" +
            "Task:\n%s",
            today, userPrompt);
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

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        try {
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
            return text;
        } catch (Exception e) {
            log.error("Error parsing Gemini text response: {}", e.getMessage());
            log.error("Response structure: {}", response);
            throw new RuntimeException("Failed to parse AI response", e);
        }
    }

    private static String getAsText(JsonNode node, String field, String def) {
        JsonNode v = node.get(field);
        return v != null && v.isTextual() ? v.asText() : def;
    }

    private static String capitalize(String s) {
        if (s == null || s.isBlank()) return "Medium";
        String lower = s.trim().toLowerCase();
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    // --- Helpers for calling Gemini with retry and fallback ---
    @SuppressWarnings("unchecked")
    private Map<String, Object> callGeminiWithRetry(String prompt, String baseModelUrl) {
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

        // Try primary (pro) with retry/backoff
        String primaryUrl = baseModelUrl + "?key=" + geminiApiKey;
        try {
            return exchangeWithRetry(primaryUrl, entity, 3, new int[]{200, 500, 1000});
        } catch (Exception primaryEx) {
            log.warn("Primary Gemini model failed, attempting fallback to flash: {}", primaryEx.getMessage());
            // Fallback to flash model
            String fallbackUrl = primaryUrl.replace("gemini-2.5-pro", "gemini-2.5-flash");
            return exchangeWithRetry(fallbackUrl, entity, 2, new int[]{300, 800});
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> exchangeWithRetry(String url, HttpEntity<Map<String, Object>> entity, int maxAttempts, int[] backoffMs) {
        RuntimeException lastEx = null;
        for (int attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, (Class<Map<String, Object>>) (Class<?>) Map.class);
                // Accept 2xx only
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    return response.getBody();
                }
                throw new RuntimeException("Non-2xx response: " + response.getStatusCode());
            } catch (Exception e) {
                lastEx = new RuntimeException(e);
                // Backoff then retry
                try {
                    int sleep = backoffMs[Math.min(attempt, backoffMs.length - 1)];
                    Thread.sleep(sleep);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw lastEx;
                }
            }
        }
        throw lastEx != null ? lastEx : new RuntimeException("Gemini call failed with unknown error");
    }
}