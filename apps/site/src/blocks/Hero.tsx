import type React from 'react';
import type { HeroProps } from '../lib/types';

export function Hero(props: HeroProps): React.JSX.Element {
  const {
    headline,
    subheadline,
    ctaLabel,
    ctaHref,
    backgroundImageUrl,
    overlayOpacity = 0.5,
    alignment = 'center',
  } = props;

  const alignClass =
    alignment === 'left'
      ? 'items-start text-left'
      : alignment === 'right'
        ? 'items-end text-right'
        : 'items-center text-center';

  return (
    <section className="relative min-h-[520px] flex overflow-hidden">
      {backgroundImageUrl && (
        <>
          <img
            src={backgroundImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
          <div
            className="absolute inset-0 bg-surface-base"
            style={{ opacity: overlayOpacity }}
          />
        </>
      )}
      {!backgroundImageUrl && (
        <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated via-surface-base to-surface-raised" />
      )}

      <div
        className={`site-section relative z-10 flex flex-1 flex-col justify-center ${alignClass} py-24 md:py-32`}
      >
        <div className="site-container flex flex-col gap-6">
          <h1 className="site-heading text-4xl md:text-5xl lg:text-6xl text-ink max-w-3xl leading-[1.1]">
            {headline}
          </h1>

          {subheadline && (
            <p className="text-lg md:text-xl text-ink-muted max-w-2xl font-body leading-relaxed">
              {subheadline}
            </p>
          )}

          {ctaLabel && ctaHref && (
            <div className="mt-4">
              <a
                href={ctaHref}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-site bg-accent text-surface-base font-display font-semibold text-base tracking-wide hover:bg-accent-hover transition-colors"
              >
                {ctaLabel}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-1">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface-base to-transparent" />
    </section>
  );
}
