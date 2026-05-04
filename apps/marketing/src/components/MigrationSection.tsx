import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { Upload, Database, Rocket } from 'lucide-react';

const steps = [
  { key: 'export', icon: Upload, num: '1' },
  { key: 'import', icon: Database, num: '2' },
  { key: 'work', icon: Rocket, num: '3' },
] as const;

export function MigrationSection() {
  const t = useTranslations('migration');

  return (
    <section id="migration" className="section-padding bg-surface-subtle dark:bg-dark-raised">
      <div className="section-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-display-lg text-ink">
            {t('title')}
          </h2>
          <p className="mt-4 text-body-lg text-ink-secondary">
            {t('subtitle')}
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-3">
          {steps.map(({ key, icon: Icon, num }) => (
            <div key={key} className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-faint">
                <div className="relative">
                  <Icon size={28} className="text-brand-600" />
                  <span className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-body-xs text-white font-semibold">
                    {num}
                  </span>
                </div>
              </div>
              <h3 className="mt-5 font-body text-heading-sm text-ink">
                {t(`steps.${key}.title`)}
              </h3>
              <p className="mt-2 text-body-sm text-ink-secondary">
                {t(`steps.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="https://app.corredor.ar/register" className="btn-primary">
            {t('cta')}
          </Link>
          <Link href="/blog" className="btn-secondary">
            {t('ctaSecondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}
