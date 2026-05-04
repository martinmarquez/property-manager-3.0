import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';

export function TestimonialCarousel() {
  const t = useTranslations('testimonials');
  const items = ['0', '1', '2'] as const;

  return (
    <section className="section-padding">
      <div className="section-container">
        <h2 className="mx-auto max-w-2xl text-center font-display text-display-lg text-ink">
          {t('title')}
        </h2>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {items.map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface-base p-6
                         dark:border-dark-border dark:bg-dark-raised"
            >
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} size={16} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="mt-4 text-body-md text-ink leading-relaxed">
                &ldquo;{t(`items.${i}.quote`)}&rdquo;
              </blockquote>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-faint text-body-xs font-semibold text-brand-600">
                  {t(`items.${i}.name`).split(' ').map((w: string) => w[0]).join('')}
                </div>
                <div>
                  <p className="text-body-sm font-medium text-ink">
                    {t(`items.${i}.name`)}
                  </p>
                  <p className="text-body-xs text-ink-secondary">
                    {t(`items.${i}.role`)}, {t(`items.${i}.company`)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
