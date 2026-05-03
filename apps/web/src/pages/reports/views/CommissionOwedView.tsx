import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  DonutChart,
  HorizontalBarChart,
  DataTable,
  WidgetCard,
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Mock data ──────────────────────────────────────────────── */

const OPERATIONS: Record<string, unknown>[] = [
  { property: 'Depto 3 amb. Palermo',        agent: 'García, J.',    sale_price: 185000, commission_pct: 3.0, amount: 5550,  status: 'Pendiente' },
  { property: 'PH 4 amb. Belgrano',          agent: 'López, M.',     sale_price: 245000, commission_pct: 3.5, amount: 8575,  status: 'Pagado' },
  { property: 'Casa Nordelta',               agent: 'Martínez, C.',  sale_price: 420000, commission_pct: 3.0, amount: 12600, status: 'En proceso' },
  { property: 'Oficina Microcentro',         agent: 'Rodríguez, A.', sale_price: 310000, commission_pct: 2.5, amount: 7750,  status: 'Pendiente' },
  { property: 'Local Recoleta',              agent: 'García, J.',    sale_price: 275000, commission_pct: 3.0, amount: 8250,  status: 'Pendiente' },
  { property: 'Depto 2 amb. Caballito',      agent: 'Fernández, P.', sale_price: 128000, commission_pct: 3.5, amount: 4480,  status: 'Pagado' },
  { property: 'Cochera x3 Puerto Madero',    agent: 'Díaz, L.',      sale_price: 95000,  commission_pct: 4.0, amount: 3800,  status: 'En proceso' },
  { property: 'Depto 1 amb. Villa Crespo',   agent: 'López, M.',     sale_price: 89000,  commission_pct: 3.5, amount: 3115,  status: 'Pendiente' },
  { property: 'Lote Pilar',                  agent: 'Sánchez, R.',   sale_price: 62000,  commission_pct: 3.0, amount: 1860,  status: 'Pagado' },
  { property: 'Depto 4 amb. Núñez',          agent: 'Martínez, C.',  sale_price: 340000, commission_pct: 3.0, amount: 10200, status: 'Pendiente' },
];

const statusColor: Record<string, string> = {
  'Pendiente':  C.warning,
  'En proceso': C.brand,
  'Pagado':     C.success,
};

const OPERATIONS_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  { id: 'property', label: 'Propiedad', width: '1.6fr', render: (r) => (
    <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{String(r.property)}</span>
  )},
  { id: 'agent', label: 'Agente', width: '1fr', render: (r) => (
    <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>{String(r.agent)}</span>
  )},
  { id: 'sale_price', label: 'Precio venta', width: '1fr', mono: true, align: 'right', render: (r) => (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
      US$ {Number(r.sale_price).toLocaleString('es-AR')}
    </span>
  )},
  { id: 'commission_pct', label: 'Com. %', width: '0.6fr', mono: true, align: 'right', render: (r) => (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{Number(r.commission_pct).toFixed(1)}%</span>
  )},
  { id: 'amount', label: 'Monto', width: '0.9fr', mono: true, align: 'right', render: (r) => (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
      US$ {Number(r.amount).toLocaleString('es-AR')}
    </span>
  )},
  { id: 'status', label: 'Estado', width: '0.9fr', render: (r) => {
    const status = String(r.status);
    const color = statusColor[status] ?? C.textSecondary;
    return (
      <span style={{
        fontFamily: F.body, fontSize: 12, fontWeight: 600, color,
        background: `${color}18`, padding: '3px 10px', borderRadius: 6,
      }}>
        {status}
      </span>
    );
  }},
];

/* Commission status donut */
const pendingTotal  = OPERATIONS.filter(o => o.status === 'Pendiente').reduce((s, o) => s + Number(o.amount), 0);
const enProcesoTotal = OPERATIONS.filter(o => o.status === 'En proceso').reduce((s, o) => s + Number(o.amount), 0);
const pagadoTotal   = OPERATIONS.filter(o => o.status === 'Pagado').reduce((s, o) => s + Number(o.amount), 0);

