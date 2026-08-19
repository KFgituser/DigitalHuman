package com.digitalhumanbackend.service;

import com.digitalhumanbackend.dto.QaRecordChangesResponse;
import com.digitalhumanbackend.dto.QaRecordPageResponse;
import com.digitalhumanbackend.dto.QaRecordResponse;
import com.digitalhumanbackend.dto.QaRecordStatsResponse;
import com.digitalhumanbackend.model.QaRecord;
import com.digitalhumanbackend.repository.QaRecordRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class QaRecordService {

    private static final int MAX_PAGE_SIZE = 200;
    private static final int MAX_CHANGE_LIMIT = 500;
    private static final Map<String, String> SOURCE_CLIENT_IDS = Map.of(
            "beijing", "1952665052121272320",
            "tangshan", "2011260068498116608"
    );

    private final QaRecordRepository qaRecordRepository;

    @Transactional(readOnly = true)
    public QaRecordPageResponse search(
            String source,
            int page,
            int pageSize,
            String status,
            String keyword,
            String dateStart,
            String dateEnd
    ) {
        int normalizedPage = Math.max(page, 1);
        int normalizedPageSize = normalizePageSize(pageSize);
        var pageable = PageRequest.of(
                normalizedPage - 1,
                normalizedPageSize,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
        );
        var result = qaRecordRepository.findAll(
                buildSpec(source, status, keyword, parseStart(dateStart), parseEnd(dateEnd), false),
                pageable
        );

        return new QaRecordPageResponse(
                result.getContent().stream().map(this::toResponse).toList(),
                result.getTotalElements(),
                normalizedPage,
                normalizedPageSize,
                result.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public QaRecordStatsResponse stats(String source, String status, String keyword, String dateStart, String dateEnd) {
        List<QaRecord> records = qaRecordRepository.findAll(
                buildSpec(source, status, keyword, parseStart(dateStart), parseEnd(dateEnd), false)
        );

        long answered = 0;
        long unanswered = 0;
        long unclear = 0;
        long unknown = 0;
        long totalTokens = 0;
        long tokenSamples = 0;
        long retrievalHits = 0;
        long retrievalSamples = 0;
        List<Double> durations = new ArrayList<>();
        Map<String, MutableDailyStats> daily = new LinkedHashMap<>();

        for (QaRecord record : records) {
            String normalizedStatus = normalizeStatus(record);
            switch (normalizedStatus) {
                case "answered" -> answered++;
                case "unanswered" -> unanswered++;
                case "unclear" -> unclear++;
                default -> unknown++;
            }

            if (record.getAnswerDurationSeconds() != null && record.getAnswerDurationSeconds() >= 0) {
                durations.add(record.getAnswerDurationSeconds());
            }
            if (record.getTotalTokens() != null) {
                totalTokens += record.getTotalTokens();
                tokenSamples++;
            }
            if (record.getRetrievalHit() != null) {
                retrievalSamples++;
                if (record.getRetrievalHit()) {
                    retrievalHits++;
                }
            }
            if (record.getCreatedAt() != null) {
                String day = record.getCreatedAt().toLocalDate().toString();
                daily.computeIfAbsent(day, key -> new MutableDailyStats()).add(normalizedStatus);
            }
        }

        long total = records.size();
        Map<String, QaRecordStatsResponse.QaRecordDailyStats> dailyResponse = new LinkedHashMap<>();
        daily.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> dailyResponse.put(entry.getKey(), entry.getValue().toResponse()));

        return new QaRecordStatsResponse(
                total,
                answered,
                unanswered,
                unclear,
                unknown,
                percent(answered, total),
                percent(unanswered, total),
                average(durations),
                percentile(durations, 0.95),
                tokenSamples > 0 ? totalTokens : null,
                retrievalSamples > 0 ? percent(retrievalHits, retrievalSamples) : null,
                dailyResponse
        );
    }

    @Transactional(readOnly = true)
    public QaRecordChangesResponse changes(String source, String updatedAfter, Long cursorId, int limit) {
        LocalDateTime parsedUpdatedAfter = parseDateTime(updatedAfter).orElse(null);
        long parsedCursorId = cursorId == null ? 0 : cursorId;
        int normalizedLimit = Math.max(1, Math.min(limit, MAX_CHANGE_LIMIT));

        Specification<QaRecord> spec = buildSpec(source, null, null, null, null, true)
                .and((root, query, cb) -> {
                    if (parsedUpdatedAfter == null) {
                        return cb.conjunction();
                    }
                    return cb.or(
                            cb.greaterThan(root.get("updatedAt"), parsedUpdatedAfter),
                            cb.and(
                                    cb.equal(root.get("updatedAt"), parsedUpdatedAfter),
                                    cb.greaterThan(root.get("id"), parsedCursorId)
                            )
                    );
                });

        var pageable = PageRequest.of(
                0,
                normalizedLimit + 1,
                Sort.by(Sort.Order.asc("updatedAt"), Sort.Order.asc("id"))
        );
        List<QaRecord> fetched = qaRecordRepository.findAll(spec, pageable).getContent();
        boolean hasMore = fetched.size() > normalizedLimit;
        List<QaRecord> records = hasMore ? fetched.subList(0, normalizedLimit) : fetched;
        QaRecord last = records.isEmpty() ? null : records.get(records.size() - 1);

        return new QaRecordChangesResponse(
                records.stream().map(this::toResponse).toList(),
                last == null ? parsedUpdatedAfter : last.getUpdatedAt(),
                last == null ? parsedCursorId : last.getId(),
                hasMore
        );
    }

    private Specification<QaRecord> buildSpec(
            String source,
            String status,
            String keyword,
            LocalDateTime dateStart,
            LocalDateTime dateEnd,
            boolean includeDeleted
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (!includeDeleted) {
                predicates.add(cb.isNull(root.get("deletedAt")));
            }

            String normalizedSource = normalizeText(source);
            if (normalizedSource != null) {
                String clientId = SOURCE_CLIENT_IDS.get(normalizedSource);
                if (clientId != null) {
                    predicates.add(cb.or(
                            cb.equal(root.get("sourceKey"), normalizedSource),
                            cb.equal(root.get("clientId"), clientId)
                    ));
                } else {
                    predicates.add(cb.equal(root.get("sourceKey"), normalizedSource));
                }
            }

            String normalizedStatus = normalizeText(status);
            if (normalizedStatus != null) {
                if ("unknown".equals(normalizedStatus)) {
                    predicates.add(cb.or(
                            cb.isNull(root.get("answerStatus")),
                            cb.equal(root.get("answerStatus"), "")
                    ));
                } else {
                    predicates.add(cb.equal(root.get("answerStatus"), normalizedStatus));
                }
            }

            String normalizedKeyword = normalizeText(keyword);
            if (normalizedKeyword != null) {
                String like = "%" + normalizedKeyword.toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("question")), like),
                        cb.like(cb.lower(root.get("answer")), like),
                        cb.like(cb.lower(root.get("failReason")), like),
                        cb.like(cb.lower(root.get("requestId")), like)
                ));
            }

            if (dateStart != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), dateStart));
            }
            if (dateEnd != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), dateEnd));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private QaRecordResponse toResponse(QaRecord record) {
        return new QaRecordResponse(
                record.getId(),
                record.getSourceKey(),
                record.getRequestId(),
                record.getQuestion(),
                record.getAnswer(),
                record.getCreatedAt(),
                record.getUpdatedAt(),
                record.getDeletedAt(),
                record.getClientId(),
                normalizeStatus(record),
                record.getFailReason(),
                record.getAnswerDurationSeconds(),
                record.getTotalTokens(),
                record.getRetrievalHit(),
                record.getSourceSummary()
        );
    }

    private String normalizeStatus(QaRecord record) {
        String status = normalizeText(record.getAnswerStatus());
        if (status != null) {
            return status;
        }
        String failReason = normalizeText(record.getFailReason());
        if (failReason != null) {
            return "unanswered";
        }
        String answer = normalizeText(record.getAnswer());
        if (answer == null || answer.length() < 10) {
            return "unanswered";
        }
        if (answer.contains("提问不清晰") || answer.contains("问题表述不清晰") || answer.contains("提问不明确")) {
            return "unclear";
        }
        if (answer.contains("未查询到") || answer.contains("无法回答") || answer.contains("抱歉") || answer.contains("不知道")) {
            return "unanswered";
        }
        return "answered";
    }

    private int normalizePageSize(int pageSize) {
        return Math.max(1, Math.min(pageSize, MAX_PAGE_SIZE));
    }

    private String normalizeText(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private LocalDateTime parseStart(String value) {
        return parseDate(value, false);
    }

    private LocalDateTime parseEnd(String value) {
        return parseDate(value, true);
    }

    private LocalDateTime parseDate(String value, boolean endOfDay) {
        if (normalizeText(value) == null) {
            return null;
        }
        try {
            var date = java.time.LocalDate.parse(value.trim());
            return endOfDay ? date.atTime(23, 59, 59) : date.atStartOfDay();
        } catch (DateTimeParseException ex) {
            return parseDateTime(value).orElse(null);
        }
    }

    private Optional<LocalDateTime> parseDateTime(String value) {
        if (normalizeText(value) == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(LocalDateTime.parse(value.trim()));
        } catch (DateTimeParseException ignored) {
            try {
                return Optional.of(OffsetDateTime.parse(value.trim()).toLocalDateTime());
            } catch (DateTimeParseException ignoredAgain) {
                return Optional.empty();
            }
        }
    }

    private int percent(long numerator, long denominator) {
        if (denominator <= 0) {
            return 0;
        }
        return Math.round((float) numerator * 100 / denominator);
    }

    private Double average(List<Double> values) {
        return values.isEmpty()
                ? null
                : values.stream().filter(Objects::nonNull).mapToDouble(Double::doubleValue).average().orElse(0);
    }

    private Double percentile(List<Double> values, double ratio) {
        if (values.isEmpty()) {
            return null;
        }
        List<Double> sorted = values.stream().sorted(Comparator.naturalOrder()).toList();
        int index = (int) Math.ceil(sorted.size() * ratio) - 1;
        return sorted.get(Math.max(0, Math.min(index, sorted.size() - 1)));
    }

    private static class MutableDailyStats {
        private long total;
        private long answered;
        private long unanswered;
        private long unclear;
        private long unknown;

        private void add(String status) {
            total++;
            switch (status) {
                case "answered" -> answered++;
                case "unanswered" -> unanswered++;
                case "unclear" -> unclear++;
                default -> unknown++;
            }
        }

        private QaRecordStatsResponse.QaRecordDailyStats toResponse() {
            return new QaRecordStatsResponse.QaRecordDailyStats(total, answered, unanswered, unclear, unknown);
        }
    }
}
