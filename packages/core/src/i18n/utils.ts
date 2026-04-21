import type { IntlShape } from 'react-intl';

export type SupportedCurrency = 'ARS' | 'USD' | 'UYU';

const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  ARS: '$',
  USD: 'U$S',
  UYU: '$U',
};

/**
 * Format a monetary amount using locale-aware number formatting.
 *
 * Uses Argentine conventions for ARS (dot as thousands separator, no decimal for whole amounts).
 * For USD/UYU, uses the currency symbol prefix common in the regional real-estate market.
 *
 * formatMoney('ARS', 150000) → "$ 150.000" (AR format per exit criteria)
 */
export function formatMoney(
  intl: IntlShape,
  currency: SupportedCurrency | string,
  amount: number | string,
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';

  const cur = currency as SupportedCurrency;
  const symbol = CURRENCY_SYMBOLS[cur] ?? currency;

  const locale = intl.locale;

  if (cur === 'ARS') {
    // Argentine peso: dot thousands separator, no decimals for whole amounts
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: num % 1 === 0 ? 0 : 2,
      useGrouping: true,
    }).format(num);
    return `${symbol} ${formatted}`;
  }

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
    useGrouping: true,
  }).format(num);

  return `${symbol} ${formatted}`;
}

/**
 * Format a date in relative or absolute form, respecting the active locale.
 *
 * mode 'relative': "hace 3 días", "ayer", "hoy"
 * mode 'absolute': "21 de abril de 2026"
 * mode 'datetime': "21/04/2026 14:32"
 */
export function formatDate(
  intl: IntlShape,
  date: Date | string | number,
  mode: 'relative' | 'absolute' | 'datetime' = 'absolute',
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';

  if (mode === 'relative') {
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffDays === 0) return intl.formatMessage({ id: 'savedViews.date.today' });
    if (diffDays === 1) return intl.formatMessage({ id: 'savedViews.date.yesterday' });
    if (diffDays < 30) {
      return intl.formatMessage({ id: 'savedViews.date.daysAgo' }, { days: diffDays });
    }
    const diffMonths = Math.floor(diffDays / 30);
    return intl.formatMessage({ id: 'savedViews.date.monthsAgo' }, { months: diffMonths });
  }

  if (mode === 'datetime') {
    return new Intl.DateTimeFormat(intl.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  }

  return new Intl.DateTimeFormat(intl.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Format a plain number with locale-aware separators.
 */
export function formatNumber(
  intl: IntlShape,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(intl.locale, options).format(value);
}
