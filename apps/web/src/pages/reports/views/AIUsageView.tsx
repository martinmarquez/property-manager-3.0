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
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Mock data ─────────────────────────────────────────────── */

const AI_FEATURES: Record<string, unknown>[] = [
  { feature: 'Auto-descripciones',      uses_mo: 1240, avg_time_saved_min: 18, satisfaction: 4.8, adoption_pct: 92 },
  { feature: 'Valuación IA',            uses_mo: 864,  avg_time_saved_min: 25, satisfaction: 4.7, adoption_pct: 85 },
  { feature: 'Respuesta automática',    uses_mo: 412,  avg_time_saved_min: 8,  satisfaction: 4.5, adoption_pct: 78 },
  { feature: 'Análisis de mercado',     uses_mo: 198,  avg_time_saved_min: 32, satisfaction: 4.4, adoption_pct: 64 },
  { feature: 'Generación de contratos', uses_mo: 133,  avg_time_saved_min: 45, satisfaction: 4.3, adoption_pct: 52 },
];

/* ─── Table columns ─────────────────────────────────────────── */

const FEATURE_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  {
    id: 'feature',
    label: 'Funcionalidad',
    width: '1.6fr',
    render: (r) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: 2,
          background: C.ai,
        }} />
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
          {String(r.feature)}
        </span>
      </div>
    ),
  },
  {
    id: 'uses_mo',
    label: 'Usos/mes',
    width: '0.9fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
        {Number(r.uses_mo).toLocaleString('es-AR')}
      </span>
    ),
  },
  {
    id: 'avg_time_saved_min',
    label: 'Ahorro prom.',
    width: '0.9fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.success, fontWeight: 500 }}>
        {Number(r.avg_time_saved_min)} min
      </span>
    ),
  },
  {
    id: 'satisfaction',
    label: 'Satisfacción',
    width: '0.9fr',
    mono: true,
    render: (r) => {
      const sat = Number(r.satisfaction);
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
            {sat.toFixed(1)}
          </span>
          <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>/5</span>
        </div>
      );
    },
  },
  {
    id: 'adoption_pct',
    label: 'Adopción',
    width: '1fr',
    mono: true,
    render: (r) => {
      const pct = Number(r.adoption_pct);
      const barColor = pct >= 80 ? C.ai : pct >= 60 ? C.aiLight : C.textTertiary;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            flex: 1, height: 6, background: C.bgElevated, borderRadius: 3, overflow: 'hidden',
          }}>
            <div style={{
              width: `${pct}%`, height: '100%', background: barColor,
              borderRadius: 3, transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textSecondary, width: 36, textAlign: 'right' }}>
            {pct}%
          </span>
        </div>
      );
    },
  },
];

/* ─── Feature adoption bar chart ───────────────────────────── */

const ADOPTION_BARS = AI_FEATURES.map((f) => ({
  label: String(f.feature),
  value: Number(f.adoption_pct),
  suffix: '%',
  color: C.ai,
}));

/* ─── Usage trend over 6 months (multi-line) ───────────────── */

const TREND_LABELS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];

const TREND_SERIES = [
  { label: 'Auto-descripciones',      data: [680,  780,  890,  980,  1120, 1240], color: C.ai },
  { label: 'Valuación IA',            data: [420,  510,  580,  670,  760,  864],  color: C.aiLight },
  { label: 'Respuesta automática',    data: [140,  190,  240,  290,  350,  412],  color: C.success },
  { label: 'Análisis de mercado',     data: [60,   85,   110,  135,  168,  198],  color: C.brand },
  { label: 'Generación de contratos', data: [28,   45,   62,   82,   108,  133],  color: C.warning },
];

/* ─── Sparklines for KPIs ──────────────────────────────────── */

const SPARK_TIME_SAVED   = [82, 96, 108, 118, 130, 142];
const SPARK_SESSIONS     = [1480, 1720, 1960, 2240, 2540, 2847];
const SPARK_SATISFACTION = [4.2, 4.3, 4.4, 4.5, 4.5, 4.6];
const SPARK_ADOPTION     = [48, 55, 62, 68, 74, 78];

/* ─── Filters ──────────────────────────────────────────────── */

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
    ],
  },
  {
    id: 'feature_category',
    label: 'Categoría',
    multi: true,
    options: [
      { value: 'content',   label: 'Generación de contenido' },
      { value: 'valuation', label: 'Valuación' },
      { value: 'comms',     label: 'Comunicación' },
      { value: 'analytics', label: 'Análisis' },
      { value: 'legal',     label: 'Legal' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Funcionalidad', 'Usos/mes', 'Ahorro prom.', 'Satisfacción', 'Adopción'],
  rows: AI_FEATURES.map((r) => [
    String(r.feature),
    Number(r.uses_mo),
    Number(r.avg_time_saved_min),
    Number(r.satisfaction),
    Number(r.adoption_pct),
  ]),
  filename: 'ai-usage',
};

/* ─── Component ────────────────────────────────────────────── */

export default function AIUsageView() {
  return (
    <ReportShell
      slug="ai-usage"
      title="Uso de IA"
      subtitle="Adopción, impacto y satisfacción de funcionalidades de IA"
      refreshedAt="Hace 5 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'Tiempo ahorrado',     value: '142h/mes',  delta: '+28%',   positive: true,  sparkline: SPARK_TIME_SAVED,   color: C.ai },
        { label: 'Sesiones IA',         value: '2.847',     delta: '+12,1%', positive: true,  sparkline: SPARK_SESSIONS,     color: C.aiLight },
        { label: 'Satisfacción',        value: '4,6/5',     delta: '+0,1',   positive: true,  sparkline: SPARK_SATISFACTION, color: C.success },
        { label: 'Adopción features',   value: '78%',       delta: '+4pp',   positive: true,  sparkline: SPARK_ADOPTION,     color: C.brand },
      ]} />

      {/* ── Feature adoption bar chart ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <WidgetCard title="Adopción por funcionalidad">
          <HorizontalBarChart data={ADOPTION_BARS} color={C.ai} />
        </WidgetCard>

        {/* Usage trend */}
        <WidgetCard title="Tendencia de uso (últimos 6 meses)">
          <MultiLineChart
            series={TREND_SERIES}
            xLabels={TREND_LABELS}
            height={240}
          />
        </WidgetCard>
      </div>

      {/* ── Feature detail table ──────────────────────────────── */}
      <WidgetCard title="Detalle por funcionalidad">
        <DataTable
          columns={FEATURE_COLUMNS}
          data={AI_FEATURES}
          defaultSort={{ col: 'uses_mo', dir: 'desc' }}
        />
      </WidgetCard>
    </ReportShell>
  );
}
