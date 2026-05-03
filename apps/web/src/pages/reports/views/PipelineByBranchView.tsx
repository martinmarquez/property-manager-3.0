import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  MultiLineChart,
  DataTable,
  WidgetCard,
  HorizontalBarChart,
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Mock data ──────────────────────────────────────────────── */

const BRANCH_TABLE: Record<string, unknown>[] = [
  { branch: 'CABA',      active_ops: 42, pipeline_value: 3100000, avg_deal: 195000, conversion_rate: 14.2, agents: 8  },
  { branch: 'GBA Norte', active_ops: 28, pipeline_value: 2400000, avg_deal: 178000, conversion_rate: 11.8, agents: 5  },
  { branch: 'GBA Sur',   active_ops: 18, pipeline_value: 1600000, avg_deal: 152000, conversion_rate: 10.5, agents: 4  },
  { branch: 'Córdoba',   active_ops: 14, pipeline_value: 1300000, avg_deal: 168000, conversion_rate: 9.1,  agents: 3  },
];

const BRANCH_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  {
    id: 'branch',
    label: 'Sucursal',
    width: '1.4fr',
    render: (r) => (
      <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
        {String(r.branch)}
      </span>
    ),
  },
  { id: 'active_ops', label: 'Ops activas', width: '0.8fr', mono: true },
  {
    id: 'pipeline_value',
    label: 'Pipeline',
    width: '1fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
        US$ {(Number(r.pipeline_value) / 1_000_000).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
      </span>
    ),
  },
  {
    id: 'avg_deal',
    label: 'Ticket prom.',
    width: '1fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
        US$ {(Number(r.avg_deal) / 1_000).toLocaleString('es-AR')}K
      </span>
    ),
  },
  {
    id: 'conversion_rate',
    label: 'Conversión',
    width: '0.8fr',
    mono: true,
    render: (r) => {
      const rate = Number(r.conversion_rate);
      return (
        <span style={{ fontFamily: F.mono, fontSize: 12, color: rate >= 12 ? C.success : C.textSecondary, fontWeight: 600 }}>
          {rate.toFixed(1)}%
        </span>
      );
    },
  },
  { id: 'agents', label: 'Agentes', width: '0.7fr', mono: true },
];

const PIPELINE_BARS = [
  { label: 'CABA',      value: 3.1, suffix: 'M', color: C.brand },
  { label: 'GBA Norte', value: 2.4, suffix: 'M', color: '#1B6AEF' },
  { label: 'GBA Sur',   value: 1.6, suffix: 'M', color: '#2880FF' },
  { label: 'Córdoba',   value: 1.3, suffix: 'M', color: C.success },
];

const TREND_LABELS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

const TREND_SERIES = [
  { label: 'CABA',      data: [2.4, 2.6, 2.7, 2.8, 2.9, 3.1], color: C.brand },
  { label: 'GBA Norte', data: [1.8, 1.9, 2.0, 2.1, 2.2, 2.4], color: '#1B6AEF' },
  { label: 'GBA Sur',   data: [1.1, 1.2, 1.3, 1.3, 1.4, 1.6], color: '#2880FF' },
  { label: 'Córdoba',   data: [0.9, 0.9, 1.0, 1.1, 1.1, 1.3], color: C.success },
];

const SPARK_TOTAL     = [6.2, 6.6, 7.0, 7.3, 7.6, 8.4];
const SPARK_TOP       = [2.4, 2.6, 2.7, 2.8, 2.9, 3.1];
const SPARK_AVG       = [1.6, 1.7, 1.8, 1.8, 1.9, 2.1];

/* ─── Filters ──────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'pipeline_type',
    label: 'Pipeline',
    options: [
      { value: 'premium', label: 'Premium' },
      { value: 'estandar', label: 'Estándar' },
      { value: 'corporativo', label: 'Corporativo' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Sucursal', 'Ops activas', 'Pipeline (USD)', 'Ticket prom. (USD)', 'Conversión %', 'Agentes'],
  rows: BRANCH_TABLE.map((r) => [
    String(r.branch),
    Number(r.active_ops),
    Number(r.pipeline_value),
    Number(r.avg_deal),
    Number(r.conversion_rate),
    Number(r.agents),
  ]),
  filename: 'pipeline-por-sucursal',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function PipelineByBranchView() {
  return (
    <ReportShell
      slug="pipeline-by-branch"
      title="Pipeline por Sucursal"
      subtitle="Distribución del pipeline activo por oficina"
      refreshedAt="Hace 10 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'Pipeline total',   value: '$8,4M',  delta: '+10.5%', positive: true, sparkline: SPARK_TOTAL, color: C.brand },
        { label: 'Sucursales activas', value: '4',     delta: '—',      color: C.textTertiary },
        { label: 'Top sucursal',     value: 'CABA',   delta: '$3,1M',  positive: true, sparkline: SPARK_TOP,   color: C.success },
        { label: 'Promedio x suc.',  value: '$2,1M',  delta: '+6.3%',  positive: true, sparkline: SPARK_AVG,   color: C.brand },
      ]} />

      {/* ── Two-column: bar chart + table ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16, marginBottom: 20 }}>
        {/* Pipeline by branch bar chart */}
        <WidgetCard title="Pipeline por sucursal (US$ M)">
          <HorizontalBarChart data={PIPELINE_BARS} color={C.brand} />
        </WidgetCard>

        {/* Branch details table */}
        <WidgetCard title="Detalle por sucursal">
          <DataTable
            columns={BRANCH_COLUMNS}
            data={BRANCH_TABLE}
            defaultSort={{ col: 'pipeline_value', dir: 'desc' }}
          />
        </WidgetCard>
      </div>

      {/* ── Pipeline trend per branch ──────────────────────────── */}
      <WidgetCard title="Tendencia de pipeline por sucursal (US$ M)">
        <MultiLineChart
          series={TREND_SERIES}
          xLabels={TREND_LABELS}
        />
      </WidgetCard>
    </ReportShell>
  );
}
