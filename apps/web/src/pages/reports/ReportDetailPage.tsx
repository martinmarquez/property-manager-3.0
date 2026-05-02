import React, { useState } from 'react';
import { C, F } from '../../components/copilot/tokens.js';

/* ─── Types ─────────────────────────────────────────────────────── */

type ChartType = 'line' | 'bar' | 'funnel' | 'heatmap' | 'table';
type DateRange = '7d' | '30d' | '90d' | 'ytd' | 'custom';

/* ─── Mock data ──────────────────────────────────────────────────── */

const FUNNEL_STAGES = [
  { label: 'Leads recibidos',    value: 340, pct: 100, color: C.brand },
  { label: 'Primer contacto',    value: 218, pct: 64,  color: '#1E6AE1' },
  { label: 'Visita agendada',    value: 127, pct: 37,  color: '#2B7EF0' },
  { label: 'Oferta presentada',  value: 62,  pct: 18,  color: '#4291FF' },
  { label: 'Cierre',             value: 23,  pct: 7,   color: '#18A659' },
];

const LINE_DATA = {
  labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'],
  datasets: [
    { label: 'Leads', values: [42, 58, 53, 67, 72, 65, 78, 84], color: C.brand },
    { label: 'Cierres', values: [8, 11, 9, 14, 15, 12, 17, 19], color: C.success },
  ],
};

const BAR_DATA = {
  labels: ['García', 'López', 'Martínez', 'Rodríguez', 'Fernández'],
  values: [28, 24, 21, 18, 15],
  colors: [C.brand, '#1E6AE1', '#2B7EF0', '#4291FF', C.textTertiary],
};

const HEATMAP_HOURS = ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];
const HEATMAP_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const generateHeatmap = () => HEATMAP_DAYS.map(d =>
  HEATMAP_HOURS.map(h => {
    const hr = parseInt(h);
    const evening = hr >= 18 && hr <= 21;
    const midday = hr >= 12 && hr <= 14;
    const weekend = d === 'Sáb';
    const base = weekend ? 0.3 : 1;
    const peak = evening ? 0.9 : midday ? 0.6 : 0.2;
    return Math.random() * 0.3 + peak * base;
  })
);
const HEATMAP_DATA = generateHeatmap();

const TABLE_DATA = [
  { agente: 'García, Juan',    leads: 68, cierres: 14, tasa: '20.6%', tiempo: '38 días', comision: 'USD 4,200' },
  { agente: 'López, María',    leads: 54, cierres: 11, tasa: '20.4%', tiempo: '42 días', comision: 'USD 3,300' },
  { agente: 'Martínez, Carlos',leads: 48, cierres: 8,  tasa: '16.7%', tiempo: '51 días', comision: 'USD 2,400' },
  { agente: 'Rodríguez, Ana',  leads: 41, cierres: 7,  tasa: '17.1%', tiempo: '44 días', comision: 'USD 2,100' },
  { agente: 'Fernández, Luis', leads: 35, cierres: 5,  tasa: '14.3%', tiempo: '58 días', comision: 'USD 1,500' },
];

/* ─── Chart components ───────────────────────────────────────────── */

