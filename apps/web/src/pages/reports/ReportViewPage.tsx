import React, { useState } from 'react';
import { C, F } from '../../components/copilot/tokens.js';

/* ─── Mock chart renderers ──────────────────────────────────── */

function LineChartMock({ title }: { title: string }) {
  const points = [40, 55, 48, 70, 63, 82, 75, 90, 85, 110, 98, 125];
  const max    = Math.max(...points);
  const w = 560, h = 180, pad = 16;
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2));
  const ys = points.map(p => h - pad - ((p / max) * (h - pad * 2)));
  const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
  const fillD = `M ${xs[0]} ${h - pad} ${xs.map((x, i) => `L ${x} ${ys[i]}`).join(' ')} L ${xs[xs.length - 1]} ${h - pad} Z`;

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const y = pad + frac * (h - pad * 2);
        return (
          <line key={frac} x1={pad} y1={y} x2={w - pad} y2={y}
            stroke={C.border} strokeWidth={1} strokeDasharray="4,4" />
        );
      })}
      {/* Fill */}
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={C.brand} stopOpacity="0.25" />
          <stop offset="100%" stopColor={C.brand} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#lineFill)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke={C.brand} strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]!} r={4}
          fill={C.bgBase} stroke={C.brand} strokeWidth={2} />
      ))}
    </svg>
  );
}

