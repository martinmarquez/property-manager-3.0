import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';

export function CTABanner() {
  const t = useTranslations('cta');

  return (
    <section className="section-padding">
      <div className="section-container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-[#2563EB] px-8 py-16 text-center md:px-16 md:py-20">
          <div className="absolute inset-0 dot-grid opacity-10" />

          <div className="relative">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-body-xs text-white/90 backdrop-blur-sm">
              {t('badge')}
            </span>
            <h2 className="mx-auto mt-6 max-w-2xl font-display text-display-lg text-white">
              {t('title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-body-lg text-white/80">
              {t('subtitle')}
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="https://app.corredor.ar/register"
                className="btn btn-lg rounded-xl bg-white px-8 py-4 font-semibold text-brand-700 hover:bg-white/90 active:bg-white/80 shadow-lg"
              >
                {t('primary')}
              </Link>
              <Link
                href="https://app.corredor.ar/demo"
                className="btn btn-lg rounded-xl border border-white/30 px-8 py-4 font-semibold text-white hover:bg-white/10 active:bg-white/20"
              >
                {t('secondary')}
              </Link>
            </div>
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="flex -space-x-2">
                {['MG', 'CB', 'LM'].map((initials) => (
                  <div
                    key={initials}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-600 bg-brand-500 text-body-xs font-semibold text-white"
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <p className="text-body-sm text-white/70">
                {t('social', { count: '200' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
