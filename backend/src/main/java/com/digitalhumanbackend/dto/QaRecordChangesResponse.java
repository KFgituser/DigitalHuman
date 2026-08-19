package com.digitalhumanbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;
import java.util.List;

public record QaRecordChangesResponse(
        List<QaRecordResponse> items,
        @JsonProperty("next_updated_after")
        LocalDateTime nextUpdatedAfter,
        @JsonProperty("next_cursor_id")
        Long nextCursorId,
        @JsonProperty("has_more")
        boolean hasMore
) {
}
