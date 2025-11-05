package com.devflow.realtime.persistence;

import java.time.Instant;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class YjsSnapshotService {

    public record SnapshotRecord(String workspaceId, byte[] snapshot, byte[] vector, Instant updatedAt, String userId) {}

    private final YjsSnapshotRepository repository;

    public YjsSnapshotService(YjsSnapshotRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Optional<SnapshotRecord> load(String workspaceId) {
        return repository.findById(workspaceId)
            .map(entity -> new SnapshotRecord(
                entity.getWorkspaceId(),
                entity.getSnapshot(),
                entity.getVector(),
                entity.getUpdatedAt(),
                entity.getUserId()
            ));
    }

    @Transactional
    public void save(String workspaceId, byte[] snapshot, byte[] vector, String userId) {
        YjsSnapshotEntity entity = repository.findById(workspaceId).orElseGet(YjsSnapshotEntity::new);
        entity.setWorkspaceId(workspaceId);
        entity.setSnapshot(snapshot);
        entity.setVector(vector);
        entity.setUpdatedAt(Instant.now());
        entity.setUserId(userId);
        repository.save(entity);
    }
}
