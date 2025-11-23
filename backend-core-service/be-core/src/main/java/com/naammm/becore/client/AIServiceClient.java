package com.naammm.becore.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;

@Component
@RequiredArgsConstructor
@Slf4j
public class AIServiceClient {

    private final RestTemplate restTemplate;

    @Value("${ai-service.url}")
    private String aiServiceUrl;

    @Async
    public void reindexDocument(String workspaceId, String documentId) {
        if (aiServiceUrl == null || aiServiceUrl.isEmpty()) {
            log.warn("AI Service URL is not configured, skipping indexing");
            return;
        }
        
        String url = String.format("%s/api/v1/workspaces/%s/documents/%s/reindex", aiServiceUrl, workspaceId, documentId);
        try {
            log.info("Triggering AI indexing for document: {} in workspace: {}", documentId, workspaceId);
            // The endpoint is a POST request
            ResponseEntity<String> response = restTemplate.postForEntity(url, null, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully triggered AI indexing for document: {}", documentId);
            } else {
                log.error("Failed to trigger AI indexing for document: {}. Status: {}", documentId, response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Error calling AI service to reindex document: {}", e.getMessage());
        }
    }
}
