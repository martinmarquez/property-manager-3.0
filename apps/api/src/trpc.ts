import { initTRPC, TRPCError } from '@trpc/server';
import type { Context as HonoContext } from 'hono';
import type { Redis } from 'ioredis';
import type { Queue } from 'bullmq';
import { ZodError } from 'zod';
import { createDb, setTenantContext as setTenantCtxDb } from '@corredor/db';
import { checkRateLimit, RateLimitPresets } from '@corredor/core';
import { logger } from '@corredor/telemetry';
import { getSession, refreshSession, destroySession, getSessionId, IDLE_TIMEOUT_SECONDS } from './middleware/session.js';
import { createHash } from 'node:crypto';
import { eq, isNull, and } from 'drizzle-orm';
import { apiKey as apiKeyTable } from '@corredor/db';
import { FeatureGateError, assertFeature } from './lib/billing/assert-feature.js';

// In-process API key cache: hash → key payload. 5-minute TTL.
// Eliminates 1 DB query per request for Bearer-token authenticated clients.
const _apiKeyCache = new Map<string, {
  id: string; tenantId: string; createdBy: string | null;
  scopes: unknown; expiresAt: Date | null; revokedAt: Date | null;
  expiresAt_cache: number;
}>();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Union-compatible DB type that covers both the top-level NeonHttpDatabase
 * and the PgTransaction handle used inside db.transaction() callbacks.
 * Using a structural duck-type keeps the context type stable across the tx boundary.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDb = Pick<ReturnType<typeof createDb>, 'execute' | 'select' | 'insert' | 'update' | 'delete' | 'query' | 'transaction'> & Record<string, any>;

export interface TRPCContext {
  /** Raw Hono context — do not use for DB queries (no RLS). */
  c: HonoContext;
  /** Request ID (from hono/request-id middleware). */
  requestId: string;
  /** Base Drizzle DB client — no RLS active until txMiddleware runs. */
  db: AnyDb;
  /** Upstash/ioredis client for sessions and rate-limiting. */
  redis: Redis;
  /** Session ID from cookie (may be undefined for unauthenticated requests). */
  sessionId: string | undefined;
  /**
   * Pre-initialized BullMQ queues keyed by queue name.
   * Always present (defaults to `{}`); populated when queues are co-located with the API.
   * Procedures guard with `if (queue)` before enqueuing.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queues: Record<string, Queue<any, any, string> | undefined>;
}

/** Context available after tenantMiddleware. */
export interface AuthenticatedContext extends TRPCContext {
  tenantId: string;
  userId: string;
  sessionId: string;
  roles: string[];
  db: AnyDb;
}

// ---------------------------------------------------------------------------
// Context factory — called by tRPC on every request
// ---------------------------------------------------------------------------

export interface CreateContextOptions {
  c: HonoContext;
  db: AnyDb;
  redis: Redis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queues?: Record<string, Queue<any, any, string> | undefined>;
}

export function createContext({ c, db, redis, queues }: CreateContextOptions): TRPCContext {
  return {
    c,
    requestId: (c.get('requestId') as string | undefined) ?? crypto.randomUUID(),
    db,
    redis,
    sessionId: getSessionId(c),
    queues: queues ?? {},
  };
}

// ---------------------------------------------------------------------------
// tRPC init
// ---------------------------------------------------------------------------

const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: process.env['NODE_ENV'] !== 'production' && error.cause instanceof ZodError ? error.cause.flatten() : null,
        upsell: error.cause instanceof FeatureGateError
          ? { requiredPlan: error.cause.requiredPlan, featureName: error.cause.featureName }
          : null,
      },
    };
  },
});

export const { router, middleware } = t;

// ---------------------------------------------------------------------------
// Middleware: tenant context
// Reads session from Redis, validates it, sets tenantId + userId on context.
// ---------------------------------------------------------------------------

