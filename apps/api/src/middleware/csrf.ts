import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Context, MiddlewareHandler, Next } from 'hono';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_TTL_SECONDS = 24 * 60 * 60; // 1 day

/** HTTP methods that require CSRF validation. */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Generate a cryptographically random CSRF token (256-bit hex). */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Read the CSRF token from the readable (non-httpOnly) cookie.
 * Returns undefined if not set.
 */
export function getCsrfCookieToken(c: Context): string | undefined {
  const cookie = c.req.header('cookie') ?? '';
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key?.trim() === CSRF_COOKIE && rest.length > 0) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

/**
 * Set the readable CSRF cookie on the response.
 * NOT httpOnly — the frontend JavaScript must read this value to include it as a header.
 */
export function setCsrfCookie(c: Context, token: string, isSecure: boolean): void {
  const secure = isSecure ? '; Secure' : '';
  c.header(
    'Set-Cookie',
    `${CSRF_COOKIE}=${token}${secure}; SameSite=Strict; Max-Age=${CSRF_TTL_SECONDS}; Path=/`,
    { append: true },
  );
}

/**
 * Hono middleware implementing the CSRF double-submit cookie pattern.
 *
 * On GET/HEAD/OPTIONS: if no CSRF cookie exists, set one.
 * On POST/PUT/PATCH/DELETE: validate that the X-CSRF-Token header matches the cookie.
 *
 * The tRPC client (apps/web) is responsible for reading the csrf_token cookie
 * and including it as the X-CSRF-Token header on all mutations.
 */
export function csrfMiddleware(isSecure = false): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const method = c.req.method.toUpperCase();

    if (MUTATING_METHODS.has(method)) {
      const cookieToken = getCsrfCookieToken(c);
      const headerToken = c.req.header(CSRF_HEADER);

      // Skip CSRF for tRPC subscriptions (SSE) — they use GET
      // Skip for internal health checks and webhook ingestion
      const path = c.req.path;
      if (path.startsWith('/webhooks/') || path === '/health') {
        return next();
      }

      const tokensMatch =
        cookieToken &&
        headerToken &&
        cookieToken.length === headerToken.length &&
        timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
      if (!tokensMatch) {
        return c.json({ error: 'CSRF token mismatch' }, 403);
      }
    } else {
      // Ensure every browser session has a CSRF token set
      const existing = getCsrfCookieToken(c);
      if (!existing) {
        const token = generateCsrfToken();
        setCsrfCookie(c, token, isSecure);
      }
    }

    return next();
  };
}
