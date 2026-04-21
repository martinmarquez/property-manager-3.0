export { formatMoney, formatDate, formatNumber } from './utils.js';
export type { SupportedCurrency } from './utils.js';

export const SUPPORTED_LOCALES = ['es-AR', 'es', 'en', 'pt-BR', 'es-MX'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'es-AR';
export const FALLBACK_LOCALE: SupportedLocale = 'en';
