import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  MultiLineChart,
  DataTable,
  WidgetCard,
  AlertCard,
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Mock data ──────────────────────────────────────────────── */

const SLA_TREND_LABELS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

const SLA_TREND_SERIES = [
  { label: 'Cumplimiento %', data: [78, 80, 83, 85, 84, 87], color: C.success },
  { label: 'Objetivo %',     data: [85, 85, 85, 85, 85, 85], color: C.textTertiary },
];

const AGENT_SLA_TABLE: Record<string, unknown>[] = [
  { agent: 'García, J.',    tickets: 142, within_sla: 128, breached: 14, avg_response: '1.8h', compliance: 90.1 },
  { agent: 'López, M.',     tickets: 128, within_sla: 112, breached: 16, avg_response: '2.1h', compliance: 87.5 },
  { agent: 'Martínez, C.',  tickets: 136, within_sla: 122, breached: 14, avg_response: '1.6h', compliance: 89.7 },
  { agent: 'Rodríguez, A.', tickets: 118, within_sla: 104, breached: 14, avg_response: '2.4h', compliance: 88.1 },
  { agent: 'Fernández, P.', tickets: 110, within_sla: 94,  breached: 16, avg_response: '2.9h', compliance: 85.5 },
  { agent: 'Díaz, L.',      tickets: 96,  within_sla: 78,  breached: 18, avg_response: '3.2h', compliance: 81.3 },
  { agent: 'Sánchez, R.',   tickets: 88,  within_sla: 68,  breached: 20, avg_response: '3.8h', compliance: 77.3 },
  { agent: 'Moreno, E.',    tickets: 74,  within_sla: 54,  breached: 20, avg_response: '4.5h', compliance: 73.0 },
];

const AGENT_SLA_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  { id: 'agent', label: 'Agente', width: '1.4fr', render: (r) => (
    <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{String(r.agent)}</span>
  )},
  { id: 'tickets', label: 'Tickets', width: '0.8fr', mono: true, render: (r) => (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>{Number(r.tickets).toLocaleString('es-AR')}</span>
  )},
  { id: 'within_sla', label: 'Dentro SLA', width: '0.9fr', mono: true, render: (r) => (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.success, fontWeight: 600 }}>{Number(r.within_sla).toLocaleString('es-AR')}</span>
  )},
  { id: 'breached', label: 'Excedidos', width: '0.8fr', mono: true, render: (r) => {
    const breached = Number(r.breached);
    return (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: breached >= 18 ? C.error : C.warning, fontWeight: 600 }}>
        {breached}
      </span>
    );
  }},
  { id: 'avg_response', label: 'Resp. prom.', width: '0.8fr', mono: true, render: (r) => (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{String(r.avg_response)}</span>
  )},
  { id: 'compliance', label: 'Cumplimiento %', width: '1fr', mono: true, render: (r) => {
    const pct = Number(r.compliance);
    const color = pct >= 85 ? C.success : pct >= 80 ? C.warning : C.error;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: C.bgElevated, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
        </div>
        <span style={{ fontFamily: F.mono, fontSize: 12, color, fontWeight: 600, minWidth: 42, textAlign: 'right' }}>
          {pct.toFixed(1)}%
        </span>
      </div>
    );
  }},
];

/* Agents below 80% SLA */
const BELOW_THRESHOLD = AGENT_SLA_TABLE
  .filter(a => Number(a.compliance) < 80)
  .map(a => String(a.agent));

/* Sparklines for KPIs */
const SPARK_COMPLIANCE = [78, 80, 83, 85, 84, 87];
const SPARK_RESPONSE   = [3.1, 2.9, 2.7, 2.5, 2.4, 2.3];
const SPARK_RESOLVED   = [720, 756, 790, 830, 860, 892];

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
      { value: 'moreno',    label: 'Moreno, E.' },
    ],
  },
  {
    id: 'priority',
    label: 'Prioridad',
    options: [
      { value: 'alta',  label: 'Alta' },
      { value: 'media', label: 'Media' },
      { value: 'baja',  label: 'Baja' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Agente', 'Tickets', 'Dentro SLA', 'Excedidos', 'Resp. prom.', 'Cumplimiento %'],
  rows: AGENT_SLA_TABLE.map((r) => [
    String(r.agent),
    Number(r.tickets),
    Number(r.within_sla),
    Number(r.breached),
    String(r.avg_response),
    Number(r.compliance),
  ]),
  filename: 'sla-adherence',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function SLAAdherenceView() {
  return (
    <ReportShell
      slug="sla-adherence"
      title="Cumplimiento de SLA"
      subtitle="Tiempos de respuesta y adherencia a niveles de servicio"
      refreshedAt="Hace 5 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* KPIs */}
      <KpiRow cards={[
        { label: 'Cumplimiento SLA',     value: '87%',  delta: '+3pp',  positive: true,  sparkline: SPARK_COMPLIANCE, color: C.success },
        { label: 'Resp. promedio',        value: '2,3h', delta: '-15%',  positive: true,  sparkline: SPARK_RESPONSE,   color: C.brand },
        { label: 'Excedidos hoy',        value: '4',    delta: '+1',    positive: false, color: C.error },
        { label: 'Resueltos dentro SLA', value: '892',  delta: '+3.7%', positive: true,  sparkline: SPARK_RESOLVED,   color: C.success },
      ]} />

      {/* SLA trend chart */}
      <div style={{ marginBottom: 20 }}>
        <WidgetCard title="Tendencia de cumplimiento SLA">
          <MultiLineChart
            series={SLA_TREND_SERIES}
            xLabels={SLA_TREND_LABELS}
          />
        </WidgetCard>
      </div>

      {/* Agent SLA table */}
      <div style={{ marginBottom: 20 }}>
        <WidgetCard title="Cumplimiento por agente">
          <DataTable
            columns={AGENT_SLA_COLUMNS}
            data={AGENT_SLA_TABLE}
            defaultSort={{ col: 'compliance', dir: 'desc' }}
            highlightRow={(row) => Number(row.compliance) < 80}
          />
        </WidgetCard>
      </div>

      {/* Alert for agents below threshold */}
      {BELOW_THRESHOLD.length > 0 && (
        <AlertCard
          title="Agentes por debajo del 80% de SLA"
          description={`${BELOW_THRESHOLD.join(', ')} ${BELOW_THRESHOLD.length === 1 ? 'se encuentra' : 'se encuentran'} por debajo del umbral mínimo de cumplimiento. Se recomienda revisión de carga de trabajo y capacitación.`}
          severity="warning"
        />
      )}
    </ReportShell>
  );
}
