import { setRequestLocale } from 'next-intl/server';
import { locales } from '@/lib/i18n/config';
import { HeroSection } from '@/components/HeroSection';
import { FeatureGrid } from '@/components/FeatureGrid';
import { MigrationSection } from '@/components/MigrationSection';
import { TestimonialCarousel } from '@/components/TestimonialCarousel';
import { CTABanner } from '@/components/CTABanner';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Corredor',
    url: 'https://corredor.ar',
    logo: 'https://corredor.ar/logo.svg',
    description: 'CRM inmobiliario con IA para Argentina',
    foundingDate: '2025',
    sameAs: [],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <HeroSection />
      <FeatureGrid />
      <MigrationSection />
      <TestimonialCarousel />
      <CTABanner />
    </>
  );
}
