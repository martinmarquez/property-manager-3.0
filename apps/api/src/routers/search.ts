import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import type { AuthenticatedContext } from '../trpc.js';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const entityTypeFilter = z
  .enum(['property', 'contact', 'lead', 'document'])
  .optional();

const queryInput = z.object({
  q: z.string().min(1).max(500),
  entityType: entityTypeFilter,
  cursor: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(50).default(20),
});

const autocompleteInput = z.object({
  q: z.string().min(1).max(200),
  entityType: entityTypeFilter,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrgmRow {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle: string | null;
  snippet: string;
  sim: number;
  exact_ref_match: number;
}

interface SemanticRow {
  ai_entity_type: string;
  entity_id: string;
  content: string;
  cosine_sim: number;
  rank: number;
}

interface FusionEntry {
  entityType: string;
  entityId: string;
  title: string;
  subtitle: string | null;
  snippet: string;
  rrfScore: number;
  matchedOn: string;
  exactRefMatch: boolean;
}

export interface SearchResult {
  entityType: 'property' | 'contact' | 'lead' | 'document';
  entityId: string;
  title: string;
  subtitle: string | null;
  snippet: string;
  relevanceScore: number;
  matchedOn: string;
}

export interface AutocompleteResult {
  label: string;
  entityType: 'property' | 'contact' | 'lead' | 'document';
  entityId: string;
  secondaryLabel: string | null;
}

// RRF fusion constant (k=60 is the standard default)
const RRF_K = 60;

// Map external entity type names to ai_embedding entity_type values
const AI_ENTITY_MAP: Record<string, string[]> = {
  property: ['property', 'property_description'],
  contact: ['contact_note'],
  document: ['document_page'],
};

const AI_TO_EXTERNAL: Record<string, string> = {
  property: 'property',
  property_description: 'property',
  contact_note: 'contact',
  document_page: 'document',
  conversation_message: 'contact',
};

// ---------------------------------------------------------------------------
// Parameterized query builders (no sql.raw, no string interpolation)
// ---------------------------------------------------------------------------

function trgmPropertyQuery(tenantId: string, q: string) {
  return sql`
    SELECT
      'property' AS entity_type,
      p.id::text AS entity_id,
      coalesce(p.title, p.reference_code, 'Property') AS title,
      coalesce(p.neighborhood, p.locality, '') AS subtitle,
      ts_headline('simple', coalesce(p.search_text, ''), plainto_tsquery('simple', ${q}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, MaxFragments=1') AS snippet,
      similarity(p.search_text, ${q}) AS sim,
      CASE WHEN lower(p.reference_code) = lower(${q}) THEN 1 ELSE 0 END AS exact_ref_match
    FROM property p
    WHERE p.tenant_id = ${tenantId}::uuid
      AND p.deleted_at IS NULL
      AND p.search_text % ${q}
    ORDER BY sim DESC
    LIMIT 100
  `;
}

function trgmContactQuery(tenantId: string, q: string) {
  return sql`
    SELECT
      'contact' AS entity_type,
      c.id::text AS entity_id,
      coalesce(c.first_name || ' ' || c.last_name, c.legal_name, 'Contact') AS title,
      coalesce(c.kind::text, '') AS subtitle,
      ts_headline('simple', coalesce(c.search_text, ''), plainto_tsquery('simple', ${q}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, MaxFragments=1') AS snippet,
      similarity(c.search_text, ${q}) AS sim,
      0 AS exact_ref_match
    FROM contact c
    WHERE c.tenant_id = ${tenantId}::uuid
      AND c.deleted_at IS NULL
      AND c.search_text % ${q}
    ORDER BY sim DESC
    LIMIT 100
  `;
}

function trgmLeadQuery(tenantId: string, q: string) {
  return sql`
    SELECT
      'lead' AS entity_type,
      l.id::text AS entity_id,
      coalesce(l.title, 'Lead') AS title,
      coalesce(c2.first_name || ' ' || c2.last_name, c2.legal_name, '') AS subtitle,
      ts_headline('simple', coalesce(l.search_text, ''), plainto_tsquery('simple', ${q}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, MaxFragments=1') AS snippet,
      similarity(l.search_text, ${q}) AS sim,
      0 AS exact_ref_match
    FROM lead l
    JOIN contact c2 ON c2.id = l.contact_id
    WHERE l.tenant_id = ${tenantId}::uuid
      AND l.deleted_at IS NULL
      AND l.search_text % ${q}
    ORDER BY sim DESC
    LIMIT 100
  `;
}

function trgmDocumentQuery(tenantId: string, q: string) {
  return sql`
    SELECT
      'document' AS entity_type,
      d.id::text AS entity_id,
      coalesce(dt.name, dt.kind::text, 'Document') AS title,
      coalesce(d.status::text, '') AS subtitle,
      coalesce(dt.kind::text || ' - ' || dt.name, '') AS snippet,
      similarity(d.search_text, ${q}) AS sim,
      0 AS exact_ref_match
    FROM doc_document d
    JOIN doc_template dt ON dt.id = d.template_id
    WHERE d.tenant_id = ${tenantId}::uuid
      AND d.deleted_at IS NULL
      AND d.search_text IS NOT NULL
      AND d.search_text % ${q}
    ORDER BY sim DESC
    LIMIT 100
  `;
}

function semanticSearchQuery(tenantId: string, q: string, aiEntityTypes?: string[]) {
  if (aiEntityTypes && aiEntityTypes.length > 0) {
    return sql`
      WITH anchor AS (
        SELECT embedding
        FROM ai_embedding
        WHERE tenant_id = ${tenantId}::uuid
          AND content % ${q}
        ORDER BY similarity(content, ${q}) DESC
        LIMIT 1
      )
      SELECT
        e.entity_type::text AS ai_entity_type,
        e.entity_id::text,
        e.content,
        1 - (e.embedding <=> (SELECT embedding FROM anchor)) AS cosine_sim,
        row_number() OVER (ORDER BY e.embedding <=> (SELECT embedding FROM anchor)) AS rank
      FROM ai_embedding e, anchor
      WHERE e.tenant_id = ${tenantId}::uuid
        AND e.entity_type = ANY(${aiEntityTypes}::ai_entity_type[])
      ORDER BY cosine_sim DESC
      LIMIT 50
    `;
  }

  return sql`
    WITH anchor AS (
      SELECT embedding
      FROM ai_embedding
      WHERE tenant_id = ${tenantId}::uuid
        AND content % ${q}
      ORDER BY similarity(content, ${q}) DESC
      LIMIT 1
    )
    SELECT
      e.entity_type::text AS ai_entity_type,
      e.entity_id::text,
      e.content,
      1 - (e.embedding <=> (SELECT embedding FROM anchor)) AS cosine_sim,
      row_number() OVER (ORDER BY e.embedding <=> (SELECT embedding FROM anchor)) AS rank
    FROM ai_embedding e, anchor
    WHERE e.tenant_id = ${tenantId}::uuid
    ORDER BY cosine_sim DESC
    LIMIT 50
  `;
}

// ---------------------------------------------------------------------------
// Autocomplete query builders
// ---------------------------------------------------------------------------

function acPropertyQuery(tenantId: string, q: string) {
  return sql`
    SELECT
      'property' AS entity_type,
      p.id::text AS entity_id,
      coalesce(p.title, p.reference_code, 'Property') AS label,
      coalesce(p.neighborhood, p.locality, '') AS secondary_label,
      similarity(p.search_text, ${q}) AS sim
    FROM property p
    WHERE p.tenant_id = ${tenantId}::uuid
      AND p.deleted_at IS NULL
      AND p.search_text % ${q}
    ORDER BY sim DESC
    LIMIT 5
  `;
}

function acContactQuery(tenantId: string, q: string) {
  return sql`
    SELECT
      'contact' AS entity_type,
      c.id::text AS entity_id,
      coalesce(c.first_name || ' ' || c.last_name, c.legal_name, 'Contact') AS label,
      coalesce(c.kind::text, '') AS secondary_label,
      similarity(c.search_text, ${q}) AS sim
    FROM contact c
    WHERE c.tenant_id = ${tenantId}::uuid
      AND c.deleted_at IS NULL
      AND c.search_text % ${q}
    ORDER BY sim DESC
    LIMIT 5
  `;
}

function acLeadQuery(tenantId: string, q: string) {
  return sql`
    SELECT
      'lead' AS entity_type,
      l.id::text AS entity_id,
      coalesce(l.title, 'Lead') AS label,
      coalesce(c2.first_name || ' ' || c2.last_name, c2.legal_name, '') AS secondary_label,
      similarity(l.search_text, ${q}) AS sim
    FROM lead l
    JOIN contact c2 ON c2.id = l.contact_id
    WHERE l.tenant_id = ${tenantId}::uuid
      AND l.deleted_at IS NULL
      AND l.search_text % ${q}
    ORDER BY sim DESC
    LIMIT 5
  `;
}

function acDocumentQuery(tenantId: string, q: string) {
  return sql`
    SELECT
      'document' AS entity_type,
      d.id::text AS entity_id,
      coalesce(dt.name, dt.kind::text, 'Document') AS label,
      coalesce(d.status::text, '') AS secondary_label,
      similarity(d.search_text, ${q}) AS sim
    FROM doc_document d
    JOIN doc_template dt ON dt.id = d.template_id
    WHERE d.tenant_id = ${tenantId}::uuid
      AND d.deleted_at IS NULL
      AND d.search_text IS NOT NULL
      AND d.search_text % ${q}
    ORDER BY sim DESC
    LIMIT 5
  `;
}

// ---------------------------------------------------------------------------
// Search router
// ---------------------------------------------------------------------------

export const searchRouter = router({
  /**
   * search.query — hybrid search across all entity types.
   *
   * Tier 1: pg_trgm keyword search on search_text columns (<50ms target)
   * Tier 2: pgvector cosine similarity on ai_embedding (100-300ms)
   * RRF fusion of both tiers, with reference_code exact match boosted 20%.
   */
  query: protectedProcedure
    .input(queryInput)
    .query(async ({ ctx, input }) => {
      const { tenantId, userId, db } = ctx as AuthenticatedContext;
      const { q, entityType, cursor, limit } = input;
      const startTime = Date.now();

      // ------------------------------------------------------------------
      // Tier 1: pg_trgm keyword search — run per-entity queries in parallel
      // ------------------------------------------------------------------
      const trgmBuilders: Record<string, (t: string, q: string) => ReturnType<typeof sql>> = {
        property: trgmPropertyQuery,
        contact: trgmContactQuery,
        lead: trgmLeadQuery,
        document: trgmDocumentQuery,
      };

      const trgmTypes = entityType ? [entityType] : ['property', 'contact', 'lead', 'document'];
      const trgmPromises = trgmTypes.map((t) => {
        const builder = trgmBuilders[t];
        if (!builder) return Promise.resolve([] as TrgmRow[]);
        return db.execute(builder(tenantId, q)).then(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r: any) => (r.rows ?? []) as TrgmRow[],
          () => [] as TrgmRow[],
        );
      });

      // ------------------------------------------------------------------
      // Tier 2: pgvector semantic search on ai_embedding
      // ------------------------------------------------------------------
      let aiEntityTypes: string[] | undefined;
      if (entityType && AI_ENTITY_MAP[entityType]) {
        aiEntityTypes = AI_ENTITY_MAP[entityType];
      }

      const semanticPromise = db
        .execute(semanticSearchQuery(tenantId, q, aiEntityTypes))
        .then(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r: any) => (r.rows ?? []) as SemanticRow[],
          () => [] as SemanticRow[],
        );

      // Execute all queries in parallel
      const [trgmResults, semanticRows] = await Promise.all([
        Promise.all(trgmPromises).then((arrays) => arrays.flat()),
        semanticPromise,
      ]);

      // ------------------------------------------------------------------
      // RRF Fusion: combine both tier rankings
      // ------------------------------------------------------------------
      const fusionMap = new Map<string, FusionEntry>();

      // Rank trgm results by sim (already sorted per-query, re-rank globally)
      const sortedTrgm = trgmResults.sort((a, b) => b.sim - a.sim);
      for (let i = 0; i < sortedTrgm.length; i++) {
        const row = sortedTrgm[i]!;
        const key = `${row.entity_type}:${row.entity_id}`;
        const rank = i + 1;
        fusionMap.set(key, {
          entityType: row.entity_type,
          entityId: row.entity_id,
          title: row.title,
          subtitle: row.subtitle,
          snippet: row.snippet,
          rrfScore: 1 / (RRF_K + rank),
          matchedOn: 'keyword',
          exactRefMatch: row.exact_ref_match === 1,
        });
      }

      // Merge semantic results
      for (const row of semanticRows) {
        if (row.cosine_sim <= 0) continue;
        const externalType = AI_TO_EXTERNAL[row.ai_entity_type] ?? row.ai_entity_type;
        if (entityType && externalType !== entityType) continue;
        const key = `${externalType}:${row.entity_id}`;
        const rrfScore = 1 / (RRF_K + row.rank);

        const existing = fusionMap.get(key);
        if (existing) {
          existing.rrfScore += rrfScore;
          existing.matchedOn = 'keyword+semantic';
        } else {
          fusionMap.set(key, {
            entityType: externalType,
            entityId: row.entity_id,
            title: row.content.slice(0, 80),
            subtitle: null,
            snippet: row.content.slice(0, 150),
            rrfScore,
            matchedOn: 'semantic',
            exactRefMatch: false,
          });
        }
      }

      // Apply 20% reference code exact match boost
      for (const entry of fusionMap.values()) {
        if (entry.exactRefMatch) {
          entry.rrfScore *= 1.2;
        }
      }

      // Sort by RRF score descending, paginate
      const allResults = Array.from(fusionMap.values()).sort(
        (a, b) => b.rrfScore - a.rrfScore,
      );
      const paginated = allResults.slice(cursor, cursor + limit);

      const results: SearchResult[] = paginated.map((r) => ({
        entityType: r.entityType as SearchResult['entityType'],
        entityId: r.entityId,
        title: r.title,
        subtitle: r.subtitle,
        snippet: r.snippet,
        relevanceScore: Math.round(r.rrfScore * 10000) / 10000,
        matchedOn: r.matchedOn,
      }));

      const latencyMs = Date.now() - startTime;

      // Log the search asynchronously (fire-and-forget, outside transaction)
      db.execute(
        sql`INSERT INTO search_query_log (tenant_id, actor_id, query_text, search_type, result_count, latency_ms)
            VALUES (${tenantId}::uuid, ${userId}::uuid, ${q}, 'hybrid', ${results.length}, ${latencyMs})`,
      ).catch(() => {});

      return {
        results,
        total: allResults.length,
        cursor: cursor + limit,
        hasMore: cursor + limit < allResults.length,
      };
    }),

  /**
   * search.autocomplete — fast trgm-only prefix match.
   * Returns up to 5 suggestions in <=50ms.
   * NO semantic/embedding queries (latency requirement).
   */
  autocomplete: protectedProcedure
    .input(autocompleteInput)
    .query(async ({ ctx, input }) => {
      const { tenantId, db } = ctx as AuthenticatedContext;
      const { q, entityType } = input;

      const acBuilders: Record<string, (t: string, q: string) => ReturnType<typeof sql>> = {
        property: acPropertyQuery,
        contact: acContactQuery,
        lead: acLeadQuery,
        document: acDocumentQuery,
      };

      const acTypes = entityType ? [entityType] : ['property', 'contact', 'lead', 'document'];

      // Run all entity type queries in parallel, merge and take top 5
      const allRows = await Promise.all(
        acTypes.map((t) => {
          const builder = acBuilders[t];
          if (!builder) return Promise.resolve([] as Array<{ entity_type: string; entity_id: string; label: string; secondary_label: string | null; sim: number }>);
          return db.execute(builder(tenantId, q)).then(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r: any) =>
              (r.rows ?? []) as Array<{
                entity_type: string;
                entity_id: string;
                label: string;
                secondary_label: string | null;
                sim: number;
              }>,
            () => [] as Array<{
              entity_type: string;
              entity_id: string;
              label: string;
              secondary_label: string | null;
              sim: number;
            }>,
          );
        }),
      ).then((arrays) => arrays.flat());

      // Sort by similarity descending, take top 5
      allRows.sort((a, b) => b.sim - a.sim);
      const top5 = allRows.slice(0, 5);

      const suggestions: AutocompleteResult[] = top5.map((r) => ({
        label: r.label,
        entityType: r.entity_type as AutocompleteResult['entityType'],
        entityId: r.entity_id,
        secondaryLabel: r.secondary_label || null,
      }));

      return { suggestions };
    }),
});
