import { useEffect, useRef, useState } from 'react';
import type { TailscaleStatus, TargetStatus } from './ChatLogs';
import '../styles/FloatingChatbot.css';
import { useI18n } from '../i18n';
import { translate, type Language } from '../i18n/messages';

type MessageRole = 'user' | 'bot';

type ChatMessage = {
  id: string;
  role: MessageRole;
  text: string;
};

const CHATBOT_API_URL =
  process.env.REACT_APP_CHATBOT_API_URL ||
  'http://10.168.1.101/knowledgeApi/knowledge/query/test';
const CHATBOT_API_URL_BEIJING =
  process.env.REACT_APP_CHATBOT_API_URL_BEIJING || 'http://10.168.1.105/knowledge/query/test';
const CHATBOT_API_URL_TANGSHAN =
  process.env.REACT_APP_CHATBOT_API_URL_TANGSHAN ||
  'http://10.168.1.101/knowledgeApi/knowledge/query/test';
const CHATBOT_CLIENT_ID =
  process.env.REACT_APP_CHATBOT_CLIENT_ID || '2011260068498116608';
const CHATBOT_KNOWLEDGE_IDS = process.env.REACT_APP_CHATBOT_KNOWLEDGE_IDS || '';
const CHATBOT_SYSTEM_PROMPT = process.env.REACT_APP_CHATBOT_SYSTEM_PROMPT || '';
const CHATBOT_SEED_QUESTIONS = process.env.REACT_APP_CHATBOT_SEED_QUESTIONS || '';

const BEIJING_API_PATHS = ['/knowledge/query/test', '/knowledgeApi/knowledge/query/test'];
const TANGSHAN_API_PATHS = [
  '/knowledgeApi/knowledge/query/test',
  ':34001/knowledge/query/test',
  '/knowledge/query/test'
];

const DEFAULT_KNOWLEDGE_IDS: string[] = ['11', '10', '8', '7', '6', '5', '4', '3', '2'];
const DEFAULT_SYSTEM_PROMPT =
  '你是北京交通大学财务专属应答者，仅依据《财务知识库》回答北交大校内财务问题，超出范围请明确说明。';

const createMessage = (role: MessageRole, text: string): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text
});

const extractFromEventStream = (rawText: string): string => {
  if (!rawText.includes('data:')) return rawText;

  const chatParts: string[] = [];
  const lines = rawText.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;

    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;

    try {
      const event = JSON.parse(payload) as Record<string, unknown>;
      if (event.type === 'chat' && typeof event.data === 'string') {
        chatParts.push(event.data);
      }
    } catch {
      // ignore non-json lines
    }
  }

  return chatParts.length > 0 ? chatParts.join('') : rawText;
};

const extractReplyText = (data: unknown): string => {
  if (typeof data === 'string') return extractFromEventStream(data);
  if (typeof data === 'number' || typeof data === 'boolean') return String(data);

  if (Array.isArray(data)) {
    return data
      .map((item) => extractReplyText(item).trim())
      .filter(Boolean)
      .join('\n');
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const preferredKeys = [
      'answer',
      'reply',
      'content',
      'message',
      'result',
      'data',
      'response',
      'output',
      'text'
    ];

    for (const key of preferredKeys) {
      if (key in record) {
        const text = extractReplyText(record[key]).trim();
        if (text) return text;
      }
    }

    return JSON.stringify(record);
  }

  return '';
};

const parseKnowledgeIds = (): string[] => {
  const runtimeRaw = localStorage.getItem('chatbotKnowledgeIds') || '';
  const raw = CHATBOT_KNOWLEDGE_IDS.trim() || runtimeRaw.trim();
  if (!raw) return DEFAULT_KNOWLEDGE_IDS;

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
    return [];
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseSeedQuestions = (): string[] => {
  const runtimeRaw = localStorage.getItem('chatbotSeedQuestions') || '';
  const raw = CHATBOT_SEED_QUESTIONS.trim() || runtimeRaw.trim();
  if (!raw) return [];

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
    return [];
  }

  return raw
    .split('||')
    .map((item) => item.trim())
    .filter(Boolean);
};

