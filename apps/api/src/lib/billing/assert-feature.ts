import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { plan, planFeature, subscription } from '@corredor/db';
import type { AuthenticatedContext } from '../../trpc.js';

export class FeatureGateError extends Error {
  readonly requiredPlan: string;
  readonly featureName: string;

  constructor(featureKey: string, requiredPlan: string, featureName: string) {
    super(`Feature '${featureKey}' requires plan '${requiredPlan}'`);
    this.name = 'FeatureGateError';
    this.requiredPlan = requiredPlan;
    this.featureName = featureName;
  }
}

const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  site_builder: 'Constructor de sitio web',
  custom_domain: 'Dominio personalizado',
  reports_export: 'Exportar reportes',
  appraisals: 'Tasaciones',
  analytics_dashboard: 'Panel de analytics',
  ai_copilot: 'Copilot IA',
  ai_descriptions: 'Descripciones con IA',
};

/**
 * Assert that the tenant's current plan includes the given feature.
 * Throws TRPCError FORBIDDEN with an upsell payload when blocked.
 *
 * Usage (same pattern as requirePermission):
 *   await assertFeature(ctx, 'site_builder');
 */
// In-process cache: tenantId+featureKey → hasFeature. 60-second TTL.
// Eliminates 2 DB queries per request for the common case (feature already granted).
const featureCache = new Map<string, { result: boolean; expiresAt: number }>();

function featureCacheKey(tenantId: string, featureKey: string) {
  return `${tenantId}:${featureKey}`;
}

export async function assertFeature(
  ctx: AuthenticatedContext,
  featureKey: string,
): Promise<void> {
  const { db, tenantId } = ctx;

  const cacheKey = featureCacheKey(tenantId, featureKey);
  const cached = featureCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.result) return;
    // Cached negative result — fall through to throw
  } else {
    featureCache.delete(cacheKey);
  }

  const [sub] = await db
    .select({ planCode: subscription.planCode })
    .from(subscription)
    .where(eq(subscription.tenantId, tenantId))
    .limit(1);

  const currentPlan = sub?.planCode ?? null;

  if (currentPlan) {
    const [feature] = await db
      .select({ featureKey: planFeature.featureKey })
      .from(planFeature)
      .where(
        and(
          eq(planFeature.planCode, currentPlan),
          eq(planFeature.featureKey, featureKey),
        ),
      )
      .limit(1);

    if (feature) {
      featureCache.set(cacheKey, { result: true, expiresAt: Date.now() + 60_000 });
      return;
    }
  }

  featureCache.set(cacheKey, { result: false, expiresAt: Date.now() + 60_000 });
  const required = await findRequiredPlan(db, featureKey);
  const displayName = FEATURE_DISPLAY_NAMES[featureKey] ?? featureKey;

  throw new TRPCError({
    code: 'FORBIDDEN',
    message: `Feature '${featureKey}' requires plan '${required.displayName}'`,
    cause: new FeatureGateError(featureKey, required.displayName, displayName),
  });
}

async function findRequiredPlan(
  db: AuthenticatedContext['db'],
  featureKey: string,
): Promise<{ code: string; displayName: string }> {
  const [result] = await db
    .select({
      code: plan.code,
      displayName: plan.displayName,
    })
    .from(planFeature)
    .innerJoin(plan, eq(planFeature.planCode, plan.code))
    .where(
      and(
        eq(planFeature.featureKey, featureKey),
        eq(plan.isActive, true),
      ),
    )
    .orderBy(plan.sortOrder)
    .limit(1);

  return result ?? { code: 'pro', displayName: 'Pro' };
}
