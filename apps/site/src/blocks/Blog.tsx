import type React from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import type { BlogProps } from '../lib/types';

export function Blog(props: BlogProps): React.JSX.Element | null {
  const { title = 'Blog', posts = [], layout = 'grid' } = props;

  if (posts.length === 0) return null;

  return (
    <section className="site-section py-16 md:py-24">
      <div className="site-container">
        <div className="mb-10">
          <h2 className="site-heading text-2xl md:text-3xl text-ink">{title}</h2>
          <div className="mt-3 h-[2px] w-12 bg-accent rounded-full" />
        </div>

        <div
          className={
            layout === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
              : 'flex flex-col gap-4'
          }
        >
          {posts.map((post, i) =>
            layout === 'grid' ? (
              <a
                key={i}
                href={post.href}
                className="group block rounded-site overflow-hidden bg-surface-raised border border-divider hover:border-accent/40 transition-colors"
              >
                {post.imageUrl && (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-5 space-y-2">
                  <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                    <Calendar className="w-3 h-3" />
                    {post.date}
                  </p>
                  <h3 className="font-display font-semibold text-ink text-base group-hover:text-accent transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-ink-muted line-clamp-2 font-body">
                    {post.excerpt}
                  </p>
                </div>
              </a>
            ) : (
              <a
                key={i}
                href={post.href}
                className="group flex gap-5 p-4 rounded-site bg-surface-raised border border-divider hover:border-accent/40 transition-colors"
              >
                {post.imageUrl && (
                  <div className="w-32 h-24 flex-shrink-0 rounded-site overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-ink-faint">{post.date}</p>
                  <h3 className="font-display font-semibold text-ink text-sm group-hover:text-accent transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-ink-muted line-clamp-2 font-body">
                    {post.excerpt}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-faint group-hover:text-accent transition-colors mt-1 flex-shrink-0" />
              </a>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
