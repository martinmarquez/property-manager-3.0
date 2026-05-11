import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { locales } from '@/lib/i18n/config';
import { Link } from '@/lib/i18n/navigation';
import { Building2, BarChart3, MessageSquare, Sparkles, Receipt, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Tour del Producto',
  description: 'Descubrí todas las funcionalidades de Corredor: propiedades, pipeline, bandeja unificada, copiloto IA y más.',
};

interface TourPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TourPage({ params }: TourPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TourContent />;
}

const sections = [
  {
    key: 'properties',
    icon: Building2,
    color: 'text-brand-600 bg-brand-faint',
    gradient: 'from-brand-600/20 to-brand-400/10',
  },
  {
    key: 'pipeline',
    icon: BarChart3,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
    gradient: 'from-amber-500/20 to-amber-300/10',
  },
  {
    key: 'inbox',
    icon: MessageSquare,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
    gradient: 'from-emerald-500/20 to-emerald-300/10',
  },
  {
    key: 'copilot',
    icon: Sparkles,
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',
    gradient: 'from-purple-500/20 to-purple-300/10',
  },
  {
    key: 'billing',
    icon: Receipt,
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10',
    gradient: 'from-rose-500/20 to-rose-300/10',
  },
];

function TourContent() {
  const t = useTranslations('tour');

  return (
    <>
      <section className="relative overflow-hidden bg-dark-base pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="dot-grid absolute inset-0 opacity-30" />
        <div className="hero-glow absolute inset-0" />
        <div className="section-container relative text-center">
          <span className="inline-flex rounded-full border border-dark-border bg-dark-raised px-4 py-1.5 text-body-xs text-brand-400 opacity-0 animate-fade-up">
            {t('badge')}
          </span>
          <h1 className="mt-6 font-display text-display-xl text-dark-text-primary opacity-0 animate-fade-up delay-100 md:text-display-2xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-body-lg text-dark-text-secondary opacity-0 animate-fade-up delay-200">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {sections.map((section, idx) => {
        const Icon = section.icon;
        const isEven = idx % 2 === 0;
        return (
          <section
            key={section.key}
            className={`section-padding ${idx % 2 === 1 ? 'bg-surface-subtle dark:bg-dark-raised' : ''}`}
          >
            <div className="section-container">
              <div className={`flex flex-col items-center gap-10 lg:gap-16 ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
                <div className="flex-1 max-w-xl">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${section.color}`}>
                    <Icon size={24} />
                  </div>
                  <h2 className="mt-6 font-display text-display-md text-ink md:text-display-lg">
                    {t(`sections.${section.key}.title`)}
                  </h2>
                  <p className="mt-4 text-body-lg text-ink-secondary leading-relaxed">
                    {t(`sections.${section.key}.description`)}
                  </p>
                  <ul className="mt-6 flex flex-col gap-3">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-600 shrink-0" />
                        <span className="text-body-md text-ink-secondary">
                          {t(`sections.${section.key}.features.${i}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full max-w-xl">
                  <div className={`aspect-[4/3] rounded-2xl bg-gradient-to-br ${section.gradient} border border-border dark:border-dark-border flex items-center justify-center`}>
                    <div className="rounded-xl bg-surface-base/80 dark:bg-dark-elevated/80 p-8 shadow-lg backdrop-blur-sm">
                      <Icon size={48} className="text-ink-tertiary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <section className="section-padding bg-dark-base">
        <div className="section-container text-center">
          <h2 className="font-display text-display-md text-dark-text-primary md:text-display-lg">
            {t('cta.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-dark-text-secondary">
            {t('cta.subtitle')}
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/precios" className="btn-primary btn-lg shadow-brand">
              {t('cta.primary')} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
