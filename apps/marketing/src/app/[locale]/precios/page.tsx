import { setRequestLocale, getMessages } from 'next-intl/server';
import { locales } from '@/lib/i18n/config';
import type { Metadata } from 'next';
import { PreciosContent } from './PreciosContent';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Precios',
  description: 'Planes y precios de Corredor. Sin sorpresas, sin contratos anuales obligatorios.',
};

interface PreciosPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PreciosPage({ params }: PreciosPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const messages = (await getMessages()) as Record<string, Record<string, unknown>>;
  const faqItems = (messages.pricing as Record<string, unknown>)?.faq as Record<string, unknown> | undefined;
  const items = (faqItems?.items ?? {}) as Record<string, { q: string; a: string }>;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: Object.values(items).map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PreciosContent />
    </>
  );
}
