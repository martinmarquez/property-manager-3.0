/**
 * Tenant context helpers for multi-tenant Postgres RLS enforcement.
 *
 * Every tRPC procedure that touches tenant data must run through these helpers.
 * The `setTenantContext` function injects `app.tenant_id` and `app.user_id` as
 * Postgres session variables so that RLS policies on all 150 tables can apply
 * `current_setting('app.tenant_id')` without any application-layer filtering.
 *
 * Usage in tRPC middleware:
 *   const tenantMiddleware = t.middleware(async ({ ctx, next }) => {
 *     const { tenantId, userId } = getCurrentTenant(ctx);
 *     await setTenantContext(ctx.db, tenantId, userId);
 *     return next({ ctx: { ...ctx, tenantId, userId } });
 *   });
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal DB interface needed by setTenantContext.
 * Compatible with Drizzle's `db.execute()` and raw pg clients.
 */
export interface DbClient {
  execute(query: { sql: string; params?: unknown[] }): Promise<unknown>;
}

/**
 * The tenant + user identity extracted from a tRPC context.
 */
export interface TenantIdentity {
  tenantId: string;
  userId: string;
}

/**
 * Shape of the tRPC context that these helpers expect.
 * Consumers should extend this with their own context fields.
 */
export interface TenantContext {
  tenantId?: string | null;
  userId?: string | null;
  session?: {
    tenantId?: string | null;
    userId?: string | null;
    user?: {
      id?: string | null;
      tenantId?: string | null;
    } | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid();

function assertUuid(value: unknown, label: string): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    throw new TenantAccessError(`Invalid ${label}: must be a valid UUID`);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class TenantAccessError extends Error {
  readonly code = "TENANT_ACCESS_DENIED" as const;
  constructor(message: string) {
    super(message);
    this.name = "TenantAccessError";
  }
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Sets the Postgres session-level tenant and user context for RLS.
 *
 * Executes `SET LOCAL app.tenant_id = '...'` and `SET LOCAL app.user_id = '...'`
 * within the current transaction (or session if no transaction is active).
 *
 * Must be called once per request, before any tenant-scoped query.
 * All subsequent queries in the same connection/transaction will have RLS active.
 *
 * @param db       Drizzle db instance (or any client with execute())
 * @param tenantId UUID of the current tenant
 * @param userId   UUID of the authenticated user
 */
export async function setTenantContext(
  db: DbClient,
  tenantId: string,
  userId: string
): Promise<void> {
  // Validate inputs to prevent SQL injection via session variables
  assertUuid(tenantId, "tenantId");
  assertUuid(userId, "userId");

  // Use parameterized SET LOCAL to prevent injection
  // Postgres SET LOCAL syntax does not support $1 placeholders, so we use
  // validated UUID strings directly (assertUuid above guarantees safe format).
  await db.execute({
    sql: `SELECT set_config('app.tenant_id', '${tenantId}', true), set_config('app.user_id', '${userId}', true)`,
  });
}

/**
 * Extracts the tenant and user identity from the tRPC context.
 *
 * Throws `TenantAccessError` if tenant or user cannot be determined — this
 * prevents accidental unauthenticated access to tenant-scoped procedures.
 *
 * @param ctx tRPC context (must have been populated by the auth middleware)
 */
export function getCurrentTenant(ctx: TenantContext): TenantIdentity {
  const tenantId =
    ctx.tenantId ??
    ctx.session?.tenantId ??
    ctx.session?.user?.tenantId;

  const userId =
    ctx.userId ??
    ctx.session?.userId ??
    ctx.session?.user?.id;

  if (!tenantId) {
    throw new TenantAccessError(
      "No tenant context found. Ensure the auth middleware runs before tenant-scoped procedures."
    );
  }

  if (!userId) {
    throw new TenantAccessError(
      "No user context found. Ensure the auth middleware runs before tenant-scoped procedures."
    );
  }

  // Validate both are proper UUIDs (defensive — auth middleware should guarantee this)
  return {
    tenantId: assertUuid(tenantId, "tenantId"),
    userId: assertUuid(userId, "userId"),
  };
}

/**
 * Asserts that the requesting user belongs to the tenant that owns a resource.
 *
 * Use this before returning or mutating any resource to prevent cross-tenant data leaks.
 *
 * @param ctx              tRPC context with tenant/user identity
 * @param resourceTenantId The tenant_id stored on the resource being accessed
 *
 * @throws TenantAccessError if the context tenant does not match the resource tenant
 *
 * @example
 * const property = await db.query.properties.findFirst({ where: eq(properties.id, input.id) });
 * if (!property) throw new TRPCError({ code: "NOT_FOUND" });
 * assertTenantAccess(ctx, property.tenantId);
 * return property;
 */
export function assertTenantAccess(
  ctx: TenantContext,
  resourceTenantId: string
): void {
  const { tenantId } = getCurrentTenant(ctx);

  if (tenantId !== resourceTenantId) {
    throw new TenantAccessError(
      `Access denied: resource belongs to tenant ${resourceTenantId}, ` +
        `but the current session is for tenant ${tenantId}.`
    );
  }
}
