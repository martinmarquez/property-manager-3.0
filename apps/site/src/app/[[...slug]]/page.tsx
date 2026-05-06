import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { resolveSite } from '../../lib/resolve-site';
import { getPage, getPageSlugs } from '../../lib/site-data';
import { BlockRenderer } from '../../blocks/BlockRenderer';

interface PageParams {
  params: Promise<{ slug?: string[] }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  try {
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
  } catch (error) {
    console.error('Error in generateMetadata:', error);
    return {};
  }
}

export async function generateStaticParams() {
  try {
    const siteData = await resolveSite();
    if (!siteData) return [];

    const slugs = await getPageSlugs(siteData.id);
    return slugs.map((slug) => ({
      slug: slug === '/' ? [] : slug.split('/').filter(Boolean),
    }));
  } catch (error) {
    console.error('Error in generateStaticParams:', error);
    return [];
  }
}

export default async function SitePage({ params }: PageParams): Promise<React.JSX.Element> {
  try {
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
          <Suspense key={block.id} fallback={<div className="min-h-[520px]" />}>
            <BlockRenderer
              block={block}
              tenantId={siteData.tenantId}
              siteId={siteData.id}
              pageId={page.id}
            />
          </Suspense>
        ))}
      </main>
    );
  } catch (error) {
    console.error('Error rendering page:', error);
    throw error;
  }
}
