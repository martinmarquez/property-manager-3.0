import { ArrowRight } from 'lucide-react';
import type { CTAProps } from '../lib/types';

export function CTA(props: CTAProps) {
  const {
    headline,
    body,
    buttonLabel,
    buttonHref,
    variant = 'default',
  } = props;

  const bgClass =
    variant === 'accent'
      ? 'bg-accent/10 border-accent/30'
      : variant === 'outline'
        ? 'bg-transparent border-divider'
        : 'bg-surface-raised border-divider';

  const btnClass =
    variant === 'outline'
      ? 'border-2 border-accent text-accent hover:bg-accent hover:text-surface-base'
      : 'bg-accent text-surface-base hover:bg-accent-hover';

  return (
    <section className="site-section py-16 md:py-24">
      <div className="site-container max-w-3xl mx-auto">
        <div className={`text-center p-10 md:p-16 rounded-site border ${bgClass}`}>
          <h2 className="site-heading text-2xl md:text-3xl text-ink mb-3">
            {headline}
          </h2>
          {body && (
            <p className="text-ink-muted font-body text-base max-w-lg mx-auto mb-8 leading-relaxed">
              {body}
            </p>
          )}
          <a
            href={buttonHref}
            className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-site font-display font-semibold text-sm tracking-wide transition-colors ${btnClass}`}
          >
            {buttonLabel}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
