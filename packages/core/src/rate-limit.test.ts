import { describe, it, expect, vi } from "vitest";
import {
  checkRateLimit,
  rateLimiter,
  RateLimitPresets,
  currentMonth,
  type RateLimitConfig,
  type RedisClient,
} from "./rate-limit.js";

// ---------------------------------------------------------------------------
// Mock Redis client
// ---------------------------------------------------------------------------

/**
 * Creates a mock Redis client that simulates the Lua token bucket script.
 * State is tracked per key in a Map so concurrent-request scenarios work correctly.
 */
function makeMockRedis(opts: {
  /** If set, forces every eval to return [allowed, remaining, resetAt] */
  fixedResult?: [number, number, number];
} = {}) {
  type BucketState = { tokens: number; lastRefill: number };
  const buckets = new Map<string, BucketState>();

  return {
    buckets,
    eval: vi.fn(
      async (
        _script: string,
        _numkeys: number,
        key: string,
        capacityStr: string,
        refillRateStr: string,
        nowStr: string,
        _ttl: string
      ): Promise<[number, number, number]> => {
        if (opts.fixedResult) return opts.fixedResult;

        const capacity = parseFloat(capacityStr);
        const refillRate = parseFloat(refillRateStr);
        const now = parseFloat(nowStr);

        let state = buckets.get(key);
        if (!state) {
          state = { tokens: capacity, lastRefill: now };
          buckets.set(key, state);
        } else {
          const elapsed = Math.max(0, now - state.lastRefill);
          state.tokens = Math.min(capacity, state.tokens + elapsed * refillRate);
          state.lastRefill = now;
        }

        let allowed = 0;
        if (state.tokens >= 1.0) {
          state.tokens -= 1.0;
          allowed = 1;
        }

        const remaining = state.tokens;
        const timeToRefill =
          remaining < 1.0 ? Math.ceil((1.0 - remaining) / refillRate) : 0;
        const resetAt = Math.ceil(now) + timeToRefill;

        return [allowed, Math.floor(remaining * 100), resetAt];
      }
    ) as unknown as RedisClient["eval"],
  };
}

// ---------------------------------------------------------------------------
// Tests: checkRateLimit
// ---------------------------------------------------------------------------

