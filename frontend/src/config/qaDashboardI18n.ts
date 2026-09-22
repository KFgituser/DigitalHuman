import type { Language } from '../i18n';
import type { QARecordSourceKey } from './qaRecords';

export type QAStatus = 'answered' | 'unanswered' | 'unclear' | 'unknown';

export type DashboardText = Record<string, string>;

export const qaStatusLabels: Record<Language, Record<QAStatus, string>> = {
  'zh-CN': {
    answered: '已回答',
    unanswered: '未回答',
    unclear: '提问不清晰',
    unknown: '待确认'
  },
  'en-US': {
    answered: 'Answered',
    unanswered: 'Unanswered',
    unclear: 'Unclear question',
    unknown: 'Pending review'
  }
};

export const qaSourceText: Record<Language, Record<QARecordSourceKey, { label: string; title: string; description: string }>> = {
  'zh-CN': {
    beijing: {
      label: '北京校区 QA',
      title: '北京校区 QA 问答记录查询与分析',
      description: '查看北京校区普通 QA 问答记录、回答质量与知识库缺口。'
    },
    tangshan: {
      label: '唐山校区 QA',
      title: '唐山校区 QA 问答记录查询与分析',
      description: '查看唐山校区普通 QA 问答记录、回答质量与知识库缺口。'
    },
    ragflowTangshan: {
      label: '唐山 QA 记录',
      title: '唐山数字人 聊天文档记录查询与分析',
      description: '专门查看唐山数字人聊天文档记录、回答耗时、Token 明细与链路质量等'
    }
  },
  'en-US': {
    beijing: {
      label: 'Beijing QA',
      title: 'Beijing Campus Q&A Records Analysis',
      description: 'Review standard Beijing campus Q&A records, answer quality, and knowledge-base gaps.'
    },
    tangshan: {
      label: 'Tangshan QA',
      title: 'Tangshan Campus Q&A Records Analysis',
      description: 'Review standard Tangshan campus Q&A records, answer quality, and knowledge-base gaps.'
    },
    ragflowTangshan: {
      label: 'Tangshan QA Records',
      title: 'Tangshan Digital Human Chat Document Records Analysis',
      description: 'Review Tangshan Digital Human chat document records, response duration, token details, and pipeline quality.'
    }
  }
};

export const qaDashboardText: Record<Language, DashboardText> = {
  'zh-CN': {
    sync: '增量同步',
    exportCurrent: '导出当前查询页',
    recordType: '记录类型',
    answerStatus: '回答状态',
    all: '全部',
    startDate: '开始日期',
    endDate: '结束日期',
    keyword: '关键词',
    keywordPlaceholder: '搜索问题、答案、ID',
    search: '查询',
    reset: '重置',
    totalRecords: '总记录数',
    currentFilter: '当前筛选',
    answerRate: '回答率',
    answeredRecords: '{count} 条已回答',
    unansweredRate: '未回答率',
    knowledgeGap: '知识库缺口线索',
    averageDuration: '平均耗时',
    durationAvailable: '有耗时字段时统计',
    p95Duration: 'P95 耗时',
    slowRequests: '慢请求排查',
    totalTokens: 'Token 总量',
    ragflowMetrics: 'RagFlow 明细统计',
    fieldMetrics: '字段存在时统计',
    statusDistribution: '回答状态分布',
    trend30Days: '近 30 天趋势',
    noTrendData: '暂无近 30 天趋势数据',
    qaRecords: '问答记录',
    totalWithCount: '共 {count} 条',
    api: '接口：',
    loading: '正在加载...',
    noRecords: '暂无符合条件的记录',
    time: '时间',
    status: '状态',
    question: '问题',
    answerSummary: '回答摘要',
    duration: '耗时',
    token: 'Token',
    source: '来源',
    actions: '操作',
    details: '详情',
    pageOf: '第 {page} / {total} 页',
    previous: '上一页',
    next: '下一页',
    recordDetails: '记录详情',
    close: '关闭',
    answer: '回答',
    failureReason: '失败原因',
    timingDetails: '耗时明细',
    tokenDetails: 'Token 明细',
    recordUnit: '条',
    queryingMysql: '正在从后端查询 MySQL 数据...',
    cachedRefreshing: '已显示 IndexedDB 缓存 {count} 条，正在刷新后端数据...',
    syncedChanges: '已更新后端数据，并同步 IndexedDB 变更 {count} 条',
    syncedNoChanges: '已更新后端数据，IndexedDB 缓存无新增变更',
    loadedServer: '已从后端加载当前页',
    loadFailed: '加载失败：',
    backendUnavailable: '后端暂不可用，已保留缓存快照',
    id: 'ID'
  },
  'en-US': {
    sync: 'Sync updates',
    exportCurrent: 'Export current page',
    recordType: 'Record type',
    answerStatus: 'Answer status',
    all: 'All',
    startDate: 'Start date',
    endDate: 'End date',
    keyword: 'Keywords',
    keywordPlaceholder: 'Search questions, answers, or IDs',
    search: 'Search',
    reset: 'Reset',
    totalRecords: 'Total records',
    currentFilter: 'Current filter',
    answerRate: 'Answer rate',
    answeredRecords: '{count} answered',
    unansweredRate: 'Unanswered rate',
    knowledgeGap: 'Knowledge-base gap signal',
    averageDuration: 'Average duration',
    durationAvailable: 'Calculated when duration is available',
    p95Duration: 'P95 duration',
    slowRequests: 'Slow-request analysis',
    totalTokens: 'Total tokens',
    ragflowMetrics: 'RagFlow metric details',
    fieldMetrics: 'Calculated when fields are available',
    statusDistribution: 'Answer status distribution',
    trend30Days: '30-day trend',
    noTrendData: 'No trend data for the last 30 days',
    qaRecords: 'Q&A records',
    totalWithCount: '{count} records',
    api: 'API: ',
    loading: 'Loading...',
    noRecords: 'No records match the current filters',
    time: 'Time',
    status: 'Status',
    question: 'Question',
    answerSummary: 'Answer summary',
    duration: 'Duration',
    token: 'Token',
    source: 'Source',
    actions: 'Actions',
    details: 'Details',
    pageOf: 'Page {page} of {total}',
    previous: 'Previous',
    next: 'Next',
    recordDetails: 'Record details',
    close: 'Close',
    answer: 'Answer',
    failureReason: 'Failure reason',
    timingDetails: 'Timing details',
    tokenDetails: 'Token details',
    recordUnit: 'records',
    queryingMysql: 'Querying MySQL through the backend...',
    cachedRefreshing: 'Showing {count} cached IndexedDB records while refreshing backend data...',
    syncedChanges: 'Backend data updated; {count} IndexedDB changes synchronized',
    syncedNoChanges: 'Backend data updated; no new IndexedDB changes',
    loadedServer: 'Loaded the current page from the backend',
    loadFailed: 'Loading failed: ',
    backendUnavailable: 'Backend is unavailable; the cached snapshot is still available',
    id: 'ID'
  }
};

export function interpolateDashboardText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}
