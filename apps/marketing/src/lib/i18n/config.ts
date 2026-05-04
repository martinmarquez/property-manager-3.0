export const locales = ['es-AR', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es-AR';
