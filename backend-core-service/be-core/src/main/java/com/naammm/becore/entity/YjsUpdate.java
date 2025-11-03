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
 * Entity to persist Yjs CRDT updates for document collaboration.
 * Each update represents a binary Yjs operation that can be replayed to reconstruct document state.
 */
@Entity
@Table(
    name = "yjs_updates",
    indexes = {
        @Index(name = "idx_workspace_id", columnList = "workspace_id"),
        @Index(name = "idx_workspace_created", columnList = "workspace_id,created_at")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YjsUpdate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /**
     * Workspace ID that this update belongs to.
     * All documents in a workspace share the same Y.Doc.
     */
    @Column(name = "workspace_id", nullable = false, length = 160)
    private String workspaceId;

    /**
     * Binary Yjs update data.
     * This is the raw CRDT operation data that Yjs generates.
     */
    @Lob
    @Column(name = "update_data", nullable = false)
    private byte[] updateData;

    /**
     * Size of the update in bytes (for monitoring and optimization).
     */
    @Column(name = "update_size", nullable = false)
    private Integer updateSize;

    /**
     * Timestamp when this update was created.
     */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * Optional: User ID who created this update (for debugging).
     */
    @Column(name = "user_id", length = 160)
    private String userId;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (updateData != null && updateSize == null) {
            updateSize = updateData.length;
        }
    }
}
