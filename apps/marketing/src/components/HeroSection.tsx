import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';

export function HeroSection() {
  const t = useTranslations('hero');

  return (
    <section className="relative overflow-hidden bg-dark-base pt-28 pb-20 md:pt-36 md:pb-28">
      <div className="dot-grid absolute inset-0 opacity-40" />
      <div className="hero-glow absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface-base dark:from-dark-base to-transparent" />

      <div className="section-container relative">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-dark-border bg-dark-raised px-4 py-1.5 text-body-xs text-brand-400 opacity-0 animate-fade-up">
            {t('badge')}
          </div>

          <h1 className="mt-8 font-display text-display-xl text-dark-text-primary opacity-0 animate-fade-up delay-100 md:text-display-2xl whitespace-pre-line">
            {t('title')}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-body-lg text-dark-text-secondary opacity-0 animate-fade-up delay-200">
            {t('subtitle')}
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center opacity-0 animate-fade-up delay-300">
            <Link href="https://app.corredor.ar/register" className="btn-primary btn-lg shadow-brand">
              {t('cta')}
            </Link>
            <Link href="/tour" className="btn-secondary btn-lg border-dark-border text-dark-text-primary hover:border-brand-400">
              {t('demo')}
            </Link>
          </div>

          <p className="mt-8 text-body-sm text-dark-text-tertiary opacity-0 animate-fade-up delay-400">
            {t('trust')}
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl opacity-0 animate-fade-up delay-500">
          <div className="screenshot-tilt rounded-2xl border border-dark-border bg-dark-raised p-3 shadow-glow-hero">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
              <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
              <span className="h-3 w-3 rounded-full bg-[#28C840]" />
              <span className="ml-4 text-body-xs text-dark-text-tertiary font-mono">app.corredor.ar</span>
            </div>
            <div className="rounded-xl bg-dark-elevated p-8">
              <div className="grid gap-6 md:grid-cols-3">
                <DashCard label="Leads nuevos" value="8" trend="+23%" />
                <DashCard label="Pipeline activo" value="$1.2M" trend="+12%" />
                <DashCard label="Visitas hoy" value="3" trend="2 confirmadas" />
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-4">
                {['Belgrano R', 'Palermo Chico', 'Recoleta', 'Núñez'].map((n) => (
                  <div key={n} className="rounded-lg border border-dark-border bg-dark-raised p-4">
                    <div className="h-20 rounded-md bg-dark-base mb-3" />
                    <p className="text-body-xs text-dark-text-primary font-medium">{n}</p>
                    <p className="text-body-xs text-dark-text-tertiary mt-0.5">3 amb · 85m²</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-raised p-5">
      <p className="text-body-xs text-dark-text-tertiary">{label}</p>
      <p className="mt-1 font-display text-display-sm text-dark-text-primary">{value}</p>
      <p className="mt-1 text-body-xs text-accent-500">{trend}</p>
    </div>
  );
}
