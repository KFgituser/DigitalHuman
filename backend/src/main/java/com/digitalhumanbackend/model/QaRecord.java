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

    @Column(nullable = false)
    private String question;

    @Column(nullable = false)
    private String answer;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "client_id", nullable = false)
    private String clientId;

    @Column(nullable = false)
    private int page;

    // Getters and Setters
}
