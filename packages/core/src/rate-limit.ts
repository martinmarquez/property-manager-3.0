import type { Context, MiddlewareHandler, Next } from "hono";

/**
 * Rate limiter configuration for a single bucket.
 */
export interface RateLimitConfig {
  /**
   * Maximum number of tokens in the bucket (burst capacity).
   * A request costs 1 token.
   */
  capacity: number;

  /**
   * Token refill rate: tokens added per second.
   * e.g. `2` = 120 tokens/minute steady-state.
   */
  refillRate: number;

  /**
   * Unique scope name for this rate limit (used in Redis key + metrics).
   * e.g. "auth_login", "api_read", "ai_requests"
   */
  scope: string;

  /**
   * How to extract the rate limit key from the request.
   * Defaults to IP-based keying if not provided.
   */
  keyExtractor?: (c: Context) => string | Promise<string>;
}

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  /** Unix timestamp (seconds) when the bucket resets to full capacity */
  resetAt: number;
  /** Seconds until the next token is available (only meaningful when allowed=false) */
  retryAfterSeconds: number;
}

/**
 * Minimal Redis client interface — compatible with ioredis, @upstash/redis, etc.
 * The rate limiter only needs `eval` (for Lua scripts).
 */
export interface RedisClient {
  eval(
    script: string,
    numkeys: number,
    ...args: (string | number)[]
  ): Promise<unknown>;
}

/**
 * Lua script implementing the token bucket algorithm as an atomic Redis operation.
 *
 * Arguments (KEYS):  [1] = bucket key
 * Arguments (ARGV):  [1] = capacity, [2] = refill_rate (tokens/sec), [3] = now (Unix seconds, float), [4] = TTL (seconds)
 *
 * Returns: [allowed (0|1), remaining_tokens (float*100 as int), reset_timestamp_secs]
 */
const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1])
local last_refill = tonumber(data[2])

if tokens == nil then
  -- First request: initialize bucket at full capacity
  tokens = capacity
  last_refill = now
else
  -- Refill tokens based on elapsed time
  local elapsed = math.max(0, now - last_refill)
  tokens = math.min(capacity, tokens + (elapsed * refill_rate))
  last_refill = now
end

local allowed = 0
local remaining = tokens

if tokens >= 1.0 then
  tokens = tokens - 1.0
  remaining = tokens
  allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
redis.call('EXPIRE', key, ttl)

-- Return: allowed, remaining*100 (integer-safe), reset_at
local time_to_refill = 0
if remaining < 1.0 then
  time_to_refill = math.ceil((1.0 - remaining) / refill_rate)
end
local reset_at = math.ceil(now) + time_to_refill

