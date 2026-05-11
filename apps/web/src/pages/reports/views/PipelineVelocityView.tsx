import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  MultiLineChart,
  WidgetCard,
  HorizontalBarChart,
  AlertCard,
} from '../charts.js';

/* ─── Mock data ──────────────────────────────────────────────── */

const STAGES = ['Consulta', 'Lead', 'Propuesta', 'Negociacion', 'Cierre'] as const;

type Stage = typeof STAGES[number];

const STAGE_LABELS: Record<Stage, string> = {
  Consulta: 'Consulta',
  Lead: 'Lead',
  Propuesta: 'Propuesta',
  Negociacion: 'Negociacion',
  Cierre: 'Cierre',
};

const STAGE_HOURS: Record<Stage, number> = {
  Consulta: 6,
  Lead: 32,
  Propuesta: 72,
  Negociacion: 120,
  Cierre: 24,
};

const STAGE_SLA_HOURS: Record<Stage, number> = {
  Consulta: 12,
  Lead: 48,
  Propuesta: 96,
  Negociacion: 96,
  Cierre: 48,
};

const STAGE_COLORS: Record<Stage, string> = {
  Consulta: C.brand,
  Lead: '#2880FF',
  Propuesta: '#5577FF',
  Negociacion: C.warning,
  Cierre: C.success,
};

const OPEN_LEADS_PER_STAGE: Record<Stage, number> = {
  Consulta: 22,
  Lead: 18,
  Propuesta: 14,
  Negociacion: 10,
  Cierre: 4,
};

// Waterfall bar data: avg hours per stage
const STAGE_TIME_BARS = STAGES.map(stage => ({
  label: STAGE_LABELS[stage],
  value: STAGE_HOURS[stage],
  color: STAGE_COLORS[stage],
  suffix: 'h',
}));

// Velocity trend (rolling 6 months)
const VELOCITY_TREND_LABELS = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];
const VELOCITY_TREND_SERIES = [
  {
    label: 'Velocity Index ($K)',
    data: [218, 234, 252, 260, 271, 284],
    color: C.brand,
  },
];

// Sparklines
const SPARK_VELOCITY  = [180, 195, 210, 218, 234, 252, 260, 271, 278, 280, 282, 284];
const SPARK_WIN_VALUE = [120, 128, 135, 145, 152, 160, 168, 172, 178, 182, 184, 186];
const SPARK_OPEN      = [82, 80, 76, 74, 72, 70, 69, 68, 68, 68, 67, 68];

// Bottleneck detection
const bottleneckStage = STAGES.reduce((worst, stage) => {
  const ratio = STAGE_HOURS[stage] / STAGE_SLA_HOURS[stage];
  const worstRatio = STAGE_HOURS[worst] / STAGE_SLA_HOURS[worst];
  return ratio > worstRatio ? stage : worst;
}, STAGES[0]);

const bottleneckHours = STAGE_HOURS[bottleneckStage];
const bottleneckSLA   = STAGE_SLA_HOURS[bottleneckStage];
const bottleneckDays  = Math.round((bottleneckHours / 24) * 10) / 10;
const slaDays         = Math.round((bottleneckSLA / 24) * 10) / 10;
const isBreached      = bottleneckHours > bottleneckSLA;

