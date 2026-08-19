package com.digitalhumanbackend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@lombok.Data
@lombok.NoArgsConstructor
@lombok.AllArgsConstructor
@Entity
@Table(name = "qa_record")
public class QaRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_key", length = 64)
    private String sourceKey;

    @Column(name = "request_id", length = 128)
    private String requestId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(columnDefinition = "MEDIUMTEXT")
    private String answer;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "client_id")
    private String clientId;

    @Column
    private Integer page;

    @Column(name = "answer_status", length = 32)
    private String answerStatus;

    @Column(name = "fail_reason", columnDefinition = "TEXT")
    private String failReason;

    @Column(name = "answer_duration_seconds")
    private Double answerDurationSeconds;

    @Column(name = "total_tokens")
    private Long totalTokens;

    @Column(name = "retrieval_hit")
    private Boolean retrievalHit;

    @Column(name = "source_summary", columnDefinition = "TEXT")
    private String sourceSummary;

    @Column(name = "raw_payload", columnDefinition = "LONGTEXT")
    private String rawPayload;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
