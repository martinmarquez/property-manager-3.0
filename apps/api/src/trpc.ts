import { initTRPC, TRPCError } from '@trpc/server';
import type { Context as HonoContext } from 'hono';
import type { Redis } from 'ioredis';
import type { Queue } from 'bullmq';
import { ZodError } from 'zod';
import { createDb, setTenantContext as setTenantCtxDb } from '@corredor/db';
import { checkRateLimit, RateLimitPresets } from '@corredor/core';
import { logger } from '@corredor/telemetry';
import { getSession, refreshSession, destroySession, getSessionId, IDLE_TIMEOUT_SECONDS } from './middleware/session.js';

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
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
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
  const { sessionId, redis, requestId } = ctx;

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
