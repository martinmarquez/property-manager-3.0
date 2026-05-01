export interface QuotaRedis {
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

const FREE_TIER_LIMIT = 50;

export function getMonthlyLimit(plan: string): number {
  switch (plan) {
    case 'growth':
    case 'enterprise':
      return Infinity;
    case 'starter':
    case 'free':
    default:
      return FREE_TIER_LIMIT;
  }
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function quotaKey(tenantId: string, userId: string): string {
  return `copilot:quota:${tenantId}:${userId}:${currentMonth()}`;
}

export async function checkQuota(
  redis: QuotaRedis,
  tenantId: string,
  userId: string,
  plan: string,
): Promise<QuotaCheckResult> {
  const limit = getMonthlyLimit(plan);
  if (limit === Infinity) {
    return { allowed: true, used: 0, limit: Infinity, remaining: Infinity };
  }

  const key = quotaKey(tenantId, userId);
  const used = parseInt((await redis.get(key)) ?? '0', 10);

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

export async function incrementQuota(
  redis: QuotaRedis,
  tenantId: string,
  userId: string,
): Promise<number> {
  const key = quotaKey(tenantId, userId);
  const newCount = await redis.incr(key);
  // Expire at end of month + 1 day buffer (max 32 days)
  if (newCount === 1) {
    await redis.expire(key, 32 * 24 * 60 * 60);
  }
  return newCount;
}
