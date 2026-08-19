package com.digitalhumanbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

public record QaRecordStatsResponse(
        long total,
        long answered,
        long unanswered,
        long unclear,
        long unknown,
        @JsonProperty("answer_rate")
        int answerRate,
        @JsonProperty("unanswered_rate")
        int unansweredRate,
        @JsonProperty("avg_duration")
        Double avgDuration,
        @JsonProperty("p95_duration")
        Double p95Duration,
        @JsonProperty("total_tokens")
        Long totalTokens,
        @JsonProperty("retrieval_hit_rate")
        Integer retrievalHitRate,
        Map<String, QaRecordDailyStats> daily
) {
    public record QaRecordDailyStats(
            long total,
            long answered,
            long unanswered,
            long unclear,
            long unknown
    ) {
    }
}
