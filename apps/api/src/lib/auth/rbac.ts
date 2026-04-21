/**
 * RBAC — Role-Based Access Control
 *
 * Phase A: permissions matrix stored in code (migrated to DB in Phase C).
 *
 * Roles (ascending privilege):
 *   external-collaborator < read-only < assistant < agent < manager < admin < owner
 *
 * Usage in tRPC procedures:
 *   requirePermission(ctx, 'properties:write');
 *   requireAnyRole(ctx, ['admin', 'owner']);
 */

import { TRPCError } from '@trpc/server';
import type { AuthenticatedContext } from '../../trpc.js';

// ---------------------------------------------------------------------------
// Permission catalogue
// ---------------------------------------------------------------------------

export type Permission =
  // Properties
  | 'properties:read'
  | 'properties:write'
  | 'properties:delete'
  | 'properties:publish'
  // Contacts / Leads
  | 'contacts:read'
  | 'contacts:write'
  | 'contacts:delete'
  // Pipelines
  | 'pipelines:read'
  | 'pipelines:write'
  // Documents
  | 'documents:read'
  | 'documents:write'
  // Portals
  | 'portals:read'
  | 'portals:write'
  // Inbox / Communication
  | 'inbox:read'
  | 'inbox:write'
  // Users & settings
  | 'users:read'
  | 'users:invite'
  | 'users:manage'
  | 'settings:read'
  | 'settings:write'
  | 'billing:read'
  | 'billing:manage'
  // Reports / Analytics
  | 'reports:read'
  | 'reports:export'
  // AI features
  | 'ai:use'
  // API keys
  | 'api_keys:manage';

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export type Role =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'agent'
  | 'assistant'
  | 'read-only'
  | 'external-collaborator';

// ---------------------------------------------------------------------------
// Permissions matrix
// Higher-privilege roles inherit lower-privilege role permissions.
// ---------------------------------------------------------------------------

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  'external-collaborator': [
    'properties:read',
    'documents:read',
  ],

  'read-only': [
    'properties:read',
    'contacts:read',
    'pipelines:read',
    'documents:read',
    'portals:read',
    'inbox:read',
    'users:read',
    'settings:read',
    'reports:read',
  ],

  assistant: [
    'properties:read',
    'contacts:read',
    'contacts:write',
    'pipelines:read',
    'pipelines:write',
    'documents:read',
    'documents:write',
    'portals:read',
    'inbox:read',
    'inbox:write',
    'users:read',
    'settings:read',
    'reports:read',
    'ai:use',
  ],

  agent: [
    'properties:read',
    'properties:write',
    'contacts:read',
    'contacts:write',
    'pipelines:read',
    'pipelines:write',
    'documents:read',
    'documents:write',
    'portals:read',
    'inbox:read',
    'inbox:write',
    'users:read',
    'settings:read',
    'reports:read',
    'reports:export',
    'ai:use',
  ],

  manager: [
    'properties:read',
    'properties:write',
    'properties:delete',
    'properties:publish',
    'contacts:read',
    'contacts:write',
    'contacts:delete',
    'pipelines:read',
    'pipelines:write',
    'documents:read',
    'documents:write',
    'portals:read',
    'portals:write',
    'inbox:read',
    'inbox:write',
    'users:read',
    'users:invite',
    'settings:read',
    'reports:read',
    'reports:export',
    'ai:use',
  ],

  admin: [
    'properties:read',
    'properties:write',
    'properties:delete',
    'properties:publish',
    'contacts:read',
    'contacts:write',
    'contacts:delete',
    'pipelines:read',
    'pipelines:write',
    'documents:read',
    'documents:write',
    'portals:read',
    'portals:write',
    'inbox:read',
    'inbox:write',
    'users:read',
    'users:invite',
    'users:manage',
    'settings:read',
    'settings:write',
    'billing:read',
    'reports:read',
    'reports:export',
    'ai:use',
    'api_keys:manage',
  ],

  owner: [
    'properties:read',
    'properties:write',
    'properties:delete',
    'properties:publish',
    'contacts:read',
    'contacts:write',
    'contacts:delete',
    'pipelines:read',
    'pipelines:write',
    'documents:read',
    'documents:write',
    'portals:read',
    'portals:write',
    'inbox:read',
    'inbox:write',
    'users:read',
    'users:invite',
    'users:manage',
    'settings:read',
    'settings:write',
    'billing:read',
    'billing:manage',
    'reports:read',
    'reports:export',
    'ai:use',
    'api_keys:manage',
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return all permissions granted to the given role slug. */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/** Return true if any of the given roles grants the requested permission. */
export function roleHasPermission(roles: string[], permission: Permission): boolean {
  return roles.some((role) =>
    (ROLE_PERMISSIONS[role as Role] ?? []).includes(permission),
  );
}

/**
 * Assert that the authenticated user has a specific permission.
 * Throws TRPCError FORBIDDEN if not.
 * Call inside a protectedProcedure — ctx is already AuthenticatedContext.
 */
export function requirePermission(
  ctx: AuthenticatedContext,
  permission: Permission,
): void {
  if (!roleHasPermission(ctx.roles, permission)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Permission required: ${permission}`,
    });
  }
}

/**
 * Assert that the authenticated user has at least one of the specified roles.
 * Throws TRPCError FORBIDDEN if not.
 */
export function requireAnyRole(ctx: AuthenticatedContext, roles: Role[]): void {
  const hasRole = ctx.roles.some((r) => roles.includes(r as Role));
  if (!hasRole) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `One of these roles required: ${roles.join(', ')}`,
    });
  }
}
