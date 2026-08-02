import { render, screen } from '@testing-library/react';
import App from './App';
import { LanguageProvider } from './i18n';

test('renders login page heading', () => {
  render(
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
  const heading = screen.getByText('用户登录');
  expect(heading).toBeInTheDocument();
});
