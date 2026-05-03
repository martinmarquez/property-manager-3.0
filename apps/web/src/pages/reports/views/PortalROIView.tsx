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

const PORTAL_COLORS: Record<string, string> = {
  ZonaProp: C.brand,
  Argenprop: '#2880FF',
  MercadoLibre: '#FFE600',
  'Portal Inmobiliario': C.success,
  Properati: '#7E3AF2',
};

const ROI_TABLE_DATA: Record<string, unknown>[] = [
  { portal: 'ZonaProp',             total_leads: 312, total_closes: 28, cost_per_lead_usd: 14.20, close_rate_pct: 8.97, cost_per_close_usd: 157.14 },
  { portal: 'Argenprop',            total_leads: 245, total_closes: 18, cost_per_lead_usd: 17.55, close_rate_pct: 7.35, cost_per_close_usd: 238.89 },
  { portal: 'MercadoLibre',         total_leads: 198, total_closes: 12, cost_per_lead_usd: 22.73, close_rate_pct: 6.06, cost_per_close_usd: 375.00 },
  { portal: 'Portal Inmobiliario',  total_leads: 156, total_closes: 14, cost_per_lead_usd: 16.03, close_rate_pct: 8.97, cost_per_close_usd: 178.57 },
  { portal: 'Properati',            total_leads: 89,  total_closes: 5,  cost_per_lead_usd: 23.60, close_rate_pct: 5.62, cost_per_close_usd: 420.00 },
];

const COST_PER_LEAD_BARS = [...ROI_TABLE_DATA]
  .sort((a, b) => Number(a.cost_per_lead_usd) - Number(b.cost_per_lead_usd))
  .map(r => ({
    label: String(r.portal),
    value: Number(r.cost_per_lead_usd),
    color: PORTAL_COLORS[String(r.portal)] ?? C.brand,
    suffix: '',
  }));

const CLOSE_RATE_BARS = [...ROI_TABLE_DATA]
  .sort((a, b) => Number(b.close_rate_pct) - Number(a.close_rate_pct))
  .map(r => ({
    label: String(r.portal),
    value: Number(r.close_rate_pct),
    color: C.success,
    suffix: '%',
  }));

const TREND_LABELS = ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

const TREND_SERIES = [
  { label: 'ZonaProp',            data: [210, 225, 238, 250, 265, 272, 280, 288, 295, 300, 308, 312], color: PORTAL_COLORS.ZonaProp! },
  { label: 'Argenprop',           data: [160, 170, 180, 192, 198, 210, 215, 222, 230, 237, 240, 245], color: PORTAL_COLORS.Argenprop! },
  { label: 'MercadoLibre',        data: [120, 128, 135, 142, 150, 158, 165, 172, 180, 188, 192, 198], color: PORTAL_COLORS.MercadoLibre! },
  { label: 'Portal Inmobiliario', data: [90, 96, 102, 108, 114, 120, 128, 135, 140, 148, 152, 156],   color: PORTAL_COLORS['Portal Inmobiliario']! },
  { label: 'Properati',           data: [48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 86, 89],             color: PORTAL_COLORS.Properati! },
];

const SPARK_SPEND   = [1900, 2000, 2050, 2100, 2150, 2200, 2250, 2300, 2350, 2380, 2400, 2400];
const SPARK_CPL     = [22.1, 21.5, 20.8, 20.2, 19.8, 19.5, 19.2, 19.0, 18.8, 18.7, 18.6, 18.5];

/* ─── Table columns ──────────────────────────────────────────── */

const ROI_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  {
    id: 'portal',
    label: 'Portal',
    width: '1.6fr',
    render: (r) => {
      const name = String(r.portal);
      const dotColor = PORTAL_COLORS[name] ?? C.brand;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{name}</span>
        </div>
      );
    },
  },
  {
    id: 'total_leads',
    label: 'Leads',
    width: '0.8fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
        {Number(r.total_leads).toLocaleString('es-AR')}
      </span>
    ),
  },
  {
    id: 'total_closes',
    label: 'Cierres',
    width: '0.8fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.success, fontWeight: 600 }}>
        {Number(r.total_closes)}
      </span>
    ),
  },
  {
    id: 'cost_per_lead_usd',
    label: 'Costo/Lead',
    width: '1fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
        ${Number(r.cost_per_lead_usd).toFixed(2)}
      </span>
    ),
  },
  {
    id: 'close_rate_pct',
    label: 'Tasa cierre',
    width: '1fr',
    mono: true,
    render: (r) => {
      const rate = Number(r.close_rate_pct);
      return (
        <span style={{ fontFamily: F.mono, fontSize: 12, color: rate >= 8 ? C.success : C.textSecondary }}>
          {rate.toFixed(2)}%
        </span>
      );
    },
  },
  {
    id: 'cost_per_close_usd',
    label: 'Costo/Cierre',
    width: '1fr',
    mono: true,
    render: (r) => {
      const cost = Number(r.cost_per_close_usd);
      return (
        <span style={{ fontFamily: F.mono, fontSize: 12, color: cost > 300 ? C.warning : C.textSecondary }}>
          ${cost.toFixed(2)}
        </span>
      );
    },
  },
];

