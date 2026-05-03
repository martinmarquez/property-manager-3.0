import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  MultiLineChart,
  DataTable,
  DonutChart,
  WidgetCard,
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Mock data ──────────────────────────────────────────────── */

const CAPTURES_TREND_LABELS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

const CAPTURES_TREND_SERIES = [
  { label: 'Captaciones', data: [18, 15, 21, 24, 22, 28], color: C.brand },
];

const TYPE_SEGMENTS = [
  { label: 'Departamento', value: 14, color: C.brand },
  { label: 'Casa',         value: 5,  color: C.success },
  { label: 'PH',           value: 4,  color: C.warning },
  { label: 'Terreno',      value: 3,  color: '#7E3AF2' },
  { label: 'Local',        value: 2,  color: '#E83B3B' },
];

const CAPTURED_TABLE: Record<string, unknown>[] = [
  { address: 'Av. Libertador 5200, Núñez',       property_type: 'Departamento', zone: 'Núñez',       asking_price: 215000, exclusive: 'Sí', agent: 'García, J.',     date: '02/05/2026' },
  { address: 'Thames 1420, Palermo',              property_type: 'Departamento', zone: 'Palermo',     asking_price: 189000, exclusive: 'Sí', agent: 'López, M.',      date: '01/05/2026' },
  { address: 'Arenales 1780, Recoleta',           property_type: 'Departamento', zone: 'Recoleta',    asking_price: 310000, exclusive: 'Sí', agent: 'Martínez, C.',   date: '30/04/2026' },
  { address: 'Av. Rivadavia 6300, Caballito',     property_type: 'PH',           zone: 'Caballito',   asking_price: 145000, exclusive: 'No', agent: 'Rodríguez, A.',  date: '29/04/2026' },
  { address: 'Gorriti 4600, Palermo Soho',        property_type: 'Local',        zone: 'Palermo',     asking_price: 280000, exclusive: 'Sí', agent: 'García, J.',     date: '28/04/2026' },
  { address: 'Av. Cabildo 3100, Belgrano',        property_type: 'Departamento', zone: 'Belgrano',    asking_price: 198000, exclusive: 'Sí', agent: 'López, M.',      date: '27/04/2026' },
  { address: 'Cuba 2200, Belgrano',               property_type: 'Casa',         zone: 'Belgrano',    asking_price: 420000, exclusive: 'No', agent: 'Martínez, C.',   date: '26/04/2026' },
  { address: 'Bonpland 1800, Palermo',            property_type: 'Departamento', zone: 'Palermo',     asking_price: 165000, exclusive: 'Sí', agent: 'García, J.',     date: '25/04/2026' },
  { address: 'Av. San Martín 4500, Villa Devoto', property_type: 'Terreno',      zone: 'Villa Devoto', asking_price: 95000,  exclusive: 'No', agent: 'Rodríguez, A.',  date: '24/04/2026' },
  { address: 'Juncal 2900, Recoleta',             property_type: 'PH',           zone: 'Recoleta',    asking_price: 275000, exclusive: 'Sí', agent: 'López, M.',      date: '23/04/2026' },
];

/* ─── Table columns ──────────────────────────────────────────── */

const CAPTURED_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  {
    id: 'address',
    label: 'Dirección',
    width: '2fr',
    render: (r) => (
      <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
        {String(r.address)}
      </span>
    ),
  },
  {
    id: 'property_type',
    label: 'Tipo',
    width: '0.9fr',
    render: (r) => (
      <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>
        {String(r.property_type)}
      </span>
    ),
  },
  {
    id: 'zone',
    label: 'Zona',
    width: '0.9fr',
  },
  {
    id: 'asking_price',
    label: 'Precio pedido',
    width: '1fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
        USD {Number(r.asking_price).toLocaleString('es-AR')}
      </span>
    ),
  },
  {
    id: 'exclusive',
    label: 'Exclusiva',
    width: '0.7fr',
    render: (r) => {
      const isExcl = String(r.exclusive) === 'Sí';
      return (
        <span style={{
          fontFamily: F.body, fontSize: 12, fontWeight: 500,
          padding: '3px 8px', borderRadius: 4,
          background: isExcl ? 'rgba(24,166,89,0.12)' : 'rgba(232,138,20,0.12)',
          color: isExcl ? C.success : C.warning,
        }}>
          {String(r.exclusive)}
        </span>
      );
    },
  },
  {
    id: 'agent',
    label: 'Agente',
    width: '1fr',
  },
  {
    id: 'date',
    label: 'Fecha',
    width: '0.8fr',
    mono: true,
  },
];

/* ─── Sparklines ─────────────────────────────────────────────── */

const SPARK_CAPTURED   = [18, 15, 21, 24, 22, 28, 26, 30, 28, 32, 29, 28];
const SPARK_EXCLUSIVE  = [12, 10, 14, 16, 15, 18, 17, 19, 18, 20, 19, 18];
const SPARK_AVG_PRICE  = [172, 168, 175, 178, 180, 185, 182, 188, 185, 190, 187, 185];

/* ─── Filters ────────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'agent',
    label: 'Agente',
    multi: true,
    options: [
      { value: 'garcia',    label: 'García, J.' },
      { value: 'lopez',     label: 'López, M.' },
      { value: 'martinez',  label: 'Martínez, C.' },
      { value: 'rodriguez', label: 'Rodríguez, A.' },
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
      { value: 'nunez',        label: 'Núñez' },
      { value: 'caballito',    label: 'Caballito' },
      { value: 'villa-devoto', label: 'Villa Devoto' },
    ],
  },
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
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Dirección', 'Tipo', 'Zona', 'Precio pedido', 'Exclusiva', 'Agente', 'Fecha'],
  rows: CAPTURED_TABLE.map((r) => [
    String(r.address),
    String(r.property_type),
    String(r.zone),
    Number(r.asking_price),
    String(r.exclusive),
    String(r.agent),
    String(r.date),
  ]),
  filename: 'captured-listings',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function CapturedListingsView() {
  return (
    <ReportShell
      slug="captured-listings"
      title="Captaciones del Mes"
      subtitle="Propiedades captadas, exclusividad y distribución por zona"
      refreshedAt="Hace 8 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'Captadas este mes',   value: '28',       delta: '+14%',   positive: true,  sparkline: SPARK_CAPTURED,  color: C.brand },
        { label: 'Exclusivas',          value: '18 (64%)', delta: '+5pp',   positive: true,  sparkline: SPARK_EXCLUSIVE, color: C.success },
        { label: 'Precio pedido prom.', value: 'USD 185K', delta: '+3.2%',  positive: true,  sparkline: SPARK_AVG_PRICE, color: C.brand },
        { label: 'Zona top',            value: 'Palermo',  subtitle: '9 captaciones este mes', color: C.warning },
      ]} />

      {/* ── Trend + Donut ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 20 }}>
        <WidgetCard title="Tendencia de captaciones (6 meses)">
          <MultiLineChart
            series={CAPTURES_TREND_SERIES}
            xLabels={CAPTURES_TREND_LABELS}
          />
        </WidgetCard>

        <WidgetCard title="Distribución por tipo">
          <DonutChart
            segments={TYPE_SEGMENTS}
            size={170}
            thickness={26}
            centerValue="28"
            centerLabel="captadas"
          />
        </WidgetCard>
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <WidgetCard title="Propiedades captadas">
        <DataTable
          columns={CAPTURED_COLUMNS}
          data={CAPTURED_TABLE}
          defaultSort={{ col: 'date', dir: 'desc' }}
        />
      </WidgetCard>
    </ReportShell>
  );
}
