import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  MultiLineChart,
  DataTable,
  ScatterChart,
  WidgetCard,
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Mock data ──────────────────────────────────────────────── */

const TREND_LABELS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

const PRICE_TREND_SERIES = [
  { label: 'Palermo',   data: [3180, 3220, 3260, 3320, 3380, 3420], color: C.brand },
  { label: 'Recoleta',  data: [2980, 3010, 3050, 3100, 3140, 3180], color: C.success },
  { label: 'Belgrano',  data: [2850, 2870, 2910, 2940, 2980, 3010], color: C.warning },
  { label: 'Caballito', data: [1980, 2000, 2040, 2070, 2110, 2150], color: '#7E3AF2' },
];

const ZONE_TABLE: Record<string, unknown>[] = [
  { zone: 'Palermo',       current_price: 3420, change_3mo: 4.8,  change_6mo: 7.5,  listings: 32, dom: 38 },
  { zone: 'Recoleta',      current_price: 3180, change_3mo: 4.2,  change_6mo: 6.7,  listings: 24, dom: 45 },
  { zone: 'Belgrano',      current_price: 3010, change_3mo: 3.4,  change_6mo: 5.6,  listings: 22, dom: 42 },
  { zone: 'Núñez',         current_price: 2890, change_3mo: 3.1,  change_6mo: 5.2,  listings: 14, dom: 48 },
  { zone: 'Barrio Norte',  current_price: 2760, change_3mo: 2.8,  change_6mo: 4.5,  listings: 10, dom: 41 },
  { zone: 'Villa Crespo',  current_price: 2380, change_3mo: 2.2,  change_6mo: 3.8,  listings: 12, dom: 56 },
  { zone: 'Caballito',     current_price: 2150, change_3mo: 1.9,  change_6mo: 3.2,  listings: 18, dom: 52 },
  { zone: 'San Telmo',     current_price: 2020, change_3mo: 1.5,  change_6mo: 2.6,  listings: 10, dom: 64 },
];

const SCATTER_POINTS = ZONE_TABLE.map(z => ({
  x: Number(z.dom),
  y: Number(z.current_price),
  size: Math.max(5, Math.min(14, Number(z.listings) / 2.5)),
  label: String(z.zone),
  color: Number(z.change_3mo) > 3.5 ? C.success : Number(z.change_3mo) < 2 ? C.warning : C.brand,
}));

/* ─── Table columns ──────────────────────────────────────────── */

const ZONE_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  {
    id: 'zone',
    label: 'Zona',
    width: '1.4fr',
    render: (r) => (
      <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
        {String(r.zone)}
      </span>
    ),
  },
  {
    id: 'current_price',
    label: 'USD/m²',
    width: '1fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
        ${Number(r.current_price).toLocaleString('es-AR')}
      </span>
    ),
  },
  {
    id: 'change_3mo',
    label: 'Var. 3M',
    width: '0.8fr',
    align: 'right',
    mono: true,
    render: (r) => {
      const val = Number(r.change_3mo);
      return (
        <span style={{
          fontFamily: F.mono, fontSize: 12, fontWeight: 600,
          color: val > 3 ? C.success : val < 2 ? C.warning : C.textSecondary,
        }}>
          +{val.toFixed(1)}%
        </span>
      );
    },
  },
  {
    id: 'change_6mo',
    label: 'Var. 6M',
    width: '0.8fr',
    align: 'right',
    mono: true,
    render: (r) => {
      const val = Number(r.change_6mo);
      return (
        <span style={{
          fontFamily: F.mono, fontSize: 12, fontWeight: 600,
          color: val > 5 ? C.success : val < 3 ? C.warning : C.textSecondary,
        }}>
          +{val.toFixed(1)}%
        </span>
      );
    },
  },
  {
    id: 'listings',
    label: 'Avisos',
    width: '0.7fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.brand }}>
        {String(r.listings)}
      </span>
    ),
  },
  {
    id: 'dom',
    label: 'DOM',
    width: '0.7fr',
    align: 'right',
    mono: true,
    render: (r) => {
      const dom = Number(r.dom);
      return (
        <span style={{
          fontFamily: F.mono, fontSize: 12,
          color: dom > 60 ? C.warning : C.textSecondary,
        }}>
          {dom}d
        </span>
      );
    },
  },
];

