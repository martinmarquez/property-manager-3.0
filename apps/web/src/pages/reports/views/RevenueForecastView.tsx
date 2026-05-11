import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  MultiLineChart,
  DonutChart,
  DataTable,
  WidgetCard,
  HorizontalBarChart,
  AlertCard,
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Mock data ──────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('es-AR');

/* MRR trend (6 months) */
const MRR_LABELS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];
const MRR_SERIES = [
  {
    label: 'MRR ($K)',
    data: [198, 215, 232, 251, 268, 287],
    color: C.brand,
  },
  {
    label: 'Forecast ($K)',
    data: [198, 218, 238, 258, 278, 298],
    color: C.textTertiary,
  },
];

/* Plan distribution donut */
const PLAN_SEGMENTS = [
  { label: 'Premium',    value: 142, color: C.brand },
  { label: 'Estándar',   value: 98,  color: '#2880FF' },
  { label: 'Corporativo', value: 47,  color: C.success },
];

/* Revenue by agent (top 6) */
const REVENUE_BY_AGENT = [
  { label: 'García, J.',    value: 68400,  suffix: '', color: C.brand },
  { label: 'López, M.',     value: 54200,  suffix: '', color: '#2880FF' },
  { label: 'Martínez, C.',  value: 47800,  suffix: '', color: '#5577FF' },
  { label: 'Rodríguez, A.', value: 41500,  suffix: '', color: C.success },
  { label: 'Fernández, L.', value: 38900,  suffix: '', color: C.warning },
  { label: 'Pérez, D.',     value: 36200,  suffix: '', color: '#7E3AF2' },
];

/* Monthly revenue breakdown table */
const MONTHLY_DATA: Record<string, unknown>[] = [
  { mes: 'Dic 2025', mrr: 198000, nuevos:  18200, upgrades: 8400,  churn: -4800,  neto: 21800,  clientes: 248 },
  { mes: 'Ene 2026', mrr: 215000, nuevos:  22100, upgrades: 6200,  churn: -5300,  neto: 23000,  clientes: 256 },
  { mes: 'Feb 2026', mrr: 232000, nuevos:  19800, upgrades: 9100,  churn: -4900,  neto: 24000,  clientes: 264 },
  { mes: 'Mar 2026', mrr: 251000, nuevos:  24500, upgrades: 7800,  churn: -5300,  neto: 27000,  clientes: 271 },
  { mes: 'Abr 2026', mrr: 268000, nuevos:  21200, upgrades: 8900,  churn: -5100,  neto: 25000,  clientes: 279 },
  { mes: 'May 2026', mrr: 287000, nuevos:  26100, upgrades: 10200, churn: -6300,  neto: 30000,  clientes: 287 },
];

/* Table columns */
const REVENUE_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  {
    id: 'mes',
    label: 'Mes',
    width: '1.2fr',
    render: (r) => (
      <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
        {String(r.mes)}
      </span>
    ),
  },
  {
    id: 'mrr',
    label: 'MRR',
    width: '1fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
        ${fmt(Number(r.mrr))}
      </span>
    ),
  },
  {
    id: 'nuevos',
    label: 'Nuevos',
    width: '1fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.success }}>
        +${fmt(Number(r.nuevos))}
      </span>
    ),
  },
  {
    id: 'upgrades',
    label: 'Upgrades',
    width: '1fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.brand }}>
        +${fmt(Number(r.upgrades))}
      </span>
    ),
  },
  {
    id: 'churn',
    label: 'Churn',
    width: '1fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.error }}>
        -${fmt(Math.abs(Number(r.churn)))}
      </span>
    ),
  },
  {
    id: 'neto',
    label: 'Neto',
    width: '1fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
        +${fmt(Number(r.neto))}
      </span>
    ),
  },
  {
    id: 'clientes',
    label: 'Clientes',
    width: '0.8fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
        {fmt(Number(r.clientes))}
      </span>
    ),
  },
];

/* Sparklines for KPIs */
const SPARK_MRR   = [198, 215, 232, 251, 268, 287];
const SPARK_ARR   = [2376, 2580, 2784, 3012, 3216, 3444];
const SPARK_CHURN = [2.8, 2.6, 2.4, 2.3, 2.2, 2.1];
const SPARK_LTV   = [10200, 10800, 11300, 11700, 12100, 12400];

