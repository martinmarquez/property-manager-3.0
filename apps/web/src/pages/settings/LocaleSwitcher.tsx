import React from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { useLocale, SUPPORTED_LOCALES } from '../../i18n/index.js';
import type { SupportedLocale } from '../../i18n/index.js';

const C = {
  bgBase:       '#070D1A',
  bgRaised:     '#0D1526',
  border:       '#1F2D48',
  brand:        '#1654d9',
  textPrimary:  '#EFF4FF',
  textSecondary:'#8DA0C0',
  textTertiary: '#6B809E',
};

const messages = defineMessages({
  label:  { id: 'locale.switcher.label' },
  esAR:   { id: 'locale.es-AR' },
  es:     { id: 'locale.es' },
  en:     { id: 'locale.en' },
  ptBR:   { id: 'locale.pt-BR' },
  esMX:   { id: 'locale.es-MX' },
});

const LOCALE_MESSAGE_MAP: Record<SupportedLocale, keyof typeof messages> = {
  'es-AR': 'esAR',
  'es':    'es',
  'en':    'en',
  'pt-BR': 'ptBR',
  'es-MX': 'esMX',
};

export function LocaleSwitcher() {
  const intl = useIntl();
  const { locale, setLocale } = useLocale();

  return (
    <div style={{ padding: '24px', maxWidth: 480 }}>
      <label
        htmlFor="locale-select"
        style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}
      >
        {intl.formatMessage(messages.label)}
      </label>
      <select
        id="locale-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as SupportedLocale)}
        style={{
          width: '100%',
          padding: '9px 12px',
          borderRadius: 7,
          fontSize: 13,
          background: C.bgRaised,
          border: `1px solid ${C.border}`,
          color: C.textPrimary,
          cursor: 'pointer',
          outline: 'none',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238DA0C0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: 36,
        }}
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option key={loc} value={loc} style={{ background: C.bgBase }}>
            {intl.formatMessage(messages[LOCALE_MESSAGE_MAP[loc]])}
          </option>
        ))}
      </select>
    </div>
  );
}
