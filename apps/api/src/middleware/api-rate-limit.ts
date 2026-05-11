import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import { subscription } from '@corredor/db';
import { checkRateLimit, type RedisClient, type RateLimitConfig } from '@corredor/core';
import type { AnyDb } from '../trpc.js';
import type { ApiEnv } from './api-key-auth.js';

const TIER_LIMITS: Record<string, { capacity: number; refillRate: number; burst: number }> = {
  basico: { capacity: 60, refillRate: 60 / 60, burst: 100 },
  profesional: { capacity: 200, refillRate: 200 / 60, burst: 400 },
  agencia: { capacity: 600, refillRate: 600 / 60, burst: 1000 },
  enterprise: { capacity: 2000, refillRate: 2000 / 60, burst: 3000 },
  solo: { capacity: 60, refillRate: 60 / 60, burst: 100 },
  pro: { capacity: 200, refillRate: 200 / 60, burst: 400 },
};

const UNAUTHENTICATED_LIMIT: RateLimitConfig = {
  scope: 'public_api_unauth',
  capacity: 30,
  refillRate: 20 / 60,
};

const IMPORT_LIMIT: RateLimitConfig = {
  scope: 'public_api_import',
  capacity: 20,
  refillRate: 10 / 60,
};

const tierCache = new Map<string, { tier: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

async function resolveTier(db: AnyDb, tenantId: string): Promise<string> {
  const cached = tierCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.tier;

  const rows = await db
    .select({ planCode: subscription.planCode })
    .from(subscription)
    .where(eq(subscription.tenantId, tenantId))
    .limit(1);

  const tier = rows[0]?.planCode ?? 'basico';
  tierCache.set(tenantId, { tier, expiresAt: Date.now() + CACHE_TTL_MS });
  return tier;
}

export function apiRateLimiter(redis: RedisClient, db: AnyDb): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const tenantId = c.get('tenantId');
    const isImport = c.req.path.includes('/import/');

    if (!tenantId) {
      const ip =
        c.req.header('CF-Connecting-IP') ??
        c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
        'unknown';
      const key = `ratelimit:public_api_unauth:ip:${ip}`;
      const result = await checkRateLimit(redis, key, UNAUTHENTICATED_LIMIT);

      c.header('X-RateLimit-Limit', String(result.limit));
      c.header('X-RateLimit-Remaining', String(result.remaining));
      c.header('X-RateLimit-Reset', String(result.resetAt));

      if (!result.allowed) {
        c.header('Retry-After', String(result.retryAfterSeconds));
        return c.json(
          { error: { code: 'rate_limited', message: 'Too many requests', retryAfter: result.retryAfterSeconds } },
          429,
        );
      }

      return next();
    }

    const tier = await resolveTier(db, tenantId);
    const limits = TIER_LIMITS[tier] ?? TIER_LIMITS['basico']!;
    const config: RateLimitConfig = isImport
      ? IMPORT_LIMIT
      : { scope: 'public_api', capacity: limits.burst, refillRate: limits.refillRate };

    const apiKeyId = c.get('apiKeyId') ?? tenantId;
    const key = `ratelimit:${config.scope}:key:${apiKeyId}`;
    const result = await checkRateLimit(redis, key, config);

    c.header('X-RateLimit-Limit', String(limits.capacity));
    c.header('X-RateLimit-Remaining', String(result.remaining));
    c.header('X-RateLimit-Reset', String(result.resetAt));

    if (!result.allowed) {
      c.header('Retry-After', String(result.retryAfterSeconds));
      return c.json(
        { error: { code: 'rate_limited', message: 'Too many requests', retryAfter: result.retryAfterSeconds } },
        429,
      );
    }

    return next();
  };
}