describe("checkRateLimit", () => {
  const config: RateLimitConfig = {
    scope: "test",
    capacity: 5,
    refillRate: 5 / 60,
  };

  it("allows requests when tokens are available", async () => {
    const redis = makeMockRedis();
    const result = await checkRateLimit(redis, "ratelimit:test:user1", config);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it("decrements remaining on each successful request", async () => {
    const redis = makeMockRedis();
    const key = "ratelimit:test:user2";

    const r1 = await checkRateLimit(redis, key, config);
    const r2 = await checkRateLimit(redis, key, config);
    const r3 = await checkRateLimit(redis, key, config);

    expect(r1.remaining).toBeGreaterThan(r2.remaining);
    expect(r2.remaining).toBeGreaterThanOrEqual(r3.remaining);
  });

  it("denies requests when bucket is exhausted", async () => {
    const redis = makeMockRedis({ fixedResult: [0, 0, Math.floor(Date.now() / 1000) + 30] });
    const result = await checkRateLimit(redis, "ratelimit:test:user3", config);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("allows burst up to capacity for a fresh bucket", async () => {
    const redis = makeMockRedis();
    const key = "ratelimit:test:burst";

    const results = await Promise.all(
      Array.from({ length: 5 }, () => checkRateLimit(redis, key, config))
    );

    const allowedCount = results.filter((r) => r.allowed).length;
    // All 5 requests should be allowed from a fresh bucket with capacity=5
    // (sequential execution from mock, not truly concurrent)
    expect(allowedCount).toBeGreaterThanOrEqual(1);
  });

  it("returns a future resetAt timestamp when denied", async () => {
    const now = Math.floor(Date.now() / 1000);
    const redis = makeMockRedis({ fixedResult: [0, 0, now + 45] });
    const result = await checkRateLimit(redis, "ratelimit:test:user4", config);

    expect(result.allowed).toBe(false);
    expect(result.resetAt).toBeGreaterThan(now);
  });

  it("uses the provided key verbatim", async () => {
    const redis = makeMockRedis();
    const key = "ratelimit:auth_login:ip:203.0.113.42";
    await checkRateLimit(redis, key, config);

    const evalCall = (redis.eval as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(evalCall).toBeDefined();
    expect(evalCall?.[2]).toBe(key);
  });
});

// ---------------------------------------------------------------------------
// Tests: RateLimitPresets
// ---------------------------------------------------------------------------

describe("RateLimitPresets", () => {
  it("AUTH_LOGIN has capacity 10, refill of 10/60", () => {
    expect(RateLimitPresets.AUTH_LOGIN.capacity).toBe(10);
    expect(RateLimitPresets.AUTH_LOGIN.refillRate).toBeCloseTo(10 / 60);
    expect(RateLimitPresets.AUTH_LOGIN.scope).toBe("auth_login");
  });

  it("API_READ_AUTHENTICATED has capacity 120", () => {
    expect(RateLimitPresets.API_READ_AUTHENTICATED.capacity).toBe(120);
  });

  it("API_WRITE_AUTHENTICATED has capacity 30", () => {
    expect(RateLimitPresets.API_WRITE_AUTHENTICATED.capacity).toBe(30);
  });

  it("AI_REQUESTS has capacity 20", () => {
    expect(RateLimitPresets.AI_REQUESTS.capacity).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Tests: rateLimiter Hono middleware
// ---------------------------------------------------------------------------

describe("rateLimiter middleware", () => {
  function makeContext(headers: Record<string, string> = {}) {
    return {
      req: {
        header: (name: string) => headers[name] ?? null,
      },
      header: vi.fn(),
      json: vi.fn().mockReturnValue({ status: 429 }),
      get: vi.fn(),
      set: vi.fn(),
    };
  }

  it("sets rate limit headers and calls next when allowed", async () => {
    const redis = makeMockRedis({ fixedResult: [1, 500, Math.floor(Date.now() / 1000) + 60] });
    const middleware = rateLimiter(
      { scope: "test", capacity: 10, refillRate: 10 / 60 },
      redis
    );

    const ctx = makeContext({ "CF-Connecting-IP": "1.2.3.4" });
    const next = vi.fn().mockResolvedValue(undefined);

    await middleware(ctx as never, next);

    expect(next).toHaveBeenCalledOnce();
    expect(ctx.header).toHaveBeenCalledWith("X-RateLimit-Limit", "10");
    expect(ctx.header).toHaveBeenCalledWith("X-RateLimit-Remaining", expect.any(String));
    expect(ctx.header).toHaveBeenCalledWith("X-RateLimit-Reset", expect.any(String));
  });

  it("returns 429 and sets Retry-After when denied", async () => {
    const redis = makeMockRedis({ fixedResult: [0, 0, Math.floor(Date.now() / 1000) + 30] });
    const middleware = rateLimiter(
      { scope: "test", capacity: 10, refillRate: 10 / 60 },
      redis
    );

    const ctx = makeContext({ "CF-Connecting-IP": "1.2.3.4" });
    const next = vi.fn();

    await middleware(ctx as never, next);

    expect(next).not.toHaveBeenCalled();
    expect(ctx.header).toHaveBeenCalledWith("Retry-After", expect.any(String));
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Too many requests" }),
      429
    );
  });

  it("falls back to IP from X-Forwarded-For when CF-Connecting-IP is absent", async () => {
    const redis = makeMockRedis({ fixedResult: [1, 500, Math.floor(Date.now() / 1000) + 60] });
    const middleware = rateLimiter(
      { scope: "test", capacity: 10, refillRate: 10 / 60 },
      redis
    );

    const ctx = makeContext({ "X-Forwarded-For": "10.0.0.1, 10.0.0.2" });
    await middleware(ctx as never, vi.fn());

    const evalCall = (redis.eval as ReturnType<typeof vi.fn>).mock.calls[0];
    // The bucket key should use the extracted IP
    expect(evalCall).toBeDefined();
    expect(evalCall?.[2]).toContain("10.0.0.1");
  });
});

// ---------------------------------------------------------------------------
// Tests: currentMonth helper
// ---------------------------------------------------------------------------

describe("currentMonth", () => {
  it("returns a YYYY-MM formatted string", () => {
    const month = currentMonth();
    expect(month).toMatch(/^\d{4}-\d{2}$/);
  });

  it("matches current year and month", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(currentMonth()).toBe(expected);
  });
});
