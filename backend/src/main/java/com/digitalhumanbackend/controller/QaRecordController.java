package com.digitalhumanbackend.controller;

import com.digitalhumanbackend.dto.QaRecordChangesResponse;
import com.digitalhumanbackend.dto.QaRecordPageResponse;
import com.digitalhumanbackend.dto.QaRecordStatsResponse;
import com.digitalhumanbackend.service.QaRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/qa-records")
@RequiredArgsConstructor
public class QaRecordController {

    private final QaRecordService qaRecordService;

    @GetMapping("/search")
    public QaRecordPageResponse search(
            @RequestParam(defaultValue = "beijing") String source,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(name = "page_size", defaultValue = "20") int pageSize,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(name = "date_start", required = false) String dateStart,
            @RequestParam(name = "date_end", required = false) String dateEnd
    ) {
        return qaRecordService.search(source, page, pageSize, status, keyword, dateStart, dateEnd);
    }

    @GetMapping("/stats")
    public QaRecordStatsResponse stats(
            @RequestParam(defaultValue = "beijing") String source,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(name = "date_start", required = false) String dateStart,
            @RequestParam(name = "date_end", required = false) String dateEnd
    ) {
        return qaRecordService.stats(source, status, keyword, dateStart, dateEnd);
    }

    @GetMapping("/changes")
    public QaRecordChangesResponse changes(
            @RequestParam(defaultValue = "beijing") String source,
            @RequestParam(name = "updated_after", required = false) String updatedAfter,
            @RequestParam(name = "cursor_id", required = false) Long cursorId,
            @RequestParam(defaultValue = "200") int limit
    ) {
        return qaRecordService.changes(source, updatedAfter, cursorId, limit);
    }
}
