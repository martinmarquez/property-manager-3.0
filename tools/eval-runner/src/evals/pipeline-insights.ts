import type { FeatureEvalConfig } from '../harness.js';
import { tryParseJSON, hasFields } from '../harness.js';

const SYSTEM_PROMPT = `Analyze real estate sales pipeline data and generate actionable insights. Output JSON: { "insights": [{ "title": string, "description": string, "impact": "high" | "medium" | "low" }], "topMetric": string, "recommendation": string }

Rules:
- insights must be a non-empty array with at least one item.
- Each insight must have a title, description, and impact field.
- impact must be exactly one of: "high", "medium", "low".
- topMetric should identify the single most important metric to watch.
- recommendation should be a specific, actionable suggestion for the sales team.
- Use Argentine real estate context: operaciones, reservas, boleto, escritura stages.
- Focus on conversion rates, bottlenecks, revenue projections, and broker performance.`;

const VALID_IMPACTS = new Set(['high', 'medium', 'low']);

function validatePipelineInsights(output: string): boolean {
  const parsed = tryParseJSON(output);
  if (!parsed) return false;
  if (!hasFields(parsed, ['insights', 'topMetric', 'recommendation'])) return false;

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj['insights'])) return false;
  const insights = obj['insights'] as unknown[];
  if (insights.length < 1) return false;

  for (const insight of insights) {
    if (!hasFields(insight, ['title', 'description', 'impact'])) return false;
    const i = insight as Record<string, unknown>;
    if (typeof i['title'] !== 'string' || i['title'].length === 0) return false;
    if (typeof i['description'] !== 'string' || i['description'].length === 0) return false;
    if (!VALID_IMPACTS.has(String(i['impact']))) return false;
  }

  const topMetric = String(obj['topMetric'] ?? '');
  if (topMetric.length === 0) return false;

  const recommendation = String(obj['recommendation'] ?? '');
  if (recommendation.length === 0) return false;

  return true;
}

