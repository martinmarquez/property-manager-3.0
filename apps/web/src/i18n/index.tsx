import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { IntlProvider } from 'react-intl';
import type { SupportedLocale } from '@corredor/core';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, FALLBACK_LOCALE } from '@corredor/core';

// Re-export for convenience
export { SUPPORTED_LOCALES, DEFAULT_LOCALE, FALLBACK_LOCALE };
export type { SupportedLocale };

// Static imports for all catalogs
import esAR from '@corredor/core/i18n/messages/es-AR.json';
import es from '@corredor/core/i18n/messages/es.json';
import en from '@corredor/core/i18n/messages/en.json';
import ptBR from '@corredor/core/i18n/messages/pt-BR.json';
import esMX from '@corredor/core/i18n/messages/es-MX.json';

type Messages = Record<string, string>;

const MESSAGES: Record<SupportedLocale, Messages> = {
  'es-AR': esAR,
  'es': es,
  'en': en,
  'pt-BR': ptBR,
  'es-MX': esMX,
};

/**
 * Merge locale messages with fallbacks: locale → parent → en → es-AR.
 * Empty string values fall through to the next level.
 */
function resolveMessages(locale: SupportedLocale): Messages {
  const primary = MESSAGES[locale];
  const parent = locale.includes('-') ? MESSAGES[locale.split('-')[0] as SupportedLocale] : undefined;
  const fallback = MESSAGES[FALLBACK_LOCALE];
  const base = MESSAGES[DEFAULT_LOCALE];

  const result: Messages = {};
  for (const key of Object.keys(base)) {
    result[key] =
      (primary[key] !== '' ? primary[key] : undefined) ??
      (parent && parent[key] !== '' ? parent[key] : undefined) ??
      (fallback[key] !== '' ? fallback[key] : undefined) ??
      base[key] ??
      key;
  }
  return result;
}

function detectLocale(): SupportedLocale {
  const stored = localStorage.getItem('corredor.locale');
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale;
  }
  const browser = navigator.language;
  const exact = SUPPORTED_LOCALES.find((l) => l === browser);
  if (exact) return exact;
  const partial = SUPPORTED_LOCALES.find((l) => browser.startsWith(l.split('-')[0] ?? l));
  return partial ?? DEFAULT_LOCALE;
}

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
});

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

interface I18nProviderProps {
  children: React.ReactNode;
  /** Override locale (useful for Storybook / tests) */
  initialLocale?: SupportedLocale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(
    initialLocale ?? detectLocale(),
  );

  const setLocale = useCallback((next: SupportedLocale) => {
    localStorage.setItem('corredor.locale', next);
    setLocaleState(next);
  }, []);

  const messages = useMemo(() => resolveMessages(locale), [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <IntlProvider
        locale={locale}
        messages={messages}
        defaultLocale={DEFAULT_LOCALE}
        onError={(err) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[i18n]', err.message);
          }
        }}
      >
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}
