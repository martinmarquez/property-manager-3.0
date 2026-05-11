import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { locales } from '@/lib/i18n/config';
import { Link } from '@/lib/i18n/navigation';
import { Target, Zap, Shield, Heart } from 'lucide-react';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Nosotros',
  description: 'Conocé al equipo detrás de Corredor, el CRM inmobiliario con IA para Argentina.',
};

interface NosotrosPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NosotrosPage({ params }: NosotrosPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <NosotrosContent />;
}

const stats = [
  { value: '+200', label: 'Corredores activos' },
  { value: '18', label: 'Módulos integrados' },
  { value: '<1h', label: 'Tiempo de migración' },
  { value: '99.9%', label: 'Uptime garantizado' },
];

const values = [
  { icon: Target, color: 'text-brand-500 bg-brand-faint', title: 'Foco local', desc: 'Construimos para la realidad argentina. Pesos, portales locales, normativa vigente.' },
  { icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10', title: 'Velocidad', desc: 'Iteramos rápido. Escuchamos a nuestros clientes y desplegamos mejoras cada semana.' },
  { icon: Shield, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10', title: 'Seguridad', desc: 'Tus datos están protegidos con encriptación de grado bancario y auditorías constantes.' },
  { icon: Heart, color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10', title: 'Pasión', desc: 'Amamos el real estate. Cada feature nace de una conversación con un corredor real.' },
];

function NosotrosContent() {
  const t = useTranslations('about');

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

      <section className="section-padding">
        <div className="section-container">
          <div className="mx-auto max-w-prose">
            <h2 className="font-display text-display-md text-ink">{t('story.title')}</h2>
            <p className="mt-6 text-body-lg text-ink-secondary leading-relaxed">{t('story.text')}</p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.value} className="rounded-xl border border-border bg-surface-base p-6 text-center dark:border-dark-border dark:bg-dark-raised">
                <p className="font-display text-display-md text-brand-600 dark:text-brand-400">{stat.value}</p>
                <p className="mt-2 text-body-sm text-ink-secondary">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle dark:bg-dark-raised">
        <div className="section-container">
          <h2 className="mx-auto max-w-prose text-center font-display text-display-md text-ink">{t('mission.title')}</h2>
          <blockquote className="mx-auto mt-8 max-w-3xl rounded-2xl border-l-4 border-brand-600 bg-surface-base p-8 dark:bg-dark-elevated">
            <p className="text-body-lg text-ink leading-relaxed italic">&ldquo;{t('mission.text')}&rdquo;</p>
          </blockquote>
        </div>
      </section>

      <section className="section-padding">
        <div className="section-container">
          <h2 className="text-center font-display text-display-md text-ink">{t('team.title')}</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div key={idx} className="group rounded-xl border border-border bg-surface-base p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-dark-border dark:bg-dark-raised">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-400 text-display-sm font-display text-white">
                  {t(`team.members.${idx}.initials`)}
                </div>
                <h3 className="mt-4 font-body text-heading-sm text-ink">{t(`team.members.${idx}.name`)}</h3>
                <p className="mt-1 text-body-sm text-ink-secondary">{t(`team.members.${idx}.role`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle dark:bg-dark-raised">
        <div className="section-container">
          <h2 className="text-center font-display text-display-md text-ink mb-12">Nuestros valores</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ icon: Icon, color, title, desc }, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-surface-base p-6 dark:border-dark-border dark:bg-dark-elevated">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${color}`}><Icon size={20} /></div>
                <h3 className="mt-4 font-body text-heading-sm text-ink">{title}</h3>
                <p className="mt-2 text-body-sm text-ink-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="section-container text-center">
          <h2 className="font-display text-display-md text-ink">¿Querés trabajar con nosotros?</h2>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-ink-secondary">Buscamos personas apasionadas por la tecnología y el real estate argentino.</p>
          <div className="mt-8">
            <Link href="https://app.corredor.ar/careers" className="btn-primary btn-lg shadow-brand">Ver posiciones abiertas</Link>
          </div>
        </div>
      </section>
    </>
  );
}
