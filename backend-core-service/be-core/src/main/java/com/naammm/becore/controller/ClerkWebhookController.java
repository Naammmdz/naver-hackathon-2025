package com.naammm.becore.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.naammm.becore.service.ClerkWebhookService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Slf4j
public class ClerkWebhookController {

    private final ClerkWebhookService webhookService;
    private final ObjectMapper objectMapper;

    @PostMapping("/clerk")
    public ResponseEntity<Map<String, Object>> handleClerkWebhook(
            @RequestHeader(value = "svix-id", required = false) String svixId,
            @RequestHeader(value = "svix-timestamp", required = false) String svixTimestamp,
            @RequestHeader(value = "svix-signature", required = false) String svixSignature,
            @RequestBody String payload
    ) {
        log.info("Received Clerk webhook");

        try {
            // Parse webhook payload
            JsonNode webhook = objectMapper.readTree(payload);
            String eventType = webhook.get("type").asText();

            log.info("Webhook event type: {}", eventType);

            // Handle different event types
            switch (eventType) {
                case "user.created":
                    webhookService.handleUserCreated(webhook.get("data"));
                    break;

                case "user.updated":
                    webhookService.handleUserUpdated(webhook.get("data"));
                    break;

                case "user.deleted":
                    webhookService.handleUserDeleted(webhook.get("data"));
                    break;

                default:
                    log.info("Unhandled event type: {}", eventType);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("event_type", eventType);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error processing Clerk webhook", e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}
