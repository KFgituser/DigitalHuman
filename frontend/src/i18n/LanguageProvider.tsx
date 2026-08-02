import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { LanguageContext } from './LanguageContext';
import { translate, type Language } from './messages';

const STORAGE_KEY = 'appLanguage';

const getInitialLanguage = (): Language => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'en-US' || saved === 'zh-CN' ? saved : 'zh-CN';
};

type LanguageProviderProps = {
  children: ReactNode;
};

export default function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage: () =>
          setLanguage((current) => (current === 'zh-CN' ? 'en-US' : 'zh-CN')),
        t: (key, params) => translate(language, key, params)
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
