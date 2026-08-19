export type QARecordSourceKey = 'beijing' | 'tangshan' | 'ragflowTangshan';

export type QARecordSource = {
  key: QARecordSourceKey;
  label: string;
  title: string;
  description: string;
  apiBaseUrl: string;
  supportsRagflowMetrics: boolean;
};

export const QA_RECORD_SOURCES: Record<QARecordSourceKey, QARecordSource> = {
  beijing: {
    key: 'beijing',
    label: '北京校区 QA',
    title: '北京校区 QA 问答记录查询与分析',
    description: '查看北京校区普通 QA 问答记录、回答质量与知识库缺口。此入口不是 RagFlow 聊天文档记录。',
    apiBaseUrl: '/api/qa-records/search?source=beijing',
    supportsRagflowMetrics: false
  },
  tangshan: {
    key: 'tangshan',
    label: '唐山校区 QA',
    title: '唐山校区 QA 问答记录查询与分析',
    description: '查看唐山校区普通 QA 问答记录、回答质量与知识库缺口。此入口不是 RagFlow 聊天文档记录。',
    apiBaseUrl: '/api/qa-records/search?source=tangshan',
    supportsRagflowMetrics: false
  },
  ragflowTangshan: {
    key: 'ragflowTangshan',
    label: 'RagFlow 聊天文档记录',
    title: 'RagFlow 聊天文档记录查询与分析',
    description: '专门查看 RagFlow 聊天文档记录、回答耗时、Token 明细与链路质量，不等同于北京/唐山普通 QA 记录。',
    apiBaseUrl: '/api/qa-records/search?source=ragflowTangshan',
    supportsRagflowMetrics: true
  }
};

export const DEFAULT_QA_RECORD_SOURCE: QARecordSourceKey = 'beijing';
export const QA_RECORD_PAGE_SIZE = 10;
export const QA_RECORD_FETCH_PAGE_SIZE = 100;
export const QA_RECORD_REQUEST_TIMEOUT_MS = 12000;
