/**
 * Brute-force login protection — Redis
 *
 * Strategy: two independent counters per failed login attempt.
 *   1. Per-account counter  keyed by email+tenantId
 *   2. Per-IP counter       keyed by client IP
 *
 * Both must be under the threshold to allow a login attempt.
 * Counters reset after LOCKOUT_WINDOW_SECONDS of inactivity
 * (sliding window via GETEX / EXPIRE).
 *
 * Thresholds (from security brief):
 *   Max failed attempts: 10
 *   Lockout window: 15 minutes
 */

import type { Redis } from 'ioredis';

const MAX_ATTEMPTS = 10;
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 minutes
const ACCOUNT_PREFIX = 'brute:acct:';
const IP_PREFIX = 'brute:ip:';

function accountKey(tenantId: string, email: string): string {
  return `${ACCOUNT_PREFIX}${tenantId}:${email.toLowerCase()}`;
}

function ipKey(ip: string): string {
  return `${IP_PREFIX}${ip}`;
}

export interface BruteForceCheck {
  allowed: boolean;
  /** Remaining attempts before lockout (undefined if already locked). */
  remaining: number;
  /** Seconds until the lockout expires (0 if not locked). */
  retryAfterSeconds: number;
}

/** Check both the per-account and per-IP counters without incrementing. */
export async function checkBruteForce(
  redis: Redis,
  tenantId: string,
  email: string,
  ip: string,
): Promise<BruteForceCheck> {
  const [acctRaw, ipRaw] = await Promise.all([
    redis.get(accountKey(tenantId, email)),
    redis.get(ipKey(ip)),
  ]);

  const acctCount = parseInt(acctRaw ?? '0', 10);
  const ipCount = parseInt(ipRaw ?? '0', 10);
  const maxCount = Math.max(acctCount, ipCount);

  if (maxCount >= MAX_ATTEMPTS) {
    const ttl = await redis.ttl(accountKey(tenantId, email));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: ttl > 0 ? ttl : LOCKOUT_WINDOW_SECONDS,
    };
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - maxCount - 1, // -1 to account for the pending attempt
    retryAfterSeconds: 0,
  };
}

/** Increment both counters after a failed login attempt. */
export async function recordFailedAttempt(
  redis: Redis,
  tenantId: string,
  email: string,
  ip: string,
): Promise<void> {
  const acctK = accountKey(tenantId, email);
  const ipK = ipKey(ip);
  await Promise.all([
    redis.multi()
      .incr(acctK)
      .expire(acctK, LOCKOUT_WINDOW_SECONDS)
      .exec(),
    redis.multi()
      .incr(ipK)
      .expire(ipK, LOCKOUT_WINDOW_SECONDS)
      .exec(),
  ]);
}

/** Clear the per-account counter on successful login. */
export async function clearAccountCounter(
  redis: Redis,
  tenantId: string,
  email: string,
): Promise<void> {
  await redis.del(accountKey(tenantId, email));
}
