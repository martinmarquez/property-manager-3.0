export const APP_URL =
  (process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.corredor.ar').replace(
    /\/$/,
    '',
  );

export function appHref(path: string): string {
  return `${APP_URL}${path}`;
}
