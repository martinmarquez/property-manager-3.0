import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  DataTable,
  WidgetCard,
  HorizontalBarChart,
  HeatmapGrid,
  GeoHeatmap,
} from '../charts.js';
import type { TableColumn, GeoHeatmapPoint } from '../charts.js';

/* ─── Mock data ─────────────────────────────────────────────── */

const NEIGHBORHOODS = [
  'Palermo', 'Recoleta', 'Belgrano', 'Caballito', 'Núñez',
  'San Telmo', 'Barracas', 'Villa Crespo', 'Colegiales',
  'Villa Urquiza', 'Almagro', 'Flores',
];

const MONTHS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

/* Demand intensity matrix: rows = neighborhoods, cols = months (0-10 scale) */
const DEMAND_DATA: number[][] = [
  [7.2, 7.8, 8.1, 8.5, 8.9, 9.4],   // Palermo
  [6.8, 7.1, 7.3, 7.6, 7.9, 8.2],   // Recoleta
  [6.5, 6.9, 7.0, 7.2, 7.5, 7.8],   // Belgrano
  [5.4, 5.8, 6.0, 6.3, 6.5, 6.9],   // Caballito
  [5.9, 6.2, 6.4, 6.8, 7.0, 7.3],   // Núñez
  [4.8, 5.2, 5.5, 5.9, 6.3, 6.7],   // San Telmo
  [3.9, 4.1, 4.4, 4.7, 5.0, 5.3],   // Barracas
  [5.7, 6.0, 6.3, 6.5, 6.8, 7.1],   // Villa Crespo
  [5.3, 5.6, 5.9, 6.1, 6.4, 6.8],   // Colegiales
  [5.0, 5.3, 5.5, 5.8, 6.1, 6.5],   // Villa Urquiza
  [4.5, 4.8, 5.0, 5.2, 5.5, 5.8],   // Almagro
  [3.6, 3.9, 4.1, 4.3, 4.5, 4.8],   // Flores
];

/* ─── Zone detail table data ───────────────────────────────── */

const ZONE_ROWS: Record<string, unknown>[] = [
  { zone: 'Palermo',       listings: 284, avg_price: 3420, demand_index: 9.4, dom_avg: 28 },
  { zone: 'Recoleta',      listings: 236, avg_price: 3180, demand_index: 8.2, dom_avg: 35 },
  { zone: 'Belgrano',      listings: 198, avg_price: 2960, demand_index: 7.8, dom_avg: 38 },
  { zone: 'Núñez',         listings: 142, avg_price: 2750, demand_index: 7.3, dom_avg: 32 },
  { zone: 'Villa Crespo',  listings: 165, avg_price: 2540, demand_index: 7.1, dom_avg: 41 },
  { zone: 'Caballito',     listings: 178, avg_price: 2380, demand_index: 6.9, dom_avg: 44 },
  { zone: 'Colegiales',    listings: 112, avg_price: 2620, demand_index: 6.8, dom_avg: 36 },
  { zone: 'San Telmo',     listings: 96,  avg_price: 2210, demand_index: 6.7, dom_avg: 48 },
  { zone: 'Villa Urquiza', listings: 134, avg_price: 2150, demand_index: 6.5, dom_avg: 42 },
  { zone: 'Almagro',       listings: 108, avg_price: 1980, demand_index: 5.8, dom_avg: 52 },
  { zone: 'Barracas',      listings: 72,  avg_price: 1720, demand_index: 5.3, dom_avg: 58 },
  { zone: 'Flores',        listings: 88,  avg_price: 1540, demand_index: 4.8, dom_avg: 64 },
];

/* ─── Table columns ─────────────────────────────────────────── */

const ZONE_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  {
    id: 'zone',
    label: 'Zona',
    width: '1.5fr',
    render: (r) => (
      <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
        {String(r.zone)}
      </span>
    ),
  },
  {
    id: 'listings',
    label: 'Avisos',
    width: '0.8fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
        {Number(r.listings).toLocaleString('es-AR')}
      </span>
    ),
  },
  {
    id: 'avg_price',
    label: 'Precio/m²',
    width: '1fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
        USD {Number(r.avg_price).toLocaleString('es-AR')}
      </span>
    ),
  },
  {
    id: 'demand_index',
    label: 'Demanda',
    width: '0.8fr',
    mono: true,
    render: (r) => {
      const idx = Number(r.demand_index);
      const color = idx >= 8 ? C.success : idx >= 6 ? C.warning : C.textSecondary;
      return (
        <span style={{ fontFamily: F.mono, fontSize: 12, color, fontWeight: 600 }}>
          {idx.toFixed(1)}
        </span>
      );
    },
  },
  {
    id: 'dom_avg',
    label: 'DOM prom.',
    width: '0.8fr',
    mono: true,
    render: (r) => {
      const dom = Number(r.dom_avg);
      const color = dom <= 35 ? C.success : dom <= 50 ? C.warning : '#E83B3B';
      return (
        <span style={{ fontFamily: F.mono, fontSize: 12, color, fontWeight: 500 }}>
          {dom}d
        </span>
      );
    },
  },
];

/* ─── Top zones by demand (bar chart) ──────────────────────── */

const TOP_ZONES_BARS = [...ZONE_ROWS]
  .sort((a, b) => Number(b.demand_index) - Number(a.demand_index))
  .slice(0, 8)
  .map((z) => ({
    label: String(z.zone),
    value: Number(z.demand_index),
    suffix: '',
    color: Number(z.demand_index) >= 8 ? C.success
      : Number(z.demand_index) >= 7 ? C.brand
      : C.brandLight,
  }));