/* ─── Sparklines ─────────────────────────────────────────────── */

const SPARK_AVG_PRICE  = [2680, 2700, 2720, 2760, 2800, 2840, 2820, 2860, 2840, 2880, 2860, 2840];
const SPARK_PALERMO    = [3180, 3220, 3260, 3320, 3380, 3420, 3400, 3440, 3420, 3460, 3440, 3420];
const SPARK_RECOLETA   = [2980, 3010, 3050, 3100, 3140, 3180, 3160, 3200, 3180, 3220, 3200, 3180];
const SPARK_CABALLITO  = [1980, 2000, 2040, 2070, 2110, 2150, 2130, 2170, 2150, 2190, 2170, 2150];

/* ─── Filters ────────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'property_type',
    label: 'Tipo',
    options: [
      { value: 'apartment', label: 'Departamento' },
      { value: 'house',     label: 'Casa' },
      { value: 'ph',        label: 'PH' },
      { value: 'land',      label: 'Terreno' },
    ],
  },
  {
    id: 'operation',
    label: 'Operación',
    options: [
      { value: 'venta',    label: 'Venta' },
      { value: 'alquiler', label: 'Alquiler' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Zona', 'USD/m²', 'Var. 3M', 'Var. 6M', 'Avisos', 'DOM'],
  rows: ZONE_TABLE.map((r) => [
    String(r.zone),
    Number(r.current_price),
    Number(r.change_3mo),
    Number(r.change_6mo),
    Number(r.listings),
    Number(r.dom),
  ]),
  filename: 'price-evolution',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function PriceEvolutionView() {
  return (
    <ReportShell
      slug="price-evolution"
      title="Evolución de Precios"
      subtitle="Precio por m² por barrio y tendencia trimestral"
      refreshedAt="Hace 20 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'Precio prom. USD/m²', value: '$2.840',    delta: '+3,8%', positive: true, sparkline: SPARK_AVG_PRICE, color: C.brand },
        { label: 'Palermo USD/m²',      value: '$3.420',    delta: '+4,8%', positive: true, sparkline: SPARK_PALERMO,   color: C.brand },
        { label: 'Recoleta USD/m²',     value: '$3.180',    delta: '+4,2%', positive: true, sparkline: SPARK_RECOLETA,  color: C.success },
        { label: 'Caballito USD/m²',    value: '$2.150',    delta: '+1,9%', positive: true, sparkline: SPARK_CABALLITO, color: '#7E3AF2' },
      ]} />

      {/* ── Price trend + Scatter ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 20 }}>
        <WidgetCard title="Evolución USD/m² por barrio (6 meses)">
          <MultiLineChart
            series={PRICE_TREND_SERIES}
            xLabels={TREND_LABELS}
          />
        </WidgetCard>

        <WidgetCard title="Precio vs DOM por zona">
          <ScatterChart
            points={SCATTER_POINTS}
            xLabel="Días en mercado (DOM)"
            yLabel="USD/m²"
            height={240}
          />
          <div style={{ display: 'flex', gap: 14, marginTop: 10, alignItems: 'center' }}>
            <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>
              Tamaño = avisos activos
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.success }} />
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>{'>'} +3,5%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.warning }} />
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>{'<'} +2%</span>
            </div>
          </div>
        </WidgetCard>
      </div>

      {/* ── Zone detail table ─────────────────────────────────── */}
      <WidgetCard title="Detalle de precios por zona">
        <DataTable
          columns={ZONE_COLUMNS}
          data={ZONE_TABLE}
          defaultSort={{ col: 'current_price', dir: 'desc' }}
        />
      </WidgetCard>
    </ReportShell>
  );
}
