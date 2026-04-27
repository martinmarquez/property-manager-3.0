import { createHash } from 'node:crypto';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { Job } from 'bullmq';
import {
  analyticsEvent,
  lead,
  property,
  tenant,
} from '@corredor/db';
import { createNodeDb } from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type Redis from 'ioredis';

export interface AnalyticsRefreshJobData {
  tenantId?: string;
  snapshotDate?: string;
}

interface KpiRow {
  dimensionType: string;
  dimensionId: string | null;
  dimensionLabel: string | null;
  metric: string;
  value: number;
}

function channelUuid(channel: string): string {
  const h = createHash('md5').update(`corredor:channel:${channel}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export class AnalyticsRefreshWorker extends BaseWorker<AnalyticsRefreshJobData, void> {
  private readonly db: ReturnType<typeof createNodeDb>;

  constructor(redis: Redis, databaseUrl: string) {
    super(QUEUE_NAMES.ANALYTICS_REFRESH, { redis, concurrency: 1 });
    this.db = createNodeDb(databaseUrl);
  }

  protected async process(job: Job<AnalyticsRefreshJobData>): Promise<void> {
    const snapshotDate =
      job.data.snapshotDate ??
      new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    const tenantIds: string[] = job.data.tenantId
      ? [job.data.tenantId]
      : await this._getAllTenantIds();

    for (const tenantId of tenantIds) {
      await this._rollupTenant(tenantId, snapshotDate);
      this.logger.info('analytics.refresh.tenant_done', { tenantId, snapshotDate });
    }

    await this.db.execute(
      sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_properties_by_tenant`,
    );

    this.logger.info('analytics.refresh.done', {
      snapshotDate,
      tenantCount: tenantIds.length,
    });
  }

  private async _getAllTenantIds(): Promise<string[]> {
    const rows = await this.db
      .select({ id: tenant.id })
      .from(tenant)
      .where(isNull(tenant.deletedAt));
    return rows.map((r) => r.id);
  }

  private async _rollupTenant(tenantId: string, snapshotDate: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`,
      );

      const rows = await this._computeMetrics(tx as never, tenantId, snapshotDate);

      if (rows.length === 0) return;

      const values = rows.map(
        (r) => sql`(${tenantId}::uuid, ${snapshotDate}::date, ${r.dimensionType}::kpi_dimension_type, ${r.dimensionId ?? null}::uuid, ${r.dimensionLabel ?? null}, ${r.metric}::kpi_metric_type, ${r.value.toFixed(4)}::numeric)`,
      );

      await tx.execute(sql`
        INSERT INTO kpi_snapshot_daily
          (tenant_id, snapshot_date, dimension_type, dimension_id, dimension_label, metric, value)
        VALUES ${sql.join(values, sql`, `)}
        ON CONFLICT ON CONSTRAINT kpi_snapshot_daily_uniq
        DO UPDATE SET value = EXCLUDED.value
      `);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _computeMetrics(tx: any, tenantId: string, snapshotDate: string): Promise<KpiRow[]> {
    const rows: KpiRow[] = [];

    // ------------------------------------------------------------------
    // Agency-level metrics
    // ------------------------------------------------------------------

    const [leadsCreated] = await tx
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'lead.created'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
        ),
      );

    const [leadsConverted] = await tx
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'lead.converted'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
        ),
      );

    const [portalReach] = await tx
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'portal.lead_received'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
        ),
      );

    const [newContacts] = await tx
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'contact.created'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
        ),
      );

    const [activeProps] = await tx
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(property)
      .where(and(isNull(property.deletedAt), eq(property.status, 'active')));

    const [pipelineRevenue] = await tx
      .select({ n: sql<number>`COALESCE(SUM(expected_value), 0)::numeric` })
      .from(lead)
      .where(and(isNull(lead.deletedAt), isNull(lead.wonAt), isNull(lead.lostAt)));

    const created = leadsCreated?.n ?? 0;
    const converted = leadsConverted?.n ?? 0;

    rows.push(
      { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'leads_created_count',     value: created },
      { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'leads_converted_count',   value: converted },
      { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'lead_conversion_rate',    value: created > 0 ? (converted / created) * 100 : 0 },
      { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'portal_reach_count',      value: portalReach?.n ?? 0 },
      { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'new_contacts_count',      value: newContacts?.n ?? 0 },
      { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'active_properties_count', value: activeProps?.n ?? 0 },
      { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'revenue_pipeline_amount', value: Number(pipelineRevenue?.n ?? 0) },
    );

    // ------------------------------------------------------------------
    // Agent-level metrics
    // ------------------------------------------------------------------

    const agentLeadsAssigned = await tx
      .select({
        actorId: analyticsEvent.actorId,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'lead.assigned'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          isNotNull(analyticsEvent.actorId),
        ),
      )
      .groupBy(analyticsEvent.actorId);

    for (const r of agentLeadsAssigned) {
      if (r.actorId) {
        rows.push({
          dimensionType: 'agent',
          dimensionId:    r.actorId,
          dimensionLabel: null,
          metric:         'leads_assigned_count',
          value:          r.n,
        });
      }
    }

    const agentDealsClosed = await tx
      .select({
        actorId: analyticsEvent.actorId,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          sql`${analyticsEvent.eventType} IN ('lead.closed_won', 'opportunity.closed_won')`,
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          isNotNull(analyticsEvent.actorId),
        ),
      )
      .groupBy(analyticsEvent.actorId);

    for (const r of agentDealsClosed) {
      if (r.actorId) {
        rows.push({
          dimensionType: 'agent',
          dimensionId:    r.actorId,
          dimensionLabel: null,
          metric:         'deals_closed_count',
          value:          r.n,
        });
      }
    }

    // ------------------------------------------------------------------
    // Property-level metrics
    // ------------------------------------------------------------------

    const propEventMetrics: { event: string; metric: string }[] = [
      { event: 'property.viewed',         metric: 'property_views_count' },
      { event: 'property.lead_generated', metric: 'property_inquiries_count' },
      { event: 'property.price_changed',  metric: 'price_change_count' },
    ];

    for (const { event, metric } of propEventMetrics) {
      const propRows = await tx
        .select({
          entityId: analyticsEvent.entityId,
          n: sql<number>`COUNT(*)::int`,
        })
        .from(analyticsEvent)
        .where(
          and(
            eq(analyticsEvent.tenantId, tenantId),
            eq(analyticsEvent.eventType, event as never),
            sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
            isNotNull(analyticsEvent.entityId),
          ),
        )
        .groupBy(analyticsEvent.entityId);

      for (const r of propRows) {
        if (r.entityId) {
          rows.push({
            dimensionType: 'property',
            dimensionId:    r.entityId,
            dimensionLabel: null,
            metric,
            value:          r.n,
          });
        }
      }
    }

    // ------------------------------------------------------------------
    // Channel-level metrics (source_channel from lead.created properties)
    // ------------------------------------------------------------------

    const channelLeads = await tx
      .select({
        channel: sql<string>`properties->>'source_channel'`,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'lead.created'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          sql`properties->>'source_channel' IS NOT NULL`,
        ),
      )
      .groupBy(sql`properties->>'source_channel'`);

    for (const r of channelLeads) {
      if (r.channel) {
        rows.push({
          dimensionType: 'channel',
          dimensionId:    channelUuid(r.channel),
          dimensionLabel: r.channel,
          metric:         'channel_leads_count',
          value:          r.n,
        });
      }
    }

    // ------------------------------------------------------------------
    // Phase D — Inbox channel metrics
    // ------------------------------------------------------------------

    const channelMsgsReceived = await tx
      .select({
        channel: sql<string>`properties->>'channel'`,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'message.received'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          sql`properties->>'channel' IS NOT NULL`,
        ),
      )
      .groupBy(sql`properties->>'channel'`);

    for (const r of channelMsgsReceived) {
      if (r.channel) {
        rows.push({
          dimensionType: 'channel',
          dimensionId:    channelUuid(r.channel),
          dimensionLabel: r.channel,
          metric:         'inbox_messages_received_count',
          value:          r.n,
        });
      }
    }

    const agentMsgsSent = await tx
      .select({
        actorId: analyticsEvent.actorId,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'message.sent'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          isNotNull(analyticsEvent.actorId),
        ),
      )
      .groupBy(analyticsEvent.actorId);

    for (const r of agentMsgsSent) {
      if (r.actorId) {
        rows.push({
          dimensionType: 'agent',
          dimensionId:    r.actorId,
          dimensionLabel: null,
          metric:         'inbox_messages_sent_count',
          value:          r.n,
        });
      }
    }

    const agentResponseTime = await tx
      .select({
        actorId: analyticsEvent.actorId,
        avgMins: sql<number>`AVG((properties->>'first_response_minutes')::numeric)::numeric`,
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'message.replied'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          isNotNull(analyticsEvent.actorId),
          sql`properties->>'first_response_minutes' IS NOT NULL`,
        ),
      )
      .groupBy(analyticsEvent.actorId);

    for (const r of agentResponseTime) {
      if (r.actorId) {
        rows.push({
          dimensionType: 'agent',
          dimensionId:    r.actorId,
          dimensionLabel: null,
          metric:         'inbox_avg_first_response_minutes',
          value:          Number(r.avgMins ?? 0),
        });
      }
    }

    const channelSlaRate = await tx
      .select({
        channel: sql<string>`properties->>'channel'`,
        slaRate: sql<number>`AVG(CASE WHEN (properties->>'sla_met')::boolean THEN 100.0 ELSE 0.0 END)::numeric`,
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'message.replied'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          sql`properties->>'channel' IS NOT NULL`,
        ),
      )
      .groupBy(sql`properties->>'channel'`);

    for (const r of channelSlaRate) {
      if (r.channel) {
        rows.push({
          dimensionType: 'channel',
          dimensionId:    channelUuid(r.channel),
          dimensionLabel: r.channel,
          metric:         'inbox_sla_compliance_rate',
          value:          Number(r.slaRate ?? 0),
        });
      }
    }

    // ------------------------------------------------------------------
    // Phase D — Portal performance metrics
    // ------------------------------------------------------------------

    const portalPublications = await tx
      .select({
        portalId:   sql<string>`properties->>'portal_id'`,
        portalName: sql<string>`properties->>'portal_name'`,
        n:          sql<number>`COUNT(DISTINCT entity_id)::int`,
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'portal.property_synced'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          sql`properties->>'portal_id' IS NOT NULL`,
          isNotNull(analyticsEvent.entityId),
        ),
      )
      .groupBy(sql`properties->>'portal_id'`, sql`properties->>'portal_name'`);

    const pubsByPortal = new Map<string, number>();

    for (const r of portalPublications) {
      if (r.portalId) {
        pubsByPortal.set(r.portalId, r.n);
        rows.push({
          dimensionType: 'channel',
          dimensionId:    r.portalId,
          dimensionLabel: r.portalName ?? r.portalId,
          metric:         'portal_publications_count',
          value:          r.n,
        });
      }
    }

    const portalSyncErrors = await tx
      .select({
        portalId:   sql<string>`properties->>'portal_id'`,
        portalName: sql<string>`properties->>'portal_name'`,
        n:          sql<number>`COUNT(*)::int`,
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'portal.sync_error'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          sql`properties->>'portal_id' IS NOT NULL`,
        ),
      )
      .groupBy(sql`properties->>'portal_id'`, sql`properties->>'portal_name'`);

    for (const r of portalSyncErrors) {
      if (r.portalId) {
        rows.push({
          dimensionType: 'channel',
          dimensionId:    r.portalId,
          dimensionLabel: r.portalName ?? r.portalId,
          metric:         'portal_sync_error_count',
          value:          r.n,
        });
      }
    }

    const portalLeadsReceived = await tx
      .select({
        portalId:   sql<string>`properties->>'portal_id'`,
        portalName: sql<string>`properties->>'portal_name'`,
        n:          sql<number>`COUNT(*)::int`,
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'portal.lead_received'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          sql`properties->>'portal_id' IS NOT NULL`,
        ),
      )
      .groupBy(sql`properties->>'portal_id'`, sql`properties->>'portal_name'`);

    for (const r of portalLeadsReceived) {
      if (r.portalId) {
        const pubs = pubsByPortal.get(r.portalId) ?? 0;
        rows.push({
          dimensionType: 'channel',
          dimensionId:    r.portalId,
          dimensionLabel: r.portalName ?? r.portalId,
          metric:         'portal_lead_conversion_rate',
          value:          pubs > 0 ? (r.n / pubs) * 100 : 0,
        });
      }
    }

    // ------------------------------------------------------------------
    // Phase D — Lead attribution (portal-sourced leads)
    // ------------------------------------------------------------------

    const leadPortalAttribution = await tx
      .select({
        portalId: sql<string>`properties->>'portal_id'`,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'lead.created'),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          sql`properties->>'portal_id' IS NOT NULL`,
        ),
      )
      .groupBy(sql`properties->>'portal_id'`);

    for (const r of leadPortalAttribution) {
      if (r.portalId) {
        rows.push({
          dimensionType: 'channel',
          dimensionId:    r.portalId,
          dimensionLabel: null,
          metric:         'lead_portal_attribution_count',
          value:          r.n,
        });
      }
    }

    return rows;
  }
}