const tenantMiddleware = middleware(async ({ ctx, next }) => {
  const { sessionId, redis, requestId, c, db } = ctx;

  // API key Bearer token auth — allows programmatic clients (e.g. k6 load tests)
  // to authenticate without a browser session and Redis.
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const rawKey = authHeader.slice(7);
    if (!rawKey || rawKey.length < 16) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid API key format' });
    }
    const hash = createHash('sha256').update(rawKey).digest('hex');

    let key: typeof _apiKeyCache extends Map<string, infer V> ? V : never;
    const cachedKey = _apiKeyCache.get(hash);
    if (cachedKey && cachedKey.expiresAt_cache > Date.now()) {
      key = cachedKey;
    } else {
      _apiKeyCache.delete(hash);
      const rows = await db
        .select({
          id: apiKeyTable.id,
          tenantId: apiKeyTable.tenantId,
          createdBy: apiKeyTable.createdBy,
          scopes: apiKeyTable.scopes,
          expiresAt: apiKeyTable.expiresAt,
          revokedAt: apiKeyTable.revokedAt,
        })
        .from(apiKeyTable)
        .where(and(eq(apiKeyTable.keyHash, hash), isNull(apiKeyTable.deletedAt)))
        .limit(1);

      if (rows.length === 0) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid API key' });
      }
      key = { ...rows[0]!, expiresAt_cache: Date.now() + 5 * 60_000 };
      _apiKeyCache.set(hash, key);
    }
    if (key.revokedAt || (key.expiresAt && new Date(key.expiresAt) < new Date())) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'API key is revoked or expired' });
    }

    db.update(apiKeyTable).set({ lastUsedAt: new Date() }).where(eq(apiKeyTable.id, key.id))
      .then(() => {}).catch(() => {});

    logger.info('tenant context resolved via API key', { tenantId: key.tenantId, requestId });

    return next({
      ctx: {
        ...ctx,
        tenantId: key.tenantId,
        userId: key.createdBy ?? key.tenantId,
        roles: (key.scopes as string[]) ?? [],
        sessionId: `apikey:${key.id}`,
        queues: ctx.queues,
      } satisfies AuthenticatedContext,
    });
  }

  if (!sessionId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No session cookie' });
  }

  const session = await getSession(redis, sessionId);
  if (!session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session expired or invalid' });
  }

  // ASVS V3.3.2 — enforce 30-minute idle timeout
  const idleSeconds = (Date.now() - new Date(session.lastSeenAt).getTime()) / 1000;
  if (idleSeconds > IDLE_TIMEOUT_SECONDS) {
    await destroySession(redis, sessionId);
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session expired due to inactivity' });
  }

  // Slide the session TTL on each authenticated request
  await refreshSession(redis, sessionId, session);

  logger.info('tenant context resolved', {
    tenantId: session.tenantId,
    userId: session.userId,
    requestId,
  });

  return next({
    ctx: {
      ...ctx,
      tenantId: session.tenantId,
      userId: session.userId,
      roles: session.roles,
      sessionId,
      queues: ctx.queues,
    } satisfies AuthenticatedContext,
  });
});

// ---------------------------------------------------------------------------
// Middleware: RBAC
// Validates the session has at least one assigned role.  Fine-grained
// per-procedure permission checks use requirePermission() from lib/auth/rbac.
// ---------------------------------------------------------------------------

const rbacMiddleware = middleware(async ({ ctx, next }) => {
  const authenticatedCtx = ctx as unknown as AuthenticatedContext;
  if (!authenticatedCtx.roles || authenticatedCtx.roles.length === 0) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No roles assigned to this user' });
  }
  return next({ ctx });
});

// ---------------------------------------------------------------------------
// Middleware: rate limiter (per-user token bucket via Redis)
// ---------------------------------------------------------------------------

