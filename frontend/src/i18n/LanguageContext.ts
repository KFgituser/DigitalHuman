import { createContext, useContext } from 'react';
import type { Language } from './messages';

export type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export const LanguageContext = createContext<I18nContextValue | null>(null);

export const useI18n = (): I18nContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used within LanguageProvider');
  }
  return context;
};
