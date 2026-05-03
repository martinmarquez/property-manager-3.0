import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  MultiLineChart,
  HorizontalBarChart,
  DataTable,
  WidgetCard,
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Mock data ──────────────────────────────────────────────── */

const MONTHLY_LABELS = ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

const REVENUE_TREND_SERIES = [
  { label: 'Ingresos totales', data: [195, 210, 218, 230, 198, 242, 256, 220, 248, 265, 235, 287], color: C.brand },
];

const REVENUE_BY_SOURCE = [
  { label: 'Ventas',         value: 148, suffix: 'K', color: C.brand },
  { label: 'Alquileres',     value: 72,  suffix: 'K', color: C.success },
  { label: 'Administración', value: 45,  suffix: 'K', color: C.warning },
  { label: 'Tasaciones',     value: 22,  suffix: 'K', color: '#7E3AF2' },
];

const MONTHLY_TABLE: Record<string, unknown>[] = [
  { month: 'May 2026',  ventas: 148, alquileres: 72, admin: 45, tasaciones: 22, total: 287 },
  { month: 'Abr 2026',  ventas: 120, alquileres: 65, admin: 34, tasaciones: 16, total: 235 },
  { month: 'Mar 2026',  ventas: 138, alquileres: 70, admin: 40, tasaciones: 17, total: 265 },
  { month: 'Feb 2026',  ventas: 130, alquileres: 68, admin: 32, tasaciones: 18, total: 248 },
  { month: 'Ene 2026',  ventas: 112, alquileres: 62, admin: 30, tasaciones: 16, total: 220 },
  { month: 'Dic 2025',  ventas: 140, alquileres: 64, admin: 36, tasaciones: 16, total: 256 },
  { month: 'Nov 2025',  ventas: 128, alquileres: 62, admin: 34, tasaciones: 18, total: 242 },
  { month: 'Oct 2025',  ventas: 98,  alquileres: 56, admin: 28, tasaciones: 16, total: 198 },
  { month: 'Sep 2025',  ventas: 118, alquileres: 62, admin: 34, tasaciones: 16, total: 230 },
  { month: 'Ago 2025',  ventas: 110, alquileres: 60, admin: 32, tasaciones: 16, total: 218 },
  { month: 'Jul 2025',  ventas: 108, alquileres: 58, admin: 30, tasaciones: 14, total: 210 },
  { month: 'Jun 2025',  ventas: 96,  alquileres: 54, admin: 30, tasaciones: 15, total: 195 },
];

/* ─── Table columns ──────────────────────────────────────────── */

const MONTHLY_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  {
    id: 'month',
    label: 'Mes',
    width: '1.4fr',
    render: (r) => (
      <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
        {String(r.month)}
      </span>
    ),
  },
  {
    id: 'ventas',
    label: 'Ventas',
    width: '0.8fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.brand, fontWeight: 600 }}>
        ${Number(r.ventas).toLocaleString('es-AR')}K
      </span>
    ),
  },
  {
    id: 'alquileres',
    label: 'Alquileres',
    width: '0.8fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.success }}>
        ${Number(r.alquileres).toLocaleString('es-AR')}K
      </span>
    ),
  },
  {
    id: 'admin',
    label: 'Admin.',
    width: '0.8fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.warning }}>
        ${Number(r.admin).toLocaleString('es-AR')}K
      </span>
    ),
  },
  {
    id: 'tasaciones',
    label: 'Tasaciones',
    width: '0.8fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: '#7E3AF2' }}>
        ${Number(r.tasaciones).toLocaleString('es-AR')}K
      </span>
    ),
  },
  {
    id: 'total',
    label: 'Total',
    width: '0.9fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 13, color: C.textPrimary, fontWeight: 700 }}>
        ${Number(r.total).toLocaleString('es-AR')}K
      </span>
    ),
  },
];

/* ─── Sparklines ─────────────────────────────────────────────── */

const SPARK_REVENUE   = [195, 210, 218, 230, 198, 242, 256, 220, 248, 265, 235, 287];
const SPARK_YTD       = [220, 468, 716, 981, 1216, 1503, 1503, 1600, 1700, 1800];
const SPARK_AVG       = [195, 203, 208, 213, 210, 216, 220, 220, 223, 225];

/* ─── Filters ────────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'branch',
    label: 'Sucursal',
    multi: true,
    options: [
      { value: 'caba',      label: 'CABA' },
      { value: 'gba-norte', label: 'GBA Norte' },
      { value: 'gba-sur',   label: 'GBA Sur' },
      { value: 'cordoba',   label: 'Córdoba' },
    ],
  },
  {
    id: 'revenue_type',
    label: 'Fuente',
    multi: true,
    options: [
      { value: 'ventas',    label: 'Ventas' },
      { value: 'alquiler',  label: 'Alquileres' },
      { value: 'admin',     label: 'Administración' },
      { value: 'tasacion',  label: 'Tasaciones' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Mes', 'Ventas', 'Alquileres', 'Admin.', 'Tasaciones', 'Total'],
  rows: MONTHLY_TABLE.map((r) => [
    String(r.month),
    Number(r.ventas),
    Number(r.alquileres),
    Number(r.admin),
    Number(r.tasaciones),
    Number(r.total),
  ]),
  filename: 'revenue-trend',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function RevenueTrendView() {
  return (
    <ReportShell
      slug="revenue-trend"
      title="Tendencia de Ingresos"
      subtitle="Facturación mensual por fuente de ingreso"
      refreshedAt="Hace 5 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'Ingresos del mes',   value: '$287K',  delta: '+22,4%',  positive: true,  sparkline: SPARK_REVENUE, color: C.brand },
        { label: 'Acumulado YTD',      value: '$1,8M',  delta: '+18,1%',  positive: true,  sparkline: SPARK_YTD,     color: C.success },
        { label: 'Promedio mensual',   value: '$225K',  delta: '+5,6%',   positive: true,  sparkline: SPARK_AVG,     color: C.brand },
        { label: 'Proyección anual',   value: '$3,4M',  subtitle: 'Basado en tendencia 12 meses', color: C.warning },
      ]} />

      {/* ── Trend + Revenue by source ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 20 }}>
        <WidgetCard title="Ingresos mensuales (12 meses)">
          <MultiLineChart
            series={REVENUE_TREND_SERIES}
            xLabels={MONTHLY_LABELS}
          />
        </WidgetCard>

        <WidgetCard title="Ingresos por fuente (mayo)">
          <HorizontalBarChart data={REVENUE_BY_SOURCE} />
        </WidgetCard>
      </div>

      {/* ── Monthly breakdown table ───────────────────────────── */}
      <WidgetCard title="Desglose mensual">
        <DataTable
          columns={MONTHLY_COLUMNS}
          data={MONTHLY_TABLE}
          defaultSort={{ col: 'total', dir: 'desc' }}
        />
      </WidgetCard>
    </ReportShell>
  );
}
