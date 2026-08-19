package com.digitalhumanbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record QaRecordPageResponse(
        List<QaRecordResponse> items,
        long total,
        int page,
        @JsonProperty("page_size")
        int pageSize,
        @JsonProperty("total_pages")
        int totalPages
) {
}
