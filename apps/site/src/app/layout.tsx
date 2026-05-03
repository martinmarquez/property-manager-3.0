import '../styles/globals.css';
import { resolveSite } from '../lib/resolve-site';
import { sanitizeHeadHtml, sanitizeCss } from '../lib/sanitize';

export default async function RootLayout({ children }: { children: React.ReactNode }): Promise<React.JSX.Element> {
  const siteData = await resolveSite();
  const theme = siteData?.themeCode ?? 'moderno';
  const siteName = siteData?.name ?? 'Corredor';

  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const safeHeadHtml = siteData?.customHeadHtml
    ? sanitizeHeadHtml(siteData.customHeadHtml)
    : '';
  const safeCss = siteData?.customCss
    ? sanitizeCss(siteData.customCss)
    : '';

  return (
    <html lang="es" data-theme={theme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Syne:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {safeHeadHtml && (
          <div dangerouslySetInnerHTML={{ __html: safeHeadHtml }} />
        )}
        {recaptchaKey && (
          <script
            src={`https://www.google.com/recaptcha/api.js?render=${recaptchaKey}`}
            async
            defer
          />
        )}
      </head>
      <body className="min-h-dvh flex flex-col">
        {children}
        {safeCss && (
          <style dangerouslySetInnerHTML={{ __html: safeCss }} />
        )}
      </body>
    </html>
  );
}
