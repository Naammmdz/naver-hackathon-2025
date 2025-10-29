package com.naammm.becore.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "task_docs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskDoc {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "task_id", nullable = false)
    private String taskId;

    @Column(name = "doc_id", nullable = false)
    private String docId;

    @Enumerated(EnumType.STRING)
    @Column(name = "relation_type", nullable = false)
    private TaskDocRelationType relationType;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private String note;

    private String createdBy;

    @Column(name = "user_id", nullable = false, length = 160)
    private String userId;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
