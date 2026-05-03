import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  DataTable,
  WidgetCard,
  AlertCard,
  HistogramChart,
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Mock data ──────────────────────────────────────────────── */

const DOCS_TABLE: Record<string, unknown>[] = [
  { entity: 'Av. Libertador 4200 — Fernández, L.',    doc_type: 'Contrato',   expiry_date: '2026-05-06', days_remaining: 3,   status: 'Por vencer' },
  { entity: 'Juncal 1580 — Pérez, M.',                doc_type: 'Seguro',     expiry_date: '2026-05-04', days_remaining: 1,   status: 'Por vencer' },
  { entity: 'Cabildo 3420 — Gómez, A.',               doc_type: 'Escribanía', expiry_date: '2026-05-01', days_remaining: -2,  status: 'Vencido' },
  { entity: 'Thames 2240 — Morales, C.',               doc_type: 'DNI',        expiry_date: '2026-05-10', days_remaining: 7,   status: 'Por vencer' },
  { entity: 'Av. Córdoba 5880 — Ruiz, S.',            doc_type: 'Garantía',   expiry_date: '2026-04-28', days_remaining: -5,  status: 'Vencido' },
  { entity: 'Av. Callao 1130 — Díaz, T.',             doc_type: 'Contrato',   expiry_date: '2026-05-12', days_remaining: 9,   status: 'Por vencer' },
  { entity: 'Arenales 2060 — Castro, V.',              doc_type: 'Seguro',     expiry_date: '2026-04-30', days_remaining: -3,  status: 'Vencido' },
  { entity: 'Guatemala 4700 — Sosa, N.',               doc_type: 'Contrato',   expiry_date: '2026-05-18', days_remaining: 15,  status: 'Por vencer' },
  { entity: 'Av. Santa Fe 3150 — Acosta, F.',         doc_type: 'Escribanía', expiry_date: '2026-05-25', days_remaining: 22,  status: 'Vigente' },
  { entity: 'Uriarte 1740 — Herrera, D.',              doc_type: 'Garantía',   expiry_date: '2026-06-15', days_remaining: 43,  status: 'Vigente' },
  { entity: 'Scalabrini Ortiz 3100 — Ríos, V.',       doc_type: 'DNI',        expiry_date: '2026-08-20', days_remaining: 109, status: 'Vigente' },
  { entity: 'Bonpland 2180 — Aguirre, F.',             doc_type: 'Seguro',     expiry_date: '2026-07-10', days_remaining: 68,  status: 'Vigente' },
  { entity: 'Gorriti 4450 — Torres, A.',               doc_type: 'Contrato',   expiry_date: '2026-05-08', days_remaining: 5,   status: 'Por vencer' },
  { entity: 'Humboldt 1560 — Giménez, M.',             doc_type: 'Garantía',   expiry_date: '2026-05-14', days_remaining: 11,  status: 'Por vencer' },
  { entity: 'Costa Rica 5900 — Molina, E.',             doc_type: 'DNI',        expiry_date: '2026-09-01', days_remaining: 121, status: 'Vigente' },
];

const DOC_STATUS_COLORS: Record<string, string> = {
  Vigente:    C.success,
  'Por vencer': C.warning,
  Vencido:    C.error,
};