const isIntroQuestion = (question: string): boolean => {
  const normalized = question.replace(/\s+/g, '');
  const introKeywords = [
    '你是谁',
    '你叫什么',
    '你是什么',
    '介绍一下你自己',
    '请介绍一下你自己'
  ];

  return introKeywords.some((keyword) => normalized.includes(keyword));
};

const getRuntimeApiUrl = (key: string): string => {
  return (localStorage.getItem(key) || '').trim();
};

const extractHost = (target?: TargetStatus): string => {
  const ip = target?.ip?.trim();
  if (ip) return ip;

  const rawUrl = target?.url?.trim();
  if (!rawUrl) return '';

  try {
    return new URL(rawUrl).host;
  } catch {
    return rawUrl
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .trim();
  }
};

const appendHostPaths = (host: string, paths: string[], candidates: string[]): void => {
  const normalizedHost = host.trim();
  if (!normalizedHost) return;

  for (const path of paths) {
    const url = `http://${normalizedHost}${path}`;
    if (!candidates.includes(url)) {
      candidates.push(url);
    }
  }
};

const getApiCandidates = (
  campusLabel: string,
  tailscaleStatus?: TailscaleStatus | null
): string[] => {
  const runtimeGeneral = getRuntimeApiUrl('chatbotApiUrl');
  const runtimeBeijing = getRuntimeApiUrl('chatbotApiUrlBeijing');
  const runtimeTangshan = getRuntimeApiUrl('chatbotApiUrlTangshan');
  const candidates: string[] = [];

  const addCandidate = (value: string) => {
    const normalized = value.trim();
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  if (runtimeGeneral) addCandidate(runtimeGeneral);

  const preferBeijing = /Beijing|北京/.test(campusLabel);
  const preferTangshan = /Tangshan|唐山/.test(campusLabel);
  const beijingHost = extractHost(tailscaleStatus?.beijing);
  const tangshanHost = extractHost(tailscaleStatus?.tangshan);

  if (preferBeijing) {
    addCandidate(runtimeBeijing || CHATBOT_API_URL_BEIJING);
    appendHostPaths(beijingHost, BEIJING_API_PATHS, candidates);
  }
  if (preferTangshan) {
    addCandidate(runtimeTangshan || CHATBOT_API_URL_TANGSHAN);
    appendHostPaths(tangshanHost, TANGSHAN_API_PATHS, candidates);
  }

  addCandidate(CHATBOT_API_URL.trim());
  addCandidate(runtimeBeijing || CHATBOT_API_URL_BEIJING);
  addCandidate(runtimeTangshan || CHATBOT_API_URL_TANGSHAN);
  appendHostPaths(beijingHost, BEIJING_API_PATHS, candidates);
  appendHostPaths(tangshanHost, TANGSHAN_API_PATHS, candidates);

  return candidates;
};

const buildFetchErrorMessage = (
  language: Language,
  apiUrl: string,
  error: unknown
): string => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return translate(language, 'chatbot.timeout', { apiUrl });
  }

  if (error instanceof TypeError) {
    const isMixedContent =
      window.location.protocol === 'https:' && apiUrl.toLowerCase().startsWith('http://');
    if (isMixedContent) {
      return translate(language, 'chatbot.mixedContent', { apiUrl });
    }
    return translate(language, 'chatbot.connectFailed', { apiUrl });
  }

  return error instanceof Error ? error.message : String(error);
};

