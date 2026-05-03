import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_HOST_SUFFIX = process.env.PLATFORM_HOST_SUFFIX ?? '.corredor.site';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') ?? '';
  const hostname = host.split(':')[0] ?? '';

  // HTTPS enforcement for custom domains (and platform subdomains in production)
  const proto = request.headers.get('x-forwarded-proto');
  if (proto === 'http' && !hostname.startsWith('localhost')) {
    return NextResponse.redirect(`https://${host}${pathname}${request.nextUrl.search}`, 301);
  }

  let subdomain: string | null = null;

  if (hostname.endsWith(PLATFORM_HOST_SUFFIX)) {
    subdomain = hostname.replace(PLATFORM_HOST_SUFFIX, '') || null;
  }

  const requestHeaders = new Headers(request.headers);
  if (subdomain) {
    requestHeaders.set('x-site-subdomain', subdomain);
  }
  requestHeaders.set('x-site-hostname', hostname);
  requestHeaders.set('x-site-pathname', pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
