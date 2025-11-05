package com.devflow.realtime.redis;

import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.BiConsumer;

import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Component;

import com.devflow.realtime.config.RealtimeCollabProperties;

@Component
public class YjsRedisService implements MessageListener {

    public record SnapshotPayload(byte[] snapshot, byte[] vector) {}

    public record UpdatePayload(byte[] update, String originId) {}

    private final RedisTemplate<String, String> redisTemplate;
    private final RealtimeCollabProperties properties;
    private final ChannelTopic channel;
    private final List<BiConsumer<String, UpdatePayload>> updateListeners = new CopyOnWriteArrayList<>();

    public YjsRedisService(
        RedisTemplate<String, String> redisTemplate,
        RealtimeCollabProperties properties
    ) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
        this.channel = new ChannelTopic(properties.getRedis().getChannelPrefix());
    }

    public ChannelTopic getChannel() {
        return channel;
    }

    public void registerUpdateListener(BiConsumer<String, UpdatePayload> listener) {
        updateListeners.add(Objects.requireNonNull(listener));
    }

    public void publishUpdate(String workspaceId, byte[] update, String originId) {
        if (!properties.getRedis().isEnabled()) {
            return;
        }
        final String payload = encodeUpdate(update, originId);
        redisTemplate.convertAndSend(channel.getTopic(), workspaceId + "|" + payload);
    }

    public void cacheSnapshot(String workspaceId, byte[] snapshot, byte[] vector) {
        if (!properties.getRedis().isEnabled()) {
            return;
        }
        final String redisKey = cacheKey(workspaceId);
        final String payload = encodeSnapshot(snapshot, vector);
        Duration ttl = properties.getRedis().getTtl();
        if (ttl.isZero() || ttl.isNegative()) {
          redisTemplate.opsForValue().set(redisKey, payload);
        } else {
          redisTemplate.opsForValue().set(redisKey, payload, ttl);
        }
    }

    public Optional<SnapshotPayload> readSnapshot(String workspaceId) {
        if (!properties.getRedis().isEnabled()) {
            return Optional.empty();
        }
        final String redisKey = cacheKey(workspaceId);
        final String payload = redisTemplate.opsForValue().get(redisKey);
        if (payload == null) {
            return Optional.empty();
        }
        return Optional.of(decodeSnapshot(payload));
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        if (!properties.getRedis().isEnabled()) {
            return;
        }
        final String raw = message.toString();
        final int separatorIndex = raw.indexOf('|');
        if (separatorIndex <= 0) {
            return;
        }
        final String workspaceId = raw.substring(0, separatorIndex);
        final String payload = raw.substring(separatorIndex + 1);
        final UpdatePayload update = decodeUpdate(payload);
        updateListeners.forEach(listener -> listener.accept(workspaceId, update));
    }

    private String cacheKey(String workspaceId) {
        return "workspace:" + workspaceId;
    }

    private String encodeSnapshot(byte[] snapshot, byte[] vector) {
        return Base64.getEncoder().encodeToString(snapshot) + ":" + Base64.getEncoder().encodeToString(vector);
    }

    private SnapshotPayload decodeSnapshot(String payload) {
        final String[] parts = payload.split(":", 2);
        return new SnapshotPayload(
            Base64.getDecoder().decode(parts[0]),
            Base64.getDecoder().decode(parts.length > 1 ? parts[1] : "")
        );
    }

    private String encodeUpdate(byte[] update, String originId) {
        return Base64.getEncoder().encodeToString(update) + ":" + (originId == null ? "" : originId);
    }

    private UpdatePayload decodeUpdate(String payload) {
        final String[] parts = payload.split(":", 2);
        final byte[] update = Base64.getDecoder().decode(parts[0]);
        final String originId = parts.length > 1 ? parts[1] : null;
        return new UpdatePayload(update, originId);
    }
}