const requestBotReply = async (
  language: Language,
  question: string,
  campusLabel: string,
  tailscaleStatus?: TailscaleStatus | null
): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 30000);
  const knowledgeIds = parseKnowledgeIds();
  const seedQuestions = parseSeedQuestions();
  const token = localStorage.getItem('token');
  const runtimePrompt = localStorage.getItem('chatbotSystemPrompt') || '';
  const systemPrompt =
    CHATBOT_SYSTEM_PROMPT.trim() || runtimePrompt.trim() || DEFAULT_SYSTEM_PROMPT;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream'
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const clientId = CHATBOT_CLIENT_ID.trim();
  const payload: Record<string, unknown> = {
    query: question,
    knowledge_ids: knowledgeIds,
    isDigital: true,
    ask: false,
    chat_rounds: 0,
    num_ctx: 8192,
    temperature: 0.1,
    top_k: 10
  };

  if (clientId) payload.client_id = clientId;
  if (systemPrompt) payload.system_prompt = systemPrompt;
  if (seedQuestions.length > 0) payload.question = seedQuestions;

  const apiCandidates = getApiCandidates(campusLabel, tailscaleStatus);
  const errors: string[] = [];

  try {
    for (const apiUrl of apiCandidates) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        const contentType = response.headers.get('content-type') || '';
        const responseBody: unknown = contentType.includes('application/json')
          ? await response.json()
          : await response.text();

        if (!response.ok) {
          const errorText =
            typeof responseBody === 'string'
              ? responseBody
              : JSON.stringify(responseBody);

          throw new Error(
            translate(language, 'chatbot.requestFailedWithStatus', {
              status: response.status,
              apiUrl,
              errorText: errorText.slice(0, 400)
            })
          );
        }

        const text = extractReplyText(responseBody).trim();
        return text || translate(language, 'chatbot.emptyReply');
      } catch (error) {
        errors.push(buildFetchErrorMessage(language, apiUrl, error));
        if (controller.signal.aborted) break;
      }
    }

    throw new Error(errors.join('；') || translate(language, 'chatbot.noAvailableApi'));
  } finally {
    window.clearTimeout(timeoutId);
  }
};

type FloatingChatbotProps = {
  campusLabel?: string;
  tailscaleStatus?: TailscaleStatus | null;
};

function FloatingChatbot({
  campusLabel = '检测中',
  tailscaleStatus = null
}: FloatingChatbotProps) {
  const { language, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('bot', t('chatbot.initialMessage'))
  ]);
  const messageBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0]?.role === 'bot') {
        return [createMessage('bot', t('chatbot.initialMessage'))];
      }
      return prev;
    });
  }, [t]);

  useEffect(() => {
    messageBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending, isOpen]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || isSending) return;

    setInputValue('');
    setMessages((prev) => [...prev, createMessage('user', content)]);

    if (isIntroQuestion(content)) {
      setMessages((prev) => [...prev, createMessage('bot', t('chatbot.fixedIntroReply'))]);
      return;
    }

    setIsSending(true);

    try {
      const reply = await requestBotReply(language, content, campusLabel, tailscaleStatus);
      setMessages((prev) => [...prev, createMessage('bot', reply)]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('chatbot.genericRequestFailed');
      setMessages((prev) => [
        ...prev,
        createMessage('bot', t('chatbot.apiException', { message }))
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="floating-chatbot">
      {isOpen ? (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div className="chatbot-title">
              <span>{t('common.appName')}</span>
              <em className="chatbot-campus">{campusLabel}</em>
            </div>
            <button
              type="button"
              className="chatbot-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label={t('chatbot.closePanel')}
            >
              x
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chatbot-message ${msg.role}`}>
                {msg.text}
              </div>
            ))}
            {isSending ? (
              <div className="chatbot-message bot">{t('chatbot.generating')}</div>
            ) : null}
            <div ref={messageBottomRef} />
          </div>

          <div className="chatbot-input-wrap">
            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={t('chatbot.placeholder')}
              disabled={isSending}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isSending || !inputValue.trim()}
            >
              {t('common.send')}
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="chatbot-trigger"
        aria-label={t('chatbot.openPanel')}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <img
          src={`${process.env.PUBLIC_URL}/chat-bot-icon.png`}
          alt={t('chatbot.iconAlt')}
        />
      </button>
    </div>
  );
}

export default FloatingChatbot;
