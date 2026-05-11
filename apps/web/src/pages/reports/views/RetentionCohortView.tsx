import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  MultiLineChart,
  WidgetCard,
  CohortGrid,
  AlertCard,
} from '../charts.js';

/* ─── Mock data ──────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('es-AR');

/* Cohort grid data — 12 monthly cohorts, M0 through M11 */
const COHORT_COL_HEADERS = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11'];

const COHORT_ROWS = [
  { label: 'Jun 2025', values: [100, 94, 89, 86, 83, 80, 78, 76, 74, 72, 71, 70] },
  { label: 'Jul 2025', values: [100, 93, 88, 84, 81, 79, 77, 75, 73, 71, 70] },
  { label: 'Ago 2025', values: [100, 95, 91, 88, 85, 82, 80, 78, 76, 74] },
  { label: 'Sep 2025', values: [100, 92, 87, 83, 80, 77, 75, 73, 72] },
  { label: 'Oct 2025', values: [100, 94, 90, 87, 84, 82, 80, 78] },
  { label: 'Nov 2025', values: [100, 96, 92, 89, 86, 84, 82] },
  { label: 'Dic 2025', values: [100, 93, 88, 85, 82, 80] },
  { label: 'Ene 2026', values: [100, 95, 91, 88, 85] },
  { label: 'Feb 2026', values: [100, 94, 90, 87] },
  { label: 'Mar 2026', values: [100, 96, 92] },
  { label: 'Abr 2026', values: [100, 95] },
  { label: 'May 2026', values: [100] },
];

/* getValue: color-code by retention percentage */
function getCohortCellStyle(value: number): { bg: string; text: string } {
  if (value >= 90) return { bg: 'rgba(24,166,89,0.28)', text: C.success };
  if (value >= 80) return { bg: 'rgba(24,166,89,0.14)', text: C.success };
  if (value >= 50) return { bg: 'rgba(22,84,217,0.16)', text: C.brand };
  if (value >= 30) return { bg: 'rgba(232,138,20,0.18)', text: C.warning };
  return { bg: 'rgba(232,59,59,0.18)', text: C.error };
}

/* Average retention curve (actual vs benchmark) */
const RETENTION_CURVE_LABELS = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11'];
const RETENTION_CURVE_SERIES = [
  {
    label: 'Retención real',
    data: [100, 94, 90, 86, 83, 81, 79, 76, 74, 72, 71, 70],
    color: C.brand,
  },
  {
    label: 'Benchmark sector',
    data: [100, 90, 84, 78, 73, 68, 64, 60, 57, 54, 52, 50],
    color: C.warning,
  },
];

/* Retention by property type — bar chart */
const RETENTION_BY_TYPE = [
  { label: 'Departamento',  value: 88, suffix: '%', color: C.brand },
  { label: 'Casa',          value: 82, suffix: '%', color: '#2880FF' },
  { label: 'PH',            value: 85, suffix: '%', color: '#5577FF' },
  { label: 'Local',         value: 76, suffix: '%', color: C.warning },
  { label: 'Oficina',       value: 91, suffix: '%', color: C.success },
  { label: 'Terreno',       value: 68, suffix: '%', color: C.error },
];

/* Sparklines for KPIs */
const SPARK_RETENTION = [80, 81, 82, 82, 83, 84];
const SPARK_LIFETIME  = [14, 15, 15, 16, 17, 18];
const SPARK_NPS       = [64, 66, 68, 69, 71, 72];
const SPARK_CHURN_REV = [5800, 5400, 5100, 4800, 4500, 4200];

/* Churn reasons */
const CHURN_REASONS = [
  { reason: 'Precio alto',              pct: 32 },
  { reason: 'Cambio de proveedor',      pct: 24 },
  { reason: 'Cierre de negocio',        pct: 18 },
  { reason: 'Funcionalidades faltantes', pct: 14 },
  { reason: 'Soporte insuficiente',     pct: 8  },
  { reason: 'Otros',                    pct: 4  },
];

