import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  FunnelChart,
  DonutChart,
  MultiLineChart,
  DataTable,
  WidgetCard,
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Mock data ──────────────────────────────────────────────── */

const FUNNEL_STAGES = [
  { label: 'Consultas',   count: 1248, color: C.brand },
  { label: 'Leads',       count: 423,  color: '#1B6AEF' },
  { label: 'Propuestas',  count: 156,  color: '#2880FF' },
  { label: 'Negociación', count: 68,   color: C.warning },
  { label: 'Cierres',     count: 42,   color: C.success },
];

const WIN_LOSS_SEGMENTS = [
  { label: 'Ganados', value: 42,  color: C.success },
  { label: 'Perdidos', value: 114, color: '#E83B3B' },
];

const STAGE_TABLE: Record<string, unknown>[] = [
  { stage: 'Consultas',   entered: 1248, exited: 825, exit_rate: 66.1, avg_hours: 4.2 },
  { stage: 'Leads',       entered: 423,  exited: 267, exit_rate: 63.1, avg_hours: 28.5 },
  { stage: 'Propuestas',  entered: 156,  exited: 88,  exit_rate: 56.4, avg_hours: 72.3 },
  { stage: 'Negociación', entered: 68,   exited: 26,  exit_rate: 38.2, avg_hours: 96.1 },
  { stage: 'Cierres',     entered: 42,   exited: 0,   exit_rate: 0,    avg_hours: 48.0 },
];

const STAGE_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  { id: 'stage',     label: 'Etapa',           width: '1.4fr', render: (r) => (
    <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{String(r.stage)}</span>
  )},
  { id: 'entered',   label: 'Ingresados',      width: '1fr', mono: true, render: (r) => (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>{Number(r.entered).toLocaleString('es-AR')}</span>
  )},
  { id: 'exited',    label: 'Salidos',         width: '1fr', mono: true },
  { id: 'exit_rate', label: 'Tasa salida %',   width: '1fr', mono: true, render: (r) => {
    const rate = Number(r.exit_rate);
    return (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: rate > 50 ? C.warning : C.textSecondary }}>
        {rate > 0 ? `${rate}%` : '—'}
      </span>
    );
  }},
  { id: 'avg_hours', label: 'Hrs prom.',       width: '1fr', mono: true, render: (r) => (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{String(r.avg_hours)}h</span>
  )},
];

const MONTHLY_TREND_LABELS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

const MONTHLY_TREND_SERIES = [
  { label: 'Consultas',  data: [820, 876, 940, 1082, 1110, 1248], color: C.brand },
  { label: 'Leads',      data: [278, 297, 318, 367,  389,  423],  color: '#1B6AEF' },
  { label: 'Propuestas', data: [111, 118, 127, 148,  161,  156],  color: '#2880FF' },
  { label: 'Cierres',    data: [23,  25,  28,  34,   36,   42],   color: C.success },
];

const SPARK_CONSULTAS  = [820, 876, 940, 1082, 1110, 1248, 1180, 1310, 1248, 1350, 1290, 1248];
const SPARK_LEADS      = [278, 297, 318, 367, 389, 423, 400, 440, 423, 460, 445, 423];
const SPARK_CIERRES    = [23, 25, 28, 34, 36, 42, 38, 44, 42, 46, 43, 42];

const FILTERS: FilterConfig[] = [
  {
    id: 'pipeline',
    label: 'Pipeline',
    options: [
      { value: 'premium', label: 'Premium' },
      { value: 'standard', label: 'Estándar' },
      { value: 'corporate', label: 'Corporativo' },
    ],
  },
  {
    id: 'branch',
    label: 'Sucursal',
    multi: true,
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
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Etapa', 'Ingresados', 'Salidos', 'Tasa salida %', 'Hrs prom.'],
  rows: STAGE_TABLE.map((r) => [
    String(r.stage),
    Number(r.entered),
    Number(r.exited),
    Number(r.exit_rate),
    Number(r.avg_hours),
  ]),
  filename: 'funnel-conversion',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function FunnelConversionView() {
  const totalHours = STAGE_TABLE.reduce((s, r) => s + (Number(r.avg_hours) || 0), 0);
  const bestStage = STAGE_TABLE
    .filter(r => Number(r.exit_rate) > 0)
    .sort((a, b) => Number(a.exit_rate) - Number(b.exit_rate))[0];

  return (
    <ReportShell
      slug="funnel-conversion"
      title="Conversión de Pipeline"
      subtitle="Tasa de conversión por etapa y cohorte mensual"
      refreshedAt="Hace 12 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* KPIs */}
      <KpiRow cards={[
        { label: 'Consultas totales', value: '1,248', delta: '+12.4%', positive: true, sparkline: SPARK_CONSULTAS, color: C.brand },
        { label: 'Leads calificados', value: '423', delta: '+8.7%', positive: true, sparkline: SPARK_LEADS, color: '#1B6AEF' },
        { label: 'Tasa de conversión', value: '3.4%', delta: '+0.3pp', positive: true, color: C.success },
        { label: 'Cierres del mes', value: '42', delta: '+16.7%', positive: true, sparkline: SPARK_CIERRES, color: C.success },
      ]} />

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Funnel diagram */}
        <WidgetCard title="Embudo de conversión">
          <FunnelChart stages={FUNNEL_STAGES} />
        </WidgetCard>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Win/Loss donut */}
          <WidgetCard title="Ganados vs Perdidos">
            <DonutChart
              segments={WIN_LOSS_SEGMENTS}
              size={160}
              thickness={24}
              centerValue="27%"
              centerLabel="win rate"
            />
          </WidgetCard>

          {/* KPI cards */}
          <WidgetCard title="Tiempo hasta cierre">
            <div style={{
              fontFamily: F.display, fontSize: 32, fontWeight: 700,
              color: C.textPrimary, letterSpacing: '-0.02em',
            }}>
              {Math.round(totalHours / 24)} días
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, margin: '4px 0 0' }}>
              Promedio suma de etapas para leads ganados
            </p>
          </WidgetCard>

          <WidgetCard title="Mejor etapa">
            <div style={{
              fontFamily: F.display, fontSize: 20, fontWeight: 700,
              color: C.warning,
            }}>
              {String(bestStage?.stage ?? '—')}
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, margin: '4px 0 0' }}>
              Menor tasa de salida ({bestStage ? `${bestStage.exit_rate}%` : '—'})
            </p>
          </WidgetCard>
        </div>
      </div>

      {/* Stage conversion table */}
      <div style={{ marginBottom: 20 }}>
        <WidgetCard title="Tabla de conversión por etapa">
          <DataTable
            columns={STAGE_COLUMNS}
            data={STAGE_TABLE}
            defaultSort={{ col: 'entered', dir: 'desc' }}
          />
        </WidgetCard>
      </div>

      {/* Monthly trend */}
      <WidgetCard title="Tendencia mensual">
        <MultiLineChart
          series={MONTHLY_TREND_SERIES}
          xLabels={MONTHLY_TREND_LABELS}
        />
      </WidgetCard>
    </ReportShell>
  );
}
