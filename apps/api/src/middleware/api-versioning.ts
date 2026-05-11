import type { MiddlewareHandler } from 'hono';
import type { RequestIdVariables } from 'hono/request-id';

export function versionHeaders(): MiddlewareHandler<{ Variables: RequestIdVariables }> {
  return async (c, next) => {
    c.header('X-API-Version', 'v1');
    c.header('X-Request-Id', c.get('requestId') ?? crypto.randomUUID());
    await next();
  };
}

export function deprecatedEndpoint(sunsetDate: string, message?: string): MiddlewareHandler {
  return async (c, next) => {
    c.header('Deprecation', 'true');
    c.header('Sunset', new Date(sunsetDate).toUTCString());
    if (message) {
      c.header('X-Deprecation-Notice', message);
    }
    await next();
  };
}
