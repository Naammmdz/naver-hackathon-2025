package com.devflow.realtime.core;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.devflow.realtime.config.RealtimeCollabProperties;
import com.devflow.realtime.persistence.YjsSnapshotService;
import com.devflow.realtime.redis.YjsRedisService;
import com.devflow.realtime.redis.YjsRedisService.UpdatePayload;
import com.devflow.realtime.yjs.YjsCodec;
import com.devflow.realtime.yjs.YjsDocument;

@Component
public class YjsDocumentManager {

    private static final Logger log = LoggerFactory.getLogger(YjsDocumentManager.class);

    private final Map<String, WorkspaceDocument> documents = new ConcurrentHashMap<>();
    private final YjsCodec codec;
    private final YjsSnapshotService snapshotService;
    private final YjsRedisService redisService;
    private final RealtimeCollabProperties properties;

    public YjsDocumentManager(
        YjsCodec codec,
        YjsSnapshotService snapshotService,
        YjsRedisService redisService,
        RealtimeCollabProperties properties
    ) {
        this.codec = codec;
        this.snapshotService = snapshotService;
        this.redisService = redisService;
        this.properties = properties;
        this.redisService.registerUpdateListener(this::handleRemoteUpdate);
    }

    public WorkspaceDocument getWorkspace(String workspaceId) {
        return documents.computeIfAbsent(workspaceId, this::loadWorkspace);
    }

    public byte[] computeDelta(String workspaceId, byte[] clientVector) {
        WorkspaceDocument document = getWorkspace(workspaceId);
        document.readLock().lock();
        try {
            return codec.encodeStateAsUpdate(document.getYDoc(), clientVector);
        } finally {
            document.readLock().unlock();
        }
    }

    public byte[] currentVector(String workspaceId) {
        WorkspaceDocument document = getWorkspace(workspaceId);
        document.readLock().lock();
        try {
            return codec.encodeStateVector(document.getYDoc());
        } finally {
            document.readLock().unlock();
        }
    }

    public void applyLocalUpdate(String workspaceId, byte[] update, UUID sessionId, String userId) {
        WorkspaceDocument document = getWorkspace(workspaceId);
        document.writeLock().lock();
        try {
            codec.applyUpdate(document.getYDoc(), update);
            document.touch(userId);
            document.incrementCounters(update.length);
        } finally {
            document.writeLock().unlock();
        }

        redisService.publishUpdate(workspaceId, update, sessionId.toString());
    }

    public void applyRemoteUpdate(String workspaceId, byte[] update, String originId) {
        WorkspaceDocument document = getWorkspace(workspaceId);
        document.writeLock().lock();
        try {
            codec.applyUpdate(document.getYDoc(), update);
            document.touch(originId);
            document.incrementCounters(update.length);
        } finally {
            document.writeLock().unlock();
        }
    }

    public void persistSnapshot(String workspaceId, String userId) {
        WorkspaceDocument document = getWorkspace(workspaceId);
        document.writeLock().lock();
        try {
            if (!document.shouldPersist(properties)) {
                return;
            }
            if (!properties.getPersistence().isEnabled()) {
                document.resetCounters();
                return;
            }

            byte[] snapshot = codec.encodeSnapshot(document.getYDoc());
            byte[] vector = codec.encodeStateVector(document.getYDoc());
            snapshotService.save(workspaceId, snapshot, vector, userId);
            redisService.cacheSnapshot(workspaceId, snapshot, vector);
            document.resetCounters();
        } finally {
            document.writeLock().unlock();
        }
    }

    public void persistAll() {
        if (!properties.getPersistence().isEnabled()) {
            return;
        }
        documents.keySet().forEach(workspaceId -> {
            try {
                persistSnapshot(workspaceId, null);
            } catch (Exception error) {
                log.warn("Failed to persist Yjs snapshot for workspace {}", workspaceId, error);
            }
        });
    }

