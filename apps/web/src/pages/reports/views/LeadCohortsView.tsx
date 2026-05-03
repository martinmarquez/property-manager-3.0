import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  CohortGrid,
  HorizontalBarChart,
  DataTable,
  WidgetCard,
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Mock data ──────────────────────────────────────────────── */

const COHORT_ROWS = [
  { label: 'Ene 2026', values: [100, 62, 38, 21, 12, 4.2] },
  { label: 'Feb 2026', values: [100, 58, 34, 19, 10, 0] },
  { label: 'Mar 2026', values: [100, 65, 41, 24, 0, 0] },
  { label: 'Abr 2026', values: [100, 60, 37, 0, 0, 0] },
  { label: 'May 2026', values: [100, 64, 0, 0, 0, 0] },
  { label: 'Jun 2026', values: [100, 0, 0, 0, 0, 0] },
];

const COHORT_HEADERS = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'];

function cohortColor(value: number): { bg: string; text: string } {
  if (value === 0)   return { bg: C.bgElevated, text: C.textTertiary };
  if (value >= 60)   return { bg: 'rgba(22,84,217,0.55)', text: C.textPrimary };
  if (value >= 30)   return { bg: 'rgba(22,84,217,0.35)', text: C.textPrimary };
  if (value >= 10)   return { bg: 'rgba(22,84,217,0.20)', text: C.textSecondary };
  return { bg: 'rgba(22,84,217,0.10)', text: C.textTertiary };
}

const LEADS_BY_SOURCE = [
  { label: 'ZonaProp',      value: 142, color: C.brand },
  { label: 'Argenprop',     value: 98,  color: '#1B6AEF' },
  { label: 'MercadoLibre',  value: 72,  color: '#2880FF' },
  { label: 'Sitio Web',     value: 56,  color: C.success },
  { label: 'Referidos',     value: 34,  color: C.warning },
  { label: 'Instagram',     value: 21,  color: '#A855F7' },
];

const COHORT_TABLE: Record<string, unknown>[] = [
  { cohort: 'Ene 2026', leads: 78,  converted: 3,  conv_pct: 4.2, best_source: 'ZonaProp',     avg_days: 42 },
  { cohort: 'Feb 2026', leads: 82,  converted: 0,  conv_pct: 0,   best_source: 'Argenprop',    avg_days: 38 },
  { cohort: 'Mar 2026', leads: 91,  converted: 0,  conv_pct: 0,   best_source: 'ZonaProp',     avg_days: 35 },
  { cohort: 'Abr 2026', leads: 86,  converted: 0,  conv_pct: 0,   best_source: 'MercadoLibre', avg_days: 28 },
  { cohort: 'May 2026', leads: 94,  converted: 0,  conv_pct: 0,   best_source: 'ZonaProp',     avg_days: 14 },
  { cohort: 'Jun 2026', leads: 92,  converted: 0,  conv_pct: 0,   best_source: 'Sitio Web',    avg_days: 3 },
];

const COHORT_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  { id: 'cohort', label: 'Cohorte', width: '1.2fr', render: (r) => (
    <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{String(r.cohort)}</span>
  )},
  { id: 'leads', label: 'Leads', width: '0.8fr', mono: true, render: (r) => (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>{Number(r.leads).toLocaleString('es-AR')}</span>
  )},
  { id: 'converted', label: 'Convertidos', width: '0.8fr', mono: true, render: (r) => (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: Number(r.converted) > 0 ? C.success : C.textTertiary, fontWeight: 600 }}>
      {Number(r.converted) > 0 ? String(r.converted) : '—'}
    </span>
  )},
  { id: 'conv_pct', label: 'Conv. %', width: '0.8fr', mono: true, render: (r) => {
    const pct = Number(r.conv_pct);
    return (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: pct > 0 ? C.success : C.textTertiary }}>
        {pct > 0 ? `${pct}%` : '—'}
      </span>
    );
  }},
  { id: 'best_source', label: 'Mejor fuente', width: '1fr', render: (r) => (
    <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>{String(r.best_source)}</span>
  )},
  { id: 'avg_days', label: 'Días prom.', width: '0.8fr', mono: true, render: (r) => (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{String(r.avg_days)}d</span>
  )},
];

/* Sparklines for KPIs */
const SPARK_COHORTS  = [5, 6, 6, 7, 7, 8];
const SPARK_CONV     = [3.1, 3.4, 3.6, 3.8, 4.0, 4.2];
const SPARK_LEADS    = [342, 360, 378, 395, 410, 423];

/* ─── Filters ────────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'source',
    label: 'Fuente',
    multi: true,
    options: [
      { value: 'zonaprop',     label: 'ZonaProp' },
      { value: 'argenprop',    label: 'Argenprop' },
      { value: 'mercadolibre', label: 'MercadoLibre' },
      { value: 'sitio-web',    label: 'Sitio Web' },
      { value: 'referidos',    label: 'Referidos' },
      { value: 'instagram',    label: 'Instagram' },
    ],
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    options: [
      { value: 'premium',    label: 'Premium' },
      { value: 'standard',   label: 'Estándar' },
      { value: 'corporate',  label: 'Corporativo' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Cohorte', 'Leads', 'Convertidos', 'Conv. %', 'Mejor fuente', 'Días prom.'],
  rows: COHORT_TABLE.map((r) => [
    String(r.cohort),
    Number(r.leads),
    Number(r.converted),
    Number(r.conv_pct),
    String(r.best_source),
    Number(r.avg_days),
  ]),
  filename: 'lead-cohorts',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function LeadCohortsView() {
  return (
    <ReportShell
      slug="lead-cohorts"
      title="Cohortes de Leads"
      subtitle="Conversión por cohorte y fuente de origen"
      refreshedAt="Hace 10 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* KPIs */}
      <KpiRow cards={[
        { label: 'Cohortes activas',   value: '8',        delta: '+2 vs trim. anterior', positive: true,  sparkline: SPARK_COHORTS, color: C.brand },
        { label: 'Mejor fuente',       value: 'ZonaProp', delta: '+18%',                 positive: true,  color: C.success },
        { label: 'Conversión prom.',   value: '4,2%',     delta: '+0.4pp',               positive: true,  sparkline: SPARK_CONV,    color: C.success },
        { label: 'Leads del mes',      value: '423',      delta: '+8.7%',                positive: true,  sparkline: SPARK_LEADS,   color: C.brand },
      ]} />

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Cohort heatmap */}
        <WidgetCard title="Retención por cohorte (%)">
          <CohortGrid
            rows={COHORT_ROWS}
            colHeaders={COHORT_HEADERS}
            getValue={cohortColor}
            formatCell={(v) => v === 0 ? '—' : `${v}%`}
          />
        </WidgetCard>

        {/* Leads by source */}
        <WidgetCard title="Leads por fuente">
          <HorizontalBarChart data={LEADS_BY_SOURCE} color={C.brand} />
        </WidgetCard>
      </div>

      {/* Cohort detail table */}
      <WidgetCard title="Detalle por cohorte">
        <DataTable
          columns={COHORT_COLUMNS}
          data={COHORT_TABLE}
          defaultSort={{ col: 'leads', dir: 'desc' }}
        />
      </WidgetCard>
    </ReportShell>
  );
}
