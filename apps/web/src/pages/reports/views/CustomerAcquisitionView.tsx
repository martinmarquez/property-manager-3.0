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

const TREND_LABELS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

const CAC_TREND_SERIES = [
  { label: 'CAC', data: [520, 510, 490, 475, 460, 420], color: C.brand },
];

const CAC_BY_CHANNEL = [
  { label: 'Google Ads',   value: 380, suffix: '', color: C.brand },
  { label: 'Portal ads',   value: 520, suffix: '', color: C.warning },
  { label: 'Social media', value: 310, suffix: '', color: C.success },
  { label: 'Referidos',    value: 180, suffix: '', color: '#7E3AF2' },
  { label: 'Directo',      value: 650, suffix: '', color: '#E83B3B' },
];

const CHANNEL_TABLE: Record<string, unknown>[] = [
  { channel: 'Google Ads',   spend: 5200,  leads: 86, customers: 14, cac: 371,  roi: 8.4 },
  { channel: 'Portal ads',   spend: 4100,  leads: 52, customers: 8,  cac: 513,  roi: 5.2 },
  { channel: 'Social media', spend: 2800,  leads: 64, customers: 9,  cac: 311,  roi: 9.8 },
  { channel: 'Referidos',    spend: 1200,  leads: 38, customers: 7,  cac: 171,  roi: 18.6 },
  { channel: 'Directo',      spend: 1500,  leads: 14, customers: 2,  cac: 750,  roi: 3.1 },
];

/* ─── Table columns ──────────────────────────────────────────── */

const CHANNEL_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  {
    id: 'channel',
    label: 'Canal',
    width: '1.4fr',
    render: (r) => (
      <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
        {String(r.channel)}
      </span>
    ),
  },
  {
    id: 'spend',
    label: 'Inversión',
    width: '0.9fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
        ${Number(r.spend).toLocaleString('es-AR')}
      </span>
    ),
  },
  {
    id: 'leads',
    label: 'Leads',
    width: '0.7fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.brand }}>
        {String(r.leads)}
      </span>
    ),
  },
  {
    id: 'customers',
    label: 'Clientes',
    width: '0.7fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.success, fontWeight: 600 }}>
        {String(r.customers)}
      </span>
    ),
  },
  {
    id: 'cac',
    label: 'CAC',
    width: '0.8fr',
    align: 'right',
    mono: true,
    render: (r) => {
      const cac = Number(r.cac);
      return (
        <span style={{
          fontFamily: F.mono, fontSize: 12, fontWeight: 600,
          color: cac > 500 ? C.warning : cac < 300 ? C.success : C.textSecondary,
        }}>
          ${cac.toLocaleString('es-AR')}
        </span>
      );
    },
  },
  {
    id: 'roi',
    label: 'ROI',
    width: '0.7fr',
    align: 'right',
    mono: true,
    render: (r) => {
      const roi = Number(r.roi);
      return (
        <span style={{
          fontFamily: F.mono, fontSize: 12, fontWeight: 600,
          color: roi > 8 ? C.success : roi < 5 ? C.warning : C.textSecondary,
        }}>
          {roi.toFixed(1)}x
        </span>
      );
    },
  },
];

/* ─── Sparklines ─────────────────────────────────────────────── */

const SPARK_CAC       = [520, 510, 490, 475, 460, 420, 430, 410, 420, 400, 415, 420];
const SPARK_LTV_CAC   = [22.0, 23.5, 25.0, 26.2, 27.8, 29.5, 29.0, 30.2, 29.5, 31.0, 30.0, 29.5];
const SPARK_PAYBACK   = [1.8, 1.7, 1.5, 1.4, 1.3, 1.2, 1.25, 1.15, 1.2, 1.1, 1.15, 1.2];
const SPARK_SPEND     = [12.4, 13.1, 13.8, 14.0, 14.2, 14.8, 14.5, 15.0, 14.8, 15.2, 14.9, 14.8];

/* ─── Filters ────────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'channel',
    label: 'Canal',
    multi: true,
    options: [
      { value: 'google',   label: 'Google Ads' },
      { value: 'portals',  label: 'Portal ads' },
      { value: 'social',   label: 'Social media' },
      { value: 'referral', label: 'Referidos' },
      { value: 'direct',   label: 'Directo' },
    ],
  },
  {
    id: 'period',
    label: 'Período',
    options: [
      { value: '3m', label: 'Últimos 3 meses' },
      { value: '6m', label: 'Últimos 6 meses' },
      { value: '12m', label: 'Últimos 12 meses' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Canal', 'Inversión', 'Leads', 'Clientes', 'CAC', 'ROI'],
  rows: CHANNEL_TABLE.map((r) => [
    String(r.channel),
    Number(r.spend),
    Number(r.leads),
    Number(r.customers),
    Number(r.cac),
    Number(r.roi),
  ]),
  filename: 'customer-acquisition',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function CustomerAcquisitionView() {
  return (
    <ReportShell
      slug="customer-acquisition"
      title="Costo de Adquisición"
      subtitle="CAC por canal, LTV y retorno de inversión en marketing"
      refreshedAt="Hace 15 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'CAC promedio',      value: '$420/cliente', delta: '-12%',   positive: true,  sparkline: SPARK_CAC,     color: C.success },
        { label: 'Ratio LTV/CAC',     value: '29,5x',       delta: '+6,2%',  positive: true,  sparkline: SPARK_LTV_CAC, color: C.brand },
        { label: 'Período de repago', value: '1,2 meses',   delta: '-0,1',   positive: true,  sparkline: SPARK_PAYBACK, color: C.success },
        { label: 'Inversión mkt.',    value: '$14,8K',       delta: '+4,2%',  positive: true,  sparkline: SPARK_SPEND,   color: C.warning },
      ]} />

      {/* ── CAC trend + CAC by channel ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 20 }}>
        <WidgetCard title="Tendencia de CAC (6 meses)">
          <MultiLineChart
            series={CAC_TREND_SERIES}
            xLabels={TREND_LABELS}
          />
        </WidgetCard>

        <WidgetCard title="CAC por canal ($)">
          <HorizontalBarChart data={CAC_BY_CHANNEL} />
        </WidgetCard>
      </div>

      {/* ── Channel detail table ──────────────────────────────── */}
      <WidgetCard title="Detalle por canal">
        <DataTable
          columns={CHANNEL_COLUMNS}
          data={CHANNEL_TABLE}
          defaultSort={{ col: 'roi', dir: 'desc' }}
        />
      </WidgetCard>
    </ReportShell>
  );
}