/* ─── Geo heatmap points (Buenos Aires neighborhoods) ──────── */

const GEO_POINTS: GeoHeatmapPoint[] = [
  { lat: -34.5880, lng: -58.4115, value: 9.4, label: 'Palermo' },
  { lat: -34.5875, lng: -58.3936, value: 8.2, label: 'Recoleta' },
  { lat: -34.5625, lng: -58.4570, value: 7.8, label: 'Belgrano' },
  { lat: -34.6195, lng: -58.4437, value: 6.9, label: 'Caballito' },
  { lat: -34.5450, lng: -58.4563, value: 7.3, label: 'Núñez' },
  { lat: -34.6215, lng: -58.3732, value: 6.7, label: 'San Telmo' },
  { lat: -34.6469, lng: -58.3869, value: 5.3, label: 'Barracas' },
  { lat: -34.5983, lng: -58.4370, value: 7.1, label: 'Villa Crespo' },
  { lat: -34.5744, lng: -58.4498, value: 6.8, label: 'Colegiales' },
  { lat: -34.5730, lng: -58.4891, value: 6.5, label: 'Villa Urquiza' },
  { lat: -34.6094, lng: -58.4167, value: 5.8, label: 'Almagro' },
  { lat: -34.6280, lng: -58.4635, value: 4.8, label: 'Flores' },
];

/* ─── Heatmap color function ───────────────────────────────── */

function demandColorFn(value: number): string {
  if (value >= 8.5) return 'rgba(24,166,89,0.55)';
  if (value >= 7.0) return 'rgba(22,84,217,0.45)';
  if (value >= 5.5) return 'rgba(232,138,20,0.35)';
  if (value >= 4.0) return 'rgba(232,138,20,0.18)';
  return 'rgba(80,97,128,0.20)';
}

/* ─── Sparklines for KPIs ──────────────────────────────────── */

const SPARK_ZONES     = [10, 10, 11, 11, 12, 12];
const SPARK_PRICE_M2  = [2640, 2690, 2720, 2760, 2800, 2840];
const SPARK_DEMAND    = [7.6, 7.8, 8.0, 8.1, 8.3, 8.4];

/* ─── Filters ──────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'property_type',
    label: 'Tipo',
    multi: true,
    options: [
      { value: 'departamento', label: 'Departamento' },
      { value: 'casa',         label: 'Casa' },
      { value: 'ph',           label: 'PH' },
      { value: 'terreno',      label: 'Terreno' },
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
  headers: ['Zona', 'Avisos', 'Precio/m²', 'Demanda', 'DOM prom.'],
  rows: ZONE_ROWS.map((r) => [
    String(r.zone),
    Number(r.listings),
    Number(r.avg_price),
    Number(r.demand_index),
    Number(r.dom_avg),
  ]),
  filename: 'zone-analysis',
};

/* ─── Component ────────────────────────────────────────────── */

export default function ZoneAnalysisView() {
  return (
    <ReportShell
      slug="zone-analysis"
      title="Análisis de Zonas"
      subtitle="Demanda, precios y absorción por barrio y zona"
      refreshedAt="Hace 12 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'Zonas activas',      value: '12',           delta: '+2',     positive: true,  sparkline: SPARK_ZONES,    color: C.brand },
        { label: 'Precio prom./m²',    value: 'USD 2.840',    delta: '+3,8%',  positive: true,  sparkline: SPARK_PRICE_M2, color: C.success },
        { label: 'Zona top',           value: 'Palermo',      delta: '#1 hace 6 meses', color: C.brandLight },
        { label: 'Índice de demanda',  value: '8,4/10',       delta: '+0,6',   positive: true,  sparkline: SPARK_DEMAND,   color: C.success },
      ]} />

      {/* ── Demand heatmap ────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <WidgetCard title="Mapa de calor de demanda por barrio">
          <HeatmapGrid
            rowLabels={NEIGHBORHOODS}
            colLabels={MONTHS}
            data={DEMAND_DATA}
            colorFn={demandColorFn}
            formatFn={(v) => v.toFixed(1)}
          />
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
            {[
              { label: 'Muy alta (8,5+)',  color: 'rgba(24,166,89,0.55)' },
              { label: 'Alta (7,0–8,4)',    color: 'rgba(22,84,217,0.45)' },
              { label: 'Media (5,5–6,9)',   color: 'rgba(232,138,20,0.35)' },
              { label: 'Baja (< 5,5)',      color: 'rgba(80,97,128,0.20)' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} />
                <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>{l.label}</span>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      {/* ── Geographic heatmap ────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <WidgetCard title="Mapa geográfico de demanda — Buenos Aires">
          <GeoHeatmap
            points={GEO_POINTS}
            center={[-58.435, -34.595]}
            zoom={11.5}
            height={420}
          />
        </WidgetCard>
      </div>

      {/* ── Two-column: table + bar chart ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 16 }}>
        <WidgetCard title="Detalle por zona">
          <DataTable
            columns={ZONE_COLUMNS}
            data={ZONE_ROWS}
            defaultSort={{ col: 'demand_index', dir: 'desc' }}
          />
        </WidgetCard>

        <WidgetCard title="Top zonas por demanda">
          <HorizontalBarChart data={TOP_ZONES_BARS} />
        </WidgetCard>
      </div>
    </ReportShell>
  );
}
