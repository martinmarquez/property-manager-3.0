import type { Context, MiddlewareHandler, Next } from "hono";
import { crypto } from "hono/utils/crypto";

/**
 * Options for the security headers middleware.
 * All fields are optional — defaults enforce the strictest posture.
 */
export interface SecurityHeadersOptions {
  /**
   * Whether this request is for the API only (no inline scripts expected).
   * When true, CSP uses `script-src 'none'`.
   * When false (web app), a per-request nonce is generated for inline scripts.
   * @default true
   */
  apiMode?: boolean;

  /**
   * Override the Content-Security-Policy header entirely.
   * Useful for specific routes that need relaxed policies (e.g. Swagger UI).
   * Setting to `false` disables CSP header entirely.
   */
  csp?: string | false;

  /**
   * Override the frame options. Set to `false` to allow framing (not recommended).
   * @default "DENY"
   */
  frameOptions?: "DENY" | "SAMEORIGIN" | false;

  /**
   * HSTS max-age in seconds.
   * @default 31536000 (1 year)
   */
  hstsMaxAge?: number;

  /**
   * Whether to include HSTS `includeSubDomains` directive.
   * @default true
   */
  hstsIncludeSubDomains?: boolean;

  /**
   * Whether to include HSTS `preload` directive.
   * Only set true once the domain is on the HSTS preload list.
   * @default false
   */
  hstsPreload?: boolean;
}

/**
 * Context key to retrieve the CSP nonce generated for the current request.
 * Use this in SSR templates to allow specific inline scripts.
 *
 * @example
 * const nonce = c.get(CSP_NONCE_KEY);
 * return c.html(`<script nonce="${nonce}">...</script>`);
 */
export const CSP_NONCE_KEY = "cspNonce" as const;

/**
 * Generates a cryptographically random nonce for CSP.
 * 128 bits of entropy, base64url-encoded.
 */
async function generateNonce(): Promise<string> {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Builds the Content-Security-Policy header value.
 *
 * API mode: strict policy with no script execution (REST/tRPC API servers)
 * Web mode: nonce-based policy allowing only nonced inline scripts
 */
function buildCSP(options: { apiMode: boolean; nonce?: string }): string {
  const { apiMode, nonce } = options;

  if (apiMode) {
    // Strict API CSP — no scripts, no frames, no plugins
    return [
      "default-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'none'",
      "base-uri 'none'",
      "upgrade-insecure-requests",
    ].join("; ");
  }

  // Web app CSP — nonce-based for inline scripts
  // Trusted external sources are listed explicitly; no wildcards
  const scriptSrc = nonce
    ? `script-src 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`
    : "script-src 'none'";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'", // shadcn/Radix injects styles; tighten post-launch
    "img-src 'self' data: blob: https://imagedelivery.net", // Cloudflare Images
    "font-src 'self' data:",
    "connect-src 'self' https://api.corredor.ar wss://api.corredor.ar",
    "media-src 'self' https://stream.mux.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Hono middleware that sets secure HTTP response headers on every response.
 *
 * Headers set:
 * - Content-Security-Policy (nonce-based for web, strict-deny for API)
 * - Strict-Transport-Security (HSTS, 1 year)
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Permissions-Policy (camera, mic, geolocation disabled)
 * - X-Powered-By: removed (no server fingerprinting)
 *
 * @example
 * // In apps/api/src/index.ts
 * import { securityHeaders } from "@corredor/core/middleware/security-headers";
 *
 * const app = new Hono();
 * app.use("*", securityHeaders({ apiMode: true }));
 *
 * @example
 * // In apps/web SSR server
 * app.use("*", securityHeaders({ apiMode: false }));
 * app.get("/", (c) => {
 *   const nonce = c.get(CSP_NONCE_KEY);
 *   return c.html(`<script nonce="${nonce}">initApp()</script>`);
 * });
 */
export function securityHeaders(
  opts: SecurityHeadersOptions = {}
): MiddlewareHandler {
  const {
    apiMode = true,
    csp: cspOverride,
    frameOptions = "DENY",
    hstsMaxAge = 31536000,
    hstsIncludeSubDomains = true,
    hstsPreload = false,
  } = opts;

  return async (c: Context, next: Next) => {
    // Generate a per-request nonce for web mode
    const nonce = !apiMode ? await generateNonce() : undefined;
    if (nonce) {
      c.set(CSP_NONCE_KEY, nonce);
    }

    await next();

    // Remove server fingerprinting headers
    c.res.headers.delete("X-Powered-By");
    c.res.headers.delete("Server");

    // Content-Security-Policy
    if (cspOverride !== false) {
      const cspValue =
        cspOverride ?? buildCSP({ apiMode, nonce });
      c.res.headers.set("Content-Security-Policy", cspValue);
    }

    // Strict-Transport-Security
    const hstsParts = [`max-age=${hstsMaxAge}`];
    if (hstsIncludeSubDomains) hstsParts.push("includeSubDomains");
    if (hstsPreload) hstsParts.push("preload");
    c.res.headers.set("Strict-Transport-Security", hstsParts.join("; "));

    // X-Content-Type-Options
    c.res.headers.set("X-Content-Type-Options", "nosniff");

    // X-Frame-Options
    if (frameOptions !== false) {
      c.res.headers.set("X-Frame-Options", frameOptions);
    }

    // Referrer-Policy
    c.res.headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin"
    );

    // Permissions-Policy — disable sensitive browser APIs
    c.res.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
    );

    // Cross-Origin policies
    c.res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    c.res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    c.res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");

    // Cache control for sensitive API responses
    // Individual routes can override this for public/cacheable data
    if (apiMode) {
      if (!c.res.headers.has("Cache-Control")) {
        c.res.headers.set(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate"
        );
      }
    }
  };
}

/**
 * Pre-configured middleware for the Corredor REST/tRPC API server (apps/api).
 * Uses strict API mode — no scripts, full deny-by-default CSP.
 */
export const apiSecurityHeaders = securityHeaders({ apiMode: true });

/**
 * Pre-configured middleware for the Corredor web app SSR server.
 * Uses nonce-based CSP for inline script support.
 */
export const webSecurityHeaders = securityHeaders({ apiMode: false });

/**
 * Pre-configured middleware for Swagger/OpenAPI UI routes.
 * Relaxed CSP to allow Swagger UI assets from CDN — only use on /docs routes.
 * DO NOT use on any route that processes user data.
 */
export const swaggerSecurityHeaders = securityHeaders({
  apiMode: false,
  csp: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "img-src 'self' data:",
    "frame-ancestors 'none'",
  ].join("; "),
});
