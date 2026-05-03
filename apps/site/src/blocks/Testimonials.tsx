import { Star, Quote } from 'lucide-react';
import type { TestimonialsProps } from '../lib/types';

export function Testimonials(props: TestimonialsProps) {
  const { title = 'Lo que dicen nuestros clientes', items = [], layout = 'grid' } = props;

  if (items.length === 0) return null;

  return (
    <section className="site-section py-16 md:py-24">
      <div className="site-container">
        <div className="text-center mb-12">
          <h2 className="site-heading text-2xl md:text-3xl text-ink">{title}</h2>
          <div className="mt-3 h-[2px] w-12 bg-accent rounded-full mx-auto" />
        </div>

        <div
          className={
            layout === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
              : 'flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4'
          }
        >
          {items.map((item, i) => (
            <div
              key={i}
              className={`flex flex-col p-6 rounded-site bg-surface-raised border border-divider ${
                layout === 'carousel' ? 'min-w-[320px] snap-center' : ''
              }`}
            >
              <Quote className="w-8 h-8 text-accent/40 mb-4 flex-shrink-0" />

              <blockquote className="text-sm text-ink leading-relaxed font-body flex-1">
                &ldquo;{item.quote}&rdquo;
              </blockquote>

              {item.rating != null && (
                <div className="flex gap-0.5 mt-4">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s < item.rating!
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-ink-faint'
                      }`}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-divider">
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt={item.author}
                    className="w-10 h-10 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center">
                    <span className="font-display font-bold text-sm text-ink-muted">
                      {item.author.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-display font-semibold text-ink">
                    {item.author}
                  </p>
                  {item.role && (
                    <p className="text-xs text-ink-faint">{item.role}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
