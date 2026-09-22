import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import api from '../services/api';
import QARecordsDashboard from './QARecordsDashboard';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn() }
}));

const get = api.get as jest.Mock;

beforeEach(() => {
  localStorage.setItem('appLanguage', 'zh-CN');
  get.mockReset();
  get.mockImplementation((url: string, config: { params: { page?: number } }) => {
    if (url.endsWith('/search')) {
      const page = config.params.page || 1;
      return Promise.resolve({
        data: {
          items: [{ id: page, question: page === 1 ? '第一页问题' : '第二页问题', answer_status: 'answered' }],
          total: 20,
          page,
          page_size: 10,
          total_pages: 2
        }
      });
    }
    if (url.endsWith('/stats')) {
      return Promise.resolve({
        data: {
          total: 20,
          answered: 20,
          unanswered: 0,
          unclear: 0,
          unknown: 0,
          answer_rate: 100,
          unanswered_rate: 0,
          avg_duration: null,
          p95_duration: null,
          total_tokens: null,
          retrieval_hit_rate: null,
          daily: {}
        }
      });
    }
    return Promise.resolve({ data: { items: [], has_more: false } });
  });
});

test('requests statistics on refresh but not when only changing page', async () => {
  render(
    <MemoryRouter>
      <LanguageProvider>
        <QARecordsDashboard />
      </LanguageProvider>
    </MemoryRouter>
  );

  expect(await screen.findByText('第一页问题')).toBeInTheDocument();
  await waitFor(() => expect(get.mock.calls.filter(([url]) => url.endsWith('/stats'))).toHaveLength(1));

  fireEvent.click(screen.getByRole('button', { name: '下一页' }));
  expect(await screen.findByText('第二页问题')).toBeInTheDocument();
  expect(get.mock.calls.filter(([url]) => url.endsWith('/stats'))).toHaveLength(1);

  fireEvent.click(screen.getByRole('button', { name: '增量同步' }));
  await waitFor(() => expect(get.mock.calls.filter(([url]) => url.endsWith('/stats'))).toHaveLength(2));
});
