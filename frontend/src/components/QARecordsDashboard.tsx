import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DEFAULT_QA_RECORD_SOURCE,
  QA_RECORD_PAGE_SIZE,
  QA_RECORD_SOURCES,
  type QARecordSource,
  type QARecordSourceKey
} from '../config/qaRecords';
import api from '../services/api';
import '../styles/QARecordsDashboard.css';

type QAStatus = 'answered' | 'unanswered' | 'unclear' | 'unknown';

type PromptMetric = {
  label?: string;
  value?: string | number;
};

type QARecord = {
  id?: string | number;
  question?: string;
  answer?: string;
  create_time?: string;
  answer_duration_seconds?: string | number;
  answer_status?: string;
  status?: string;
  qa_status?: string;
  fail_reason?: string;
  failure_reason?: string;
  client_id?: string;
  request_id?: string;
  total_tokens?: string | number;
  token_total?: string | number;
  tokens?: string | number;
  retrieval_hit?: boolean;
  source_documents?: unknown[] | string;
  sources?: unknown[] | string;
  reference?: string;
  references?: unknown[] | string;
  knowledge_name?: string;
  dataset_name?: string;
  ragflow_prompt_metrics?: {
    time_elapsed?: PromptMetric[];
    token_usage?: PromptMetric[];
  };
  [key: string]: unknown;
};

type CachedSnapshot = {
  version: number;
  sourceKey: QARecordSourceKey;
  savedAt: string;
  updatedAfter?: string;
  cursorId?: string | number;
  records: QARecord[];
};

