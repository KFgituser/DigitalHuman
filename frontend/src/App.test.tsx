import { render, screen } from '@testing-library/react';
import App from './App';
import { LanguageProvider } from './i18n';

// The login-page render test does not make HTTP requests. Mock the API client so
// Jest does not need to load Axios' ESM entry point under react-scripts 5.
jest.mock('./services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
    },
  },
}));

test('renders login page heading', () => {
  render(
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
  const heading = screen.getByText('用户登录');
  expect(heading).toBeInTheDocument();
});