const STATUS_SEGMENTS = [
  { label: 'Pendiente',  value: pendingTotal,   color: C.warning },
  { label: 'En proceso', value: enProcesoTotal,  color: C.brand },
  { label: 'Pagado',     value: pagadoTotal,     color: C.success },
];

/* Commission by agent */
const agentTotals: Record<string, number> = {};
OPERATIONS.forEach(o => {
  const agent = String(o.agent);
  agentTotals[agent] = (agentTotals[agent] ?? 0) + Number(o.amount);
});

const COMMISSION_BY_AGENT = Object.entries(agentTotals)
  .sort(([, a], [, b]) => b - a)
  .map(([label, value]) => ({
    label,
    value,
    suffix: '',
    color: C.brand,
  }));

/* Sparklines for KPIs */
const SPARK_PENDING = [980, 1020, 1060, 1120, 1180, 1240];
const SPARK_PAID    = [210, 228, 244, 256, 268, 287];

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
      { value: 'fernandez', label: 'Fernández, P.' },
      { value: 'diaz',      label: 'Díaz, L.' },
      { value: 'sanchez',   label: 'Sánchez, R.' },
    ],
  },
  {
    id: 'status',
    label: 'Estado',
    options: [
      { value: 'pendiente',  label: 'Pendiente' },
      { value: 'en-proceso', label: 'En proceso' },
      { value: 'pagado',     label: 'Pagado' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Propiedad', 'Agente', 'Precio venta', 'Com. %', 'Monto', 'Estado'],
  rows: OPERATIONS.map((r) => [
    String(r.property),
    String(r.agent),
    Number(r.sale_price),
    Number(r.commission_pct),
    Number(r.amount),
    String(r.status),
  ]),
  filename: 'commission-owed',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function CommissionOwedView() {
  const totalPending = OPERATIONS
    .filter(o => o.status === 'Pendiente' || o.status === 'En proceso')
    .reduce((s, o) => s + Number(o.amount), 0);

  return (
    <ReportShell
      slug="commission-owed"
      title="Comisiones Pendientes"
      subtitle="Estado de comisiones por operación y agente"
      refreshedAt="Hace 15 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* KPIs */}
      <KpiRow cards={[
        { label: 'Comisiones pendientes', value: `US$ ${(1240000).toLocaleString('es-AR')}`, delta: '+6.2%', positive: true,  sparkline: SPARK_PENDING, color: C.warning },
        { label: 'Pagado este mes',       value: `US$ ${(287000).toLocaleString('es-AR')}`,  delta: '+12%',  positive: true,  sparkline: SPARK_PAID,    color: C.success },
        { label: 'Comisión promedio',      value: '3,2%', color: C.brand },
        { label: 'Agentes con pendiente', value: '8',    color: C.warning },
      ]} />

      {/* Operations table */}
      <div style={{ marginBottom: 20 }}>
        <WidgetCard title="Operaciones">
          <DataTable
            columns={OPERATIONS_COLUMNS}
            data={OPERATIONS}
            defaultSort={{ col: 'amount', dir: 'desc' }}
          />
        </WidgetCard>
      </div>

      {/* Two-column: Donut + Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Status breakdown donut */}
        <WidgetCard title="Desglose por estado">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <DonutChart
              segments={STATUS_SEGMENTS}
              size={180}
              thickness={26}
              centerValue={`US$ ${Math.round(totalPending / 1000)}K`}
              centerLabel="pendiente"
            />
          </div>
        </WidgetCard>

        {/* Commission by agent */}
        <WidgetCard title="Comisión por agente (US$)">
          <HorizontalBarChart data={COMMISSION_BY_AGENT} color={C.brand} />
        </WidgetCard>
      </div>
    </ReportShell>
  );
}
