package com.digitalhumanbackend.service;

import com.digitalhumanbackend.dto.QaRecordChangesResponse;
import com.digitalhumanbackend.dto.QaRecordPageResponse;
import com.digitalhumanbackend.dto.QaRecordResponse;
import com.digitalhumanbackend.dto.QaRecordStatsResponse;
import com.digitalhumanbackend.model.QaRecord;
import com.digitalhumanbackend.repository.QaRecordRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
    private final EntityManager entityManager;

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
        Specification<QaRecord> spec = buildSpec(source, status, keyword, parseStart(dateStart), parseEnd(dateEnd), false);
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<QaRecord> root = query.from(QaRecord.class);
        Expression<Integer> year = cb.function("year", Integer.class, root.get("createdAt"));
        Expression<Integer> month = cb.function("month", Integer.class, root.get("createdAt"));
        Expression<Integer> day = cb.function("day", Integer.class, root.get("createdAt"));
        Expression<String> normalizedStatus = statusExpression(cb, root);
        Expression<Double> duration = root.get("answerDurationSeconds");
        Expression<Double> validDuration = cb.<Double>selectCase()
                .when(cb.greaterThanOrEqualTo(duration, 0d), duration)
                .otherwise(cb.nullLiteral(Double.class));
        Expression<Long> retrievalHit = cb.<Long>selectCase()
                .when(cb.isTrue(root.get("retrievalHit")), 1L)
                .otherwise(0L);

        query.multiselect(
                year, month, day, normalizedStatus,
                cb.count(root), cb.sum(validDuration), cb.count(validDuration),
                cb.sum(root.<Long>get("totalTokens")), cb.count(root.get("totalTokens")),
                cb.sum(retrievalHit), cb.count(root.get("retrievalHit"))
        );
        query.where(spec.toPredicate(root, query, cb));
        query.groupBy(year, month, day, normalizedStatus);

        StatsTotals totals = new StatsTotals();
        Map<String, StatsTotals> daily = new LinkedHashMap<>();
        for (Tuple row : entityManager.createQuery(query).getResultList()) {
            String date = LocalDate.of(row.get(0, Number.class).intValue(),
                    row.get(1, Number.class).intValue(), row.get(2, Number.class).intValue()).toString();
            String rowStatus = row.get(3, String.class);
            totals.add(rowStatus, row);
            daily.computeIfAbsent(date, ignored -> new StatsTotals()).add(rowStatus, row);
        }

        Map<String, QaRecordStatsResponse.QaRecordDailyStats> dailyResponse = new LinkedHashMap<>();
        daily.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> dailyResponse.put(entry.getKey(), entry.getValue().toDailyResponse()));

        return new QaRecordStatsResponse(
                totals.total,
                totals.answered,
                totals.unanswered,
                totals.unclear,
                totals.unknown,
                percent(totals.answered, totals.total),
                percent(totals.unanswered, totals.total),
                totals.durationCount > 0 ? totals.durationSum / totals.durationCount : null,
                percentileDuration(spec, totals.durationCount),
                totals.tokenCount > 0 ? totals.tokenSum : null,
                totals.retrievalCount > 0 ? percent(totals.retrievalHits, totals.retrievalCount) : null,
                dailyResponse
        );
    }

    private Expression<String> statusExpression(CriteriaBuilder cb, Root<QaRecord> root) {
        Expression<String> explicit = cb.trim(root.get("answerStatus"));
        Expression<String> failReason = cb.trim(root.get("failReason"));
        Expression<String> answer = cb.trim(root.get("answer"));
        return cb.<String>selectCase()
                .when(cb.greaterThan(cb.length(explicit), 0), explicit)
                .when(cb.greaterThan(cb.length(failReason), 0), "unanswered")
                .when(cb.or(cb.isNull(answer), cb.lessThan(cb.length(answer), 10)), "unanswered")
                .when(cb.or(
                        cb.like(answer, "%提问不清晰%"),
                        cb.like(answer, "%问题表述不清晰%"),
                        cb.like(answer, "%提问不明确%")
                ), "unclear")
                .when(cb.or(
                        cb.like(answer, "%未查询到%"),
                        cb.like(answer, "%无法回答%"),
                        cb.like(answer, "%抱歉%"),
                        cb.like(answer, "%不知道%")
                ), "unanswered")
                .otherwise("answered");
    }

    private Double percentileDuration(Specification<QaRecord> spec, long count) {
        if (count == 0) {
            return null;
        }
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Double> query = cb.createQuery(Double.class);
        Root<QaRecord> root = query.from(QaRecord.class);
        Expression<Double> duration = root.get("answerDurationSeconds");
        query.select(duration);
        query.where(cb.and(spec.toPredicate(root, query, cb), cb.greaterThanOrEqualTo(duration, 0d)));
        query.orderBy(cb.asc(duration));
        return entityManager.createQuery(query)
                .setFirstResult((int) Math.ceil(count * 0.95) - 1)
                .setMaxResults(1)
                .getSingleResult();
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

    private static class StatsTotals {
        private long total;
        private long answered;
        private long unanswered;
        private long unclear;
        private long unknown;
        private double durationSum;
        private long durationCount;
        private long tokenSum;
        private long tokenCount;
        private long retrievalHits;
        private long retrievalCount;

        private void add(String status, Tuple row) {
            long count = row.get(4, Number.class).longValue();
            total += count;
            switch (status) {
                case "answered" -> answered += count;
                case "unanswered" -> unanswered += count;
                case "unclear" -> unclear += count;
                default -> unknown += count;
            }
            Number duration = row.get(5, Number.class);
            durationSum += duration == null ? 0 : duration.doubleValue();
            durationCount += row.get(6, Number.class).longValue();
            Number tokens = row.get(7, Number.class);
            tokenSum += tokens == null ? 0 : tokens.longValue();
            tokenCount += row.get(8, Number.class).longValue();
            Number hits = row.get(9, Number.class);
            retrievalHits += hits == null ? 0 : hits.longValue();
            retrievalCount += row.get(10, Number.class).longValue();
        }

        private QaRecordStatsResponse.QaRecordDailyStats toDailyResponse() {
            return new QaRecordStatsResponse.QaRecordDailyStats(total, answered, unanswered, unclear, unknown);
        }
    }
}
