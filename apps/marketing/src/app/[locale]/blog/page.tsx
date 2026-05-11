import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { locales, type Locale } from '@/lib/i18n/config';
import { Link } from '@/lib/i18n/navigation';
import { BLOG_POSTS } from '@/lib/blog/posts';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Novedades, guías y mejores prácticas para la inmobiliaria moderna.',
};

interface BlogPageProps {
  params: Promise<{ locale: string }>;
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BlogContent locale={locale as Locale} />;
}

const categoryColors: Record<string, string> = {
  product: 'bg-brand-faint text-brand-600 dark:text-brand-400',
  guides: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  news: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  market: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
};

function BlogContent({ locale }: { locale: Locale }) {
  const t = useTranslations('blog');
  const featured = BLOG_POSTS[0];
  const rest = BLOG_POSTS.slice(1);

  return (
    <>
      <section className="relative overflow-hidden bg-dark-base pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="dot-grid absolute inset-0 opacity-30" />
        <div className="hero-glow absolute inset-0" />
        <div className="section-container relative text-center">
          <h1 className="font-display text-display-xl text-dark-text-primary opacity-0 animate-fade-up md:text-display-2xl">{t('title')}</h1>
          <p className="mx-auto mt-6 max-w-xl text-body-lg text-dark-text-secondary opacity-0 animate-fade-up delay-100">{t('subtitle')}</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="section-container">
          <Link href={`/blog/${featured.slug}` as '/blog/lanzamiento-corredor'} className="group block rounded-2xl border border-border bg-surface-base p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-dark-border dark:bg-dark-raised md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-brand-600 px-3 py-1 text-body-xs font-semibold text-white">{t('featured')}</span>
                  <span className={`rounded-full px-3 py-1 text-body-xs font-medium ${categoryColors[featured.category]}`}>{t(`categories.${featured.category}`)}</span>
                </div>
                <h2 className="mt-4 font-display text-display-sm text-ink group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors md:text-display-md">{featured.content[locale].title}</h2>
                <p className="mt-3 text-body-md text-ink-secondary line-clamp-2">{featured.content[locale].excerpt}</p>
                <div className="mt-4 flex items-center gap-4 text-body-sm text-ink-tertiary">
                  <span>{featured.author.name}</span>
                  <span aria-hidden="true">·</span>
                  <span>{featured.date}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t('readTime', { min: featured.readTime })}</span>
                </div>
              </div>
              <div className="h-48 w-full rounded-xl bg-gradient-to-br from-brand-600/20 to-accent-500/20 md:h-56 md:w-80 shrink-0" />
            </div>
          </Link>

          <h2 className="mt-16 font-display text-display-sm text-ink">{t('allPosts')}</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}` as '/blog/lanzamiento-corredor'} className="group flex flex-col rounded-xl border border-border bg-surface-base transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-dark-border dark:bg-dark-raised">
                <div className="h-40 rounded-t-xl bg-gradient-to-br from-brand-600/10 to-accent-500/10" />
                <div className="flex flex-1 flex-col p-5">
                  <span className={`self-start rounded-full px-3 py-1 text-body-xs font-medium ${categoryColors[post.category]}`}>{t(`categories.${post.category}`)}</span>
                  <h3 className="mt-3 font-body text-heading-sm text-ink group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">{post.content[locale].title}</h3>
                  <p className="mt-2 text-body-sm text-ink-secondary line-clamp-2 flex-1">{post.content[locale].excerpt}</p>
                  <div className="mt-4 flex items-center justify-between text-body-xs text-ink-tertiary">
                    <span>{post.date}</span>
                    <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-medium">{t('readMore')} <ArrowRight size={14} /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
