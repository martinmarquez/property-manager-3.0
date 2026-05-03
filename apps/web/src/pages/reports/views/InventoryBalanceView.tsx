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

const TREND_SERIES = [
  { label: 'Nuevos',   data: [22, 19, 24, 26, 25, 28], color: C.brand },
  { label: 'Vendidos', data: [14, 11, 13, 10, 14, 12], color: C.success },
];

const INVENTORY_BY_TYPE = [
  { label: 'Departamento', value: 78, color: C.brand },
  { label: 'Casa',         value: 28, color: C.success },
  { label: 'PH',           value: 18, color: C.warning },
  { label: 'Terreno',      value: 12, color: '#7E3AF2' },
  { label: 'Local',        value: 6,  color: '#E83B3B' },
];

const ZONE_TABLE: Record<string, unknown>[] = [
  { zone: 'Palermo',       active: 32, new: 7,  sold: 3, avg_dom: 38,  absorption: 2.8 },
  { zone: 'Recoleta',      active: 24, new: 5,  sold: 2, avg_dom: 45,  absorption: 3.5 },
  { zone: 'Belgrano',      active: 22, new: 4,  sold: 2, avg_dom: 42,  absorption: 3.1 },
  { zone: 'Caballito',     active: 18, new: 3,  sold: 2, avg_dom: 52,  absorption: 2.6 },
  { zone: 'Núñez',         active: 14, new: 3,  sold: 1, avg_dom: 48,  absorption: 3.8 },
  { zone: 'Villa Crespo',  active: 12, new: 2,  sold: 1, avg_dom: 56,  absorption: 3.4 },
  { zone: 'San Telmo',     active: 10, new: 2,  sold: 0, avg_dom: 64,  absorption: 5.0 },
  { zone: 'Barrio Norte',  active: 10, new: 2,  sold: 1, avg_dom: 41,  absorption: 2.9 },
];

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
    id: 'active',
    label: 'Activos',
    width: '0.7fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
        {Number(r.active).toLocaleString('es-AR')}
      </span>
    ),
  },
  {
    id: 'new',
    label: 'Nuevos',
    width: '0.7fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.brand }}>
        +{String(r.new)}
      </span>
    ),
  },
  {
    id: 'sold',
    label: 'Vendidos',
    width: '0.7fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.success }}>
        {String(r.sold)}
      </span>
    ),
  },
  {
    id: 'avg_dom',
    label: 'DOM prom.',
    width: '0.8fr',
    align: 'right',
    mono: true,
    render: (r) => {
      const dom = Number(r.avg_dom);
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
  {
    id: 'absorption',
    label: 'Absorción (meses)',
    width: '1fr',
    align: 'right',
    mono: true,
    render: (r) => {
      const abs = Number(r.absorption);
      return (
        <span style={{
          fontFamily: F.mono, fontSize: 12, fontWeight: 600,
          color: abs > 4 ? C.warning : abs < 3 ? C.success : C.textSecondary,
        }}>
          {abs.toFixed(1)}
        </span>
      );
    },
  },
];

/* ─── Sparklines ─────────────────────────────────────────────── */

const SPARK_ACTIVE     = [128, 130, 134, 138, 136, 142, 140, 145, 142, 148, 144, 142];
const SPARK_NEW        = [22, 19, 24, 26, 25, 28, 27, 30, 28, 31, 29, 28];
const SPARK_SOLD       = [14, 11, 13, 10, 14, 12, 13, 15, 12, 14, 13, 12];
const SPARK_ABSORPTION = [3.8, 3.6, 3.4, 3.5, 3.3, 3.2, 3.3, 3.1, 3.2, 3.0, 3.1, 3.2];

/* ─── Filters ────────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'property_type',
    label: 'Tipo',
    multi: true,
    options: [
      { value: 'apartment', label: 'Departamento' },
      { value: 'house',     label: 'Casa' },
      { value: 'ph',        label: 'PH' },
      { value: 'land',      label: 'Terreno' },
      { value: 'retail',    label: 'Local' },
    ],
  },
  {
    id: 'zone',
    label: 'Zona',
    multi: true,
    options: [
      { value: 'palermo',      label: 'Palermo' },
      { value: 'recoleta',     label: 'Recoleta' },
      { value: 'belgrano',     label: 'Belgrano' },
      { value: 'caballito',    label: 'Caballito' },
      { value: 'nunez',        label: 'Núñez' },
      { value: 'villa-crespo', label: 'Villa Crespo' },
      { value: 'san-telmo',    label: 'San Telmo' },
      { value: 'barrio-norte', label: 'Barrio Norte' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Zona', 'Activos', 'Nuevos', 'Vendidos', 'DOM prom.', 'Absorción (meses)'],
  rows: ZONE_TABLE.map((r) => [
    String(r.zone),
    Number(r.active),
    Number(r.new),
    Number(r.sold),
    Number(r.avg_dom),
    Number(r.absorption),
  ]),
  filename: 'inventory-balance',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function InventoryBalanceView() {
  return (
    <ReportShell
      slug="inventory-balance"
      title="Balance de Inventario"
      subtitle="Ratio nuevos vs vendidos y tasa de absorción"
      refreshedAt="Hace 10 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'Inventario activo',  value: '142',      delta: '+4.4%',  positive: true,  sparkline: SPARK_ACTIVE,     color: C.brand },
        { label: 'Nuevos este mes',    value: '28',       delta: '+12%',   positive: true,  sparkline: SPARK_NEW,        color: C.brand },
        { label: 'Vendidos este mes',  value: '12',       delta: '-14.3%', positive: false, sparkline: SPARK_SOLD,       color: C.success },
        { label: 'Tasa de absorción',  value: '3,2 meses', delta: '-0.1',  positive: true,  sparkline: SPARK_ABSORPTION, color: C.success, tooltip: 'Meses para vender el inventario activo al ritmo actual' },
      ]} />

      {/* ── Trend + Bar chart ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 20 }}>
        <WidgetCard title="Tendencia nuevos vs vendidos (6 meses)">
          <MultiLineChart
            series={TREND_SERIES}
            xLabels={TREND_LABELS}
          />
        </WidgetCard>

        <WidgetCard title="Inventario por tipo">
          <HorizontalBarChart data={INVENTORY_BY_TYPE} />
        </WidgetCard>
      </div>

      {/* ── Zone detail table ─────────────────────────────────── */}
      <WidgetCard title="Detalle por zona">
        <DataTable
          columns={ZONE_COLUMNS}
          data={ZONE_TABLE}
          defaultSort={{ col: 'active', dir: 'desc' }}
        />
      </WidgetCard>
    </ReportShell>
  );
}