export function createEval(): FeatureEvalConfig {
  return {
    featureId: 'pipeline.insights',
    systemPrompt: SYSTEM_PROMPT,
    threshold: 0.8,
    maxTokens: 1024,
    cases: [
      {
        id: 'pi-01-stalled-pipeline',
        category: 'bottleneck',
        input: `Pipeline snapshot — May 2026:
Active deals: 42
Stage distribution:
  - Consulta inicial: 18 (43%)
  - Visita programada: 12 (29%)
  - Reserva: 8 (19%)
  - Boleto: 3 (7%)
  - Escritura: 1 (2%)
Avg time in stage:
  - Consulta inicial: 5 days
  - Visita programada: 14 days
  - Reserva: 28 days
  - Boleto: 45 days
  - Escritura: 60 days
Conversion rates:
  - Consulta -> Visita: 67%
  - Visita -> Reserva: 67%
  - Reserva -> Boleto: 38%
  - Boleto -> Escritura: 33%
Revenue projection: USD 2.1M (committed) / USD 5.8M (pipeline)
Top brokers: Maria (12 deals), Juan (9 deals), Pedro (8 deals)`,
        validate: validatePipelineInsights,
      },
      {
        id: 'pi-02-strong-pipeline',
        category: 'performance',
        input: `Pipeline snapshot — May 2026:
Active deals: 67
Stage distribution:
  - Consulta inicial: 20 (30%)
  - Visita programada: 15 (22%)
  - Reserva: 14 (21%)
  - Boleto: 10 (15%)
  - Escritura: 8 (12%)
Avg time in stage:
  - Consulta inicial: 3 days
  - Visita programada: 7 days
  - Reserva: 10 days
  - Boleto: 15 days
  - Escritura: 30 days
Conversion rates:
  - Consulta -> Visita: 75%
  - Visita -> Reserva: 80%
  - Reserva -> Boleto: 71%
  - Boleto -> Escritura: 80%
Revenue projection: USD 4.8M (committed) / USD 8.2M (pipeline)
Top brokers: Ana (18 deals), Carlos (16 deals), Lucia (14 deals)
Month-over-month growth: +22%`,
        validate: validatePipelineInsights,
      },
      {
        id: 'pi-03-seasonal-dip',
        category: 'forecast',
        input: `Pipeline snapshot — January 2026 (summer / vacation season):
Active deals: 19
Stage distribution:
  - Consulta inicial: 10 (53%)
  - Visita programada: 4 (21%)
  - Reserva: 3 (16%)
  - Boleto: 1 (5%)
  - Escritura: 1 (5%)
Avg time in stage:
  - Consulta inicial: 8 days
  - Visita programada: 18 days
  - Reserva: 15 days
  - Boleto: 20 days
  - Escritura: 35 days
Conversion rates:
  - Consulta -> Visita: 40%
  - Visita -> Reserva: 50%
  - Reserva -> Boleto: 33%
  - Boleto -> Escritura: 100%
Revenue projection: USD 850K (committed) / USD 2.1M (pipeline)
Year-over-year comparison: -35% vs January 2025
Historical pattern: January is typically the slowest month, recovery begins in March`,
        validate: validatePipelineInsights,
      },
      {
        id: 'pi-04-broker-imbalance',
        category: 'performance',
        input: `Pipeline snapshot — April 2026:
Active deals: 53
Broker performance:
  - Sofia: 22 deals, 78% conversion, avg close 25 days, USD 3.2M pipeline
  - Martin: 15 deals, 45% conversion, avg close 48 days, USD 1.8M pipeline
  - Diego: 10 deals, 30% conversion, avg close 62 days, USD 900K pipeline
  - Laura: 6 deals, 25% conversion, avg close 55 days, USD 450K pipeline
Team average conversion: 52%
Team average close time: 42 days
Stage distribution:
  - Consulta inicial: 15
  - Visita programada: 14
  - Reserva: 12
  - Boleto: 8
  - Escritura: 4
Lead source performance: Portal (40%), Referral (35%), Social (15%), Walk-in (10%)`,
        validate: validatePipelineInsights,
      },
      {
        id: 'pi-05-reserva-bottleneck',
        category: 'bottleneck',
        input: `Pipeline snapshot — March 2026:
Active deals: 38
Stage distribution:
  - Consulta inicial: 5 (13%)
  - Visita programada: 6 (16%)
  - Reserva: 18 (47%)
  - Boleto: 6 (16%)
  - Escritura: 3 (8%)
Avg time in stage:
  - Consulta inicial: 4 days
  - Visita programada: 6 days
  - Reserva: 42 days
  - Boleto: 18 days
  - Escritura: 25 days
Conversion rates:
  - Consulta -> Visita: 80%
  - Visita -> Reserva: 85%
  - Reserva -> Boleto: 33%
  - Boleto -> Escritura: 50%
Top reasons for reserva stalls: Financing delays (45%), Price negotiation (30%), Legal issues (25%)
Revenue at risk: USD 2.4M stuck in reserva stage`,
        validate: validatePipelineInsights,
      },
      {
        id: 'pi-06-new-development-surge',
        category: 'forecast',
        input: `Pipeline snapshot — May 2026 (post-launch of 3 new developments):
Active deals: 89
Stage distribution:
  - Consulta inicial: 45 (51%)
  - Visita programada: 22 (25%)
  - Reserva: 12 (13%)
  - Boleto: 7 (8%)
  - Escritura: 3 (3%)
New leads this month: 58 (vs avg 25/month)
Lead source: Development launch event (62%), Portal ads (22%), Referrals (16%)
Conversion rates:
  - Consulta -> Visita: 49%
  - Visita -> Reserva: 55%
  - Reserva -> Boleto: 58%
  - Boleto -> Escritura: 43%
Avg deal size: USD 145,000 (development units) vs USD 210,000 (resale)
Broker capacity: 5 brokers handling avg 17.8 deals each (recommended max: 12)`,
        validate: validatePipelineInsights,
      },
      {
        id: 'pi-07-high-value-concentration',
        category: 'performance',
        input: `Pipeline snapshot — April 2026:
Active deals: 31
Deal value distribution:
  - Under USD 100K: 8 deals (26%) — USD 620K total
  - USD 100K-200K: 12 deals (39%) — USD 1.8M total
  - USD 200K-500K: 7 deals (22%) — USD 2.3M total
  - Over USD 500K: 4 deals (13%) — USD 3.1M total
Stage distribution of high-value deals (>500K):
  - Consulta inicial: 1
  - Visita programada: 1
  - Reserva: 1
  - Boleto: 1
Avg close time by segment:
  - Under 100K: 30 days
  - 100K-200K: 45 days
  - 200K-500K: 65 days
  - Over 500K: 95 days
Top broker for high-value: Ana (3 of 4 deals)
Risk: 40% of pipeline revenue depends on 4 deals`,
        validate: validatePipelineInsights,
      },
      {
        id: 'pi-08-escritura-delays',
        category: 'bottleneck',
        input: `Pipeline snapshot — May 2026:
Active deals: 44
Stage distribution:
  - Consulta inicial: 8
  - Visita programada: 10
  - Reserva: 7
  - Boleto: 9
  - Escritura: 10
Avg time in stage:
  - Consulta inicial: 4 days
  - Visita programada: 8 days
  - Reserva: 12 days
  - Boleto: 14 days
  - Escritura: 75 days (target: 30 days)
Escritura delay reasons: Notary backlog (40%), Municipal certificate delays (30%), Bank mortgage approval (20%), Title issues (10%)
Deals past due in escritura: 7 of 10
Revenue held in escritura: USD 3.8M
Commission at risk due to deal fatigue: estimated USD 190K`,
        validate: validatePipelineInsights,
      },
      {
        id: 'pi-09-declining-conversion',
        category: 'forecast',
        input: `Pipeline snapshot — May 2026 (3-month trend):
Active deals: 35

Conversion rate trend (March -> April -> May):
  - Consulta -> Visita: 72% -> 65% -> 55%
  - Visita -> Reserva: 68% -> 60% -> 48%
  - Reserva -> Boleto: 55% -> 50% -> 42%
  - Boleto -> Escritura: 70% -> 65% -> 60%

Monthly new leads: 40 -> 38 -> 32
Monthly closed deals: 8 -> 6 -> 3
Avg deal size: USD 175K -> USD 168K -> USD 155K

Stage distribution (current):
  - Consulta inicial: 14
  - Visita programada: 9
  - Reserva: 6
  - Boleto: 4
  - Escritura: 2

Market context: Interest rate hike from 4.5% to 6.2% in April, new rental law uncertainty`,
        validate: validatePipelineInsights,
      },
      {
        id: 'pi-10-rental-vs-sales-split',
        category: 'performance',
        input: `Pipeline snapshot — May 2026:
Active deals: 56

Sales pipeline (28 deals):
  - Consulta inicial: 8
  - Visita programada: 7
  - Reserva: 6
  - Boleto: 4
  - Escritura: 3
  Sales conversion: Consulta->Escritura: 18%
  Avg close time: 52 days
  Revenue: USD 4.2M pipeline

Rental pipeline (28 deals):
  - Consulta inicial: 6
  - Visita programada: 8
  - Reserva/Contrato: 10
  - Firma: 4
  Rental conversion: Consulta->Firma: 35%
  Avg close time: 18 days
  Monthly rent revenue: ARS 12.5M pipeline

Broker allocation: 3 brokers on sales, 2 on rentals
Commission structure: Sales 3% one-time, Rentals 1 month rent
YTD revenue split: Sales 72%, Rentals 28%`,
        validate: validatePipelineInsights,
      },
    ],
  };
}
