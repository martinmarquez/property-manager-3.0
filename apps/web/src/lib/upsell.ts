import type { TRPCClientErrorLike } from '@trpc/client';
import type { AppRouter } from '../trpc.js';

export interface UpsellPayload {
  requiredPlan: string;
  featureName: string;
}

/**
 * Extract the upsell payload from a tRPC FORBIDDEN error, if present.
 * Returns null when the error is not a feature-gate error.
 */
export function getUpsellPayload(
  error: TRPCClientErrorLike<AppRouter> | null | undefined,
): UpsellPayload | null {
  if (!error) return null;
  const data = error.data as Record<string, unknown> | undefined;
  if (!data?.upsell) return null;
  const upsell = data.upsell as UpsellPayload;
  if (upsell.requiredPlan && upsell.featureName) return upsell;
  return null;
}
