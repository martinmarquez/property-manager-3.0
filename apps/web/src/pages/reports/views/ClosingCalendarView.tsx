import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  DonutChart,
  MultiLineChart,
  DataTable,
  WidgetCard,
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Mock data ──────────────────────────────────────────────── */

const CLOSINGS_TABLE: Record<string, unknown>[] = [
  { property: 'Av. Libertador 4200, Núñez',       buyer: 'Fernández, Lucía',  agent: 'García, J.',    expected_date: '2026-05-08', price: 185000, status: 'Firma' },
  { property: 'Juncal 1580, Recoleta',             buyer: 'Pérez, Martín',     agent: 'López, M.',     expected_date: '2026-05-10', price: 220000, status: 'Escritura' },
  { property: 'Cabildo 3420, Belgrano',            buyer: 'Gómez, Analía',     agent: 'Martínez, C.',  expected_date: '2026-05-12', price: 142000, status: 'Posesión' },
  { property: 'Av. Córdoba 5880, Palermo',         buyer: 'Ruiz, Sebastián',   agent: 'García, J.',    expected_date: '2026-05-14', price: 198000, status: 'Firma' },
  { property: 'Thames 2240, Palermo Soho',         buyer: 'Morales, Camila',   agent: 'Rodríguez, A.', expected_date: '2026-05-16', price: 265000, status: 'Escritura' },
  { property: 'Av. Callao 1130, Barrio Norte',     buyer: 'Díaz, Tomás',       agent: 'López, M.',     expected_date: '2026-05-18', price: 175000, status: 'Firma' },
  { property: 'Arenales 2060, Recoleta',           buyer: 'Castro, Valentina', agent: 'Martínez, C.',  expected_date: '2026-05-20', price: 310000, status: 'Escritura' },
  { property: 'Guatemala 4700, Palermo',           buyer: 'Sosa, Nicolás',     agent: 'Rodríguez, A.', expected_date: '2026-05-22', price: 128000, status: 'Posesión' },
  { property: 'Av. Santa Fe 3150, Palermo',        buyer: 'Acosta, Florencia', agent: 'García, J.',    expected_date: '2026-05-25', price: 155000, status: 'Firma' },
  { property: 'Uriarte 1740, Palermo',             buyer: 'Herrera, Diego',    agent: 'López, M.',     expected_date: '2026-05-28', price: 240000, status: 'Escritura' },
];

const STATUS_COLORS: Record<string, string> = {
  Firma: C.warning,
  Escritura: C.brand,
  Posesión: C.success,
};

const CLOSING_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  {
    id: 'property',
    label: 'Propiedad',
    width: '2fr',
    render: (r) => (
      <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
        {String(r.property)}
      </span>
    ),
  },
  { id: 'buyer', label: 'Comprador', width: '1.2fr' },
  { id: 'agent', label: 'Agente', width: '1fr' },
  {
    id: 'expected_date',
    label: 'Fecha esper.',
    width: '1fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
        {new Date(String(r.expected_date)).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
      </span>
    ),
  },
  {
    id: 'price',
    label: 'Precio',
    width: '1fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
        US$ {Number(r.price).toLocaleString('es-AR')}
      </span>
    ),
  },
  {
    id: 'status',
    label: 'Estado',
    width: '0.8fr',
    render: (r) => {
      const st = String(r.status);
      const color = STATUS_COLORS[st] ?? C.textSecondary;
      return (
        <span style={{
          fontFamily: F.body, fontSize: 11, fontWeight: 600,
          color, background: `${color}1A`,
          padding: '3px 8px', borderRadius: 4,
        }}>
          {st}
        </span>
      );
    },
  },
];

const MONTHLY_LABELS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

const MONTHLY_CLOSINGS_SERIES = [
  { label: 'Cierres', data: [14, 16, 18, 19, 21, 23], color: C.brand },
];

const CLOSING_TYPE_SEGMENTS = [
  { label: 'Venta',   value: 16, color: C.brand },
  { label: 'Alquiler', value: 5,  color: C.success },
  { label: 'Permuta', value: 2,  color: C.warning },
];

const SPARK_CLOSINGS = [14, 16, 18, 19, 21, 23, 22, 24, 23, 25, 24, 23];
const SPARK_PIPELINE = [3.4, 3.6, 3.8, 3.9, 4.0, 4.2];
const SPARK_AVG_DEAL = [168, 172, 175, 178, 180, 182];
const SPARK_DAYS     = [42, 40, 38, 37, 35, 34];

/* ─── Filters ──────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'agent',
    label: 'Agente',
    multi: true,
    options: [
      { value: 'garcia', label: 'García, J.' },
      { value: 'lopez', label: 'López, M.' },
      { value: 'martinez', label: 'Martínez, C.' },
      { value: 'rodriguez', label: 'Rodríguez, A.' },
    ],
  },
  {
    id: 'type',
    label: 'Tipo',
    options: [
      { value: 'venta', label: 'Venta' },
      { value: 'alquiler', label: 'Alquiler' },
      { value: 'permuta', label: 'Permuta' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Propiedad', 'Comprador', 'Agente', 'Fecha esper.', 'Precio', 'Estado'],
  rows: CLOSINGS_TABLE.map((r) => [
    String(r.property),
    String(r.buyer),
    String(r.agent),
    String(r.expected_date),
    Number(r.price),
    String(r.status),
  ]),
  filename: 'closing-calendar',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function ClosingCalendarView() {
  return (
    <ReportShell
      slug="closing-calendar"
      title="Calendario de Cierres"
      subtitle="Operaciones en curso y proyección de cierres"
      refreshedAt="Hace 6 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'Cierres este mes',  value: '23',    delta: '+3',     positive: true,  sparkline: SPARK_CLOSINGS, color: C.brand },
        { label: 'Valor pipeline',    value: '$4,2M', delta: '+8.1%',  positive: true,  sparkline: SPARK_PIPELINE, color: C.success },
        { label: 'Ticket promedio',   value: '$182K', delta: '+2.3%',  positive: true,  sparkline: SPARK_AVG_DEAL, color: C.brand },
        { label: 'Días al cierre',    value: '34',    delta: '-3 días', positive: true, sparkline: SPARK_DAYS,     color: C.warning },
      ]} />

      {/* ── Closings table ─────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <WidgetCard title="Próximos cierres">
          <DataTable
            columns={CLOSING_COLUMNS}
            data={CLOSINGS_TABLE}
            defaultSort={{ col: 'expected_date', dir: 'asc' }}
          />
        </WidgetCard>
      </div>

      {/* ── Two-column charts ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        {/* Monthly trend */}
        <WidgetCard title="Tendencia mensual de cierres">
          <MultiLineChart
            series={MONTHLY_CLOSINGS_SERIES}
            xLabels={MONTHLY_LABELS}
          />
        </WidgetCard>

        {/* Closing type donut */}
        <WidgetCard title="Tipo de operación">
          <DonutChart
            segments={CLOSING_TYPE_SEGMENTS}
            size={170}
            thickness={26}
            centerValue="23"
            centerLabel="cierres"
          />
        </WidgetCard>
      </div>
    </ReportShell>
  );
}