/* ─── Filters ────────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'month',
    label: 'Mes',
    options: [
      { value: '2026-05', label: 'Mayo 2026' },
      { value: '2026-04', label: 'Abril 2026' },
      { value: '2026-03', label: 'Marzo 2026' },
      { value: '2026-02', label: 'Febrero 2026' },
      { value: '2026-01', label: 'Enero 2026' },
      { value: '2025-12', label: 'Diciembre 2025' },
    ],
  },
  {
    id: 'portal',
    label: 'Portal',
    multi: true,
    options: [
      { value: 'zonaprop', label: 'ZonaProp' },
      { value: 'argenprop', label: 'Argenprop' },
      { value: 'mercadolibre', label: 'MercadoLibre' },
      { value: 'portalinmo', label: 'Portal Inmobiliario' },
      { value: 'properati', label: 'Properati' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Portal', 'Leads', 'Cierres', 'Costo/Lead', 'Tasa cierre', 'Costo/Cierre'],
  rows: ROI_TABLE_DATA.map((r) => [
    String(r.portal),
    Number(r.total_leads),
    Number(r.total_closes),
    Number(r.cost_per_lead_usd),
    Number(r.close_rate_pct),
    Number(r.cost_per_close_usd),
  ]),
  filename: 'portal-roi',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function PortalROIView() {
  // Derive best portal (lowest cost_per_close)
  const bestPortal = [...ROI_TABLE_DATA].sort(
    (a, b) => Number(a.cost_per_close_usd) - Number(b.cost_per_close_usd),
  )[0];

  return (
    <ReportShell
      slug="portal-roi"
      title="Portal ROI"
      subtitle="Retorno de inversión por portal inmobiliario"
      refreshedAt="Hace 8 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* KPI Row */}
      <KpiRow
        columns={3}
        cards={[
          {
            label: 'Inversión total mensual',
            value: '$2,400',
            delta: '+5.3%',
            positive: true,
            subtitle: '/mes',
            sparkline: SPARK_SPEND,
            color: C.brand,
          },
          {
            label: 'Mejor portal',
            value: String(bestPortal?.portal ?? '—'),
            subtitle: `Menor costo/cierre: $${Number(bestPortal?.cost_per_close_usd ?? 0).toFixed(0)}`,
            color: C.success,
          },
          {
            label: 'Costo promedio por lead',
            value: '$18.50',
            delta: '-6.1%',
            positive: true,
            sparkline: SPARK_CPL,
            color: C.warning,
          },
        ]}
      />

      {/* ROI comparison table */}
      <div style={{ marginBottom: 20 }}>
        <WidgetCard title="Comparativa de ROI por portal">
          <DataTable
            columns={ROI_COLUMNS}
            data={ROI_TABLE_DATA}
            defaultSort={{ col: 'cost_per_close_usd', dir: 'asc' }}
          />
        </WidgetCard>
      </div>

      {/* Bar charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Cost per lead bar - ascending */}
        <WidgetCard title="Costo por lead (USD)">
          <HorizontalBarChart
            data={COST_PER_LEAD_BARS.map(d => ({
              ...d,
              suffix: '',
            }))}
            color={C.brand}
          />
        </WidgetCard>

        {/* Close rate bar - descending */}
        <WidgetCard title="Tasa de cierre (%)">
          <HorizontalBarChart
            data={CLOSE_RATE_BARS}
            color={C.success}
          />
        </WidgetCard>
      </div>

      {/* Leads trend - 12 months */}
      <WidgetCard title="Tendencia de leads por portal (12 meses)">
        <MultiLineChart
          series={TREND_SERIES}
          xLabels={TREND_LABELS}
        />
      </WidgetCard>
    </ReportShell>
  );
}
