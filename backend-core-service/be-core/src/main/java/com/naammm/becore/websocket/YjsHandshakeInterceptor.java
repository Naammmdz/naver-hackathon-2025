package com.naammm.becore.websocket;

import java.util.Map;

import com.naammm.becore.security.ClerkTokenVerifier;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Intercepts Yjs WebSocket handshake to extract and validate Clerk auth token
 * Sets userId in session attributes for use by YjsWebSocketHandler
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class YjsHandshakeInterceptor implements HandshakeInterceptor {

    private final ClerkTokenVerifier clerkTokenVerifier;

    @Override
    public boolean beforeHandshake(
            @NonNull ServerHttpRequest request,
            @NonNull ServerHttpResponse response,
            @NonNull WebSocketHandler wsHandler,
            @NonNull Map<String, Object> attributes) throws Exception {

        try {
            // Extract token from query parameter or Authorization header
            String token = extractToken(request);
            
            if (token == null) {
                log.warn("[Yjs] No auth token provided in WebSocket handshake");
                // Allow connection but without userId (will be rejected by handler)
                return true;
            }

            // Verify token and extract userId (subject claim)
            String userId = clerkTokenVerifier.verify(token);
            
            if (userId != null) {
                // Store userId in session attributes
                attributes.put("userId", userId);
                log.info("[Yjs] WebSocket handshake authorized for userId: {}", userId);
                return true;
            } else {
                log.warn("[Yjs] Invalid auth token in WebSocket handshake");
                return true; // Allow connection, handler will reject if userId missing
            }
            
        } catch (Exception e) {
            log.error("[Yjs] Error during WebSocket handshake: {}", e.getMessage());
            return true; // Allow connection, handler will validate
        }
    }

    @Override
    public void afterHandshake(
            @NonNull ServerHttpRequest request,
            @NonNull ServerHttpResponse response,
            @NonNull WebSocketHandler wsHandler,
            @Nullable Exception exception) {
        // No-op
    }

    private String extractToken(ServerHttpRequest request) {
        // Try query parameter first (for y-websocket library)
        String query = request.getURI().getQuery();
        if (query != null) {
            Map<String, String> params = UriComponentsBuilder.fromUriString("?" + query)
                    .build()
                    .getQueryParams()
                    .toSingleValueMap();
            
            String token = params.get("token");
            if (token != null) {
                return token;
            }
        }

        // Try Authorization header
        var authHeaders = request.getHeaders().get("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String authHeader = authHeaders.get(0);
            if (authHeader.startsWith("Bearer ")) {
                return authHeader.substring(7);
            }
        }

        return null;
    }
}