/* ─── Filters ────────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'property_type',
    label: 'Tipo propiedad',
    multi: true,
    options: [
      { value: 'apartment', label: 'Departamento' },
      { value: 'house',     label: 'Casa' },
      { value: 'ph',        label: 'PH' },
      { value: 'office',    label: 'Oficina' },
      { value: 'retail',    label: 'Local' },
      { value: 'land',      label: 'Terreno' },
    ],
  },
  {
    id: 'zone',
    label: 'Zona',
    multi: true,
    options: [
      { value: 'caba',      label: 'CABA' },
      { value: 'gba-norte', label: 'GBA Norte' },
      { value: 'gba-sur',   label: 'GBA Sur' },
      { value: 'cordoba',   label: 'Córdoba' },
      { value: 'rosario',   label: 'Rosario' },
      { value: 'mendoza',   label: 'Mendoza' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Cohorte', ...COHORT_COL_HEADERS],
  rows: COHORT_ROWS.map((r) => [
    r.label,
    ...r.values.map((v) => Number(v)),
  ]),
  filename: 'retention-cohort',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function RetentionCohortView() {
  return (
    <ReportShell
      slug="retention-cohort"
      title="Retención de Cohortes"
      subtitle="Análisis de retención por cohorte mensual (Solo owners y admins)"
      refreshedAt="Hace 8 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'Tasa retención',  value: '84%',    delta: '+2,1pp',    positive: true,  sparkline: SPARK_RETENTION, color: C.success },
        { label: 'Vida promedio',   value: '18 meses', delta: '+3 meses', positive: true,  sparkline: SPARK_LIFETIME,  color: C.brand },
        { label: 'NPS',             value: '72',     delta: '+4',        positive: true,  sparkline: SPARK_NPS,       color: '#5577FF' },
        { label: 'Churn revenue',   value: '$4,2K/m', delta: '-12%',     positive: true,  sparkline: SPARK_CHURN_REV, color: C.warning },
      ]} />

      {/* ── Cohort heatmap ────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <WidgetCard title="Grilla de retención por cohorte (% clientes activos)">
          <CohortGrid
            rows={COHORT_ROWS}
            colHeaders={COHORT_COL_HEADERS}
            getValue={getCohortCellStyle}
            formatCell={(v) => `${v}%`}
          />
          {/* Legend */}
          <div style={{
            display: 'flex', gap: 16, marginTop: 14, paddingTop: 10,
            borderTop: `1px solid ${C.border}`, flexWrap: 'wrap',
          }}>
            {[
              { label: '> 90%', bg: 'rgba(24,166,89,0.28)' },
              { label: '80–90%', bg: 'rgba(24,166,89,0.14)' },
              { label: '50–79%', bg: 'rgba(22,84,217,0.16)' },
              { label: '30–49%', bg: 'rgba(232,138,20,0.18)' },
              { label: '< 30%', bg: 'rgba(232,59,59,0.18)' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: item.bg }} />
                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      {/* ── Retention curve + Retention by type ───────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <WidgetCard title="Curva de retención promedio vs benchmark">
          <MultiLineChart
            series={RETENTION_CURVE_SERIES}
            xLabels={RETENTION_CURVE_LABELS}
            height={240}
          />
          <div style={{
            marginTop: 12,
            padding: '10px 14px',
            background: C.brandFaint,
            border: `1px solid ${C.brand}`,
            borderRadius: 8,
          }}>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>
              Retención a M11 de{' '}
              <span style={{ fontFamily: F.mono, fontWeight: 700, color: C.brand }}>70%</span>
              {' '}supera el benchmark del sector ({' '}
              <span style={{ fontFamily: F.mono, fontWeight: 600, color: C.warning }}>50%</span>
              {' '}) por 20pp.
            </span>
          </div>
        </WidgetCard>

        <WidgetCard title="Retención a 12 meses por tipo de propiedad">
          <div style={{ marginBottom: 16 }}>
            {RETENTION_BY_TYPE.map(item => {
              const barColor = item.value >= 80 ? C.success : item.value >= 60 ? C.brand : C.error;
              return (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
                }}>
                  <span style={{
                    width: 100, fontFamily: F.body, fontSize: 13,
                    color: C.textSecondary, textAlign: 'right', flexShrink: 0,
                  }}>
                    {item.label}
                  </span>
                  <div style={{
                    flex: 1, height: 24, background: C.bgElevated,
                    borderRadius: 4, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${item.value}%`,
                      height: '100%',
                      background: barColor,
                      borderRadius: 4,
                      opacity: 0.85,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <span style={{
                    width: 48, fontFamily: F.mono, fontSize: 12,
                    color: C.textPrimary, fontWeight: 600, textAlign: 'right', flexShrink: 0,
                  }}>
                    {item.value}%
                  </span>
                </div>
              );
            })}
          </div>
          {/* Average footer */}
          <div style={{
            paddingTop: 10,
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary }}>
              Promedio ponderado
            </span>
            <span style={{ fontFamily: F.mono, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>
              84%
            </span>
          </div>
        </WidgetCard>
      </div>

      {/* ── Churn reasons + alert ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <WidgetCard title="Motivos de baja (últimos 6 meses)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CHURN_REASONS.map(item => (
              <div key={item.reason} style={{
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{
                  width: 160, fontFamily: F.body, fontSize: 13,
                  color: C.textSecondary, flexShrink: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {item.reason}
                </span>
                <div style={{
                  flex: 1, height: 22, background: C.bgElevated,
                  borderRadius: 4, overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${item.pct}%`,
                    height: '100%',
                    background: item.pct >= 25 ? C.error : item.pct >= 15 ? C.warning : C.brand,
                    borderRadius: 4,
                    opacity: 0.85,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <span style={{
                  width: 40, fontFamily: F.mono, fontSize: 12,
                  color: C.textPrimary, fontWeight: 600, textAlign: 'right', flexShrink: 0,
                }}>
                  {item.pct}%
                </span>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Alertas de retención">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AlertCard
              title="Cohorte Sep 2025 con retención baja"
              description={`Retención a M8 de 72%, 2pp por debajo del promedio. Mayoría de bajas en cuentas tipo "Terreno" y "Local" en zona GBA Sur.`}
              severity="warning"
            />
            <AlertCard
              title="NPS en alza sostenida"
              description="El NPS subió 4 puntos este trimestre alcanzando 72. Las cuentas Premium mantienen el puntaje más alto (NPS 81)."
              severity="info"
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: C.bgBase, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '14px 18px',
              borderLeft: `3px solid ${C.success}`,
            }}>
              <div>
                <p style={{
                  fontFamily: F.body, fontSize: 13, fontWeight: 500,
                  color: C.textPrimary, margin: '0 0 2px',
                }}>
                  Clientes en riesgo
                </p>
                <p style={{
                  fontFamily: F.body, fontSize: 11, color: C.textTertiary, margin: 0,
                }}>
                  Sin actividad en los últimos 30 días
                </p>
              </div>
              <span style={{
                fontFamily: F.display, fontSize: 24, fontWeight: 700,
                color: C.warning, letterSpacing: '-0.02em',
              }}>
                12
              </span>
            </div>
          </div>
        </WidgetCard>
      </div>
    </ReportShell>
  );
}
