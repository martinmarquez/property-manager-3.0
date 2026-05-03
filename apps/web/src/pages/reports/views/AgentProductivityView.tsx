import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  MultiLineChart,
  DataTable,
  WidgetCard,
  HorizontalBarChart,
  HeatmapGrid,
  RankBadge,
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Constants ─────────────────────────────────────────────── */

const LOGGED_IN_AGENT = 'Martínez, C.';

/* ─── Mock data ─────────────────────────────────────────────── */

const AGENTS: Record<string, unknown>[] = [
  { rank: 1, change:  1, agent_name: 'García, J.',    leads_handled: 68, leads_won: 9,  win_rate_pct: 13.2, listings_created: 11, avg_first_reply_min: 12, visits_completed: 24 },
  { rank: 2, change: -1, agent_name: 'López, M.',     leads_handled: 62, leads_won: 8,  win_rate_pct: 12.9, listings_created: 9,  avg_first_reply_min: 18, visits_completed: 22 },
  { rank: 3, change:  0, agent_name: 'Martínez, C.',  leads_handled: 58, leads_won: 7,  win_rate_pct: 12.1, listings_created: 8,  avg_first_reply_min: 9,  visits_completed: 20 },
  { rank: 4, change:  2, agent_name: 'Rodríguez, A.', leads_handled: 55, leads_won: 6,  win_rate_pct: 10.9, listings_created: 7,  avg_first_reply_min: 22, visits_completed: 18 },
  { rank: 5, change: -1, agent_name: 'Fernández, P.', leads_handled: 52, leads_won: 5,  win_rate_pct: 9.6,  listings_created: 6,  avg_first_reply_min: 14, visits_completed: 16 },
  { rank: 6, change:  0, agent_name: 'Díaz, L.',      leads_handled: 48, leads_won: 4,  win_rate_pct: 8.3,  listings_created: 5,  avg_first_reply_min: 27, visits_completed: 14 },
  { rank: 7, change:  1, agent_name: 'Sánchez, R.',   leads_handled: 42, leads_won: 2,  win_rate_pct: 4.8,  listings_created: 4,  avg_first_reply_min: 35, visits_completed: 11 },
  { rank: 8, change: -2, agent_name: 'Moreno, E.',    leads_handled: 38, leads_won: 1,  win_rate_pct: 2.6,  listings_created: 3,  avg_first_reply_min: 42, visits_completed: 8  },
];

const LEADERBOARD_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  {
    id: 'rank',
    label: '#',
    width: '70px',
    render: (r) => <RankBadge rank={Number(r.rank)} change={Number(r.change)} />,
  },
  {
    id: 'agent_name',
    label: 'Agente',
    width: '1.4fr',
    render: (r) => (
      <span style={{
        fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500,
      }}>
        {String(r.agent_name)}
      </span>
    ),
  },
  { id: 'leads_handled',       label: 'Leads',       width: '0.8fr', mono: true },
  {
    id: 'leads_won',
    label: 'Ganados',
    width: '0.8fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.success, fontWeight: 600 }}>
        {String(r.leads_won)}
      </span>
    ),
  },
  {
    id: 'win_rate_pct',
    label: 'Win %',
    width: '0.8fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
        {Number(r.win_rate_pct).toFixed(1)}%
      </span>
    ),
  },
  { id: 'listings_created',    label: 'Avisos',      width: '0.8fr', mono: true },
  {
    id: 'avg_first_reply_min',
    label: '1ra resp.',
    width: '0.8fr',
    mono: true,
    render: (r) => {
      const mins = Number(r.avg_first_reply_min);
      const color = mins <= 15 ? C.success : mins <= 30 ? C.warning : '#E83B3B';
      return (
        <span style={{ fontFamily: F.mono, fontSize: 12, color, fontWeight: 500 }}>
          {mins}m
        </span>
      );
    },
  },
  { id: 'visits_completed',    label: 'Visitas',     width: '0.8fr', mono: true },
];

/* Win-rate bar chart data (sorted descending) */
const WIN_RATE_BARS = [...AGENTS]
  .sort((a, b) => Number(b.win_rate_pct) - Number(a.win_rate_pct))
  .map(a => ({
    label: String(a.agent_name),
    value: Number(a.win_rate_pct),
    suffix: '%',
    color: C.brand,
  }));

/* Response-time heatmap: rows = agents, cols = Mon–Fri */
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

const HEATMAP_DATA: number[][] = [
  [10, 14, 8,  12, 16], // García
  [18, 22, 15, 20, 19], // López
  [7,  9,  11, 8,  10], // Martínez
  [25, 18, 30, 22, 20], // Rodríguez
  [12, 16, 14, 18, 13], // Fernández
  [28, 32, 26, 30, 34], // Díaz
  [35, 38, 40, 32, 36], // Sánchez
  [44, 40, 48, 42, 38], // Moreno
];

const HEATMAP_ROW_LABELS = AGENTS.map(a => String(a.agent_name));