return {allowed, math.floor(remaining * 100), reset_at}
`;

/**
 * Check the rate limit for a given key against a Redis bucket.
 */
export async function checkRateLimit(
  redis: RedisClient,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now() / 1000; // Unix seconds with millisecond precision
  const ttl = Math.ceil((config.capacity / config.refillRate) * 2); // Auto-expire stale buckets

  const result = (await redis.eval(
    TOKEN_BUCKET_LUA,
    1,
    key,
    config.capacity,
    config.refillRate,
    now,
    ttl
  )) as [number, number, number];

  const [allowedInt, remainingCents, resetAt] = result;
  const allowed = allowedInt === 1;
  const remaining = remainingCents / 100;
  const retryAfterSeconds = allowed
    ? 0
    : Math.ceil((1 - remaining) / config.refillRate);

  return {
    allowed,
    remaining: Math.floor(remaining),
    limit: config.capacity,
    resetAt,
    retryAfterSeconds,
  };
}

/**
 * Default key extractor: uses client IP address.
 * Falls back to "unknown" if IP cannot be determined.
 */
function defaultKeyExtractor(c: Context): string {
  const ip =
    c.req.header("CF-Connecting-IP") ?? // Cloudflare real IP
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    c.req.header("X-Real-IP") ??
    "unknown";
  return `ip:${ip}`;
}

/**
 * Creates a Hono middleware that enforces rate limits using a Redis token bucket.
 *
 * @param config - Rate limit configuration
 * @param redis - Redis client instance
 *
 * @example
 * const app = new Hono();
 * const redis = new Redis(process.env.REDIS_URL);
 *
 * app.use("/auth/login", rateLimiter({
 *   scope: "auth_login",
 *   capacity: 10,
 *   refillRate: 10 / 60,  // 10 per minute
 * }, redis));
 */
export function rateLimiter(
  config: RateLimitConfig,
  redis: RedisClient
): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const extractor = config.keyExtractor ?? defaultKeyExtractor;
    const identifier = await extractor(c);
    const bucketKey = `ratelimit:${config.scope}:${identifier}`;

    const result = await checkRateLimit(redis, bucketKey, config);

    // Always set rate limit headers
    c.header("X-RateLimit-Limit", String(result.limit));
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset", String(result.resetAt));

    if (!result.allowed) {
      c.header("Retry-After", String(result.retryAfterSeconds));
      return c.json(
        {
          error: "Too many requests",
          retryAfter: result.retryAfterSeconds,
        },
        429
      );
    }

    await next();
  };
}

// ── Pre-configured presets ─────────────────────────────────────────────────

/**
 * Rate limit presets matching the documented tiers in docs/architecture/rate-limiting.md.
 * Pass to `rateLimiter()` along with your Redis client instance.
 */
export const RateLimitPresets = {
  /**
   * Auth: login — 10 req/min per IP
   * Protects against credential stuffing.
   */
  AUTH_LOGIN: {
    scope: "auth_login",
    capacity: 10,
    refillRate: 10 / 60,
  } satisfies Omit<RateLimitConfig, "keyExtractor">,

  /**
   * Auth: registration — 5 req/min per IP
   */
  AUTH_REGISTER: {
    scope: "auth_register",
    capacity: 5,
    refillRate: 5 / 60,
  } satisfies Omit<RateLimitConfig, "keyExtractor">,

  /**
   * Auth: forgot-password — 3 req/min per IP
   */
  AUTH_FORGOT_PASSWORD: {
    scope: "auth_forgot_password",
    capacity: 3,
    refillRate: 3 / 60,
  } satisfies Omit<RateLimitConfig, "keyExtractor">,

  /**
   * Auth: TOTP verify — 10 req/min per session
   */
  AUTH_TOTP: {
    scope: "auth_totp",
    capacity: 10,
    refillRate: 10 / 60,
  } satisfies Omit<RateLimitConfig, "keyExtractor">,

  /**
   * API reads (authenticated) — 120 req/min per user
   */
  API_READ_AUTHENTICATED: {
    scope: "api_read_auth",
    capacity: 120,
    refillRate: 120 / 60,
  } satisfies Omit<RateLimitConfig, "keyExtractor">,

  /**
   * API reads (unauthenticated) — 60 req/min per IP
   */
  API_READ_UNAUTHENTICATED: {
    scope: "api_read_unauth",
    capacity: 60,
    refillRate: 60 / 60,
  } satisfies Omit<RateLimitConfig, "keyExtractor">,

  /**
   * API writes (authenticated) — 30 req/min per user
   */
  API_WRITE_AUTHENTICATED: {
    scope: "api_write_auth",
    capacity: 30,
    refillRate: 30 / 60,
  } satisfies Omit<RateLimitConfig, "keyExtractor">,

  /**
   * API writes (unauthenticated) — 10 req/min per IP
   */
  API_WRITE_UNAUTHENTICATED: {
    scope: "api_write_unauth",
    capacity: 10,
    refillRate: 10 / 60,
  } satisfies Omit<RateLimitConfig, "keyExtractor">,

  /**
   * AI endpoints — 20 req/min per user
   * Does NOT enforce token budgets — use `aiTokenBudgetMiddleware` for that.
   */
  AI_REQUESTS: {
    scope: "ai_requests",
    capacity: 20,
    refillRate: 20 / 60,
  } satisfies Omit<RateLimitConfig, "keyExtractor">,

  /**
   * Webhook ingestion (portal) — 100 req/min per portal
   */
  WEBHOOK_PORTAL: {
    scope: "webhook_portal",
    capacity: 100,
    refillRate: 100 / 60,
  } satisfies Omit<RateLimitConfig, "keyExtractor">,

  /**
   * Webhook ingestion (Stripe/Mercado Pago) — 500 req/min
   */
  WEBHOOK_PAYMENT: {
    scope: "webhook_payment",
    capacity: 500,
    refillRate: 500 / 60,
  } satisfies Omit<RateLimitConfig, "keyExtractor">,
} as const;

// ── AI Token Budget Middleware ──────────────────────────────────────────────

/**
 * Per-tenant monthly AI token budget configuration.
 */
export interface AiBudgetConfig {
  /**
   * Retrieves the monthly token budget for a tenant (from DB or cache).
   * Return `Infinity` for unlimited plans.
   */
  getBudget: (tenantId: string) => Promise<number>;

  /**
   * Gets the current token usage for the current month.
   * Key: `ai:usage:{tenantId}:{YYYY-MM}`
   */
  getUsage: (tenantId: string, month: string) => Promise<number>;

  /**
   * Increments usage after a successful AI call.
   */
  incrementUsage: (
    tenantId: string,
    month: string,
    tokens: number
  ) => Promise<void>;
}

/**
 * Helper to get current month string in YYYY-MM format.
 */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Middleware that enforces per-tenant monthly AI token budgets.
 * Must be used BEFORE the AI handler that calls Anthropic.
 *
 * Uses a two-phase approach:
 * 1. Pre-request: check if budget allows the call (estimate ~4k tokens for safety)
 * 2. Post-request: increment actual token usage from response
 *
 * @example
 * app.use("/api/ai/*",
 *   rateLimiter(RateLimitPresets.AI_REQUESTS, redis),
 *   aiTokenBudgetMiddleware(budgetConfig)
 * );
 */
export function aiTokenBudgetMiddleware(
  budgetConfig: AiBudgetConfig
): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    // tenantId must be set by auth middleware before this runs
    const tenantId = c.get("tenantId") as string | undefined;
    if (!tenantId) {
      // No tenant = not authenticated; let auth middleware handle it
      return next();
    }

    const month = currentMonth();
    const [budget, usage] = await Promise.all([
      budgetConfig.getBudget(tenantId),
      budgetConfig.getUsage(tenantId, month),
    ]);

    // Pre-flight check: conservative 4k token estimate
    const CONSERVATIVE_ESTIMATE = 4_000;
    if (budget !== Infinity && usage + CONSERVATIVE_ESTIMATE > budget) {
      return c.json(
        {
          error: "AI token budget exceeded",
          message:
            "Your plan's monthly AI usage limit has been reached. Please upgrade your plan to continue.",
          usagePercent: Math.round((usage / budget) * 100),
        },
        429
      );
    }

    // Set budget context for the handler to use
    c.set("aiBudget", { budget, usage, remaining: budget - usage });

    await next();

    // Post-request: increment usage with actual tokens used
    // The AI handler should set c.set("aiTokensUsed", actualTokenCount)
    const tokensUsed = c.get("aiTokensUsed") as number | undefined;
    if (tokensUsed && tokensUsed > 0) {
      await budgetConfig.incrementUsage(tenantId, month, tokensUsed);
    }
  };
}
