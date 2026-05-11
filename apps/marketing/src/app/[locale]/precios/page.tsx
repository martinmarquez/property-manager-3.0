import { setRequestLocale } from 'next-intl/server';
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
  return <PreciosContent />;
}
