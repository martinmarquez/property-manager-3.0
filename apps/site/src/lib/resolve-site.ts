import { headers } from 'next/headers';
import { getSiteBySubdomain, getSiteByCustomDomain } from './site-data';
import type { SiteData } from './types';

const PLATFORM_HOST_SUFFIX = process.env.PLATFORM_HOST_SUFFIX ?? '.corredor.site';

export async function resolveSite(): Promise<SiteData | null> {
  const headerStore = await headers();
  const host = headerStore.get('host') ?? '';
  const hostname = host.split(':')[0] ?? '';

  if (hostname.endsWith(PLATFORM_HOST_SUFFIX)) {
    const subdomain = hostname.replace(PLATFORM_HOST_SUFFIX, '');
    if (!subdomain) return null;
    return getSiteBySubdomain(subdomain);
  }

  if (!hostname) return null;
  return getSiteByCustomDomain(hostname);
}
