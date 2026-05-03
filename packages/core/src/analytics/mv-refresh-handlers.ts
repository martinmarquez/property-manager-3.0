/**
 * Event-driven materialized view refresh subscriptions.
 *
 * Call registerMvRefreshEventHandlers(bus, queue) once at process startup
 * (API server or worker) to wire domain events → debounced MV refresh jobs.
 *
 * Debounce: BullMQ jobId uniqueness ensures at most one refresh job per
 * (mvName, tenantId) pair is queued within the 30-second delay window.
 * First-event-wins: subsequent events for the same MV+tenant within 30s
 * are silently dropped. The refresh covers all tenants regardless, so
 * multiple concurrent event-driven triggers for different tenants each
 * schedule a separate job for accurate audit trails.
 */

import type { Queue } from "bullmq";
import type { EventBus } from "../events/bus.js";

export interface MvRefreshJobData {
  /** One of the 10 analytics MV names defined in 0021 migration. */
  mvName: string;
  /** Tenant that triggered this refresh (for audit); refresh is global. */
  tenantId: string;
}

const DEBOUNCE_MS = 30_000;

// All MV names that can be refreshed via this queue.
export const REFRESHABLE_MVS = [
  "mv_pipeline_conversion",
  "mv_listing_performance",
  "mv_agent_productivity",
  "mv_portal_roi",
  "mv_revenue_forecast",
  "mv_retention_cohort",
  "mv_zone_heatmap",
  "mv_ai_usage_value",
  "mv_sla_adherence",
  "mv_commission_owed",
] as const;

export type RefreshableMv = (typeof REFRESHABLE_MVS)[number];

async function enqueue(
  queue: Queue<MvRefreshJobData>,
  mvName: RefreshableMv,
  tenantId: string,
): Promise<void> {
  await queue.add(
    "mv-refresh",
    { mvName, tenantId },
    {
      jobId: `mv:${mvName}:${tenantId}`,
      delay: DEBOUNCE_MS,
      removeOnComplete: { count: 20 },
      removeOnFail: false,
    },
  );
}

/**
 * Register all event-to-MV refresh mappings on the given EventBus.
 * Returns an array of unsubscribe functions (call to tear down, e.g. in tests).
 */
export function registerMvRefreshEventHandlers(
  bus: EventBus,
  queue: Queue<MvRefreshJobData>,
): Array<() => void> {
  const unsubs: Array<() => void> = [];

  // lead.stage_moved → mv_pipeline_conversion
  unsubs.push(
    bus.subscribe("lead.stage_moved", async (e) => {
      await enqueue(queue, "mv_pipeline_conversion", e.payload.tenantId);
    }),
  );

  // lead.won → mv_pipeline_conversion, mv_revenue_forecast, mv_commission_owed
  unsubs.push(
    bus.subscribe("lead.won", async (e) => {
      const { tenantId } = e.payload;
      await enqueue(queue, "mv_pipeline_conversion", tenantId);
      await enqueue(queue, "mv_revenue_forecast", tenantId);
      await enqueue(queue, "mv_commission_owed", tenantId);
    }),
  );

  // property.price_changed → mv_listing_performance
  unsubs.push(
    bus.subscribe("property.price_changed", async (e) => {
      await enqueue(queue, "mv_listing_performance", e.payload.tenantId);
    }),
  );

  // portal_lead.created → mv_listing_performance, mv_zone_heatmap
  unsubs.push(
    bus.subscribe("portal_lead.created", async (e) => {
      const { tenantId } = e.payload;
      await enqueue(queue, "mv_listing_performance", tenantId);
      await enqueue(queue, "mv_zone_heatmap", tenantId);
    }),
  );

  // inquiry.created → mv_zone_heatmap
  unsubs.push(
    bus.subscribe("inquiry.created", async (e) => {
      await enqueue(queue, "mv_zone_heatmap", e.payload.tenantId);
    }),
  );

  // subscription.created → mv_revenue_forecast
  unsubs.push(
    bus.subscribe("subscription.created", async (e) => {
      await enqueue(queue, "mv_revenue_forecast", e.payload.tenantId);
    }),
  );

  // subscription.cancelled → mv_revenue_forecast
  unsubs.push(
    bus.subscribe("subscription.cancelled", async (e) => {
      await enqueue(queue, "mv_revenue_forecast", e.payload.tenantId);
    }),
  );

  // inbox.sla_breached → mv_sla_adherence
  unsubs.push(
    bus.subscribe("inbox.sla_breached", async (e) => {
      await enqueue(queue, "mv_sla_adherence", e.payload.tenantId);
    }),
  );

  return unsubs;
}