const DOCS_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  {
    id: 'entity',
    label: 'Propiedad / Cliente',
    width: '2.2fr',
    render: (r) => (
      <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
        {String(r.entity)}
      </span>
    ),
  },
  {
    id: 'doc_type',
    label: 'Tipo doc.',
    width: '0.9fr',
    render: (r) => (
      <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>{String(r.doc_type)}</span>
    ),
  },
  {
    id: 'expiry_date',
    label: 'Vencimiento',
    width: '0.9fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
        {new Date(String(r.expiry_date)).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
      </span>
    ),
  },
  {
    id: 'days_remaining',
    label: 'Días rest.',
    width: '0.7fr',
    align: 'right',
    mono: true,
    render: (r) => {
      const days = Number(r.days_remaining);
      const color = days < 0 ? C.error : days <= 7 ? C.warning : C.textSecondary;
      return (
        <span style={{ fontFamily: F.mono, fontSize: 12, color, fontWeight: 600 }}>
          {days < 0 ? `${days}` : days}
        </span>
      );
    },
  },
  {
    id: 'status',
    label: 'Estado',
    width: '0.8fr',
    render: (r) => {
      const st = String(r.status);
      const color = DOC_STATUS_COLORS[st] ?? C.textSecondary;
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

const EXPIRY_BINS = [
  { label: '0–7d',   count: 4,  color: C.error },
  { label: '8–15d',  count: 3,  color: C.warning },
  { label: '16–30d', count: 2,  color: C.brand },
  { label: '31–60d', count: 2,  color: '#2880FF' },
  { label: '60+d',   count: 4,  color: C.success },
];

const SPARK_EXPIRING  = [3, 4, 5, 6, 5, 7];
const SPARK_EXPIRED   = [1, 2, 1, 2, 2, 3];
const SPARK_UP_TO_DATE = [148, 146, 145, 144, 143, 142];
const SPARK_RENEWAL   = [96, 95, 95, 94, 94, 94];

/* ─── Filters ──────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'doc_type',
    label: 'Tipo documento',
    multi: true,
    options: [
      { value: 'contrato', label: 'Contrato' },
      { value: 'dni', label: 'DNI' },
      { value: 'escribania', label: 'Escribanía' },
      { value: 'garantia', label: 'Garantía' },
      { value: 'seguro', label: 'Seguro' },
    ],
  },
  {
    id: 'status',
    label: 'Estado',
    options: [
      { value: 'vigente', label: 'Vigente' },
      { value: 'por-vencer', label: 'Por vencer' },
      { value: 'vencido', label: 'Vencido' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Propiedad / Cliente', 'Tipo doc.', 'Vencimiento', 'Días rest.', 'Estado'],
  rows: DOCS_TABLE.map((r) => [
    String(r.entity),
    String(r.doc_type),
    String(r.expiry_date),
    Number(r.days_remaining),
    String(r.status),
  ]),
  filename: 'document-expiry',
};

/* ─── Component ──────────────────────────────────────────────── */

export default function DocumentExpiryView() {
  return (
    <ReportShell
      slug="document-expiry"
      title="Vencimiento de Documentos"
      subtitle="Estado y alertas de documentación por propiedad"
      refreshedAt="Hace 3 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'Por vencer',       value: '7',    delta: '+2',    positive: false, sparkline: SPARK_EXPIRING,   color: C.warning },
        { label: 'Vencidos',         value: '3',    delta: '+1',    positive: false, sparkline: SPARK_EXPIRED,    color: C.error },
        { label: 'Al día',           value: '142',  delta: '-2',    positive: false, sparkline: SPARK_UP_TO_DATE, color: C.success },
        { label: 'Tasa de renovación', value: '94%', delta: '-1,2%', positive: false, sparkline: SPARK_RENEWAL,  color: C.brand },
      ]} />

      {/* ── Alert card ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <AlertCard
          title="3 documentos vencidos requieren acción inmediata"
          description="Escribanía de Cabildo 3420, Garantía de Av. Córdoba 5880 y Seguro de Arenales 2060 tienen vencimiento superado. Contactar a los clientes para iniciar la renovación."
          severity="error"
        />
      </div>

      {/* ── Two-column: histogram + alert ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Expiry histogram */}
        <WidgetCard title="Documentos por días al vencimiento">
          <HistogramChart bins={EXPIRY_BINS} />
        </WidgetCard>

        {/* Upcoming expirations alert */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AlertCard
            title="7 documentos por vencer en los próximos 15 días"
            description="4 contratos y 3 otros documentos requieren atención antes de su vencimiento. Priorizar renovaciones para evitar interrupciones operativas."
            severity="warning"
          />
          <WidgetCard title="Distribución por tipo">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { type: 'Contrato', total: 52, expiring: 3 },
                { type: 'Seguro', total: 34, expiring: 2 },
                { type: 'Garantía', total: 28, expiring: 1 },
                { type: 'DNI', total: 22, expiring: 1 },
                { type: 'Escribanía', total: 16, expiring: 0 },
              ].map(d => (
                <div key={d.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>{d.type}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>{d.total}</span>
                    {d.expiring > 0 && (
                      <span style={{
                        fontFamily: F.mono, fontSize: 10, color: C.warning,
                        background: `${C.warning}1A`, padding: '2px 6px', borderRadius: 3,
                      }}>
                        {d.expiring} por vencer
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </WidgetCard>
        </div>
      </div>

      {/* ── Documents table ────────────────────────────────────── */}
      <WidgetCard title="Documentos — estado detallado">
        <DataTable
          columns={DOCS_COLUMNS}
          data={DOCS_TABLE}
          defaultSort={{ col: 'days_remaining', dir: 'asc' }}
          highlightRow={(row) => Number(row.days_remaining) < 0}
        />
      </WidgetCard>
    </ReportShell>
  );
}
