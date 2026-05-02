import React, { useState } from 'react';
import { C, F } from '../../components/copilot/tokens.js';

/* ─── Data ──────────────────────────────────────────────────── */

const OPERATIONAL_REPORTS = [
  { id: 'r01', title: 'Leads por fuente',          icon: '📊', chartType: 'bar',    desc: 'Origen de nuevas consultas',             kpi: '247',    delta: '+12%',  pos: true },
  { id: 'r02', title: 'Pipeline de ventas',        icon: '🔀', chartType: 'funnel', desc: 'Embudo por etapa de negociación',        kpi: '18',     delta: '+3',    pos: true },
  { id: 'r03', title: 'Propiedades activas',       icon: '🏠', chartType: 'table',  desc: 'Stock disponible por tipo y zona',       kpi: '143',    delta: '-5',    pos: false },
  { id: 'r04', title: 'Tiempo de respuesta',       icon: '⏱',  chartType: 'line',   desc: 'Horas hasta primer contacto',            kpi: '2.4 h',  delta: '-18%',  pos: true },
  { id: 'r05', title: 'Actividad del equipo',      icon: '👥', chartType: 'table',  desc: 'Tareas y llamadas por asesor',           kpi: '―',      delta: '―',     pos: true },
  { id: 'r06', title: 'Consultas sin responder',   icon: '📬', chartType: 'table',  desc: 'Leads sin contacto > 24h',              kpi: '11',     delta: '+2',    pos: false },
  { id: 'r07', title: 'Visitas agendadas',         icon: '📅', chartType: 'bar',    desc: 'Showings por semana',                   kpi: '34',     delta: '+7',    pos: true },
  { id: 'r08', title: 'Vencimientos de contrato',  icon: '📋', chartType: 'table',  desc: 'Alquileres próximos a renovar',          kpi: '9',      delta: '―',     pos: true },
  { id: 'r09', title: 'Tasa de conversión',        icon: '🎯', chartType: 'funnel', desc: 'Lead → propuesta → cierre',             kpi: '6.2%',   delta: '+0.8pp',pos: true },
  { id: 'r10', title: 'Prospectos calificados',    icon: '⭐', chartType: 'bar',    desc: 'Leads con score > 70 este mes',         kpi: '58',     delta: '+14',   pos: true },
  { id: 'r11', title: 'Reservas del mes',          icon: '🤝', chartType: 'line',   desc: 'Operaciones en reserva activas',        kpi: '7',      delta: '+2',    pos: true },
  { id: 'r12', title: 'Propiedades sin visitas',   icon: '🔍', chartType: 'table',  desc: 'Stock sin showings en los últimos 30d', kpi: '23',     delta: '―',     pos: false },
];

const STRATEGIC_REPORTS = [
  { id: 's01', title: 'Revenue mensual',           icon: '💰', chartType: 'line',    desc: 'Facturación y comisiones mensuales',   kpi: '$4.2M',  delta: '+23%',  pos: true },
  { id: 's02', title: 'Participación de mercado',  icon: '🥧', chartType: 'bar',     desc: 'Share por zona vs competencia',        kpi: '―',      delta: '―',     pos: true },
  { id: 's03', title: 'Precio promedio por m²',    icon: '📐', chartType: 'heatmap', desc: 'Valores actuales por barrio',          kpi: 'USD 2.8k',delta: '+4%',  pos: true },
  { id: 's04', title: 'Estacionalidad',            icon: '🗓', chartType: 'line',    desc: 'Patrones de demanda histórica',        kpi: '―',      delta: '―',     pos: true },
  { id: 's05', title: 'Proyección de cierre',      icon: '🔮', chartType: 'bar',     desc: 'Forecast de ventas 90 días',           kpi: '12 ops', delta: '―',     pos: true },
  { id: 's06', title: 'Retención de propietarios', icon: '🏗', chartType: 'line',    desc: 'Churn y renovación de mandatos',       kpi: '88%',    delta: '+2pp',  pos: true },
  { id: 's07', title: 'Eficiencia de publicación', icon: '📡', chartType: 'bar',     desc: 'Tiempo hasta primera consulta',        kpi: '4.1 d',  delta: '-0.7d', pos: true },
  { id: 's08', title: 'Satisfacción del cliente',  icon: '😊', chartType: 'line',    desc: 'NPS e índice de recomendación',        kpi: '72',     delta: '+5',    pos: true },
  { id: 's09', title: 'Absorción de stock',        icon: '📉', chartType: 'line',    desc: 'Meses de inventario disponible',       kpi: '3.2 m',  delta: '-0.4m', pos: true },
  { id: 's10', title: 'P&L por asesor',            icon: '📈', chartType: 'table',   desc: 'Rentabilidad neta por vendedor',       kpi: '―',      delta: '―',     pos: true },
];

const CHART_TYPE_LABELS: Record<string, string> = {
  line: 'Línea', bar: 'Barras', funnel: 'Embudo', heatmap: 'Mapa calor', table: 'Tabla',
};

