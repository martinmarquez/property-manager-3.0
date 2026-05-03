import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveSite } from '../../lib/resolve-site';
import { getPage, getPageSlugs } from '../../lib/site-data';
import { BlockRenderer } from '../../blocks/BlockRenderer';

interface PageParams {
  params: Promise<{ slug?: string[] }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const siteData = await resolveSite();
  if (!siteData) return {};

  const pageSlug = slug?.join('/') ?? '/';
  const page = await getPage(siteData.id, pageSlug === '/' ? '/' : `/${pageSlug}`);
  if (!page) return {};

  const title = page.metaTitle ?? page.title;
  const description = page.metaDescription ?? undefined;

  return {
    title: `${title} — ${siteData.name}`,
    description,
    openGraph: {
      title,
      description,
      siteName: siteData.name,
      ...(page.ogImageUrl && { images: [{ url: page.ogImageUrl }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(page.ogImageUrl && { images: [page.ogImageUrl] }),
    },
  };
}

export default async function SitePage({ params }: PageParams): Promise<React.JSX.Element> {
  const { slug } = await params;
  const siteData = await resolveSite();
  if (!siteData) notFound();

  const pageSlug = slug?.join('/') ?? '/';
  const normalizedSlug = pageSlug === '/' ? '/' : `/${pageSlug}`;
  const page = await getPage(siteData.id, normalizedSlug);
  if (!page) notFound();

  return (
    <main className="flex-1">
      {page.blocks.map((block) => (
        <BlockRenderer
          key={block.id}
          block={block}
          tenantId={siteData.tenantId}
          siteId={siteData.id}
          pageId={page.id}
        />
      ))}
    </main>
  );
}
