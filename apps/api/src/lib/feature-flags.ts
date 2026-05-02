import { eq, and } from 'drizzle-orm';
import { featureFlag } from '@corredor/db';
import type { AnyDb } from '../trpc.js';

export class FeatureDisabledError extends Error {
  readonly statusCode = 403 as const;
  readonly upgradePrompt =
    'This feature is not included in your current plan. Contact your account manager or upgrade to enable it.';
  constructor(flagKey: string) {
    super(`Feature '${flagKey}' is not enabled for this tenant`);
    this.name = 'FeatureDisabledError';
  }
}

/**
 * Throws FeatureDisabledError when the tenant does not have access to the
 * given feature flag.  Missing rows default to disabled.
 */
export async function checkFeatureFlag(
  db: AnyDb,
  tenantId: string,
  flagKey: string,
): Promise<void> {
  const [flag] = await db
    .select({
      enabled: featureFlag.enabled,
      rolloutPct: featureFlag.rolloutPct,
    })
    .from(featureFlag)
    .where(and(eq(featureFlag.tenantId, tenantId), eq(featureFlag.key, flagKey)))
    .limit(1);

  if (!flag || !flag.enabled || flag.rolloutPct <= 0) {
    throw new FeatureDisabledError(flagKey);
  }
}