/* ─── Components ─────────────────────────────────────────────── */

function ReportCard({ report, onOpen }: {
  report: (typeof OPERATIONAL_REPORTS)[number];
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.bgElevated : C.bgRaised,
        border: `1px solid ${hovered ? C.borderHover : C.border}`,
        borderRadius: 12, padding: '18px 20px', cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{report.icon}</span>
          <div>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              {report.title}
            </p>
            <p style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, margin: '2px 0 0' }}>
              {report.desc}
            </p>
          </div>
        </div>
        <span style={{
          fontFamily: F.mono, fontSize: 9, padding: '2px 6px', borderRadius: 4,
          background: C.bgBase, color: C.textTertiary, border: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          {CHART_TYPE_LABELS[report.chartType]}
        </span>
      </div>

      {/* KPI */}
      {report.kpi !== '―' && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.textPrimary }}>
            {report.kpi}
          </span>
          {report.delta !== '―' && (
            <span style={{
              fontFamily: F.mono, fontSize: 11,
              color: report.pos ? C.success : C.error,
            }}>
              {report.delta}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ScheduleDigestModal({ onClose }: { onClose: () => void }) {
  const [freq, setFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [emails, setEmails] = useState('martin@inmobiliaria.com');

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(7,13,26,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: C.bgRaised, borderRadius: 16, border: `1px solid ${C.border}`,
        width: 480, padding: '28px 32px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: F.display, fontSize: 18, color: C.textPrimary, margin: 0 }}>
            📧 Digest por email
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: C.textTertiary, cursor: 'pointer', fontSize: 18,
          }}>✕</button>
        </div>

        <label style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, display: 'block', marginBottom: 6 }}>
          Frecuencia
        </label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['daily', 'weekly', 'monthly'] as const).map(f => (
            <button key={f} onClick={() => setFreq(f)} style={{
              flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${freq === f ? C.brand : C.border}`,
              background: freq === f ? C.brandFaint : C.bgElevated,
              color: freq === f ? C.brand : C.textSecondary,
              fontFamily: F.body, fontSize: 13, cursor: 'pointer',
            }}>
              {f === 'daily' ? 'Diario' : f === 'weekly' ? 'Semanal' : 'Mensual'}
            </button>
          ))}
        </div>

        <label style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, display: 'block', marginBottom: 6 }}>
          Destinatarios (separados por coma)
        </label>
        <textarea
          value={emails}
          onChange={e => setEmails(e.target.value)}
          rows={2}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8,
            border: `1px solid ${C.border}`, background: C.bgBase,
            color: C.textPrimary, fontFamily: F.mono, fontSize: 12,
            outline: 'none', resize: 'vertical', boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}>Cancelar</button>
          <button style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', background: C.brand,
            color: '#fff', fontFamily: F.body, fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────── */

export default function ReportsDashboard({ onOpenReport }: {
  onOpenReport?: (reportId: string) => void;
}) {
  const [showDigest, setShowDigest] = useState(false);
  const [dateRange, setDateRange] = useState('Este mes');

  const DATE_OPTIONS = ['Hoy', 'Esta semana', 'Este mes', 'Este trimestre', 'Este año', 'Personalizado'];

  return (
    <div style={{ padding: '28px 32px', fontFamily: F.body }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            Reportes
          </h1>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '4px 0 0' }}>
            {OPERATIONAL_REPORTS.length} operacionales · {STRATEGIC_REPORTS.length} estratégicos
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Date range picker */}
          <div style={{ position: 'relative' }}>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              style={{
                padding: '8px 32px 8px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
                background: C.bgElevated, color: C.textPrimary, fontFamily: F.body, fontSize: 13,
                cursor: 'pointer', outline: 'none', appearance: 'none',
              }}
            >
              {DATE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.textTertiary, fontSize: 12 }}>▾</span>
          </div>
          <button style={{
            padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.bgElevated, color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}>
            ⬇ CSV
          </button>
          <button style={{
            padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.bgElevated, color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}>
            ⬇ Excel
          </button>
          <button onClick={() => setShowDigest(true)} style={{
            padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.bgElevated, color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}>
            📧 Digest
          </button>
        </div>
      </div>

      {/* Operational section */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Operacionales
          </span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary }}>12</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {OPERATIONAL_REPORTS.map(r => (
            <ReportCard key={r.id} report={r} onOpen={() => onOpenReport?.(r.id)} />
          ))}
        </div>
      </div>

      {/* Strategic section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Estratégicos
          </span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary }}>10</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {STRATEGIC_REPORTS.map(r => (
            <ReportCard key={r.id} report={r} onOpen={() => onOpenReport?.(r.id)} />
          ))}
        </div>
      </div>

      {showDigest && <ScheduleDigestModal onClose={() => setShowDigest(false)} />}
    </div>
  );
}
