import { randomBytes } from 'node:crypto';
import type { Context } from 'hono';
import type { Redis } from 'ioredis';

const SESSION_COOKIE = 'session';
export const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours — ASVS V3.3.3
export const IDLE_TIMEOUT_SECONDS = 30 * 60; // 30 minutes — ASVS V3.3.2
const SESSION_KEY_PREFIX = 'sess:';

export interface SessionData {
  tenantId: string;
  userId: string;
  roles: string[];
  createdAt: string;
  /** ISO timestamp — updated on each successful auth middleware run */
  lastSeenAt: string;
}

function sessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

/** Generate a cryptographically random session ID (256-bit hex). */
export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Write a new session to Redis and return the session ID.
 * The caller is responsible for setting the session cookie.
 */
export async function createSession(
  redis: Redis,
  data: Omit<SessionData, 'createdAt' | 'lastSeenAt'>,
): Promise<string> {
  const sessionId = generateSessionId();
  const now = new Date().toISOString();
  const payload: SessionData = { ...data, createdAt: now, lastSeenAt: now };
  await redis.setex(sessionKey(sessionId), SESSION_TTL_SECONDS, JSON.stringify(payload));
  return sessionId;
}

/**
 * Look up a session in Redis.
 * Returns null if missing or unparseable.
 */
export async function getSession(
  redis: Redis,
  sessionId: string,
): Promise<SessionData | null> {
  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

/**
 * Slide the session TTL and update lastSeenAt.
 * Call this on every authenticated request to implement rolling sessions.
 */
export async function refreshSession(
  redis: Redis,
  sessionId: string,
  session: SessionData,
): Promise<void> {
  const updated: SessionData = { ...session, lastSeenAt: new Date().toISOString() };
  await redis.setex(sessionKey(sessionId), SESSION_TTL_SECONDS, JSON.stringify(updated));
}

/** Delete a session from Redis (on logout). */
export async function destroySession(redis: Redis, sessionId: string): Promise<void> {
  await redis.del(sessionKey(sessionId));
}

/** Extract the session ID from the request cookie. */
export function getSessionId(c: Context): string | undefined {
  const cookie = c.req.header('cookie') ?? '';
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key?.trim() === SESSION_COOKIE && rest.length > 0) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

/** Set the session cookie on the response. */
export function setSessionCookie(c: Context, sessionId: string, isSecure: boolean): void {
  const secure = isSecure ? '; Secure' : '';
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=${sessionId}; HttpOnly${secure}; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}; Path=/`,
  );
}

/** Clear the session cookie (used on logout). */
export function clearSessionCookie(c: Context): void {
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/`,
  );
}
