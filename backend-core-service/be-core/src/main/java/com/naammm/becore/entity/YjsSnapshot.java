package com.naammm.becore.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity to persist Yjs CRDT snapshots for document collaboration.
 * Snapshots contain the complete state (Y.encodeStateAsUpdate) and vector clock (Y.encodeStateVector)
 * for efficient synchronization and recovery.
 */
@Entity
@Table(
    name = "yjs_snapshots",
    indexes = {
        @Index(name = "idx_snapshot_workspace_id", columnList = "workspace_id"),
        @Index(name = "idx_snapshot_workspace_updated", columnList = "workspace_id,updated_at DESC")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YjsSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /**
     * Workspace ID that this snapshot belongs to.
     * All documents in a workspace share the same Y.Doc.
     */
    @Column(name = "workspace_id", nullable = false, length = 160)
    private String workspaceId;

    /**
     * Complete Yjs state snapshot (Y.encodeStateAsUpdate()).
     * This contains all CRDT operations needed to reconstruct the document state.
     */
    @Lob
    @Column(name = "snapshot", nullable = false)
    private byte[] snapshot;

    /**
     * Yjs state vector (Y.encodeStateVector()).
     * Used to calculate deltas and ensure proper synchronization.
     */
    @Lob
    @Column(name = "vector", nullable = false)
    private byte[] vector;

    /**
     * Timestamp when this snapshot was created/updated.
     */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Optional: User ID who triggered this snapshot (for debugging).
     */
    @Column(name = "user_id", length = 160)
    private String userId;

    @PrePersist
    protected void onCreate() {
        updatedAt = LocalDateTime.now();
    }
}