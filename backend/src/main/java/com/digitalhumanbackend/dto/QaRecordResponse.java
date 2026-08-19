package com.digitalhumanbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

public record QaRecordResponse(
        Long id,
        @JsonProperty("source_key")
        String sourceKey,
        @JsonProperty("request_id")
        String requestId,
        String question,
        String answer,
        @JsonProperty("create_time")
        LocalDateTime createTime,
        @JsonProperty("updated_at")
        LocalDateTime updatedAt,
        @JsonProperty("deleted_at")
        LocalDateTime deletedAt,
        @JsonProperty("client_id")
        String clientId,
        @JsonProperty("answer_status")
        String answerStatus,
        @JsonProperty("fail_reason")
        String failReason,
        @JsonProperty("answer_duration_seconds")
        Double answerDurationSeconds,
        @JsonProperty("total_tokens")
        Long totalTokens,
        @JsonProperty("retrieval_hit")
        Boolean retrievalHit,
        @JsonProperty("source_summary")
        String sourceSummary
) {
}
