import { createContext } from 'preact';
import { useContext, useState, useCallback } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { ja } from './ja.ts';
import { en } from './en.ts';
import type { Translations } from './types.ts';

export type Locale = 'ja' | 'en';

const translations: Record<Locale, Translations> = { ja, en };

interface I18nContext {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

function detectLocale(): Locale {
  const saved = localStorage.getItem('locale');
  if (saved === 'ja' || saved === 'en') return saved;
  const browserLang = navigator.language.split('-')[0];
  return browserLang === 'ja' ? 'ja' : 'en';
}

const I18nCtx = createContext<I18nContext>({
  locale: 'ja',
  t: ja,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ComponentChildren }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  return (
    <I18nCtx.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </I18nCtx.Provider>
  );
}

export function useI18n() {
  return useContext(I18nCtx);
}

export function formatMessage(
  template: string,
  params: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? '');
}
