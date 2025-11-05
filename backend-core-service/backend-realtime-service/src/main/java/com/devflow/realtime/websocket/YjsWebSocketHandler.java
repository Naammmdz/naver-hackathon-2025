package com.devflow.realtime.websocket;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import com.devflow.common.domain.entity.WorkspaceRole;
import com.devflow.common.domain.repository.WorkspaceMemberRepository;
import com.devflow.realtime.core.YjsDocumentManager;
import com.devflow.realtime.redis.YjsRedisService;
import com.devflow.realtime.redis.YjsRedisService.UpdatePayload;

import org.slf4j.LoggerFactory;
import org.slf4j.Logger;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class YjsWebSocketHandler extends BinaryWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(YjsWebSocketHandler.class);

    private final Map<String, WorkspaceRoom> rooms = new ConcurrentHashMap<>();
    private final YjsDocumentManager documentManager;
    private final YjsRedisService redisService;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    public YjsWebSocketHandler(
        YjsDocumentManager documentManager,
        YjsRedisService redisService,
        WorkspaceMemberRepository workspaceMemberRepository
    ) {
        this.documentManager = documentManager;
        this.redisService = redisService;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.redisService.registerUpdateListener(this::handleDistributedUpdate);
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        final SessionDescriptor descriptor;
        try {
            descriptor = establishSession(session);
        } catch (IllegalArgumentException error) {
            String reason = error.getMessage();
            log.warn("Rejecting websocket connection: {}", reason);
            if (reason == null || reason.length() > 120) {
                reason = "Workspace access denied";
            }
            session.close(CloseStatus.POLICY_VIOLATION.withReason(reason));
            return;
        }

        final WorkspaceRoom room = rooms.computeIfAbsent(descriptor.workspaceId(), id -> new WorkspaceRoom());
        room.addSession(descriptor.sessionId(), session);

        byte[] delta = documentManager.computeDelta(descriptor.workspaceId(), descriptor.clientVector());
        if (delta.length > 0) {
            session.sendMessage(new BinaryMessage(delta));
        }

        log.info(
            "Client {} joined realtime workspace {} (role={}, connections={})",
            descriptor.sessionId(),
            descriptor.workspaceId(),
            descriptor.role(),
            room.sessionCount()
        );
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        final SessionDescriptor context = sessionContext(session);
        if (context.sessionId() == null || context.workspaceId() == null || context.workspaceId().isEmpty()) {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Incomplete session state"));
            return;
        }
        if (context.readOnly()) {
            log.debug(
                "Rejecting update from read-only member {} in workspace {}",
                context.userId(),
                context.workspaceId()
            );
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Read-only membership"));
            return;
        }
        final byte[] update = toByteArray(message.getPayload());

        documentManager.applyLocalUpdate(context.workspaceId(), update, context.sessionId(), context.userId());
        broadcastToWorkspace(context.workspaceId(), context.sessionId(), update);
        documentManager.persistSnapshot(context.workspaceId(), context.userId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            if ("ping".equalsIgnoreCase(message.getPayload())) {
                session.sendMessage(new TextMessage("pong"));
            }
        } catch (IOException e) {
            log.error("Failed to send pong message", e);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        final SessionDescriptor context = sessionContext(session);
        if (context.sessionId() == null) {
            return;
        }
        if (context.workspaceId() == null || context.workspaceId().isEmpty()) {
            return;
        }
        final WorkspaceRoom room = rooms.get(context.workspaceId());
        int remaining = 0;
        if (room != null) {
            room.removeSession(context.sessionId());
            remaining = room.sessionCount();
            if (remaining == 0) {
                rooms.remove(context.workspaceId());
                documentManager.persistSnapshotImmediately(context.workspaceId(), context.userId());
                documentManager.evictWorkspace(context.workspaceId());
            }
        }

        log.info(
            "Client {} left workspace {} (remaining={})",
            context.sessionId(),
            context.workspaceId(),
            remaining
        );
    }

    private void broadcastToWorkspace(String workspaceId, UUID origin, byte[] update) {
        final WorkspaceRoom room = rooms.get(workspaceId);
        if (room == null) {
            return;
        }
        room.broadcast(origin, update);
    }

    private void handleDistributedUpdate(String workspaceId, UpdatePayload payload) {
        UUID origin = null;
        if (payload.originId() != null && !payload.originId().isBlank()) {
            try {
                origin = UUID.fromString(payload.originId());
            } catch (IllegalArgumentException ignored) {
                origin = null;
            }
        }
        broadcastToWorkspace(workspaceId, origin, payload.update());
    }

    private static byte[] toByteArray(ByteBuffer buffer) {
        byte[] data = new byte[buffer.remaining()];
        buffer.get(data);
        return data;
    }

    private SessionDescriptor sessionContext(WebSocketSession session) {
        Map<String, Object> attributes = session.getAttributes();
        byte[] clientVector = (byte[]) attributes.get("clientVector");
        return new SessionDescriptor(
            (String) attributes.getOrDefault("workspaceId", ""),
            (UUID) attributes.get("sessionId"),
            clientVector != null ? clientVector : new byte[0],
            (String) attributes.get("userId"),
            (WorkspaceRole) attributes.get("workspaceRole"),
            Boolean.TRUE.equals(attributes.get("readOnly"))
        );
    }

    private SessionDescriptor establishSession(WebSocketSession session) {
        final HandshakeAttributes handshake = resolveHandshake(session);
        final WorkspaceRole role = requireWorkspaceMembership(handshake.workspaceId(), handshake.userId());
        final SessionDescriptor descriptor = new SessionDescriptor(
            handshake.workspaceId(),
            handshake.sessionId(),
            handshake.clientVector(),
            handshake.userId(),
            role,
            role == WorkspaceRole.VIEWER
        );
        session.getAttributes().putAll(descriptor.asMap());
        return descriptor;
    }

    private WorkspaceRole requireWorkspaceMembership(String workspaceId, String userId) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("userId is required for realtime collaboration");
        }
        return workspaceMemberRepository.findRoleByWorkspaceIdAndUserId(workspaceId, userId)
            .orElseThrow(() -> new IllegalArgumentException(
                "User %s is not a member of workspace %s".formatted(userId, workspaceId)
            ));
    }

    private HandshakeAttributes resolveHandshake(WebSocketSession session) {
        final URI uri = session.getUri();
        if (uri == null) {
            throw new IllegalArgumentException("Missing websocket URI");
        }

        final MultiValueMap<String, String> query = UriComponentsBuilder.fromUri(uri).build().getQueryParams();
        final String workspaceId = query.getFirst("workspaceId");
        final String vectorParam = query.getFirst("clientVector");
        final String userId = query.getFirst("userId");
        if (workspaceId == null) {
            throw new IllegalArgumentException("workspaceId is required");
        }
        final byte[] clientVector = vectorParam != null ? Base64.getDecoder().decode(URLDecoder.decode(vectorParam, StandardCharsets.UTF_8)) : new byte[0];

        return new HandshakeAttributes(
            workspaceId,
            UUID.randomUUID(),
            clientVector,
            userId
        );
    }

    private record HandshakeAttributes(String workspaceId, UUID sessionId, byte[] clientVector, String userId) { }

    private record SessionDescriptor(
        String workspaceId,
        UUID sessionId,
        byte[] clientVector,
        String userId,
        WorkspaceRole role,
        boolean readOnly
    ) {
        Map<String, Object> asMap() {
            return Map.of(
                "workspaceId", workspaceId,
                "sessionId", sessionId,
                "clientVector", clientVector,
                "userId", userId,
                "workspaceRole", role,
                "readOnly", readOnly
            );
        }
    }

    private static final class WorkspaceRoom {
        private final Map<UUID, WebSocketSession> sessions;

        WorkspaceRoom() {
            this.sessions = new ConcurrentHashMap<>();
        }

        void addSession(UUID sessionId, WebSocketSession session) {
            sessions.put(sessionId, session);
        }

        void removeSession(UUID sessionId) {
            sessions.remove(sessionId);
        }

        int sessionCount() {
            return sessions.size();
        }

        void broadcast(UUID origin, byte[] update) {
            BinaryMessage message = new BinaryMessage(update);
            sessions.forEach((sessionId, session) -> {
                if (sessionId.equals(origin)) {
                    return;
                }
                try {
                    if (session.isOpen()) {
                        session.sendMessage(message);
                    }
                } catch (IOException error) {
                    log.warn("Failed to broadcast update to session {}", sessionId, error);
                }
            });
        }
    }
}
