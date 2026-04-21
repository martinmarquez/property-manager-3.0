/**
 * Auth audit log helpers
 *
 * Writes a row to the audit_log table for every significant auth event.
 * Call within the DB transaction so it rolls back on failure.
 *
 * Auth event types:
 *   user.registered        user.email_verified
 *   user.login             user.login_failed
 *   user.logout            user.locked_out
 *   user.password_reset_requested   user.password_reset_confirmed
 *   user.totp_enabled      user.totp_disabled
 *   user.webauthn_registered user.webauthn_removed
 *   user.session_revoked
 */

import { auditLog } from '@corredor/db';
import type { AnyDb } from '../../trpc.js';

export type AuthEventType =
  | 'user.registered'
  | 'user.email_verified'
  | 'user.login'
  | 'user.login_failed'
  | 'user.logout'
  | 'user.locked_out'
  | 'user.password_reset_requested'
  | 'user.password_reset_confirmed'
  | 'user.totp_enabled'
  | 'user.totp_disabled'
  | 'user.webauthn_registered'
  | 'user.webauthn_removed'
  | 'user.session_revoked';

export interface AuthAuditOpts {
  db: AnyDb;
  tenantId: string;
  userId: string | null;
  action: AuthEventType;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  meta?: Record<string, unknown>;
}

/** Write a single auth event to the audit_log table. */
export async function writeAuthAudit(opts: AuthAuditOpts): Promise<void> {
  await opts.db.insert(auditLog).values({
    tenantId: opts.tenantId,
    userId: opts.userId ?? undefined,
    entityType: 'user',
    entityId: opts.userId ?? '00000000-0000-0000-0000-000000000000',
    action: opts.action,
    diff: opts.meta ?? null,
    ip: opts.ip ?? null,
    userAgent: opts.userAgent ?? null,
    requestId: opts.requestId ?? null,
  });
}
