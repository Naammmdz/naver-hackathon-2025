package com.naammm.becore.config;

import com.naammm.becore.websocket.YjsHandshakeInterceptor;
import com.naammm.becore.websocket.YjsWebSocketHandler;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSocketMessageBroker
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer, WebSocketConfigurer {

    private final YjsWebSocketHandler yjsWebSocketHandler;
    private final YjsHandshakeInterceptor yjsHandshakeInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple in-memory broker for pub/sub
        config.enableSimpleBroker("/topic", "/queue");
        
        // Prefix for messages from client to server
        config.setApplicationDestinationPrefixes("/app");
        
        // Prefix for user-specific messages
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // STOMP endpoint for old collaboration system (can be removed later)
        registry.addEndpoint("/ws/collaboration")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Yjs binary WebSocket endpoint with authentication interceptor
        registry.addHandler(yjsWebSocketHandler, "/ws/yjs/*")
                .addInterceptors(yjsHandshakeInterceptor)
                .setAllowedOriginPatterns("*");
    }

    /**
     * Configure WebSocket container with larger buffer sizes to handle Yjs state sync
     * Default buffer size is 8KB which is too small for large document states
     */
    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        
        // Increase buffer sizes to handle large Yjs updates (16MB)
        container.setMaxTextMessageBufferSize(16 * 1024 * 1024);
        container.setMaxBinaryMessageBufferSize(16 * 1024 * 1024);
        
        // Increase session idle timeout (30 minutes)
        container.setMaxSessionIdleTimeout(30 * 60 * 1000L);
        
        return container;
    }
}
