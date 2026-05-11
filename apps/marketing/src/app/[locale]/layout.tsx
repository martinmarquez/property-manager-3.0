import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Syne, Inter, DM_Mono } from 'next/font/google';
import { locales } from '@/lib/i18n/config';
import { NavBar } from '@/components/NavBar';
import { Footer } from '@/components/Footer';
import '../globals.css';

const syne = Syne({ subsets: ['latin'], weight: ['600', '700', '800'], display: 'swap', variable: '--font-syne' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-inter' });
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], display: 'swap', variable: '--font-dm-mono' });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: {
    template: '%s | Corredor',
    default: 'Corredor — CRM inmobiliario con IA',
  },
  description: 'Gestioná propiedades, leads y operaciones desde un solo lugar.',
  metadataBase: new URL('https://corredor.ar'),
  alternates: {
    canonical: '/',
    languages: { 'es-AR': '/', en: '/en/' },
  },
  openGraph: {
    type: 'website',
    siteName: 'Corredor',
    locale: 'es_AR',
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${syne.variable} ${inter.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-body antialiased">
        <NextIntlClientProvider messages={messages}>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-brand-600 focus:text-white">
            Skip to content
          </a>
          <NavBar />
          <main id="main">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
