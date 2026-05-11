import type { MiddlewareHandler } from 'hono';
import { createHash } from 'node:crypto';
import { eq, isNull, and } from 'drizzle-orm';
import { apiKey } from '@corredor/db';
import type { AnyDb } from '../trpc.js';

export interface ApiKeyContext {
  tenantId: string;
  apiKeyId: string;
  scopes: string[];
}

export type ApiEnv = {
  Variables: {
    tenantId: string;
    apiKeyId: string;
    scopes: string[];
    apiKey: ApiKeyContext;
  };
};

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function apiKeyAuth(db: AnyDb): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(
        { error: { code: 'unauthorized', message: 'Missing or invalid Authorization header' } },
        401,
      );
    }

    const rawKey = authHeader.slice(7);
    if (!rawKey || rawKey.length < 16) {
      return c.json(
        { error: { code: 'unauthorized', message: 'Invalid API key format' } },
        401,
      );
    }

    const hash = hashKey(rawKey);

    const rows = await db
      .select({
        id: apiKey.id,
        tenantId: apiKey.tenantId,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        revokedAt: apiKey.revokedAt,
      })
      .from(apiKey)
      .where(and(eq(apiKey.keyHash, hash), isNull(apiKey.deletedAt)))
      .limit(1);

    if (rows.length === 0) {
      return c.json(
        { error: { code: 'unauthorized', message: 'Invalid API key' } },
        401,
      );
    }

    const key = rows[0]!;

    if (key.revokedAt) {
      return c.json(
        { error: { code: 'unauthorized', message: 'API key has been revoked' } },
        401,
      );
    }

    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return c.json(
        { error: { code: 'unauthorized', message: 'API key has expired' } },
        401,
      );
    }

    db.update(apiKey)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKey.id, key.id))
      .then(() => {})
      .catch(() => {});

    const ctx: ApiKeyContext = {
      tenantId: key.tenantId,
      apiKeyId: key.id,
      scopes: (key.scopes as string[]) ?? [],
    };

    c.set('apiKey', ctx);
    c.set('tenantId', ctx.tenantId);
    c.set('apiKeyId', ctx.apiKeyId);
    c.set('scopes', ctx.scopes);

    return next();
  };
}

export function requireScopes(...requiredScopes: string[]): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const keyScopes = c.get('scopes') ?? [];
    const missing = requiredScopes.filter((s) => !keyScopes.includes(s));
    if (missing.length > 0) {
      return c.json(
        {
          error: {
            code: 'forbidden',
            message: `API key lacks required scope(s): ${missing.join(', ')}`,
          },
        },
        403,
      );
    }
    return next();
  };
}
