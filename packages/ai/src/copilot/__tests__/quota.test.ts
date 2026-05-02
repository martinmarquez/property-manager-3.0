import { describe, it, expect, vi, type MockedObject } from 'vitest';
import { checkQuota, incrementQuota, getMonthlyLimit, type QuotaRedis } from '../quota.js';

function createMockRedis(counter: number = 0): MockedObject<QuotaRedis> {
  return {
    get: vi.fn().mockResolvedValue(counter > 0 ? String(counter) : null),
    incr: vi.fn().mockResolvedValue(counter + 1),
    expire: vi.fn().mockResolvedValue(1),
  };
}

describe('getMonthlyLimit', () => {
  it('returns 50 for free plan', () => {
    expect(getMonthlyLimit('free')).toBe(50);
  });

  it('returns 50 for starter plan', () => {
    expect(getMonthlyLimit('starter')).toBe(50);
  });

  it('returns Infinity for growth plan', () => {
    expect(getMonthlyLimit('growth')).toBe(Infinity);
  });

  it('returns Infinity for enterprise plan', () => {
    expect(getMonthlyLimit('enterprise')).toBe(Infinity);
  });

  it('returns 50 for unknown plan', () => {
    expect(getMonthlyLimit('unknown')).toBe(50);
  });
});

describe('checkQuota', () => {
  it('allows request when under limit', async () => {
    const redis = createMockRedis(10);
    const result = await checkQuota(redis, 'tenant-1', 'user-1', 'free');

    expect(result.allowed).toBe(true);
    expect(result.used).toBe(10);
    expect(result.limit).toBe(50);
    expect(result.remaining).toBe(40);
  });

  it('blocks request when at limit', async () => {
    const redis = createMockRedis(50);
    const result = await checkQuota(redis, 'tenant-1', 'user-1', 'free');

    expect(result.allowed).toBe(false);
    expect(result.used).toBe(50);
    expect(result.remaining).toBe(0);
  });

  it('always allows for growth plan', async () => {
    const redis = createMockRedis(9999);
    const result = await checkQuota(redis, 'tenant-1', 'user-1', 'growth');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(Infinity);
    expect(result.remaining).toBe(Infinity);
  });

  it('allows first request (no counter)', async () => {
    const redis = createMockRedis(0);
    const result = await checkQuota(redis, 'tenant-1', 'user-1', 'free');

    expect(result.allowed).toBe(true);
    expect(result.used).toBe(0);
  });
});

describe('incrementQuota', () => {
  it('increments the counter', async () => {
    const redis = createMockRedis(0);
    const result = await incrementQuota(redis, 'tenant-1', 'user-1');

    expect(result).toBe(1);
    expect(redis.incr).toHaveBeenCalledTimes(1);
  });

  it('sets expiry on first increment', async () => {
    const redis = createMockRedis(0);
    await incrementQuota(redis, 'tenant-1', 'user-1');

    expect(redis.expire).toHaveBeenCalledTimes(1);
    expect(redis.expire.mock.calls[0]![1]).toBe(32 * 24 * 60 * 60);
  });

  it('does not set expiry on subsequent increments', async () => {
    const redis: MockedObject<QuotaRedis> = {
      ...createMockRedis(5),
      incr: vi.fn().mockResolvedValue(6),
    };

    await incrementQuota(redis, 'tenant-1', 'user-1');

    expect(redis.expire).not.toHaveBeenCalled();
  });
});