function responseTimeColor(minutes: number): string {
  if (minutes < 15) return 'rgba(24,166,89,0.45)';
  if (minutes <= 30) return 'rgba(232,138,20,0.40)';
  return 'rgba(232,59,59,0.40)';
}

/* Closes trend (top 3 agents) over 6 months */
const TREND_LABELS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

const TREND_SERIES = [
  { label: 'García, J.',   data: [5, 6, 7, 7, 8, 9],  color: C.brand },
  { label: 'López, M.',    data: [4, 5, 5, 6, 7, 8],  color: C.brandLight },
  { label: 'Martínez, C.', data: [3, 4, 4, 5, 6, 7],  color: C.success },
];

/* Sparklines for KPIs */
const SPARK_CLOSES   = [28, 30, 33, 36, 38, 42];
const SPARK_LEADS    = [310, 340, 355, 380, 400, 423];
const SPARK_WIN_RATE = [8.5, 8.9, 9.2, 9.4, 9.7, 9.9];

/* ─── Filters ───────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'period',
    label: 'Período',
    options: [
      { value: '2026-05', label: 'Mayo 2026' },
      { value: '2026-04', label: 'Abril 2026' },
      { value: '2026-q1', label: 'Q1 2026' },
      { value: '2026-q2', label: 'Q2 2026' },
    ],
  },
  {
    id: 'branch',
    label: 'Sucursal',
    options: [
      { value: 'caba', label: 'CABA' },
      { value: 'gba-norte', label: 'GBA Norte' },
      { value: 'gba-sur', label: 'GBA Sur' },
      { value: 'cordoba', label: 'Córdoba' },
    ],
  },
  {
    id: 'agent',
    label: 'Agente',
    multi: true,
    options: [
      { value: 'garcia', label: 'García, J.' },
      { value: 'lopez', label: 'López, M.' },
      { value: 'martinez', label: 'Martínez, C.' },
      { value: 'rodriguez', label: 'Rodríguez, A.' },
      { value: 'fernandez', label: 'Fernández, P.' },
      { value: 'diaz', label: 'Díaz, L.' },
      { value: 'sanchez', label: 'Sánchez, R.' },
      { value: 'moreno', label: 'Moreno, E.' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['#', 'Agente', 'Leads', 'Ganados', 'Win %', 'Avisos', '1ra resp.', 'Visitas'],
  rows: AGENTS.map((r) => [
    Number(r.rank),
    String(r.agent_name),
    Number(r.leads_handled),
    Number(r.leads_won),
    Number(r.win_rate_pct),
    Number(r.listings_created),
    Number(r.avg_first_reply_min),
    Number(r.visits_completed),
  ]),
  filename: 'agent-productivity',
};

/* ─── Component ─────────────────────────────────────────────── */

export default function AgentProductivityView() {
  return (
    <ReportShell
      slug="agent-productivity"
      title="Productividad de Agentes"
      subtitle="Leaderboard de rendimiento, tiempos de respuesta y cierre por agente"
      refreshedAt="Hace 8 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'Total cierres',        value: '42',   delta: '+16.7%',  positive: true,  sparkline: SPARK_CLOSES,   color: C.success },
        { label: 'Leads manejados',      value: '423',  delta: '+8.7%',   positive: true,  sparkline: SPARK_LEADS,    color: C.brand },
        { label: 'Win rate equipo',      value: '9.9%', delta: '+0.5pp',  positive: true,  sparkline: SPARK_WIN_RATE, color: C.brandLight },
        { label: 'Tiempo resp. prom.',   value: '2.4h', delta: '-18min',  positive: true,  color: C.success },
      ]} />

      {/* ── Leaderboard table ─────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <WidgetCard title="Leaderboard de agentes">
          <DataTable
            columns={LEADERBOARD_COLUMNS}
            data={AGENTS}
            defaultSort={{ col: 'rank', dir: 'asc' }}
            highlightRow={(row) => String(row.agent_name) === LOGGED_IN_AGENT}
          />
        </WidgetCard>
      </div>

      {/* ── Two-column charts ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Win rate bar chart */}
        <WidgetCard title="Win rate por agente">
          <HorizontalBarChart data={WIN_RATE_BARS} color={C.brand} />
        </WidgetCard>

        {/* Response time heatmap */}
        <WidgetCard title="Tiempo 1ra respuesta (min) por día">
          <HeatmapGrid
            rowLabels={HEATMAP_ROW_LABELS}
            colLabels={DAYS}
            data={HEATMAP_DATA}
            colorFn={responseTimeColor}
            formatFn={(v) => `${v}m`}
          />
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
            {[
              { label: '< 15 min', color: 'rgba(24,166,89,0.45)' },
              { label: '15–30 min', color: 'rgba(232,138,20,0.40)' },
              { label: '> 30 min', color: 'rgba(232,59,59,0.40)' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} />
                <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>{l.label}</span>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      {/* ── Closes trend line chart ───────────────────────────── */}
      <WidgetCard title="Tendencia de cierres — Top 3 agentes">
        <MultiLineChart
          series={TREND_SERIES}
          xLabels={TREND_LABELS}
        />
      </WidgetCard>
    </ReportShell>
  );
}