/* ─── Filters ────────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'pipeline',
    label: 'Pipeline',
    options: [
      { value: 'premium', label: 'Premium' },
      { value: 'standard', label: 'Estandar' },
      { value: 'corporate', label: 'Corporativo' },
    ],
  },
  {
    id: 'cohort_month',
    label: 'Cohorte',
    options: [
      { value: '2026-05', label: 'Mayo 2026' },
      { value: '2026-04', label: 'Abril 2026' },
      { value: '2026-03', label: 'Marzo 2026' },
      { value: '2026-02', label: 'Febrero 2026' },
      { value: '2026-01', label: 'Enero 2026' },
      { value: '2025-12', label: 'Diciembre 2025' },
    ],
  },
  {
    id: 'agent',
    label: 'Agente',
    multi: true,
    options: [
      { value: 'garcia', label: 'Garcia, J.' },
      { value: 'lopez', label: 'Lopez, M.' },
      { value: 'martinez', label: 'Martinez, C.' },
      { value: 'rodriguez', label: 'Rodriguez, A.' },
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
      { value: 'cordoba', label: 'Cordoba' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Etapa', 'Hrs prom.', 'SLA (hrs)', 'Leads abiertos'],
  rows: STAGES.map((stage) => [
    String(STAGE_LABELS[stage]),
    Number(STAGE_HOURS[stage]),
    Number(STAGE_SLA_HOURS[stage]),
    Number(OPEN_LEADS_PER_STAGE[stage]),
  ]),
  filename: 'pipeline-velocity',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function PipelineVelocityView() {
  const totalOpenLeads = Object.values(OPEN_LEADS_PER_STAGE).reduce((s, n) => s + n, 0);

  return (
    <ReportShell
      slug="pipeline-velocity"
      title="Pipeline Velocity"
      subtitle="Velocidad de conversion y tiempo por etapa"
      refreshedAt="Hace 5 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* KPI Row (4 cards) */}
      <KpiRow
        columns={4}
        cards={[
          {
            label: 'Velocity Index',
            value: '$284K',
            delta: '+4.8%',
            positive: true,
            sparkline: SPARK_VELOCITY,
            color: C.brand,
            tooltip: '(leads x avg_deal_value x win_rate) / avg_days',
          },
          {
            label: 'Win value forecast',
            value: '$186K',
            delta: '+3.2%',
            positive: true,
            sparkline: SPARK_WIN_VALUE,
            color: C.success,
          },
          {
            label: 'Open leads',
            value: String(totalOpenLeads),
            delta: '-2.9%',
            positive: true,
            sparkline: SPARK_OPEN,
            color: C.warning,
          },
          {
            label: 'Avg deal value',
            value: '$45K',
            delta: '+1.1%',
            positive: true,
            color: '#5577FF',
          },
        ]}
      />

      {/* Stage time bar + Velocity trend side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Stage time bar (waterfall-style) */}
        <WidgetCard title="Tiempo promedio por etapa">
          <HorizontalBarChart data={STAGE_TIME_BARS} />
          {/* Total waterfall summary */}
          <div style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary }}>
              Tiempo total promedio
            </span>
            <span style={{ fontFamily: F.mono, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>
              {Object.values(STAGE_HOURS).reduce((s, h) => s + h, 0)}h
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 400, color: C.textTertiary, marginLeft: 6 }}>
                ({Math.round(Object.values(STAGE_HOURS).reduce((s, h) => s + h, 0) / 24)} dias)
              </span>
            </span>
          </div>
        </WidgetCard>

        {/* Velocity trend - rolling 6 months */}
        <WidgetCard title="Tendencia velocity index (6 meses)">
          <MultiLineChart
            series={VELOCITY_TREND_SERIES}
            xLabels={VELOCITY_TREND_LABELS}
          />
        </WidgetCard>
      </div>

      {/* Bottleneck alert + Open leads funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Bottleneck alert */}
        <WidgetCard title="Alerta de cuello de botella">
          <AlertCard
            title={`Etapa "${STAGE_LABELS[bottleneckStage]}" supera el SLA`}
            description={
              `Promedio: ${bottleneckDays} dias (SLA: ${slaDays} dias). ` +
              (isBreached
                ? `Excedido por ${Math.round((bottleneckHours - bottleneckSLA) / 24 * 10) / 10} dias. Requiere atencion inmediata.`
                : 'Dentro del rango aceptable.')
            }
            severity={isBreached ? 'error' : 'warning'}
          />
          {/* SLA comparison per stage */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STAGES.map(stage => {
              const hours = STAGE_HOURS[stage];
              const sla = STAGE_SLA_HOURS[stage];
              const pct = Math.min((hours / sla) * 100, 100);
              const exceeded = hours > sla;
              return (
                <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 90, fontFamily: F.body, fontSize: 12,
                    color: C.textSecondary, textAlign: 'right', flexShrink: 0,
                  }}>
                    {STAGE_LABELS[stage]}
                  </span>
                  <div style={{
                    flex: 1, height: 6, background: C.bgElevated,
                    borderRadius: 3, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: exceeded ? C.error : hours / sla > 0.75 ? C.warning : C.success,
                      borderRadius: 3,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <span style={{
                    width: 70, fontFamily: F.mono, fontSize: 11,
                    color: exceeded ? C.error : C.textTertiary,
                    fontWeight: exceeded ? 600 : 400,
                    textAlign: 'right', flexShrink: 0,
                  }}>
                    {Math.round(hours / 24 * 10) / 10}d / {Math.round(sla / 24 * 10) / 10}d
                  </span>
                </div>
              );
            })}
          </div>
        </WidgetCard>

        {/* Open leads funnel - KPI card row per stage */}
        <WidgetCard title="Leads abiertos por etapa">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STAGES.map(stage => {
              const count = OPEN_LEADS_PER_STAGE[stage];
              const pct = totalOpenLeads > 0 ? Math.round((count / totalOpenLeads) * 100) : 0;
              return (
                <div
                  key={stage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: C.bgBase,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    borderLeft: `3px solid ${STAGE_COLORS[stage]}`,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontFamily: F.body, fontSize: 13, fontWeight: 500,
                      color: C.textPrimary, margin: 0,
                    }}>
                      {STAGE_LABELS[stage]}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontFamily: F.display, fontSize: 22, fontWeight: 700,
                      color: C.textPrimary, letterSpacing: '-0.02em',
                    }}>
                      {count}
                    </span>
                    <span style={{
                      fontFamily: F.mono, fontSize: 11, color: C.textTertiary,
                      marginLeft: 6,
                    }}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total footer */}
          <div style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary }}>
              Total abiertos
            </span>
            <span style={{
              fontFamily: F.display, fontSize: 18, fontWeight: 700,
              color: C.textPrimary,
            }}>
              {totalOpenLeads}
            </span>
          </div>
        </WidgetCard>
      </div>

      {/* Velocity formula explanation */}
      <div style={{
        background: C.brandFaint,
        border: `1px solid ${C.brand}`,
        borderRadius: 10,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{
          fontFamily: F.mono, fontSize: 11, color: C.brand,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          fontWeight: 600, flexShrink: 0,
        }}>
          Formula
        </span>
        <span style={{ fontFamily: F.mono, fontSize: 13, color: C.textPrimary }}>
          Velocity Index = (leads x avg_deal_value x win_rate) / avg_days
        </span>
        <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>
          = (68 x $45K x 0.34) / 3.7 = $284K
        </span>
      </div>
    </ReportShell>
  );
}
