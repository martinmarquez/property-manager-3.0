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

const RESERVATION_TABLE: Record<string, unknown>[] = [
  { property: 'Av. del Libertador 6200, Belgrano',  client: 'Méndez, Carolina',  agent: 'García, J.',    date: '2026-04-28', amount: 15000,  status: 'Activa' },
  { property: 'Gorriti 4450, Palermo',               client: 'Torres, Alejandro', agent: 'López, M.',     date: '2026-04-30', amount: 22000,  status: 'Activa' },
  { property: 'Av. Pueyrredón 1820, Recoleta',      client: 'Villalba, Julieta', agent: 'Martínez, C.',  date: '2026-05-01', amount: 18500,  status: 'Cerrada' },
  { property: 'Bonpland 2180, Palermo',              client: 'Aguirre, Franco',   agent: 'Rodríguez, A.', date: '2026-04-22', amount: 12000,  status: 'Vencida' },
  { property: 'Scalabrini Ortiz 3100, Palermo',     client: 'Ríos, Valentín',    agent: 'García, J.',    date: '2026-05-02', amount: 20000,  status: 'Activa' },
  { property: 'Av. Cabildo 2740, Belgrano',         client: 'Pereyra, Sofía',    agent: 'López, M.',     date: '2026-04-25', amount: 25000,  status: 'Cerrada' },
  { property: 'Humboldt 1560, Palermo',              client: 'Giménez, Matías',   agent: 'Martínez, C.',  date: '2026-04-18', amount: 16000,  status: 'Vencida' },
  { property: 'Av. Las Heras 3640, Palermo Chico',  client: 'Navarro, Luciana',  agent: 'Rodríguez, A.', date: '2026-05-03', amount: 30000,  status: 'Activa' },
  { property: 'Costa Rica 5900, Palermo Hollywood',  client: 'Molina, Ezequiel',  agent: 'García, J.',    date: '2026-04-20', amount: 14000,  status: 'Cerrada' },
  { property: 'Fitz Roy 2100, Palermo Soho',        client: 'Herrera, Camila',   agent: 'López, M.',     date: '2026-04-26', amount: 19500,  status: 'Activa' },
];

const RES_STATUS_COLORS: Record<string, string> = {
  Activa:  C.brand,
  Vencida: C.error,
  Cerrada: C.success,
};

const RESERVATION_COLUMNS: TableColumn<Record<string, unknown>>[] = [
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
  { id: 'client', label: 'Cliente', width: '1.2fr' },
  { id: 'agent', label: 'Agente', width: '1fr' },
  {
    id: 'date',
    label: 'Fecha',
    width: '0.8fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
        {new Date(String(r.date)).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
      </span>
    ),
  },
  {
    id: 'amount',
    label: 'Seña',
    width: '0.8fr',
    align: 'right',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
        US$ {Number(r.amount).toLocaleString('es-AR')}
      </span>
    ),
  },
  {
    id: 'status',
    label: 'Estado',
    width: '0.7fr',
    render: (r) => {
      const st = String(r.status);
      const color = RES_STATUS_COLORS[st] ?? C.textSecondary;
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

const TREND_LABELS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

const RATE_TREND_SERIES = [
  { label: 'Tasa de reserva', data: [62, 65, 68, 70, 73, 76], color: C.brand },
  { label: 'Conversión a cierre', data: [85, 86, 88, 89, 91, 92], color: C.success },
];

const OUTCOME_SEGMENTS = [
  { label: 'Cerrada exitosa', value: 12, color: C.success },
  { label: 'Caída',           value: 3,  color: C.error },
  { label: 'En curso',        value: 8,  color: C.brand },
];

const SPARK_RATE       = [62, 65, 68, 70, 73, 76, 74, 77, 76, 78, 77, 76];
const SPARK_ACTIVE     = [11, 12, 13, 14, 16, 18];
const SPARK_AVG_TIME   = [12, 11, 10, 9, 9, 8];
const SPARK_CONVERSION = [85, 86, 88, 89, 91, 92];

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
    id: 'property_type',
    label: 'Tipo propiedad',
    options: [
      { value: 'departamento', label: 'Departamento' },
      { value: 'casa', label: 'Casa' },
      { value: 'ph', label: 'PH' },
      { value: 'local', label: 'Local comercial' },
      { value: 'oficina', label: 'Oficina' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Propiedad', 'Cliente', 'Agente', 'Fecha', 'Seña', 'Estado'],
  rows: RESERVATION_TABLE.map((r) => [
    String(r.property),
    String(r.client),
    String(r.agent),
    String(r.date),
    Number(r.amount),
    String(r.status),
  ]),
  filename: 'reservation-rates',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function ReservationRatesView() {
  return (
    <ReportShell
      slug="reservation-rates"
      title="Tasas de Reserva"
      subtitle="Reservas activas, vencimientos y conversión a cierre"
      refreshedAt="Hace 4 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'Tasa de reserva',      value: '76%',    delta: '+5,1%',  positive: true,  sparkline: SPARK_RATE,       color: C.brand },
        { label: 'Reservas activas',     value: '18',     delta: '+2',     positive: true,  sparkline: SPARK_ACTIVE,     color: C.success },
        { label: 'Tiempo prom. reserva', value: '8 días', delta: '-1 día', positive: true,  sparkline: SPARK_AVG_TIME,   color: C.warning },
        { label: 'Conversión a cierre',  value: '92%',    delta: '+1,2%',  positive: true,  sparkline: SPARK_CONVERSION, color: C.success },
      ]} />

      {/* ── Two-column: trend + donut ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Rate trend */}
        <WidgetCard title="Tendencia de tasas (6 meses)">
          <MultiLineChart
            series={RATE_TREND_SERIES}
            xLabels={TREND_LABELS}
          />
        </WidgetCard>

        {/* Outcome donut */}
        <WidgetCard title="Resultado de reservas">
          <DonutChart
            segments={OUTCOME_SEGMENTS}
            size={170}
            thickness={26}
            centerValue="23"
            centerLabel="reservas"
          />
        </WidgetCard>
      </div>

      {/* ── Reservations table ─────────────────────────────────── */}
      <WidgetCard title="Reservas recientes">
        <DataTable
          columns={RESERVATION_COLUMNS}
          data={RESERVATION_TABLE}
          defaultSort={{ col: 'date', dir: 'desc' }}
        />
      </WidgetCard>
    </ReportShell>
  );
}