function BarChartMock() {
  const bars = [
    { label: 'ZonaProp',    value: 78, color: C.brand },
    { label: 'Argenprop',   value: 54, color: '#5577FF' },
    { label: 'MercadoLibre',value: 43, color: C.warning },
    { label: 'Portal Inmob',value: 31, color: C.ai },
    { label: 'Directo',     value: 41, color: C.success },
  ];
  const max = Math.max(...bars.map(b => b.value));
  const w = 480, h = 180, barW = 52, gap = 24;

  return (
    <svg width={w} height={h}>
      {bars.map((bar, i) => {
        const barH  = (bar.value / max) * (h - 40);
        const x     = i * (barW + gap) + 20;
        const y     = h - 30 - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH}
              rx={4} fill={bar.color} opacity={0.85} />
            <text x={x + barW / 2} y={h - 14} textAnchor="middle"
              fontFamily={F.mono} fontSize={9} fill={C.textTertiary}>
              {bar.label}
            </text>
            <text x={x + barW / 2} y={y - 5} textAnchor="middle"
              fontFamily={F.mono} fontSize={11} fontWeight="bold" fill={C.textPrimary}>
              {bar.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FunnelChartMock() {
  const stages = [
    { label: 'Leads',       value: 247, color: C.brand },
    { label: 'Calificados', value: 141, color: '#5577FF' },
    { label: 'Propuesta',   value: 68,  color: C.ai },
    { label: 'Negociación', value: 24,  color: C.warning },
    { label: 'Cierre',      value: 15,  color: C.success },
  ];
  const maxVal = stages[0]!.value;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 480 }}>
      {stages.map((stage, idx) => {
        const pct = (stage.value / maxVal) * 100;
        const convRate = idx > 0 ? Math.round((stage.value / stages[idx - 1]!.value) * 100) : 100;
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 80, textAlign: 'right' }}>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary }}>{stage.label}</span>
            </div>
            <div style={{ flex: 1, height: 36, position: 'relative' }}>
              <div style={{
                position: 'absolute', left: `${(100 - pct) / 2}%`,
                width: `${pct}%`, height: '100%',
                background: `${stage.color}30`, border: `1px solid ${stage.color}`,
                borderRadius: 4, transition: 'all 0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: stage.color }}>
                  {stage.value}
                </span>
              </div>
            </div>
            <div style={{ width: 50, textAlign: 'right' }}>
              {idx > 0 && (
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary }}>
                  {convRate}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HeatmapMock() {
  const neighborhoods = ['Palermo', 'Recoleta', 'Belgrano', 'Caballito', 'Flores', 'San Telmo'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May'];
  const values = neighborhoods.map(() => months.map(() => 1200 + Math.floor(Math.random() * 1800)));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontFamily: F.mono }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 12px 4px 0', fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textAlign: 'left' }}>Barrio / Mes</th>
            {months.map(m => (
              <th key={m} style={{ padding: '4px 8px', fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textAlign: 'center' }}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {neighborhoods.map((n, ni) => (
            <tr key={ni}>
              <td style={{ padding: '4px 12px 4px 0', fontFamily: F.mono, fontSize: 11, color: C.textSecondary, whiteSpace: 'nowrap' }}>{n}</td>
              {months.map((_, mi) => {
                const val = values[ni]![mi]!;
                const intensity = (val - 1200) / 1800;
                return (
                  <td key={mi} style={{
                    padding: '4px 8px', borderRadius: 4,
                    background: `rgba(22,84,217,${0.1 + intensity * 0.7})`,
                    textAlign: 'center',
                  }}>
                    <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textPrimary }}>
                      {val.toLocaleString('es-AR')}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataTableMock() {
  const rows = [
    { label: 'Carlos M.',   v1: '34',   v2: '€ 820k', v3: '5.2%', v4: C.success },
    { label: 'Ana G.',      v1: '28',   v2: '€ 640k', v3: '4.8%', v4: C.success },
    { label: 'Roberto S.',  v1: '19',   v2: '€ 430k', v3: '3.1%', v4: C.warning },
    { label: 'Lucía F.',    v1: '41',   v2: '€ 1.1M', v3: '7.6%', v4: C.success },
    { label: 'Marcelo T.',  v1: '12',   v2: '€ 270k', v3: '2.0%', v4: C.error   },
  ];
  return (
    <div style={{ borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px',
        padding: '8px 16px', borderBottom: `1px solid ${C.border}`, background: C.bgBase,
      }}>
        {['Asesor', 'Ops', 'Volume', 'Conv%'].map(h => (
          <span key={h} style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
        ))}
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px',
          padding: '10px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none',
          background: i % 2 === 0 ? C.bgRaised : C.bgBase,
        }}>
          <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{row.label}</span>
          <span style={{ fontFamily: F.mono, fontSize: 13, color: C.textSecondary }}>{row.v1}</span>
          <span style={{ fontFamily: F.mono, fontSize: 13, color: C.textSecondary }}>{row.v2}</span>
          <span style={{ fontFamily: F.mono, fontSize: 13, color: row.v4 }}>{row.v3}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────── */

const CHART_TYPES = [
  { id: 'line',    label: 'Línea',      icon: '📈' },
  { id: 'bar',     label: 'Barras',     icon: '📊' },
  { id: 'funnel',  label: 'Embudo',     icon: '🔀' },
  { id: 'heatmap', label: 'Mapa calor', icon: '🌡' },
  { id: 'table',   label: 'Tabla',      icon: '📋' },
] as const;

type ChartType = 'line' | 'bar' | 'funnel' | 'heatmap' | 'table';

export default function ReportViewPage({
  title = 'Leads por fuente',
  defaultChart = 'bar',
  onBack,
}: {
  title?: string;
  defaultChart?: ChartType;
  onBack?: () => void;
}) {
  const [chartType, setChartType] = useState<ChartType>(defaultChart);
  const [dateRange, setDateRange] = useState('Este mes');

  const DATE_OPTIONS = ['Hoy', 'Esta semana', 'Este mes', 'Este trimestre', 'Este año', 'Personalizado'];

  const renderChart = () => {
    switch (chartType) {
      case 'line':    return <LineChartMock title={title} />;
      case 'bar':     return <BarChartMock />;
      case 'funnel':  return <FunnelChartMock />;
      case 'heatmap': return <HeatmapMock />;
      case 'table':   return <DataTableMock />;
    }
  };

  return (
    <div style={{ padding: '28px 32px', fontFamily: F.body }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: C.textTertiary, cursor: 'pointer',
          fontFamily: F.body, fontSize: 13, padding: 0,
        }}>
          ← Reportes
        </button>
        <span style={{ color: C.textTertiary, fontSize: 13 }}>/</span>
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>{title}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            {title}
          </h1>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '4px 0 0' }}>
            Período: {dateRange}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{
              padding: '7px 28px 7px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.bgElevated, color: C.textPrimary, fontFamily: F.body, fontSize: 13,
              cursor: 'pointer', outline: 'none', appearance: 'none',
            }}>
              {DATE_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.textTertiary, fontSize: 11 }}>▾</span>
          </div>
          <button style={{
            padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.bgElevated, color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}>⬇ CSV</button>
          <button style={{
            padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.bgElevated, color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}>⬇ Excel</button>
        </div>
      </div>

      {/* Chart type tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {CHART_TYPES.map(ct => (
          <button key={ct.id} onClick={() => setChartType(ct.id)} style={{
            padding: '6px 14px', borderRadius: 8,
            border: `1px solid ${chartType === ct.id ? C.brand : C.border}`,
            background: chartType === ct.id ? C.brandFaint : C.bgElevated,
            color: chartType === ct.id ? C.brand : C.textSecondary,
            fontFamily: F.body, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{ct.icon}</span>{ct.label}
          </button>
        ))}
      </div>

      {/* Chart card */}
      <div style={{
        background: C.bgRaised, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: '24px 28px',
      }}>
        <div style={{ overflowX: 'auto' }}>
          {renderChart()}
        </div>
      </div>

      {/* Summary KPI strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20,
      }}>
        {[
          { label: 'Total',   value: '247',   sub: 'Leads este mes' },
          { label: 'Promedio',value: '8.2',   sub: 'Leads por día' },
          { label: 'Pico',    value: '34',    sub: '15 de mayo' },
          { label: 'vs. mes anterior', value: '+12%', sub: 'vs. 220 abril', color: C.success },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: C.bgRaised, borderRadius: 10, border: `1px solid ${C.border}`,
            padding: '16px 20px',
          }}>
            <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
              {kpi.label}
            </p>
            <p style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: kpi.color ?? C.textPrimary, margin: 0 }}>
              {kpi.value}
            </p>
            <p style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, margin: '4px 0 0' }}>
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
