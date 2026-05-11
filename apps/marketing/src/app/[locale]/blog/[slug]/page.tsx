import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { locales, type Locale } from '@/lib/i18n/config';
import { Link } from '@/lib/i18n/navigation';
import { BLOG_POSTS, getPostBySlug } from '@/lib/blog/posts';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of locales) {
    for (const post of BLOG_POSTS) {
      params.push({ locale, slug: post.slug });
    }
  }
  return params;
}

interface BlogPostPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const loc = locale as Locale;
  return {
    title: post.content[loc].title,
    description: post.content[loc].excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = getPostBySlug(slug);
  if (!post) notFound();
  return <BlogPostContent locale={locale as Locale} slug={slug} />;
}

const categoryColors: Record<string, string> = {
  product: 'bg-brand-faint text-brand-600 dark:text-brand-400',
  guides: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  news: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  market: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
};

function BlogPostContent({ locale, slug }: { locale: Locale; slug: string }) {
  const t = useTranslations('blog');
  const post = getPostBySlug(slug)!;
  const { title, body } = post.content[locale];
  const related = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <>
      <section className="relative overflow-hidden bg-dark-base pt-28 pb-16 md:pt-36 md:pb-20">
        <div className="dot-grid absolute inset-0 opacity-20" />
        <div className="hero-glow absolute inset-0" />
        <div className="section-container relative">
          <Link href="/blog" className="inline-flex items-center gap-2 text-body-sm text-dark-text-tertiary hover:text-dark-text-primary transition-colors mb-8">
            <ArrowLeft size={16} /> {t('title')}
          </Link>
          <span className={`rounded-full px-3 py-1 text-body-xs font-medium ${categoryColors[post.category]}`}>{t(`categories.${post.category}`)}</span>
          <h1 className="mt-4 font-display text-display-lg text-dark-text-primary md:text-display-xl max-w-4xl">{title}</h1>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-body-xs font-bold text-white">{post.author.initials}</div>
            <div>
              <p className="text-body-sm text-dark-text-primary font-medium">{post.author.name}</p>
              <p className="text-body-xs text-dark-text-tertiary">{post.date} · {t('readTime', { min: post.readTime })}</p>
            </div>
          </div>
        </div>
      </section>

      <article className="section-padding">
        <div className="section-container">
          <div className="mx-auto max-w-prose">
            <MarkdownBody content={body} />
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="section-padding bg-surface-subtle dark:bg-dark-raised">
          <div className="section-container">
            <h2 className="font-display text-display-sm text-ink">{t('allPosts')}</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {related.map((rPost) => (
                <Link key={rPost.slug} href={`/blog/${rPost.slug}` as '/blog/lanzamiento-corredor'} className="group flex flex-col rounded-xl border border-border bg-surface-base p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-dark-border dark:bg-dark-elevated">
                  <span className={`self-start rounded-full px-3 py-1 text-body-xs font-medium ${categoryColors[rPost.category]}`}>{t(`categories.${rPost.category}`)}</span>
                  <h3 className="mt-3 font-body text-heading-sm text-ink group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{rPost.content[locale].title}</h3>
                  <p className="mt-2 text-body-sm text-ink-secondary line-clamp-2 flex-1">{rPost.content[locale].excerpt}</p>
                  <span className="mt-4 flex items-center gap-1 text-body-sm text-brand-600 dark:text-brand-400 font-medium">{t('readMore')} <ArrowRight size={14} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function MarkdownBody({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-4 flex flex-col gap-2 pl-5 list-disc marker:text-brand-500">
          {listItems.map((item, i) => (
            <li key={i} className="text-body-md text-ink-secondary leading-relaxed pl-1">
              <InlineText text={item} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={`h-${elements.length}`} className="mt-10 mb-4 font-display text-display-sm text-ink">{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={`h-${elements.length}`} className="mt-8 mb-3 font-body text-heading-md text-ink">{trimmed.slice(4)}</h3>);
    } else if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      elements.push(<p key={`p-${elements.length}`} className="my-4 text-body-md text-ink-secondary leading-relaxed"><InlineText text={trimmed} /></p>);
    }
  }
  flushList();
  return <div>{elements}</div>;
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-ink font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