/* ─── Filters ────────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'pipeline',
    label: 'Pipeline',
    options: [
      { value: 'premium',    label: 'Premium' },
      { value: 'standard',   label: 'Estándar' },
      { value: 'corporate',  label: 'Corporativo' },
    ],
  },
  {
    id: 'branch',
    label: 'Sucursal',
    multi: true,
    options: [
      { value: 'caba',      label: 'CABA' },
      { value: 'gba-norte', label: 'GBA Norte' },
      { value: 'gba-sur',   label: 'GBA Sur' },
      { value: 'cordoba',   label: 'Córdoba' },
      { value: 'rosario',   label: 'Rosario' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Mes', 'MRR', 'Nuevos', 'Upgrades', 'Churn', 'Neto', 'Clientes'],
  rows: MONTHLY_DATA.map((r) => [
    String(r.mes),
    Number(r.mrr),
    Number(r.nuevos),
    Number(r.upgrades),
    Number(r.churn),
    Number(r.neto),
    Number(r.clientes),
  ]),
  filename: 'revenue-forecast',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function RevenueForecastView() {
  return (
    <ReportShell
      slug="revenue-forecast"
      title="Pronóstico de Ingresos"
      subtitle="MRR, ARR y métricas de retención (Solo owners y admins)"
      refreshedAt="Hace 10 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'MRR',           value: '$287K',   delta: '+22%',     positive: true,  sparkline: SPARK_MRR,   color: C.brand },
        { label: 'ARR',           value: '$3,4M',   delta: '+18%',     positive: true,  sparkline: SPARK_ARR,   color: C.success },
        { label: 'Tasa de churn', value: '2,1%',    delta: '-0,7pp',   positive: true,  sparkline: SPARK_CHURN, color: C.warning },
        { label: 'LTV promedio',  value: '$12,4K',  delta: '+8,3%',    positive: true,  sparkline: SPARK_LTV,   color: '#5577FF' },
      ]} />

      {/* ── MRR trend + Plan distribution ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <WidgetCard title="Tendencia MRR (6 meses)">
          <MultiLineChart
            series={MRR_SERIES}
            xLabels={MRR_LABELS}
            height={240}
          />
        </WidgetCard>

        <WidgetCard title="Distribución por plan">
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
            <DonutChart
              segments={PLAN_SEGMENTS}
              size={180}
              thickness={28}
              centerValue="287"
              centerLabel="clientes"
            />
          </div>
          {/* Revenue per plan summary */}
          <div style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {PLAN_SEGMENTS.map(seg => (
              <div key={seg.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>
                  {seg.label}
                </span>
                <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
                  {seg.value} cuentas
                </span>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      {/* ── Revenue by agent ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <WidgetCard title="Ingresos por agente (mensual)">
          <HorizontalBarChart
            data={REVENUE_BY_AGENT.map(a => ({
              ...a,
              suffix: '',
              label: a.label,
              value: a.value,
            }))}
          />
          {/* Total footer */}
          <div style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary }}>
              Total facturado (mes)
            </span>
            <span style={{ fontFamily: F.mono, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>
              ${fmt(REVENUE_BY_AGENT.reduce((s, a) => s + a.value, 0))}
            </span>
          </div>
        </WidgetCard>

        {/* Churn alert + key metrics */}
        <WidgetCard title="Alertas de ingresos">
          <AlertCard
            title="Churn aumenta en plan Estándar"
            description="La tasa de churn del plan Estándar subió a 3,8% este mes (+1,2pp). Se recomienda revisar la estrategia de retención para las 98 cuentas activas de este segmento."
            severity="warning"
          />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: C.bgBase, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '12px 16px',
              borderLeft: `3px solid ${C.success}`,
            }}>
              <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
                Nuevos clientes (mes)
              </span>
              <span style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.success }}>
                +14
              </span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: C.bgBase, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '12px 16px',
              borderLeft: `3px solid ${C.error}`,
            }}>
              <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
                Bajas (mes)
              </span>
              <span style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.error }}>
                -6
              </span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: C.bgBase, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '12px 16px',
              borderLeft: `3px solid ${C.brand}`,
            }}>
              <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
                Upgrades (mes)
              </span>
              <span style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.brand }}>
                +8
              </span>
            </div>
          </div>
        </WidgetCard>
      </div>

      {/* ── Monthly revenue breakdown ─────────────────────────── */}
      <WidgetCard title="Desglose mensual de ingresos">
        <DataTable
          columns={REVENUE_COLUMNS}
          data={MONTHLY_DATA}
          defaultSort={{ col: 'mes', dir: 'desc' }}
        />
      </WidgetCard>
    </ReportShell>
  );
}