    public void persistSnapshotImmediately(String workspaceId, String userId) {
        WorkspaceDocument document = getWorkspace(workspaceId);
        document.writeLock().lock();
        try {
            if (!properties.getPersistence().isEnabled()) {
                document.resetCounters();
                return;
            }
            byte[] snapshot = codec.encodeSnapshot(document.getYDoc());
            byte[] vector = codec.encodeStateVector(document.getYDoc());
            snapshotService.save(workspaceId, snapshot, vector, userId);
            redisService.cacheSnapshot(workspaceId, snapshot, vector);
            document.resetCounters();
        } finally {
            document.writeLock().unlock();
        }
    }

    public void evictWorkspace(String workspaceId) {
        WorkspaceDocument document = documents.remove(workspaceId);
        if (document != null) {
            document.destroy();
        }
    }

    private void handleRemoteUpdate(String workspaceId, UpdatePayload payload) {
        applyRemoteUpdate(workspaceId, payload.update(), payload.originId());
    }

    private WorkspaceDocument loadWorkspace(String workspaceId) {
        Optional<YjsRedisService.SnapshotPayload> cached = redisService.readSnapshot(workspaceId);
        if (cached.isPresent()) {
            log.debug("Hydrating workspace {} from redis cache", workspaceId);
            return new WorkspaceDocument(
                workspaceId,
                codec.hydrate(cached.get().snapshot(), cached.get().vector())
            );
        }

        if (!properties.getPersistence().isEnabled()) {
            log.info("Persistence disabled. Creating volatile Y.Doc for workspace {}", workspaceId);
            return new WorkspaceDocument(workspaceId, codec.newDocument());
        }

        return snapshotService.load(workspaceId)
            .map(record -> {
                log.info("Hydrating workspace {} from database snapshot", workspaceId);
                return new WorkspaceDocument(workspaceId, codec.hydrate(record.snapshot(), record.vector()));
            })
            .orElseGet(() -> {
                log.info("Creating new Y.Doc for workspace {}", workspaceId);
                return new WorkspaceDocument(workspaceId, codec.newDocument());
            });
    }

    public static final class WorkspaceDocument {
        private final String workspaceId;
        private final YjsDocument yDoc;
        private final AtomicInteger updatesSinceSnapshot = new AtomicInteger();
        private final AtomicInteger bufferedBytes = new AtomicInteger();
        private volatile Instant lastPersisted = Instant.now();
        private volatile String lastTouchedBy;

        WorkspaceDocument(String workspaceId, YjsDocument yDoc) {
            this.workspaceId = workspaceId;
            this.yDoc = yDoc;
        }

        public String getWorkspaceId() {
            return workspaceId;
        }

        public YjsDocument getYDoc() {
            return yDoc;
        }

        public java.util.concurrent.locks.Lock readLock() {
            return yDoc.readLock();
        }

        public java.util.concurrent.locks.Lock writeLock() {
            return yDoc.writeLock();
        }

        public String getLastTouchedBy() {
            return lastTouchedBy;
        }

        void touch(String userId) {
            yDoc.touch();
            lastTouchedBy = userId;
        }

        void incrementCounters(int deltaBytes) {
            updatesSinceSnapshot.incrementAndGet();
            bufferedBytes.addAndGet(deltaBytes);
        }

        void resetCounters() {
            updatesSinceSnapshot.set(0);
            bufferedBytes.set(0);
            lastPersisted = Instant.now();
        }

        boolean shouldPersist(RealtimeCollabProperties properties) {
            if (updatesSinceSnapshot.get() == 0) {
                return false;
            }
            if (updatesSinceSnapshot.get() >= properties.getSnapshotUpdateThreshold()) {
                return true;
            }
            if (bufferedBytes.get() >= properties.getSnapshotByteThreshold()) {
                return true;
            }
            Instant limit = lastPersisted.plus(properties.getSnapshotInterval());
            return Instant.now().isAfter(limit);
        }

        void destroy() {
            // Hook for releasing native resources when using WASM backed codecs.
        }

        @Override
        public String toString() {
            return "WorkspaceDocument{" +
                "workspaceId='" + workspaceId + '\'' +
                ", updatesSinceSnapshot=" + updatesSinceSnapshot +
                ", bufferedBytes=" + bufferedBytes +
                ", lastTouchedBy='" + lastTouchedBy + '\'' +
                ", lastPersisted=" + lastPersisted +
                '}';
        }
    }
}
