import { createHash } from 'node:crypto';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { Job } from 'bullmq';
import {
  analyticsEvent,
  lead,
  property,
  tenant,
  copilotSession,
  copilotTurn,
  aiEmbeddingLog,
  searchQueryLog,
  descriptionGenerationLog,
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

    // Phase F materialized views — refresh nightly after KPI rollup
    await this.db.execute(
      sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ai_usage_value`,
    );
    await this.db.execute(
      sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ai_cost_by_tenant`,
    );
    await this.db.execute(
      sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_search_analytics`,
    );
    await this.db.execute(
      sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_description_metrics`,
    );

    // Phase G materialized views — billing metrics (platform-level, not per-tenant)
    await this.db.execute(
      sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_billing_metrics`,
    );
    await this.db.execute(
      sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_plan_distribution`,
    );

    // Phase G — Reports materialized views (0021 + 0023 migrations)
    await this._refreshIfExists('analytics.mv_pipeline_conversion');
    await this._refreshIfExists('analytics.mv_listing_performance');
    await this._refreshIfExists('analytics.mv_agent_productivity');
    await this._refreshIfExists('analytics.mv_portal_roi');
    await this._refreshIfExists('analytics.mv_revenue_forecast');
    await this._refreshIfExists('analytics.mv_retention_cohort');
    await this._refreshIfExists('analytics.mv_zone_heatmap');
    await this._refreshIfExists('analytics.mv_sla_adherence');
    await this._refreshIfExists('analytics.mv_commission_owed');

    this.logger.info('analytics.refresh.done', {
      snapshotDate,
      tenantCount: tenantIds.length,
    });
  }

  private async _refreshIfExists(mvName: string): Promise<void> {
    try {
      await this.db.execute(sql.raw(
        `REFRESH MATERIALIZED VIEW CONCURRENTLY ${mvName}`,
      ));
      this.logger.info('analytics.refresh.mv_done', { mv: mvName });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('does not exist')) {
        this.logger.warn('analytics.refresh.mv_missing', { mv: mvName });
      } else {
        throw err;
      }
    }
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

    // ------------------------------------------------------------------
    // Phase F — Copilot usage metrics
    // ------------------------------------------------------------------

    const [copilotQueries] = await tx
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(copilotTurn)
      .where(
        and(
          eq(copilotTurn.tenantId, tenantId),
          sql`${copilotTurn.createdAt}::date = ${snapshotDate}::date`,
        ),
      );

    const [copilotSessions] = await tx
      .select({ n: sql<number>`COUNT(DISTINCT id)::int` })
      .from(copilotSession)
      .where(
        and(
          eq(copilotSession.tenantId, tenantId),
          sql`${copilotSession.createdAt}::date = ${snapshotDate}::date`,
        ),
      );

    const [copilotUniqueUsers] = await tx
      .select({ n: sql<number>`COUNT(DISTINCT user_id)::int` })
      .from(copilotSession)
      .where(
        and(
          eq(copilotSession.tenantId, tenantId),
          sql`${copilotSession.createdAt}::date = ${snapshotDate}::date`,
          isNotNull(copilotSession.userId),
        ),
      );

    const [copilotTokens] = await tx
      .select({
        inputTotal:  sql<number>`COALESCE(SUM(input_tokens), 0)::bigint`,
        outputTotal: sql<number>`COALESCE(SUM(output_tokens), 0)::bigint`,
      })
      .from(copilotTurn)
      .where(
        and(
          eq(copilotTurn.tenantId, tenantId),
          sql`${copilotTurn.createdAt}::date = ${snapshotDate}::date`,
        ),
      );

    const [copilotConfirmRate] = await tx
      .select({
        rate: sql<number>`
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE action_confirmed = true)
            / NULLIF(COUNT(*) FILTER (WHERE action_confirmed IS NOT NULL), 0),
            2
          )::numeric`,
      })
      .from(copilotTurn)
      .where(
        and(
          eq(copilotTurn.tenantId, tenantId),
          sql`${copilotTurn.createdAt}::date = ${snapshotDate}::date`,
        ),
      );

    const [copilotAvgMs] = await tx
      .select({
        avgMs: sql<number>`ROUND(AVG(total_ms), 2)::numeric`,
      })
      .from(copilotTurn)
      .where(
        and(
          eq(copilotTurn.tenantId, tenantId),
          sql`${copilotTurn.createdAt}::date = ${snapshotDate}::date`,
          isNotNull(copilotTurn.totalMs),
        ),
      );

    const queriesCount = copilotQueries?.n ?? 0;

    if (queriesCount > 0) {
      rows.push(
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'copilot_queries_count',            value: queriesCount },
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'copilot_sessions_count',           value: copilotSessions?.n ?? 0 },
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'copilot_unique_users_count',       value: copilotUniqueUsers?.n ?? 0 },
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'copilot_tokens_input_total',       value: Number(copilotTokens?.inputTotal ?? 0) },
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'copilot_tokens_output_total',      value: Number(copilotTokens?.outputTotal ?? 0) },
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'copilot_action_confirmation_rate', value: Number(copilotConfirmRate?.rate ?? 0) },
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'copilot_avg_response_ms',          value: Number(copilotAvgMs?.avgMs ?? 0) },
      );
    }

    // ------------------------------------------------------------------
    // Phase F — AI cost metrics (embedding + LLM)
    // ------------------------------------------------------------------

    const [embeddingTokens] = await tx
      .select({ n: sql<number>`COALESCE(SUM(token_count), 0)::bigint` })
      .from(aiEmbeddingLog)
      .where(
        and(
          eq(aiEmbeddingLog.tenantId, tenantId),
          sql`${aiEmbeddingLog.createdAt}::date = ${snapshotDate}::date`,
        ),
      );

    const embedTokens  = Number(embeddingTokens?.n ?? 0);
    const inputTokens  = Number(copilotTokens?.inputTotal ?? 0);
    const outputTokens = Number(copilotTokens?.outputTotal ?? 0);
    // cost model: text-embedding-3-small $0.02/1M; claude-sonnet-4-6 $3/$15 per 1M
    const embeddingCost = (embedTokens / 1_000_000) * 0.02;
    const llmCost       = (inputTokens / 1_000_000) * 3.0 + (outputTokens / 1_000_000) * 15.0;

    if (embedTokens > 0 || inputTokens > 0) {
      rows.push(
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'ai_embedding_cost_usd', value: Number(embeddingCost.toFixed(6)) },
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'ai_llm_cost_usd',       value: Number(llmCost.toFixed(6)) },
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'ai_total_cost_usd',     value: Number((embeddingCost + llmCost).toFixed(6)) },
      );
    }

    // ------------------------------------------------------------------
    // Phase F — Search analytics
    // ------------------------------------------------------------------

    const [searchStats] = await tx
      .select({
        total:        sql<number>`COUNT(*)::int`,
        zeroResults:  sql<number>`COUNT(*) FILTER (WHERE result_count = 0)::int`,
        clicked:      sql<number>`COUNT(*) FILTER (WHERE clicked_rank IS NOT NULL)::int`,
      })
      .from(searchQueryLog)
      .where(
        and(
          eq(searchQueryLog.tenantId, tenantId),
          sql`${searchQueryLog.createdAt}::date = ${snapshotDate}::date`,
        ),
      );

    const totalSearches = searchStats?.total ?? 0;

    if (totalSearches > 0) {
      const zeroResultRate = totalSearches > 0
        ? ((searchStats?.zeroResults ?? 0) / totalSearches) * 100
        : 0;
      const ctr = totalSearches > 0
        ? ((searchStats?.clicked ?? 0) / totalSearches) * 100
        : 0;

      rows.push(
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'search_queries_count',    value: totalSearches },
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'search_zero_result_rate', value: Number(zeroResultRate.toFixed(2)) },
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'search_click_through_rate', value: Number(ctr.toFixed(2)) },
      );
    }

    // ------------------------------------------------------------------
    // Phase F — Description generation metrics
    // ------------------------------------------------------------------

    const [descStats] = await tx
      .select({
        total:     sql<number>`COUNT(*)::int`,
        saved:     sql<number>`COUNT(*) FILTER (WHERE saved = true)::int`,
        avgLatency: sql<number>`ROUND(AVG(latency_ms), 2)::numeric`,
      })
      .from(descriptionGenerationLog)
      .where(
        and(
          eq(descriptionGenerationLog.tenantId, tenantId),
          sql`${descriptionGenerationLog.createdAt}::date = ${snapshotDate}::date`,
        ),
      );

    const totalDescs = descStats?.total ?? 0;

    if (totalDescs > 0) {
      const saveRate = totalDescs > 0
        ? ((descStats?.saved ?? 0) / totalDescs) * 100
        : 0;

      rows.push(
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'descriptions_generated_count',  value: totalDescs },
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'description_save_rate',          value: Number(saveRate.toFixed(2)) },
        { dimensionType: 'agency', dimensionId: null, dimensionLabel: null, metric: 'description_avg_generation_ms',  value: Number(descStats?.avgLatency ?? 0) },
      );
    }

    // ------------------------------------------------------------------
    // Phase G — Site (website builder) metrics
    // ------------------------------------------------------------------

    const siteEventMetrics: { event: string; metric: string }[] = [
      { event: 'site.page_published',          metric: 'site_pages_published_count' },
      { event: 'site.form_submitted',          metric: 'site_form_submissions_count' },
      { event: 'site.custom_domain_connected', metric: 'site_custom_domains_count' },
      { event: 'site.page_viewed',             metric: 'site_page_views_count' },
    ];

    for (const { event, metric } of siteEventMetrics) {
      const [siteRow] = await tx
        .select({ n: sql<number>`COUNT(*)::int` })
        .from(analyticsEvent)
        .where(
          and(
            eq(analyticsEvent.tenantId, tenantId),
            eq(analyticsEvent.eventType, event as never),
            sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          ),
        );

      const val = siteRow?.n ?? 0;
      if (val > 0) {
        rows.push({
          dimensionType: 'agency',
          dimensionId:    null,
          dimensionLabel: null,
          metric,
          value:          val,
        });
      }
    }

    // ------------------------------------------------------------------
    // Phase G — Appraisal metrics
    // ------------------------------------------------------------------

    const appraisalEventMetrics: { event: string; metric: string }[] = [
      { event: 'appraisal.created',              metric: 'appraisals_created_count' },
      { event: 'appraisal.comp_searched',         metric: 'appraisal_comp_searches_count' },
      { event: 'appraisal.pdf_downloaded',        metric: 'appraisal_pdf_downloads_count' },
    ];

    for (const { event, metric } of appraisalEventMetrics) {
      const [apprRow] = await tx
        .select({ n: sql<number>`COUNT(*)::int` })
        .from(analyticsEvent)
        .where(
          and(
            eq(analyticsEvent.tenantId, tenantId),
            eq(analyticsEvent.eventType, event as never),
            sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          ),
        );

      const val = apprRow?.n ?? 0;
      if (val > 0) {
        rows.push({
          dimensionType: 'agency',
          dimensionId:    null,
          dimensionLabel: null,
          metric,
          value:          val,
        });
      }
    }

    // AI narrative adoption rate: narratives_generated / appraisals_created
    const [appraisalsCreated] = await tx
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'appraisal.created' as never),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
        ),
      );

    const [narrativesGenerated] = await tx
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.tenantId, tenantId),
          eq(analyticsEvent.eventType, 'appraisal.ai_narrative_generated' as never),
          sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
        ),
      );

    const createdCount = appraisalsCreated?.n ?? 0;
    const narrativeCount = narrativesGenerated?.n ?? 0;
    if (createdCount > 0) {
      rows.push({
        dimensionType: 'agency',
        dimensionId:    null,
        dimensionLabel: null,
        metric:         'appraisal_ai_narrative_rate',
        value:          Number(((narrativeCount / createdCount) * 100).toFixed(2)),
      });
    }

    // ------------------------------------------------------------------
    // Phase G — Report adoption metrics
    // ------------------------------------------------------------------

    const reportEventMetrics: { event: string; metric: string }[] = [
      { event: 'report.viewed',           metric: 'report_views_count' },
      { event: 'report.exported',         metric: 'report_exports_count' },
      { event: 'report.digest_scheduled', metric: 'report_digest_subscriptions_count' },
    ];

    for (const { event, metric } of reportEventMetrics) {
      const [repRow] = await tx
        .select({ n: sql<number>`COUNT(*)::int` })
        .from(analyticsEvent)
        .where(
          and(
            eq(analyticsEvent.tenantId, tenantId),
            eq(analyticsEvent.eventType, event as never),
            sql`${analyticsEvent.occurredAt}::date = ${snapshotDate}::date`,
          ),
        );

      const val = repRow?.n ?? 0;
      if (val > 0) {
        rows.push({
          dimensionType: 'agency',
          dimensionId:    null,
          dimensionLabel: null,
          metric,
          value:          val,
        });
      }
    }

    return rows;
  }
}
