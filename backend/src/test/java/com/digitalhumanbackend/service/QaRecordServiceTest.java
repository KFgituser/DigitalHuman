package com.digitalhumanbackend.service;

import com.digitalhumanbackend.model.QaRecord;
import com.digitalhumanbackend.repository.QaRecordRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@DataJpaTest(properties = "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect")
@Import(QaRecordService.class)
class QaRecordServiceTest {

    @Autowired
    private QaRecordRepository records;

    @Autowired
    private QaRecordService service;

    @Test
    void aggregatesFilteredRecordsAndSelectsP95WithoutLoadingEveryDuration() {
        for (int i = 1; i <= 20; i++) {
            QaRecord record = record("beijing", "ordinary " + i, LocalDateTime.of(2026, 1, 1, 12, 0));
            record.setAnswerStatus("answered");
            record.setAnswerDurationSeconds((double) i);
            record.setTotalTokens((long) i);
            record.setRetrievalHit(i % 2 == 0);
            records.save(record);
        }

        QaRecord unanswered = record("beijing", "focus failure", LocalDateTime.of(2026, 1, 2, 12, 0));
        unanswered.setFailReason("request failed");
        unanswered.setAnswerDurationSeconds(-1d);
        records.save(unanswered);

        QaRecord unclear = record("beijing", "focus unclear", LocalDateTime.of(2026, 1, 2, 12, 0));
        unclear.setAnswer("这个问题提问不清晰，请补充更多信息。");
        records.save(unclear);

        QaRecord unknown = record("beijing", "focus unknown", LocalDateTime.of(2026, 1, 2, 12, 0));
        unknown.setAnswerStatus("other");
        records.save(unknown);

        QaRecord deleted = record("beijing", "deleted", LocalDateTime.of(2026, 1, 1, 12, 0));
        deleted.setDeletedAt(LocalDateTime.of(2026, 1, 3, 12, 0));
        records.save(deleted);
        records.save(record("tangshan", "other source", LocalDateTime.of(2026, 1, 1, 12, 0)));
        records.flush();

        var stats = service.stats("beijing", null, null, null, null);
        assertEquals(23, stats.total());
        assertEquals(20, stats.answered());
        assertEquals(1, stats.unanswered());
        assertEquals(1, stats.unclear());
        assertEquals(1, stats.unknown());
        assertEquals(10.5, stats.avgDuration());
        assertEquals(19d, stats.p95Duration());
        assertEquals(210L, stats.totalTokens());
        assertEquals(50, stats.retrievalHitRate());
        assertEquals(20, stats.daily().get("2026-01-01").total());
        assertEquals(3, stats.daily().get("2026-01-02").total());

        var filtered = service.stats("beijing", null, "focus", "2026-01-02", "2026-01-02");
        assertEquals(3, filtered.total());
        assertEquals(1, filtered.unanswered());
        assertEquals(1, filtered.unclear());
        assertEquals(1, filtered.unknown());
        assertNull(filtered.avgDuration());
        assertNull(filtered.p95Duration());
        assertNull(filtered.totalTokens());
        assertNull(filtered.retrievalHitRate());
    }

    private QaRecord record(String source, String question, LocalDateTime createdAt) {
        QaRecord record = new QaRecord();
        record.setSourceKey(source);
        record.setQuestion(question);
        record.setAnswer("This is an ordinary answered response.");
        record.setCreatedAt(createdAt);
        record.setUpdatedAt(createdAt);
        return record;
    }
}
