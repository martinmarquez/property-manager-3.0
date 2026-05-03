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

const VOLUME_LABELS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

const VOLUME_SERIES = [
  { label: 'Email',    data: [280, 295, 310, 328, 340, 362], color: C.brand },
  { label: 'WhatsApp', data: [190, 210, 228, 245, 260, 284], color: C.success },
  { label: 'Portal',   data: [120, 135, 148, 162, 178, 201], color: C.warning },
];

const MESSAGES_BY_CHANNEL = [
  { label: 'Email',    value: 362, color: C.brand },
  { label: 'WhatsApp', value: 284, color: C.success },
  { label: 'Portal',   value: 201, color: C.warning },
  { label: 'Teléfono', value: 0,   color: C.textTertiary, suffix: ' (pronto)' },
];

const AGENT_COMMS: Record<string, unknown>[] = [
  { agent: 'García, J.',    sent: 186, received: 214, avg_reply: '1.1h', response_rate: 96.2 },
  { agent: 'López, M.',     sent: 164, received: 192, avg_reply: '1.3h', response_rate: 94.8 },
  { agent: 'Martínez, C.',  sent: 152, received: 178, avg_reply: '1.0h', response_rate: 97.1 },
  { agent: 'Rodríguez, A.', sent: 138, received: 160, avg_reply: '1.6h', response_rate: 91.5 },
  { agent: 'Fernández, P.', sent: 122, received: 148, avg_reply: '1.8h', response_rate: 89.3 },
  { agent: 'Díaz, L.',      sent: 104, received: 130, avg_reply: '2.2h', response_rate: 85.4 },
  { agent: 'Sánchez, R.',   sent: 86,  received: 108, avg_reply: '2.6h', response_rate: 82.1 },
  { agent: 'Moreno, E.',    sent: 68,  received: 94,  avg_reply: '3.1h', response_rate: 78.6 },
];

const AGENT_COMMS_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  { id: 'agent', label: 'Agente', width: '1.4fr', render: (r) => (
    <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{String(r.agent)}</span>
  )},
  { id: 'sent', label: 'Enviados', width: '0.8fr', mono: true, render: (r) => (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>{Number(r.sent).toLocaleString('es-AR')}</span>
  )},
  { id: 'received', label: 'Recibidos', width: '0.8fr', mono: true, render: (r) => (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>{Number(r.received).toLocaleString('es-AR')}</span>
  )},
  { id: 'avg_reply', label: 'Resp. prom.', width: '0.8fr', mono: true, render: (r) => {
    const raw = String(r.avg_reply);
    const hours = parseFloat(raw);
    const color = hours <= 1.5 ? C.success : hours <= 2.5 ? C.warning : C.error;
    return (
      <span style={{ fontFamily: F.mono, fontSize: 12, color }}>{raw}</span>
    );
  }},
  { id: 'response_rate', label: 'Tasa resp. %', width: '1fr', mono: true, render: (r) => {
    const pct = Number(r.response_rate);
    const color = pct >= 90 ? C.success : pct >= 80 ? C.warning : C.error;
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

/* Sparklines for KPIs */
const SPARK_MESSAGES = [590, 640, 686, 735, 778, 847];
const SPARK_REPLY    = [2.0, 1.8, 1.7, 1.6, 1.5, 1.4];

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
    id: 'channel',
    label: 'Canal',
    multi: true,
    options: [
      { value: 'email',    label: 'Email' },
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'portal',   label: 'Portal' },
      { value: 'telefono', label: 'Teléfono' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Agente', 'Enviados', 'Recibidos', 'Resp. prom.', 'Tasa resp. %'],
  rows: AGENT_COMMS.map((r) => [
    String(r.agent),
    Number(r.sent),
    Number(r.received),
    String(r.avg_reply),
    Number(r.response_rate),
  ]),
  filename: 'inbox-activity',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function InboxActivityView() {
  return (
    <ReportShell
      slug="inbox-activity"
      title="Actividad de Inbox"
      subtitle="Volumen y tiempos de respuesta por canal"
      refreshedAt="Hace 3 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* KPIs */}
      <KpiRow cards={[
        { label: 'Mensajes del mes',  value: '847',  delta: '+8,7%', positive: true,  sparkline: SPARK_MESSAGES, color: C.brand },
        { label: 'Resp. promedio',     value: '1,4h', delta: '-12%',  positive: true,  sparkline: SPARK_REPLY,    color: C.success },
        { label: 'No leídos',         value: '23',   color: C.warning },
        { label: 'Canales activos',   value: '4',    color: C.brand },
      ]} />

      {/* Volume trend */}
      <div style={{ marginBottom: 20 }}>
        <WidgetCard title="Volumen de mensajes por canal">
          <MultiLineChart
            series={VOLUME_SERIES}
            xLabels={VOLUME_LABELS}
          />
        </WidgetCard>
      </div>

      {/* Two-column: Bar + Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16, marginBottom: 20 }}>
        {/* Messages by channel */}
        <WidgetCard title="Mensajes por canal">
          <HorizontalBarChart data={MESSAGES_BY_CHANNEL} color={C.brand} />
        </WidgetCard>

        {/* Agent communication stats */}
        <WidgetCard title="Comunicación por agente">
          <DataTable
            columns={AGENT_COMMS_COLUMNS}
            data={AGENT_COMMS}
            defaultSort={{ col: 'sent', dir: 'desc' }}
          />
        </WidgetCard>
      </div>
    </ReportShell>
  );
}