const rateLimitMiddleware = middleware(async ({ ctx, next }) => {
  const { redis, c } = ctx;
  const authenticatedCtx = ctx as unknown as AuthenticatedContext;

  // Skip rate limiting if Redis is not ready — fail-open so staging without
  // Redis still serves requests. Production always has Redis provisioned.
  // Also skip for API key auth — keys are pre-authorized machine clients (e.g. k6).
  if (redis.status !== 'ready' || authenticatedCtx.sessionId?.startsWith('apikey:')) {
    return next({ ctx });
  }

  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown';

  // Use per-user key for authenticated requests
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method.toUpperCase());
  const preset = isWrite
    ? RateLimitPresets.API_WRITE_AUTHENTICATED
    : RateLimitPresets.API_READ_AUTHENTICATED;
  const key = `ratelimit:${preset.scope}:user:${authenticatedCtx.tenantId}:${authenticatedCtx.userId}`;

  const result = await checkRateLimit(redis, key, preset);

  c.header('X-RateLimit-Limit', String(result.limit));
  c.header('X-RateLimit-Remaining', String(result.remaining));
  c.header('X-RateLimit-Reset', String(result.resetAt));

  if (!result.allowed) {
    c.header('Retry-After', String(result.retryAfterSeconds));
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Retry in ${result.retryAfterSeconds}s`,
    });
  }

  // Fallback IP check (belt-and-suspenders against anonymous bursts)
  const ipKey = `ratelimit:ip_fallback:${ip}`;
  const ipResult = await checkRateLimit(redis, ipKey, {
    scope: 'ip_fallback',
    capacity: 300,
    refillRate: 300 / 60,
  });

  if (!ipResult.allowed) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'IP rate limit exceeded' });
  }

  return next({ ctx });
});

// ---------------------------------------------------------------------------
// Middleware: audit log
// Logs every mutation to stdout and emits a structured telemetry event.
// Domain-specific audit rows (e.g. user.login) are written inline by the
// procedure itself using writeAuthAudit() from lib/auth/audit.ts so they
// participate in the same DB transaction.
// ---------------------------------------------------------------------------

const auditLogMiddleware = middleware(async ({ ctx, next, path, type }) => {
  const authenticatedCtx = ctx as unknown as AuthenticatedContext;
  const startedAt = Date.now();

  const result = await next({ ctx });

  if (type === 'mutation') {
    const durationMs = Date.now() - startedAt;
    logger.info('audit: mutation completed', {
      path,
      tenantId: authenticatedCtx.tenantId,
      userId: authenticatedCtx.userId,
      requestId: authenticatedCtx.requestId,
      durationMs,
    });
  }

  return result;
});

// ---------------------------------------------------------------------------
// Middleware: transaction wrapper
// Wraps all tRPC calls in a Postgres transaction and activates RLS.
// ---------------------------------------------------------------------------

const txMiddleware = middleware(async ({ ctx, next }) => {
  const authenticatedCtx = ctx as unknown as AuthenticatedContext;
  const { tenantId, userId, db } = authenticatedCtx;

  // Neon HTTP driver supports interactive transactions via the /transaction endpoint
  return db.transaction(async (tx) => {
    // Activate RLS for this transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await setTenantCtxDb(tx as any, tenantId, userId);

    return next({
      ctx: {
        ...authenticatedCtx,
        // Replace base db with the transaction handle (RLS is now active)
        db: tx as AnyDb,
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Procedure builders
// ---------------------------------------------------------------------------

/** Open to the public — no authentication required. */
export const publicProcedure = t.procedure;

/**
 * Authenticated procedure: tenantContext → rbac → rateLimit → auditLog → txWrapper.
 * All downstream procedures get a typed context with tenantId, userId, roles, and
 * a transaction-scoped DB handle with RLS active.
 */
export const protectedProcedure = t.procedure
  .use(tenantMiddleware)
  .use(rbacMiddleware)
  .use(rateLimitMiddleware)
  .use(auditLogMiddleware)
  .use(txMiddleware);

/**
 * Like protectedProcedure but without the transaction wrapper.
 * Use for long-running operations (e.g. LLM calls) that should not hold
 * a DB connection open. The handler must manage its own DB access.
 */
export const protectedProcedureNoTx = t.procedure
  .use(tenantMiddleware)
  .use(rbacMiddleware)
  .use(rateLimitMiddleware)
  .use(auditLogMiddleware);

const publicRateLimitMiddleware = middleware(async ({ ctx, next }) => {
  const { redis, c } = ctx;

  if (redis.status !== 'ready') {
    return next({ ctx });
  }

  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown';

  const key = `ratelimit:${RateLimitPresets.AUTH_REGISTER.scope}:ip:${ip}`;
  const result = await checkRateLimit(redis, key, RateLimitPresets.AUTH_REGISTER);

  if (!result.allowed) {
    c.header('Retry-After', String(result.retryAfterSeconds));
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Retry in ${result.retryAfterSeconds}s`,
    });
  }

  return next({ ctx });
});

/** Public procedure with IP-based rate limiting. Use for auth endpoints to prevent brute-force. */
export const publicRateLimitedProcedure = t.procedure.use(publicRateLimitMiddleware);

/**
 * Middleware factory that gates a procedure on a plan_feature key.
 * Throws FORBIDDEN with an upsell payload when the tenant's plan
 * does not include the feature.
 *
 * Usage:
 *   const siteProcedure = protectedProcedure.use(withFeatureGate('site_builder'));
 */
export function withFeatureGate(featureKey: string) {
  return middleware(async ({ ctx, next }) => {
    const authedCtx = ctx as unknown as AuthenticatedContext;
    await assertFeature(authedCtx, featureKey);
    return next({
      ctx: {
        tenantId: authedCtx.tenantId,
        userId: authedCtx.userId,
        sessionId: authedCtx.sessionId,
        roles: authedCtx.roles,
      },
    });
  });
}