type SearchResponse = {
  items: QARecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

type ChangesResponse = {
  items: QARecord[];
  next_updated_after?: string;
  next_cursor_id?: string | number;
  has_more?: boolean;
};

type StatsDaily = Record<QAStatus, number> & { total: number };

type StatsResponse = {
  total: number;
  answered: number;
  unanswered: number;
  unclear: number;
  unknown: number;
  answer_rate: number;
  unanswered_rate: number;
  avg_duration: number | null;
  p95_duration: number | null;
  total_tokens: number | null;
  retrieval_hit_rate: number | null;
  daily: Record<string, StatsDaily>;
};

type Filters = {
  status: QAStatus | '';
  dateStart: string;
  dateEnd: string;
  keyword: string;
};

type Analysis = {
  total: number;
  answered: number;
  unanswered: number;
  unclear: number;
  unknown: number;
  answerRate: number;
  unansweredRate: number;
  avgDuration: number | null;
  p95Duration: number | null;
  totalTokens: number | null;
  retrievalHitRate: number | null;
  daily: Record<string, StatsDaily>;
};

const statusLabels: Record<QAStatus, string> = {
  answered: '已回答',
  unanswered: '未回答',
  unclear: '提问不清晰',
  unknown: '待确认'
};

const statusOrder: QAStatus[] = ['answered', 'unanswered', 'unclear', 'unknown'];
const CACHE_VERSION = 1;
const CACHE_DB_NAME = 'digital-human-qa-cache';
const CACHE_STORE_NAME = 'recordSnapshots';
const CACHE_RECORD_LIMIT = 500;

function isSourceKey(value: string | null): value is QARecordSourceKey {
  return Boolean(value && value in QA_RECORD_SOURCES);
}

function getInitialSource(searchParams: URLSearchParams): QARecordSourceKey {
  const source = searchParams.get('source') || searchParams.get('campus');
  return isSourceKey(source) ? source : DEFAULT_QA_RECORD_SOURCE;
}

function normalizeNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatDate(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTime(value: unknown): string {
  if (!value) return '--';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatDuration(value: unknown): string {
  const num = normalizeNumber(value);
  if (num == null || num < 0) return '--';
  if (num < 1) return `${Math.round(num * 1000)}ms`;
  return `${num.toFixed(num >= 10 ? 1 : 2)}s`;
}

function normalizeStatus(record: QARecord): QAStatus {
  const explicit = String(record.answer_status || record.status || record.qa_status || '').toLowerCase();
  if (['answered', 'success', 'resolved', 'hit'].includes(explicit)) return 'answered';
  if (['unanswered', 'failed', 'no_answer', 'miss', 'not_found'].includes(explicit)) {
    return 'unanswered';
  }
  if (['unclear', 'unclearquestion', 'ambiguous'].includes(explicit)) return 'unclear';

  const failReason = String(record.fail_reason || record.failure_reason || '').trim();
  if (failReason) return 'unanswered';

  const answer = String(record.answer || '').trim();
  const unclearWords = [
    '您的问题表述不太清晰',
    '您的问题表述不清晰',
    '您的问题不清晰',
    '您的提问不明确',
    '没有明确的提问或需求',
    '过于简略',
    '提问不清晰'
  ];
  if (unclearWords.some((word) => answer.includes(word))) return 'unclear';

  const unansweredWords = [
    '超出知识库覆盖范围',
    '超出《财务知识库》覆盖范围',
    '未查询到',
    '无法回答',
    '抱歉',
    '对不起',
    '不知道'
  ];
  if (!answer || answer.length < 10 || unansweredWords.some((word) => answer.includes(word))) {
    return 'unanswered';
  }

  return 'answered';
}

function getTokenCount(record: QARecord): number | null {
  const direct = normalizeNumber(record.total_tokens ?? record.token_total ?? record.tokens);
  if (direct != null) return direct;

  const usage = record.ragflow_prompt_metrics?.token_usage;
  if (!Array.isArray(usage)) return null;

  const total = usage.reduce((sum, item) => {
    const value = normalizeNumber(item.value);
    return value == null ? sum : sum + value;
  }, 0);

  return total || null;
}

function hasRetrievalHit(record: QARecord): boolean | null {
  if (typeof record.retrieval_hit === 'boolean') return record.retrieval_hit;
  if (Array.isArray(record.source_documents)) return record.source_documents.length > 0;
  if (Array.isArray(record.sources)) return record.sources.length > 0;
  return null;
}

function getSourceSummary(record: QARecord): string {
  const candidates = [
    record.source_documents,
    record.sources,
    record.reference,
    record.references,
    record.knowledge_name,
    record.dataset_name
  ];

  const value = candidates.find((candidate) => {
    if (Array.isArray(candidate)) return candidate.length > 0;
    return candidate != null && String(candidate).trim();
  });

  if (Array.isArray(value)) return `${value.length} 个来源`;
  return value ? String(value) : '--';
}

function getRecordKey(record: QARecord): string {
  if (record.id != null && String(record.id).trim()) return `id:${record.id}`;
  if (record.request_id != null && String(record.request_id).trim()) return `request:${record.request_id}`;
  return `fallback:${record.create_time || ''}:${record.question || ''}`;
}

function sortRecords(records: QARecord[]): QARecord[] {
  return [...records].sort((a, b) => {
    const timeA = new Date(String(a.create_time || '')).getTime();
    const timeB = new Date(String(b.create_time || '')).getTime();
    const normalizedA = Number.isFinite(timeA) ? timeA : 0;
    const normalizedB = Number.isFinite(timeB) ? timeB : 0;
    return normalizedB - normalizedA;
  });
}

function mergeRecords(cachedRecords: QARecord[], fetchedRecords: QARecord[]): QARecord[] {
  const byKey = new Map<string, QARecord>();
  cachedRecords.forEach((record) => byKey.set(getRecordKey(record), record));
  fetchedRecords.forEach((record) => byKey.set(getRecordKey(record), record));
  return sortRecords(Array.from(byKey.values()));
}

function openCacheDb(): Promise<IDBDatabase | null> {
  if (!('indexedDB' in window)) return Promise.resolve(null);

  return new Promise((resolve) => {
    const request = window.indexedDB.open(CACHE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'sourceKey' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function loadCachedSnapshot(sourceKey: QARecordSourceKey): Promise<CachedSnapshot | null> {
  const db = await openCacheDb();
  if (!db) return null;

  return new Promise((resolve) => {
    const transaction = db.transaction(CACHE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(CACHE_STORE_NAME);
    const request = store.get(sourceKey);
    request.onsuccess = () => {
      const snapshot = request.result as CachedSnapshot | undefined;
      if (
        !snapshot ||
        snapshot.version !== CACHE_VERSION ||
        snapshot.sourceKey !== sourceKey ||
        !Array.isArray(snapshot.records)
      ) {
        resolve(null);
        return;
      }
      resolve({ ...snapshot, records: sortRecords(snapshot.records).slice(0, CACHE_RECORD_LIMIT) });
    };
    request.onerror = () => resolve(null);
    transaction.oncomplete = () => db.close();
  });
}

async function saveCachedSnapshot(
  sourceKey: QARecordSourceKey,
  records: QARecord[],
  previous?: CachedSnapshot | null,
  changes?: ChangesResponse
) {
  const db = await openCacheDb();
  if (!db) return;

  const sortedRecords = sortRecords(records).slice(0, CACHE_RECORD_LIMIT);
  const newest = sortedRecords.find((record) => record.updated_at || record.create_time);
  const snapshot: CachedSnapshot = {
    version: CACHE_VERSION,
    sourceKey,
    savedAt: new Date().toISOString(),
    updatedAfter:
      changes?.next_updated_after ||
      previous?.updatedAfter ||
      (newest?.updated_at ? String(newest.updated_at) : newest?.create_time ? String(newest.create_time) : undefined),
    cursorId: changes?.next_cursor_id || previous?.cursorId || newest?.id,
    records: sortedRecords
  };

  return new Promise<void>((resolve) => {
    const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
    transaction.objectStore(CACHE_STORE_NAME).put(snapshot);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      resolve();
    };
  });
}

function buildQueryParams(
  sourceKey: QARecordSourceKey,
  filters: Filters,
  page?: number,
  pageSize?: number
) {
  const params: Record<string, string | number> = {
    source: sourceKey
  };
  if (page != null) params.page = page;
  if (pageSize != null) params.page_size = pageSize;
  if (filters.status) params.status = filters.status;
  if (filters.keyword.trim()) params.keyword = filters.keyword.trim();
  if (filters.dateStart) params.date_start = filters.dateStart;
  if (filters.dateEnd) params.date_end = filters.dateEnd;
  return params;
}

async function fetchRecordPage(
  sourceKey: QARecordSourceKey,
  filters: Filters,
  page: number
): Promise<SearchResponse> {
  const response = await api.get<SearchResponse>('/api/qa-records/search', {
    params: buildQueryParams(sourceKey, filters, page, QA_RECORD_PAGE_SIZE)
  });
  return response.data;
}

async function fetchRecordStats(
  sourceKey: QARecordSourceKey,
  filters: Filters
): Promise<StatsResponse> {
  const response = await api.get<StatsResponse>('/api/qa-records/stats', {
    params: buildQueryParams(sourceKey, filters)
  });
  return response.data;
}

async function fetchRecordChanges(
  sourceKey: QARecordSourceKey,
  snapshot: CachedSnapshot | null
): Promise<ChangesResponse> {
  const response = await api.get<ChangesResponse>('/api/qa-records/changes', {
    params: {
      source: sourceKey,
      updated_after: snapshot?.updatedAfter,
      cursor_id: snapshot?.cursorId,
      limit: 200
    }
  });
  return response.data;
}

function toAnalysis(stats: StatsResponse): Analysis {
  return {
    total: stats.total,
    answered: stats.answered,
    unanswered: stats.unanswered,
    unclear: stats.unclear,
    unknown: stats.unknown,
    answerRate: stats.answer_rate,
    unansweredRate: stats.unanswered_rate,
    avgDuration: stats.avg_duration,
    p95Duration: stats.p95_duration,
    totalTokens: stats.total_tokens,
    retrievalHitRate: stats.retrieval_hit_rate,
    daily: stats.daily || {}
  };
}

function percentile(values: number[], ratio: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * ratio) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function analyzeRecords(records: QARecord[]): Analysis {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  const analysis: Analysis = {
    total: records.length,
    answered: 0,
    unanswered: 0,
    unclear: 0,
    unknown: 0,
    answerRate: 0,
    unansweredRate: 0,
    avgDuration: null,
    p95Duration: null,
    totalTokens: null,
    retrievalHitRate: null,
    daily: {}
  };

  const durations: number[] = [];
  let totalTokens = 0;
  let tokenSamples = 0;
  let retrievalHits = 0;
  let retrievalSamples = 0;

  records.forEach((record) => {
    const status = normalizeStatus(record);
    analysis[status] += 1;

    const duration = normalizeNumber(record.answer_duration_seconds);
    if (duration != null && duration >= 0) durations.push(duration);

    const tokens = getTokenCount(record);
    if (tokens != null) {
      totalTokens += tokens;
      tokenSamples += 1;
    }

    const hit = hasRetrievalHit(record);
    if (hit !== null) {
      retrievalSamples += 1;
      if (hit) retrievalHits += 1;
    }

    const dateKey = formatDate(record.create_time);
    if (dateKey) {
      const date = new Date(`${dateKey}T00:00:00`);
      if (date >= start) {
        if (!analysis.daily[dateKey]) {
          analysis.daily[dateKey] = { answered: 0, unanswered: 0, unclear: 0, unknown: 0, total: 0 };
        }
        analysis.daily[dateKey][status] += 1;
        analysis.daily[dateKey].total += 1;
      }
    }
  });

  analysis.avgDuration = durations.length
    ? durations.reduce((sum, value) => sum + value, 0) / durations.length
    : null;
  analysis.p95Duration = percentile(durations, 0.95);
  analysis.answerRate = analysis.total ? Math.round((analysis.answered / analysis.total) * 100) : 0;
  analysis.unansweredRate = analysis.total
    ? Math.round((analysis.unanswered / analysis.total) * 100)
    : 0;
  analysis.totalTokens = tokenSamples ? totalTokens : null;
  analysis.retrievalHitRate = retrievalSamples
    ? Math.round((retrievalHits / retrievalSamples) * 100)
    : null;

  return analysis;
}

function csvValue(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(records: QARecord[], source: QARecordSource, suffix: string) {
  const rows = [
    ['ID', '记录类型', '状态', '时间', '耗时', 'Token', '问题', '答案', '失败原因', '来源']
      .map(csvValue)
      .join(',')
  ];

  records.forEach((record) => {
    rows.push(
      [
        record.id,
        source.label,
        statusLabels[normalizeStatus(record)],
        formatDateTime(record.create_time),
        formatDuration(record.answer_duration_seconds),
        getTokenCount(record) ?? '',
        record.question || '',
        record.answer || '',
        record.fail_reason || record.failure_reason || '',
        getSourceSummary(record)
      ]
        .map(csvValue)
        .join(',')
    );
  });

  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `qa_records_${source.key}_${suffix}_${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function StatusDistribution({
  analysis,
  onStatusClick
}: {
  analysis: Analysis;
  onStatusClick: (status: QAStatus) => void;
}) {
  return (
    <div className="qa-status-bars">
      {statusOrder.map((status) => {
        const count = analysis[status];
        const percent = analysis.total ? Math.round((count / analysis.total) * 100) : 0;
        return (
          <button
            className={`qa-status-bar qa-status-bar--${status}`}
            key={status}
            type="button"
            onClick={() => onStatusClick(status)}
          >
            <span className="qa-status-bar__head">
              <span>{statusLabels[status]}</span>
              <strong>
                {count} 条 · {percent}%
              </strong>
            </span>
            <span className="qa-status-bar__track">
              <span style={{ width: `${percent}%` }} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TrendChart({ analysis }: { analysis: Analysis }) {
  const dates = Object.keys(analysis.daily).sort();
  const width = 680;
  const height = 230;
  const padX = 28;
  const padY = 24;
  const max = Math.max(1, ...dates.map((date) => analysis.daily[date].total));

  const points = dates
    .map((date, index) => {
      const x = dates.length <= 1 ? width / 2 : padX + (index * (width - padX * 2)) / (dates.length - 1);
      const y = height - padY - (analysis.daily[date].total / max) * (height - padY * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="qa-trend-chart">
      {dates.length === 0 ? (
        <div className="qa-chart-empty">暂无近 30 天趋势数据</div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="近 30 天趋势">
          <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} />
          <line x1={padX} y1={padY} x2={padX} y2={height - padY} />
          <polyline points={points} />
          {dates.map((date, index) => {
            const x =
              dates.length <= 1 ? width / 2 : padX + (index * (width - padX * 2)) / (dates.length - 1);
            const total = analysis.daily[date].total;
            const y = height - padY - (total / max) * (height - padY * 2);
            return (
              <g key={date}>
                <circle cx={x} cy={y} r="4" />
                {(index === 0 || index === dates.length - 1 || index % 5 === 0) && (
                  <text x={x} y={height - 6} textAnchor="middle">
                    {date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function DetailDrawer({
  record,
  onClose
}: {
  record: QARecord | null;
  onClose: () => void;
}) {
  if (!record) return null;

  const metrics = record.ragflow_prompt_metrics || {};
  const metricGroups = [
    { title: '耗时明细', items: metrics.time_elapsed || [] },
    { title: 'Token 明细', items: metrics.token_usage || [] }
  ].filter((group) => group.items.length > 0);

  return (
    <div className="qa-drawer-mask" onClick={onClose}>
      <aside className="qa-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="qa-drawer__head">
          <h2>记录详情</h2>
          <button type="button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="qa-detail-section">
          <div className="qa-meta-grid">
            <div><span>ID</span><strong>{record.id || '--'}</strong></div>
            <div><span>状态</span><strong>{statusLabels[normalizeStatus(record)]}</strong></div>
            <div><span>时间</span><strong>{formatDateTime(record.create_time)}</strong></div>
            <div><span>耗时</span><strong>{formatDuration(record.answer_duration_seconds)}</strong></div>
            <div><span>Token</span><strong>{getTokenCount(record) ?? '--'}</strong></div>
            <div><span>来源</span><strong>{getSourceSummary(record)}</strong></div>
          </div>
        </div>

        <div className="qa-detail-section">
          <h3>问题</h3>
          <p>{record.question || '--'}</p>
        </div>
        <div className="qa-detail-section">
          <h3>回答</h3>
          <p>{record.answer || '--'}</p>
        </div>

        {(record.fail_reason || record.failure_reason) && (
          <div className="qa-detail-section">
            <h3>失败原因</h3>
            <p>{record.fail_reason || record.failure_reason}</p>
          </div>
        )}

        {metricGroups.map((group) => (
          <div className="qa-detail-section" key={group.title}>
            <h3>{group.title}</h3>
            <div className="qa-meta-grid">
              {group.items.map((item, index) => (
                <div key={`${group.title}-${index}`}>
                  <span>{item.label || '--'}</span>
                  <strong>{item.value || '--'}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

function QARecordsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sourceKey, setSourceKey] = useState<QARecordSourceKey>(() => getInitialSource(searchParams));
  const [records, setRecords] = useState<QARecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPageCount, setTotalPageCount] = useState(1);
  const [serverAnalysis, setServerAnalysis] = useState<Analysis | null>(null);
  const [filters, setFilters] = useState<Filters>({
    status: '',
    dateStart: '',
    dateEnd: '',
    keyword: ''
  });
  const [draftFilters, setDraftFilters] = useState<Filters>(filters);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [syncVersion, setSyncVersion] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<QARecord | null>(null);

  const source = QA_RECORD_SOURCES[sourceKey];

  useEffect(() => {
    setSearchParams({ source: sourceKey }, { replace: true });
  }, [setSearchParams, sourceKey]);

  useEffect(() => {
    let cancelled = false;
    const canShowCachedSnapshot =
      currentPage === 1 &&
      !filters.status &&
      !filters.dateStart &&
      !filters.dateEnd &&
      !filters.keyword.trim();

    setLoading(true);
    setError('');
    setSyncMessage('正在从后端查询 MySQL 数据...');

    async function loadData() {
      const cachedSnapshot = await loadCachedSnapshot(sourceKey);
      if (cancelled) return;

      if (canShowCachedSnapshot && cachedSnapshot?.records.length) {
        setRecords(cachedSnapshot.records.slice(0, QA_RECORD_PAGE_SIZE));
        setTotalRecords(cachedSnapshot.records.length);
        setTotalPageCount(Math.max(1, Math.ceil(cachedSnapshot.records.length / QA_RECORD_PAGE_SIZE)));
        setServerAnalysis(analyzeRecords(cachedSnapshot.records));
        setSyncMessage(`已显示 IndexedDB 缓存 ${cachedSnapshot.records.length} 条，正在刷新后端数据...`);
      }

      try {
        const [pageResult, statsResult, changesResult] = await Promise.all([
          fetchRecordPage(sourceKey, filters, currentPage),
          fetchRecordStats(sourceKey, filters),
          canShowCachedSnapshot ? fetchRecordChanges(sourceKey, cachedSnapshot) : Promise.resolve(null)
        ]);
        if (cancelled) return;

        const pageRecords = sortRecords(pageResult.items || []);
        setRecords(pageRecords);
        setTotalRecords(pageResult.total || 0);
        setTotalPageCount(Math.max(1, pageResult.total_pages || 1));
        setServerAnalysis(toAnalysis(statsResult));

        if (canShowCachedSnapshot) {
          const mergedRecords = changesResult
            ? mergeRecords(cachedSnapshot?.records || [], changesResult.items || [])
            : pageRecords;
          const cacheRecords = mergeRecords(mergedRecords, pageRecords);
          await saveCachedSnapshot(sourceKey, cacheRecords, cachedSnapshot, changesResult || undefined);
          const changedCount = changesResult?.items?.length || 0;
          setSyncMessage(
            changedCount > 0
              ? `已更新后端数据，并同步 IndexedDB 变更 ${changedCount} 条`
              : '已更新后端数据，IndexedDB 缓存无新增变更'
          );
        } else {
          setSyncMessage('已按筛选条件从后端加载当前页和统计数据');
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setError(`加载失败：${message}`);
          setSyncMessage(canShowCachedSnapshot && cachedSnapshot?.records.length ? '后端暂不可用，已保留缓存快照' : '');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [sourceKey, filters, currentPage, syncVersion]);

  const analysis = useMemo(() => serverAnalysis || analyzeRecords(records), [records, serverAnalysis]);
  const totalPages = Math.max(1, totalPageCount);
  const pageItems = records;

  const applyFilters = () => {
    setFilters(draftFilters);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    const nextFilters: Filters = { status: '', dateStart: '', dateEnd: '', keyword: '' };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setCurrentPage(1);
  };

  return (
    <main className="qa-dashboard">
      <section className="qa-dashboard__topbar">
        <div>
          <h1>{source.title}</h1>
          <p>{source.description}</p>
        </div>
        <div className="qa-dashboard__actions">
          <button
            type="button"
            onClick={() => {
              setSyncVersion((current) => current + 1);
            }}
          >
            增量同步
          </button>
          <button
            type="button"
            className="primary"
            disabled={pageItems.length === 0}
            onClick={() => downloadCsv(pageItems, source, 'current_page')}
          >
            导出当前查询页
          </button>
        </div>
      </section>

      <section className="qa-filter-bar">
        <label>
          <span>记录类型</span>
          <select
            value={sourceKey}
            onChange={(event) => {
              setSourceKey(event.target.value as QARecordSourceKey);
              setCurrentPage(1);
            }}
          >
            {Object.values(QA_RECORD_SOURCES).map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>回答状态</span>
          <select
            value={draftFilters.status}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, status: event.target.value as Filters['status'] }))
            }
          >
            <option value="">全部</option>
            {statusOrder.map((status) => (
              <option value={status} key={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>开始日期</span>
          <input
            type="date"
            value={draftFilters.dateStart}
            onChange={(event) => setDraftFilters((current) => ({ ...current, dateStart: event.target.value }))}
          />
        </label>
        <label>
          <span>结束日期</span>
          <input
            type="date"
            value={draftFilters.dateEnd}
            onChange={(event) => setDraftFilters((current) => ({ ...current, dateEnd: event.target.value }))}
          />
        </label>
        <label>
          <span>关键词</span>
          <input
            type="search"
            placeholder="搜索问题、答案、ID"
            value={draftFilters.keyword}
            onChange={(event) => setDraftFilters((current) => ({ ...current, keyword: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyFilters();
            }}
          />
        </label>
        <div className="qa-filter-bar__actions">
          <button type="button" className="primary" onClick={applyFilters}>
            查询
          </button>
          <button type="button" onClick={resetFilters}>
            重置
          </button>
        </div>
      </section>

      <section className="qa-kpi-grid">
        <div><span>总记录数</span><strong>{analysis.total || '--'}</strong><small>当前筛选</small></div>
        <div><span>回答率</span><strong>{analysis.total ? `${analysis.answerRate}%` : '--'}</strong><small>{analysis.answered} 条已回答</small></div>
        <div><span>未回答率</span><strong>{analysis.total ? `${analysis.unansweredRate}%` : '--'}</strong><small>知识库缺口线索</small></div>
        <div><span>平均耗时</span><strong>{formatDuration(analysis.avgDuration)}</strong><small>有耗时字段时统计</small></div>
        <div><span>P95 耗时</span><strong>{formatDuration(analysis.p95Duration)}</strong><small>慢请求排查</small></div>
        <div><span>Token 总量</span><strong>{analysis.totalTokens ?? '--'}</strong><small>{source.supportsRagflowMetrics ? 'RagFlow 明细统计' : '字段存在时统计'}</small></div>
      </section>

      <section className="qa-analysis-grid">
        <div className="qa-panel">
          <div className="qa-panel__head">
            <h2>回答状态分布</h2>
          </div>
          <StatusDistribution
            analysis={analysis}
            onStatusClick={(status) => {
              const nextFilters = { ...draftFilters, status };
              setDraftFilters(nextFilters);
              setFilters(nextFilters);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="qa-panel">
          <div className="qa-panel__head">
            <h2>近 30 天趋势</h2>
          </div>
          <TrendChart analysis={analysis} />
        </div>
      </section>

      <section className="qa-table-panel">
        <div className="qa-table-panel__head">
          <div>
            <strong>问答记录</strong>
            <span>共 {totalRecords} 条</span>
          </div>
          <div className="qa-table-panel__status">
            <span>{syncMessage}</span>
            <span>接口：{source.apiBaseUrl}</span>
          </div>
        </div>

        {loading && <div className="qa-table-state">正在加载...</div>}
        {!loading && error && <div className="qa-table-state error">{error}</div>}
        {!loading && !error && pageItems.length === 0 && (
          <div className="qa-table-state">暂无符合条件的记录</div>
        )}
        {!loading && !error && pageItems.length > 0 && (
          <>
            <div className="qa-table-wrap">
              <table className="qa-record-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>状态</th>
                    <th>问题</th>
                    <th>回答摘要</th>
                    <th>耗时</th>
                    <th>Token</th>
                    <th>来源</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((record, index) => {
                    const status = normalizeStatus(record);
                    return (
                      <tr key={`${record.id || 'record'}-${index}`}>
                        <td>{formatDateTime(record.create_time)}</td>
                        <td>
                          <span className={`qa-badge qa-badge--${status}`}>{statusLabels[status]}</span>
                        </td>
                        <td className="qa-question-cell"><div>{record.question || '--'}</div></td>
                        <td className="qa-answer-cell"><div>{record.answer || '--'}</div></td>
                        <td>{formatDuration(record.answer_duration_seconds)}</td>
                        <td>{getTokenCount(record) ?? '--'}</td>
                        <td>{getSourceSummary(record)}</td>
                        <td>
                          <button type="button" className="qa-row-action" onClick={() => setSelectedRecord(record)}>
                            详情
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="qa-pagination">
              <span>第 {currentPage} / {totalPages} 页</span>
              <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => page - 1)}>
                上一页
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                下一页
              </button>
            </div>
          </>
        )}
      </section>

      <DetailDrawer record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </main>
  );
}

export default QARecordsDashboard;