function LineChart() {
  const w = 560, h = 200, padL = 36, padB = 24, padT = 12;
  const chartW = w - padL - 20;
  const chartH = h - padB - padT;
  const allVals = LINE_DATA.datasets.flatMap(d => d.values);
  const maxVal = Math.max(...allVals);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      {/* Y-axis grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = padT + chartH - pct * chartH;
        return (
          <g key={pct}>
            <line x1={padL} x2={w - 20} y1={y} y2={y} stroke={C.border} strokeWidth={0.5} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontFamily={F.mono} fontSize={9} fill={C.textTertiary}>
              {Math.round(maxVal * pct)}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {LINE_DATA.labels.map((label, i) => {
        const x = padL + (i / (LINE_DATA.labels.length - 1)) * chartW;
        return (
          <text key={i} x={x} y={h - 6} textAnchor="middle" fontFamily={F.mono} fontSize={9} fill={C.textTertiary}>
            {label}
          </text>
        );
      })}

      {/* Lines */}
      {LINE_DATA.datasets.map(ds => {
        const points = ds.values.map((v, i) => {
          const x = padL + (i / (ds.values.length - 1)) * chartW;
          const y = padT + chartH - (v / maxVal) * chartH;
          return `${x},${y}`;
        }).join(' ');
        return (
          <g key={ds.label}>
            <polyline points={points} fill="none" stroke={ds.color} strokeWidth={2.5} strokeLinejoin="round" />
            {ds.values.map((v, i) => {
              const x = padL + (i / (ds.values.length - 1)) * chartW;
              const y = padT + chartH - (v / maxVal) * chartH;
              return <circle key={i} cx={x} cy={y} r={3.5} fill={ds.color} />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

function BarChart() {
  const w = 500, h = 200, padL = 80, padB = 24, padT = 12;
  const chartW = w - padL - 20;
  const chartH = h - padB - padT;
  const max = Math.max(...BAR_DATA.values);
  const barW = Math.min(40, (chartW / BAR_DATA.values.length) - 10);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      {/* Y-axis labels (agent names) */}
      {BAR_DATA.labels.map((label, i) => {
        const y = padT + (i / BAR_DATA.values.length) * chartH + (chartH / BAR_DATA.values.length / 2);
        return (
          <text key={i} x={padL - 8} y={y + 4} textAnchor="end" fontFamily={F.body} fontSize={11} fill={C.textSecondary}>
            {label}
          </text>
        );
      })}

      {/* Horizontal bars */}
      {BAR_DATA.values.map((v, i) => {
        const barH = (chartH / BAR_DATA.values.length) - 6;
        const y = padT + (i / BAR_DATA.values.length) * chartH + 3;
        const bw = (v / max) * chartW;
        return (
          <g key={i}>
            <rect x={padL} y={y} width={bw} height={barH} rx={3} fill={BAR_DATA.colors[i]} opacity={0.85} />
            <text x={padL + bw + 6} y={y + barH / 2 + 4} fontFamily={F.mono} fontSize={11} fill={C.textPrimary} fontWeight={600}>
              {v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FunnelChart() {
  const w = 440, h = 260;
  const maxW = w - 80;
  const rowH = h / FUNNEL_STAGES.length;

  return (
    <div style={{ width: '100%', maxWidth: w, margin: '0 auto' }}>
      {FUNNEL_STAGES.map((stage, i) => {
        const barW = (stage.pct / 100) * maxW;
        const isLast = i === FUNNEL_STAGES.length - 1;
        return (
          <div key={i} style={{ position: 'relative', marginBottom: isLast ? 0 : 2 }}>
            {/* Bar */}
            <div style={{
              height: rowH - 4, display: 'flex', alignItems: 'center', position: 'relative',
              justifyContent: 'center',
            }}>
              <div style={{
                position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                width: barW, height: rowH - 8, borderRadius: 4,
                background: stage.color, opacity: 0.9,
                transition: 'width 0.5s ease',
              }} />
              {/* Label inside bar */}
              <span style={{
                position: 'relative', zIndex: 1,
                fontFamily: F.body, fontSize: 12, fontWeight: 600, color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}>
                {stage.label}: {stage.value} ({stage.pct}%)
              </span>
            </div>

            {/* Drop-off indicator between stages */}
            {!isLast && (
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                height: 6, marginBottom: 2,
              }}>
                <span style={{ fontFamily: F.mono, fontSize: 9, color: '#E83B3B' }}>
                  ↓ {100 - FUNNEL_STAGES[i + 1].pct}% dropout
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HeatmapChart() {
  const cellW = 38, cellH = 26;
  const labelW = 32;
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 'fit-content' }}>
        {/* Hour labels */}
        <div style={{ display: 'flex', gap: 2, marginLeft: labelW + 2 }}>
          {HEATMAP_HOURS.map(h => (
            <div key={h} style={{
              width: cellW, fontFamily: F.mono, fontSize: 9,
              color: C.textTertiary, textAlign: 'center',
            }}>
              {h}h
            </div>
          ))}
        </div>

        {/* Rows */}
        {HEATMAP_DATA.map((row, di) => (
          <div key={di} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div style={{
              width: labelW, fontFamily: F.body, fontSize: 11,
              color: C.textSecondary, textAlign: 'right', paddingRight: 6, flexShrink: 0,
            }}>
              {HEATMAP_DAYS[di]}
            </div>
            {row.map((v, hi) => {
              const intensity = Math.min(v, 1);
              const r = Math.round(22 + intensity * (22 - 22));
              const g = Math.round(84 + intensity * (130 - 84));
              const b = Math.round(217 + intensity * (217 - 100));
              const bg = `rgba(22, 84, 217, ${intensity * 0.85})`;
              return (
                <div
                  key={hi}
                  title={`${HEATMAP_DAYS[di]} ${HEATMAP_HOURS[hi]}h: ${Math.round(intensity * 28)} consultas`}
                  style={{
                    width: cellW, height: cellH, borderRadius: 3,
                    background: bg, transition: 'background 0.2s',
                    cursor: 'default', flexShrink: 0,
                  }}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: labelW + 2 }}>
          <span style={{ fontFamily: F.body, fontSize: 10, color: C.textTertiary }}>Menos</span>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
            <div key={v} style={{
              width: 16, height: 12, borderRadius: 2,
              background: `rgba(22, 84, 217, ${v * 0.85})`,
            }} />
          ))}
          <span style={{ fontFamily: F.body, fontSize: 10, color: C.textTertiary }}>Más</span>
        </div>
      </div>
    </div>
  );
}

function TableView() {
  const COLS = ['Agente', 'Leads', 'Cierres', 'Tasa', 'Tiempo prom.', 'Comisión'];
  return (
    <div style={{
      background: C.bgBase, borderRadius: 10, border: `1px solid ${C.border}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.5fr 80px 80px 80px 110px 100px',
        padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
        background: C.bgElevated,
      }}>
        {COLS.map(c => (
          <span key={c} style={{
            fontFamily: F.mono, fontSize: 10, color: C.textTertiary,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {c}
          </span>
        ))}
      </div>

      {TABLE_DATA.map((row, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '1.5fr 80px 80px 80px 110px 100px',
          padding: '12px 16px', alignItems: 'center',
          borderBottom: i < TABLE_DATA.length - 1 ? `1px solid ${C.border}` : 'none',
          background: i === 0 ? `${C.brandFaint}` : 'transparent',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i === 0 && <span style={{ fontSize: 12 }}>🏆</span>}
            <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: i === 0 ? 600 : 400 }}>
              {row.agente}
            </span>
          </div>
          <span style={{ fontFamily: F.mono, fontSize: 13, color: C.textSecondary }}>{row.leads}</span>
          <span style={{ fontFamily: F.mono, fontSize: 13, color: C.textSecondary }}>{row.cierres}</span>
          <span style={{
            fontFamily: F.mono, fontSize: 12, fontWeight: 600,
            color: parseFloat(row.tasa) >= 18 ? C.success : C.textSecondary,
          }}>
            {row.tasa}
          </span>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{row.tiempo}</span>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>{row.comision}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Email digest config ─────────────────────────────────────────── */

function EmailDigestPanel({ onClose }: { onClose: () => void }) {
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recipients, setRecipients] = useState('martin@agencia.com');
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div style={{
      width: 340, borderLeft: `1px solid ${C.border}`, background: C.bgRaised,
      padding: '20px 20px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            Email Digest
          </p>
          <p style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, margin: '2px 0 0' }}>
            Recibir reporte por email
          </p>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`,
          background: C.bgElevated, color: C.textSecondary, cursor: 'pointer', fontSize: 16,
        }}>
          ×
        </button>
      </div>

      {/* Toggle */}
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary }}>Activar digest</span>
        <div
          onClick={() => setEnabled(!enabled)}
          style={{
            width: 40, height: 22, borderRadius: 11, padding: 2, transition: 'background 0.2s',
            background: enabled ? C.brand : C.bgBase, border: `1px solid ${enabled ? C.brand : C.border}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: enabled ? 'flex-end' : 'flex-start',
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'all 0.2s' }} />
        </div>
      </label>

      {/* Frequency */}
      <div style={{ opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
        <label style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
          Frecuencia
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['daily', 'weekly', 'monthly'] as const).map(f => (
            <button key={f} onClick={() => setFrequency(f)} style={{
              flex: 1, padding: '6px 0', borderRadius: 6,
              border: `1px solid ${frequency === f ? C.brand : C.border}`,
              background: frequency === f ? C.brandFaint : C.bgBase,
              color: frequency === f ? C.brandLight : C.textSecondary,
              fontFamily: F.body, fontSize: 11, cursor: 'pointer',
            }}>
              {f === 'daily' ? 'Diario' : f === 'weekly' ? 'Semanal' : 'Mensual'}
            </button>
          ))}
        </div>
      </div>

      {/* Day/time (if weekly) */}
      {enabled && frequency === 'weekly' && (
        <div>
          <label style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
            Día de envío
          </label>
          <select style={{
            width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${C.border}`,
            background: C.bgBase, color: C.textPrimary, fontFamily: F.body, fontSize: 13, outline: 'none',
          }}>
            <option>Lunes</option>
            <option>Martes</option>
            <option>Miércoles</option>
            <option>Jueves</option>
            <option>Viernes</option>
          </select>
        </div>
      )}

      {/* Recipients */}
      <div style={{ opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
        <label style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
          Destinatarios
        </label>
        <textarea
          value={recipients}
          onChange={e => setRecipients(e.target.value)}
          placeholder="email1@agencia.com, email2@agencia.com"
          rows={2}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${C.border}`,
            background: C.bgBase, color: C.textPrimary, fontFamily: F.mono, fontSize: 11,
            resize: 'none', boxSizing: 'border-box', outline: 'none',
          }}
        />
        <p style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, margin: '4px 0 0' }}>
          Separar con comas para múltiples destinatarios
        </p>
      </div>

      <button onClick={save} style={{
        padding: '9px', borderRadius: 8, border: 'none',
        background: saved ? C.success : C.brand,
        color: '#fff', fontFamily: F.body, fontWeight: 600, fontSize: 13, cursor: 'pointer',
        transition: 'background 0.2s',
      }}>
        {saved ? '✓ Guardado' : 'Guardar configuración'}
      </button>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

export default function ReportDetailPage() {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [showDigest, setShowDigest] = useState(false);

  const CHART_TYPES: { id: ChartType; label: string; icon: string }[] = [
    { id: 'line',    label: 'Línea',   icon: '📈' },
    { id: 'bar',     label: 'Barras',  icon: '📊' },
    { id: 'funnel',  label: 'Embudo',  icon: '⬇️' },
    { id: 'heatmap', label: 'Heatmap', icon: '🔥' },
    { id: 'table',   label: 'Tabla',   icon: '📋' },
  ];

  const DATE_RANGES: { id: DateRange; label: string }[] = [
    { id: '7d', label: 'Últ. 7 días' },
    { id: '30d', label: 'Últ. 30 días' },
    { id: '90d', label: 'Últ. 90 días' },
    { id: 'ytd', label: 'Año actual' },
    { id: 'custom', label: 'Personalizado…' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: F.body }}>
      {/* Page header */}
      <div style={{
        padding: '20px 32px 0', borderBottom: `1px solid ${C.border}`,
        background: C.bgRaised,
      }}>
        {/* Breadcrumb */}
        <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, margin: '0 0 10px' }}>
          <span style={{ color: C.textSecondary }}>Reportes</span>
          <span style={{ margin: '0 6px' }}>›</span>
          <span>Conversión de Pipeline</span>
        </p>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: '0 0 4px' }}>
              Conversión de Pipeline
            </h1>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: 0 }}>
              Tasa de conversión por etapa, agente y cohorte · Última actualización hace 12 min
            </p>
          </div>

          {/* Export + digest */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button style={{
              padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.bgElevated, color: C.textSecondary,
              fontFamily: F.body, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ⬇ CSV
            </button>
            <button style={{
              padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.bgElevated, color: C.textSecondary,
              fontFamily: F.body, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ⬇ Excel
            </button>
            <button
              onClick={() => setShowDigest(!showDigest)}
              style={{
                padding: '7px 14px', borderRadius: 8,
                border: `1px solid ${showDigest ? C.brand : C.border}`,
                background: showDigest ? C.brandFaint : C.bgElevated,
                color: showDigest ? C.brandLight : C.textSecondary,
                fontFamily: F.body, fontSize: 12, cursor: 'pointer',
              }}
            >
              ✉ Digest
            </button>
          </div>
        </div>

        {/* KPI summary strip */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          {[
            { label: 'Leads totales',   value: '340', delta: '+28', dir: 'up' },
            { label: 'Tasa global',     value: '18.4%', delta: '+2.1pp', dir: 'up' },
            { label: 'Tiempo de cierre',value: '47 días', delta: '-8d', dir: 'up' },
            { label: 'Cierres',         value: '23', delta: '+5', dir: 'up' },
          ].map(m => (
            <div key={m.label} style={{ minWidth: 110 }}>
              <p style={{ fontFamily: F.mono, fontSize: 9, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                {m.label}
              </p>
              <p style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textPrimary, margin: 0, lineHeight: 1 }}>
                {m.value}
              </p>
              <p style={{ fontFamily: F.body, fontSize: 11, color: C.success, margin: '3px 0 0' }}>
                ↑ {m.delta}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Chart area + optional digest panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Main chart panel */}
        <div style={{ flex: 1, padding: '20px 32px', overflowY: 'auto' }}>
          {/* Toolbar: date range + chart type */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap',
          }}>
            {/* Date range */}
            <div style={{ display: 'flex', background: C.bgBase, borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              {DATE_RANGES.map(dr => (
                <button key={dr.id} onClick={() => setDateRange(dr.id)} style={{
                  padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 12,
                  fontFamily: F.body, fontWeight: 500,
                  background: dateRange === dr.id ? C.brand : 'transparent',
                  color: dateRange === dr.id ? '#fff' : C.textSecondary,
                  transition: 'all 0.12s', whiteSpace: 'nowrap',
                }}>
                  {dr.label}
                </button>
              ))}
            </div>

            {/* Chart type */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {CHART_TYPES.map(ct => (
                <button key={ct.id} onClick={() => setChartType(ct.id)} style={{
                  padding: '6px 10px', borderRadius: 6,
                  border: `1px solid ${chartType === ct.id ? C.brand : C.border}`,
                  background: chartType === ct.id ? C.brandFaint : C.bgElevated,
                  color: chartType === ct.id ? C.brandLight : C.textSecondary,
                  fontFamily: F.body, fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'all 0.12s',
                }}>
                  <span style={{ fontSize: 14 }}>{ct.icon}</span>
                  <span>{ct.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div style={{
            background: C.bgRaised, borderRadius: 12, border: `1px solid ${C.border}`,
            padding: '24px', marginBottom: 24,
            minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {chartType === 'line' && <div style={{ width: '100%' }}><LineChart /></div>}
            {chartType === 'bar' && <div style={{ width: '100%' }}><BarChart /></div>}
            {chartType === 'funnel' && <div style={{ width: '100%', maxWidth: 500 }}><FunnelChart /></div>}
            {chartType === 'heatmap' && <HeatmapChart />}
            {chartType === 'table' && <div style={{ width: '100%' }}><TableView /></div>}
          </div>

          {/* Legend (for line/bar) */}
          {(chartType === 'line') && (
            <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
              {LINE_DATA.datasets.map(ds => (
                <div key={ds.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 3, borderRadius: 2, background: ds.color }} />
                  <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>{ds.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Data table */}
          {chartType !== 'table' && (
            <div>
              <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
                Datos detallados
              </p>
              <TableView />
            </div>
          )}
        </div>

        {/* Email digest sidebar */}
        {showDigest && <EmailDigestPanel onClose={() => setShowDigest(false)} />}
      </div>
    </div>
  );
}
