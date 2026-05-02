import React, { useState, useCallback } from 'react';
import {
  ArrowLeft, Calendar, ChevronDown, Download, Mail,
  Filter, BarChart2, LineChart, Table2, ArrowUpRight,
  ArrowDownRight, RefreshCw, X, Check,
} from 'lucide-react';

/* ─── Design tokens ──────────────────────────────────────────────── */

const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  bgSubtle:      '#162035',
  brand:         '#1654d9',
  brandHover:    '#1244b8',
  brandFaint:    'rgba(22,84,217,0.12)',
  ai:            '#7E3AF2',
  aiFaint:       'rgba(126,58,242,0.12)',
  aiLight:       '#9B59FF',
  success:       '#18A659',
  successFaint:  'rgba(24,166,89,0.12)',
  warning:       '#E88A14',
  warningFaint:  'rgba(232,138,20,0.12)',
  error:         '#E83B3B',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  border:        '#1F2D48',
} as const;

const F = {
  display: "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
  mono:    "'DM Mono', monospace",
} as const;

/* ─── Types ──────────────────────────────────────────────────────── */

type ChartType = 'funnel' | 'line' | 'bar' | 'table' | 'heatmap';
type DatePreset =
  | 'today' | 'yesterday' | '7d' | '30d' | 'thisMonth'
  | 'lastQuarter' | 'thisYear' | 'custom';

/* ─── Mock data ──────────────────────────────────────────────────── */

// 30-day time series
const generateDaySeries = (base: number, vol: number, trend: number): number[] =>
  Array.from({ length: 30 }, (_, i) =>
    Math.max(0, Math.round(base + i * trend + (Math.random() - 0.5) * vol))
  );

const SERIES_CONSULTAS  = generateDaySeries(32, 18, 2.1);
const SERIES_LEADS      = generateDaySeries(10, 8, 0.8);
const SERIES_PROPUESTAS = generateDaySeries(4, 4, 0.2);
const SERIES_CIERRES    = generateDaySeries(1, 1.5, 0.05);

// Bar chart — 6 agents
const BAR_AGENTS = [
  { name: 'García, J.',    consultas: 248, cierres: 8 },
  { name: 'López, M.',     consultas: 210, cierres: 7 },
  { name: 'Martínez, C.', consultas: 194, cierres: 6 },
  { name: 'Rodríguez, A.',consultas: 182, cierres: 5 },
  { name: 'Fernández, L.',consultas: 156, cierres: 4 },
  { name: 'Gómez, P.',     consultas: 138, cierres: 3 },
];

// Table rows
const TABLE_AGENT_ROWS = [
  { agente: 'García, Juan',     pipeline: 'Premium',   consultas: 248, leads: 84, propuestas: 31, cierres: 8,  conv: '3.2%' },
  { agente: 'López, María',     pipeline: 'Estándar',  consultas: 210, leads: 71, propuestas: 26, cierres: 7,  conv: '3.3%' },
  { agente: 'Martínez, Carlos', pipeline: 'Premium',   consultas: 194, leads: 66, propuestas: 24, cierres: 6,  conv: '3.1%' },
  { agente: 'Rodríguez, Ana',   pipeline: 'Estándar',  consultas: 182, leads: 62, propuestas: 23, cierres: 5,  conv: '2.7%' },
  { agente: 'Fernández, Luis',  pipeline: 'Corporativo',consultas: 156, leads: 53, propuestas: 20, cierres: 4,  conv: '2.6%' },
  { agente: 'Gómez, Paula',     pipeline: 'Estándar',  consultas: 138, leads: 47, propuestas: 17, cierres: 3,  conv: '2.2%' },
  { agente: 'Pereyra, Diego',   pipeline: 'Corporativo',consultas: 120, leads: 41, propuestas: 15, cierres: 5,  conv: '4.2%' },
  { agente: 'Castro, Sofía',    pipeline: 'Premium',   consultas: 100, leads: 34, propuestas: 12, cierres: 4,  conv: '4.0%' },
];

// Heatmap: 7 days × 24 hours but we'll show 7 days × 15 hours (7–22)
const HEATMAP_DAYS   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HEATMAP_HOURS  = ['8h','9h','10h','11h','12h','13h','14h','15h','16h','17h','18h','19h','20h','21h','22h'];
const HEATMAP_DATA: number[][] = HEATMAP_DAYS.map((d, di) =>
  HEATMAP_HOURS.map((_, hi) => {
    const hr = 8 + hi;
    const isWeekend = di >= 5;
    const morning  = hr >= 9  && hr <= 11 ? 0.7 : 0;
    const midday   = hr >= 12 && hr <= 14 ? 0.5 : 0;
    const evening  = hr >= 18 && hr <= 21 ? 0.9 : 0;
    const peak     = Math.max(morning, midday, evening);
    const base     = isWeekend ? 0.15 : 0.3;
    return Math.min(1, base + peak * (isWeekend ? 0.4 : 1) + Math.random() * 0.15);
  })
);

// Monthly history table
const MONTHLY_TABLE = [
  { periodo: 'Mayo 2026',     consultas: 1248, leads: 423, propuestas: 156, cierres: 42, tasa: '3.4%' },
  { periodo: 'Abril 2026',    consultas: 1110, leads: 389, propuestas: 161, cierres: 36, tasa: '3.2%' },
  { periodo: 'Marzo 2026',    consultas: 1082, leads: 367, propuestas: 148, cierres: 34, tasa: '3.1%' },
  { periodo: 'Febrero 2026',  consultas: 940,  leads: 318, propuestas: 127, cierres: 28, tasa: '3.0%' },
  { periodo: 'Enero 2026',    consultas: 876,  leads: 297, propuestas: 118, cierres: 25, tasa: '2.9%' },
  { periodo: 'Dic 2025',      consultas: 820,  leads: 278, propuestas: 111, cierres: 23, tasa: '2.8%' },
  { periodo: 'Nov 2025',      consultas: 795,  leads: 270, propuestas: 108, cierres: 21, tasa: '2.6%' },
  { periodo: 'Oct 2025',      consultas: 742,  leads: 252, propuestas: 101, cierres: 19, tasa: '2.6%' },
];

/* ─── Mini sparkline for KPI cards ──────────────────────────────── */

function KpiSparkline({ data, color }: { data: number[]; color: string }) {
  const W = 80;
  const H = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - 3 - ((v - min) / range) * (H - 6);
      return `${x},${y}`;
    })
    .join(' ');

  const area =
    `0,${H} ` +
    data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - 3 - ((v - min) / range) * (H - 6);
        return `${x},${y}`;
      })
      .join(' ') +
    ` ${W},${H}`;

  const uid = color.replace(/[^a-z0-9]/gi, '');

  return (
    <svg width={W} height={H} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`kpi-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#kpi-${uid})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Funnel chart ───────────────────────────────────────────────── */

function FunnelChart() {
  const W = 520;
  const H = 320;
  const stages = [
    { label: 'Consultas',   count: 1248, pct: 100,  color: C.brand },
    { label: 'Leads',       count: 423,  pct: 33.9, color: '#1B6AEF' },
    { label: 'Propuestas',  count: 156,  pct: 12.5, color: '#2880FF' },
    { label: 'Cierres',     count: 42,   pct: 3.4,  color: C.success },
  ];

  const stageH  = 52;
  const gapH    = 28;
  const maxTopW = W - 60;
  const minW    = 120;
  const totalBlockH = stages.length * stageH + (stages.length - 1) * gapH;
  const topY    = (H - totalBlockH) / 2;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ overflow: 'visible', maxWidth: W }}
    >
      {stages.map((stage, i) => {
        const topW = minW + (stage.pct / 100) * (maxTopW - minW);
        const y    = topY + i * (stageH + gapH);
        const x0   = (W - topW) / 2;
        const x1   = (W + topW) / 2;

        // Trapezoid: same width top and bottom for each bar (rectangular stage blocks)
        // Next stage is narrower → draw trapezoid connecting this bottom to next top
        const nextStage = stages[i + 1];
        const nextTopW  = nextStage
          ? minW + (nextStage.pct / 100) * (maxTopW - minW)
          : topW;
        const nx0 = (W - nextTopW) / 2;
        const nx1 = (W + nextTopW) / 2;

        // The stage block itself as a rectangle
        const rectPoints = `${x0},${y} ${x1},${y} ${x1},${y + stageH} ${x0},${y + stageH}`;

        // Connector trapezoid between stages
        const connPoints = nextStage
          ? `${x0},${y + stageH} ${x1},${y + stageH} ${nx1},${y + stageH + gapH} ${nx0},${y + stageH + gapH}`
          : null;

        const convRate = nextStage
          ? ((nextStage.count / stage.count) * 100).toFixed(1)
          : null;

        return (
          <g key={stage.label}>
            {/* Stage rectangle */}
            <polygon
              points={rectPoints}
              fill={stage.color}
              opacity={0.9}
            />
            {/* Stage label — left */}
            <text
              x={x0 - 12}
              y={y + stageH / 2 + 1}
              textAnchor="end"
              dominantBaseline="middle"
              fontFamily={F.body}
              fontSize={12}
              fill={C.textSecondary}
            >
              {stage.label}
            </text>
            {/* Count + pct — right */}
            <text
              x={x1 + 12}
              y={y + stageH / 2 - 7}
              textAnchor="start"
              fontFamily={F.mono}
              fontSize={14}
              fontWeight="bold"
              fill={C.textPrimary}
            >
              {stage.count.toLocaleString('es-AR')}
            </text>
            <text
              x={x1 + 12}
              y={y + stageH / 2 + 10}
              textAnchor="start"
              fontFamily={F.mono}
              fontSize={11}
              fill={C.textTertiary}
            >
              {stage.pct}%
            </text>

            {/* Connector trapezoid */}
            {connPoints && (
              <polygon
                points={connPoints}
                fill={stage.color}
                opacity={0.35}
              />
            )}

            {/* Conversion rate label in connector */}
            {convRate && (
              <text
                x={W / 2}
                y={y + stageH + gapH / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily={F.mono}
                fontSize={10}
                fill={C.textTertiary}
              >
                {convRate}% conversión ↓
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Line chart ─────────────────────────────────────────────────── */

interface TooltipState {
  x: number;
  y: number;
  day: number;
  values: { label: string; value: number; color: string }[];
}

function LineChartView() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const W    = 700;
  const H    = 220;
  const padL = 44;
  const padR = 20;
  const padT = 16;
  const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const series = [
    { label: 'Consultas',  data: SERIES_CONSULTAS,  color: C.brand },
    { label: 'Leads',      data: SERIES_LEADS,       color: C.success },
    { label: 'Propuestas', data: SERIES_PROPUESTAS,  color: C.warning },
    { label: 'Cierres',    data: SERIES_CIERRES,     color: '#9B59FF' },
  ];

  const allVals = series.flatMap(s => s.data);
  const maxVal  = Math.max(...allVals);

  const toX = (i: number) => padL + (i / 29) * chartW;
  const toY = (v: number) => padT + chartH - (v / maxVal) * chartH;

  const xLabels = [0, 5, 10, 15, 20, 25, 29];

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX  = (e.clientX - rect.left) * (W / rect.width);
    const idx   = Math.round(((relX - padL) / chartW) * 29);
    const clamped = Math.max(0, Math.min(29, idx));
    setTooltip({
      x: toX(clamped),
      y: 30,
      day: clamped + 1,
      values: series.map(s => ({ label: s.label, value: s.data[clamped] ?? 0, color: s.color })),
    });
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: 'visible', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          {series.map(s => (
            <linearGradient key={s.label} id={`lc-${s.label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = padT + chartH - pct * chartH;
          return (
            <g key={pct}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke={C.border} strokeWidth={0.5} />
              <text
                x={padL - 6}
                y={y + 4}
                textAnchor="end"
                fontFamily={F.mono}
                fontSize={9}
                fill={C.textTertiary}
              >
                {Math.round(maxVal * pct)}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {xLabels.map(i => (
          <text
            key={i}
            x={toX(i)}
            y={H - 6}
            textAnchor="middle"
            fontFamily={F.mono}
            fontSize={9}
            fill={C.textTertiary}
          >
            d{i + 1}
          </text>
        ))}

        {/* Area fills */}
        {series.map(s => {
          const areaPoints =
            `${toX(0)},${padT + chartH} ` +
            s.data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ') +
            ` ${toX(29)},${padT + chartH}`;
          return (
            <polygon
              key={`area-${s.label}`}
              points={areaPoints}
              fill={`url(#lc-${s.label})`}
            />
          );
        })}

        {/* Lines */}
        {series.map(s => {
          const pts = s.data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
          return (
            <polyline
              key={`line-${s.label}`}
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {/* Hover crosshair */}
        {tooltip && (
          <line
            x1={tooltip.x}
            x2={tooltip.x}
            y1={padT}
            y2={padT + chartH}
            stroke={C.border}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {/* Hover dots */}
        {tooltip &&
          series.map(s => (
            <circle
              key={`dot-${s.label}`}
              cx={tooltip.x}
              cy={toY(s.data[tooltip.day - 1] ?? 0)}
              r={4}
              fill={s.color}
              stroke={C.bgBase}
              strokeWidth={2}
            />
          ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: Math.min(tooltip.x + 12, 580),
          background: C.bgRaised,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '10px 12px',
          pointerEvents: 'none',
          minWidth: 140,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          zIndex: 10,
        }}>
          <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, margin: '0 0 8px', textTransform: 'uppercase' }}>
            Día {tooltip.day}
          </p>
          {tooltip.values.map(v => (
            <div key={v.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 4 }}>
              <span style={{ fontFamily: F.body, fontSize: 12, color: v.color }}>{v.label}</span>
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>{v.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
        {series.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 2.5, borderRadius: 2, background: s.color }} />
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Bar chart ──────────────────────────────────────────────────── */

function BarChartView() {
  const W    = 620;
  const H    = 220;
  const padL = 80;
  const padR = 24;
  const padT = 16;
  const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxC = Math.max(...BAR_AGENTS.map(a => a.consultas));
  const groupW = chartW / BAR_AGENTS.length;
  const barW   = Math.min(18, groupW * 0.38);
  const gap    = 4;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        {/* Y grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = padT + chartH - pct * chartH;
          return (
            <g key={pct}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke={C.border} strokeWidth={0.5} />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontFamily={F.mono} fontSize={9} fill={C.textTertiary}>
                {Math.round(maxC * pct)}
              </text>
            </g>
          );
        })}

        {BAR_AGENTS.map((agent, i) => {
          const cx       = padL + i * groupW + groupW / 2;
          const barHC    = (agent.consultas / maxC) * chartH;
          const barHCi   = (agent.cierres / maxC) * chartH;
          const xC       = cx - barW - gap / 2;
          const xCi      = cx + gap / 2;

          return (
            <g key={agent.name}>
              {/* Consultas bar */}
              <rect
                x={xC}
                y={padT + chartH - barHC}
                width={barW}
                height={barHC}
                rx={3}
                fill={C.brand}
                opacity={0.85}
              />
              {/* Cierres bar */}
              <rect
                x={xCi}
                y={padT + chartH - barHCi}
                width={barW}
                height={barHCi}
                rx={3}
                fill={C.success}
                opacity={0.85}
              />
              {/* X label */}
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                fontFamily={F.mono}
                fontSize={9}
                fill={C.textTertiary}
              >
                {agent.name.split(',')[0]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
        {[
          { label: 'Consultas', color: C.brand },
          { label: 'Cierres',   color: C.success },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Table chart ────────────────────────────────────────────────── */

type SortCol = 'agente' | 'consultas' | 'leads' | 'propuestas' | 'cierres' | 'conv';
type SortDir = 'asc' | 'desc';

function TableChartView() {
  const [sortCol, setSortCol] = useState<SortCol>('cierres');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const sorted = [...TABLE_AGENT_ROWS].sort((a, b) => {
    let av: number | string, bv: number | string;
    if (sortCol === 'agente')     { av = a.agente;     bv = b.agente; }
    else if (sortCol === 'conv')  { av = parseFloat(a.conv); bv = parseFloat(b.conv); }
    else                          { av = a[sortCol];   bv = b[sortCol]; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const cols: { id: SortCol; label: string; width: string }[] = [
    { id: 'agente',     label: 'Agente',      width: '1.6fr' },
    { id: 'consultas',  label: 'Consultas',   width: '90px' },
    { id: 'leads',      label: 'Leads',       width: '80px' },
    { id: 'propuestas', label: 'Propuestas',  width: '100px' },
    { id: 'cierres',    label: 'Cierres',     width: '80px' },
    { id: 'conv',       label: 'Conv. %',     width: '80px' },
  ];

  const gridCols = cols.map(c => c.width).join(' ');

  return (
    <div style={{
      background: C.bgBase,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        padding: '10px 16px',
        borderBottom: `1px solid ${C.border}`,
        background: C.bgElevated,
      }}>
        {cols.map(col => (
          <div
            key={col.id}
            onClick={() => handleSort(col.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span style={{
              fontFamily: F.mono,
              fontSize: 10,
              color: sortCol === col.id ? C.brand : C.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {col.label}
            </span>
            {sortCol === col.id && (
              <span style={{ fontSize: 9, color: C.brand }}>
                {sortDir === 'asc' ? '▲' : '▼'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Rows */}
      {sorted.map((row, i) => (
        <div
          key={row.agente}
          style={{
            display: 'grid',
            gridTemplateColumns: gridCols,
            padding: '11px 16px',
            alignItems: 'center',
            background: i % 2 === 0 ? C.bgRaised : C.bgBase,
            borderBottom: i < sorted.length - 1 ? `1px solid ${C.border}` : 'none',
          }}
        >
          <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary }}>{row.agente}</span>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{row.consultas}</span>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{row.leads}</span>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{row.propuestas}</span>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>{row.cierres}</span>
          <span style={{
            fontFamily: F.mono,
            fontSize: 12,
            fontWeight: 600,
            color: parseFloat(row.conv) >= 3.5 ? C.success : C.textSecondary,
          }}>
            {row.conv}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Heatmap ────────────────────────────────────────────────────── */

function HeatmapView() {
  const [hoveredCell, setHoveredCell] = useState<{ di: number; hi: number } | null>(null);
  const cellW = 36;
  const cellH = 24;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 3, minWidth: 'fit-content' }}>
        {/* Hour labels */}
        <div style={{ display: 'flex', gap: 3, marginLeft: 40 }}>
          {HEATMAP_HOURS.map(h => (
            <div key={h} style={{
              width: cellW,
              fontFamily: F.mono,
              fontSize: 9,
              color: C.textTertiary,
              textAlign: 'center',
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {HEATMAP_DATA.map((row, di) => (
          <div key={di} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{
              width: 36,
              fontFamily: F.body,
              fontSize: 11,
              color: C.textSecondary,
              textAlign: 'right',
              paddingRight: 6,
              flexShrink: 0,
            }}>
              {HEATMAP_DAYS[di]}
            </div>
            {row.map((v, hi) => {
              const isHov = hoveredCell?.di === di && hoveredCell?.hi === hi;
              const alpha = 0.08 + v * 0.82;
              return (
                <div
                  key={hi}
                  title={`${HEATMAP_DAYS[di]} ${HEATMAP_HOURS[hi]}: ~${Math.round(v * 42)} consultas`}
                  onMouseEnter={() => setHoveredCell({ di, hi })}
                  onMouseLeave={() => setHoveredCell(null)}
                  style={{
                    width: cellW,
                    height: cellH,
                    borderRadius: 4,
                    background: v > 0.7
                      ? `rgba(22,84,217,${alpha})`
                      : v > 0.4
                      ? `rgba(22,84,217,${alpha})`
                      : `rgba(31,45,72,${0.4 + v * 0.5})`,
                    border: isHov ? `1px solid ${C.brand}` : '1px solid transparent',
                    cursor: 'default',
                    flexShrink: 0,
                    transition: 'border-color 0.1s',
                  }}
                />
              );
            })}
          </div>
        ))}

        {/* Tooltip row for hovered cell */}
        {hoveredCell && (
          <div style={{
            marginLeft: 40,
            marginTop: 4,
            fontFamily: F.body,
            fontSize: 12,
            color: C.textSecondary,
          }}>
            <span style={{ color: C.textPrimary, fontWeight: 600 }}>
              {HEATMAP_DAYS[hoveredCell.di]} {HEATMAP_HOURS[hoveredCell.hi]}
            </span>
            {' — '}
            ~{Math.round((HEATMAP_DATA[hoveredCell.di]?.[hoveredCell.hi] ?? 0) * 42)} consultas
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, marginLeft: 40 }}>
          <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>Menos</span>
          {[0.08, 0.24, 0.42, 0.62, 0.82].map(a => (
            <div key={a} style={{
              width: 20,
              height: 14,
              borderRadius: 3,
              background: `rgba(22,84,217,${a})`,
            }} />
          ))}
          <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>Más</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Digest modal ───────────────────────────────────────────────── */

interface DigestModalProps {
  onClose: () => void;
}

function DigestModal({ onClose }: DigestModalProps) {
  const [recipients, setRecipients] = useState('martin@corredor.com.ar');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState('Martes');
  const [time, setTime] = useState('08:00');
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1400);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(7,13,26,0.8)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: C.bgRaised,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        width: 480,
        maxWidth: '90vw',
        padding: '28px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{
              fontFamily: F.display,
              fontSize: 18,
              fontWeight: 700,
              color: C.textPrimary,
              margin: '0 0 4px',
            }}>
              Configurar envío automático
            </h2>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: 0 }}>
              Conversión de Funnel
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.bgElevated,
              color: C.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Recipients */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            fontFamily: F.mono,
            fontSize: 10,
            color: C.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            display: 'block',
            marginBottom: 8,
          }}>
            Destinatarios
          </label>
          <input
            value={recipients}
            onChange={e => setRecipients(e.target.value)}
            placeholder="email1@agencia.com, email2@agencia.com"
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.bgBase,
              color: C.textPrimary,
              fontFamily: F.mono,
              fontSize: 12,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <p style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, margin: '5px 0 0' }}>
            Separar múltiples emails con comas
          </p>
        </div>

        {/* Frequency */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            fontFamily: F.mono,
            fontSize: 10,
            color: C.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            display: 'block',
            marginBottom: 8,
          }}>
            Frecuencia
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['daily', 'weekly', 'monthly'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 8,
                  border: `1px solid ${frequency === f ? C.brand : C.border}`,
                  background: frequency === f ? C.brandFaint : C.bgBase,
                  color: frequency === f ? '#fff' : C.textSecondary,
                  fontFamily: F.body,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {f === 'daily' ? 'Diario' : f === 'weekly' ? 'Semanal' : 'Mensual'}
              </button>
            ))}
          </div>
        </div>

        {/* Day of week (weekly only) */}
        {frequency === 'weekly' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{
              fontFamily: F.mono,
              fontSize: 10,
              color: C.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'block',
              marginBottom: 8,
            }}>
              Día de envío
            </label>
            <select
              value={dayOfWeek}
              onChange={e => setDayOfWeek(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: C.bgBase,
                color: C.textPrimary,
                fontFamily: F.body,
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(d => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        {/* Time */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            fontFamily: F.mono,
            fontSize: 10,
            color: C.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            display: 'block',
            marginBottom: 8,
          }}>
            Hora de envío
          </label>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.bgBase,
              color: C.textPrimary,
              fontFamily: F.mono,
              fontSize: 13,
              outline: 'none',
              colorScheme: 'dark',
            }}
          />
        </div>

        {/* Format */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            fontFamily: F.mono,
            fontSize: 10,
            color: C.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            display: 'block',
            marginBottom: 8,
          }}>
            Formato
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['pdf', 'excel'] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                style={{
                  padding: '7px 20px',
                  borderRadius: 8,
                  border: `1px solid ${format === fmt ? C.brand : C.border}`,
                  background: format === fmt ? C.brandFaint : C.bgBase,
                  color: format === fmt ? '#fff' : C.textSecondary,
                  fontFamily: F.body,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{
          background: C.bgSubtle,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 24,
        }}>
          <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, margin: '0 0 2px' }}>
            Próximo envío
          </p>
          <p style={{ fontFamily: F.mono, fontSize: 13, color: C.textPrimary, margin: 0, fontWeight: 600 }}>
            {frequency === 'daily'
              ? `mañana a las ${time}`
              : frequency === 'weekly'
              ? `${dayOfWeek.toLowerCase()} 6 de mayo, ${time}`
              : `1 de junio, ${time}`}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 8,
              border: 'none',
              background: saved ? C.success : C.brand,
              color: '#fff',
              fontFamily: F.body,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {saved ? <><Check size={15} /> Guardado</> : 'Guardar'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: C.textSecondary,
              fontFamily: F.body,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Export dropdown ────────────────────────────────────────────── */

function ExportDropdown({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 6,
      background: C.bgRaised,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: '6px',
      minWidth: 140,
      zIndex: 200,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      {['CSV', 'Excel'].map(opt => (
        <button
          key={opt}
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 12px',
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: C.textSecondary,
            fontFamily: F.body,
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'left',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = C.bgElevated)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Download size={13} />
          Exportar {opt}
        </button>
      ))}
    </div>
  );
}

/* ─── Date picker dropdown ───────────────────────────────────────── */

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today',        label: 'Hoy' },
  { id: 'yesterday',    label: 'Ayer' },
  { id: '7d',           label: 'Últimos 7 días' },
  { id: '30d',          label: 'Últimos 30 días' },
  { id: 'thisMonth',    label: 'Este mes' },
  { id: 'lastQuarter',  label: 'Último trimestre' },
  { id: 'thisYear',     label: 'Este año' },
  { id: 'custom',       label: 'Personalizado…' },
];

const PRESET_LABELS: Record<DatePreset, string> = {
  today:       'Hoy',
  yesterday:   'Ayer',
  '7d':        'Últimos 7 días',
  '30d':       'Últimos 30 días',
  thisMonth:   'Este mes',
  lastQuarter: 'Último trimestre',
  thisYear:    'Este año',
  custom:      'Personalizado',
};

function DatePickerDropdown({
  selected,
  onSelect,
}: {
  selected: DatePreset;
  onSelect: (p: DatePreset) => void;
}) {
  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 6,
      background: C.bgRaised,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: '6px',
      minWidth: 200,
      zIndex: 200,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      {DATE_PRESETS.map(p => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '8px 12px',
            borderRadius: 6,
            border: 'none',
            background: selected === p.id ? C.brandFaint : 'transparent',
            color: selected === p.id ? '#fff' : C.textSecondary,
            fontFamily: F.body,
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'left',
          }}
          onMouseEnter={e => {
            if (selected !== p.id) e.currentTarget.style.background = C.bgElevated;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = selected === p.id ? C.brandFaint : 'transparent';
          }}
        >
          <span>{p.label}</span>
          {selected === p.id && <Check size={13} color={C.brand} />}
        </button>
      ))}
    </div>
  );
}

/* ─── Monthly data table ─────────────────────────────────────────── */

function MonthlyDataTable() {
  const [sortCol, setSortCol] = useState<'periodo' | 'consultas' | 'leads' | 'propuestas' | 'cierres' | 'tasa'>('periodo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const sorted = [...MONTHLY_TABLE].sort((a, b) => {
    const av = sortCol === 'tasa' ? parseFloat(a.tasa) : (sortCol === 'periodo' ? a.periodo : a[sortCol] as number);
    const bv = sortCol === 'tasa' ? parseFloat(b.tasa) : (sortCol === 'periodo' ? b.periodo : b[sortCol] as number);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const cols = [
    { id: 'periodo' as const,    label: 'Período',    width: '1.4fr' },
    { id: 'consultas' as const,  label: 'Consultas',  width: '1fr' },
    { id: 'leads' as const,      label: 'Leads',      width: '1fr' },
    { id: 'propuestas' as const, label: 'Propuestas', width: '1fr' },
    { id: 'cierres' as const,    label: 'Cierres',    width: '1fr' },
    { id: 'tasa' as const,       label: 'Tasa Conv.', width: '1fr' },
  ];

  const gridCols = cols.map(c => c.width).join(' ');

  const totals = {
    consultas:  MONTHLY_TABLE.reduce((s, r) => s + r.consultas, 0),
    leads:      MONTHLY_TABLE.reduce((s, r) => s + r.leads, 0),
    propuestas: MONTHLY_TABLE.reduce((s, r) => s + r.propuestas, 0),
    cierres:    MONTHLY_TABLE.reduce((s, r) => s + r.cierres, 0),
  };
  const avgTasa = (totals.cierres / totals.consultas * 100).toFixed(1) + '%';

  return (
    <div>
      <h3 style={{
        fontFamily: F.mono,
        fontSize: 10,
        color: C.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        margin: '0 0 12px',
      }}>
        Historial mensual
      </h3>

      <div style={{
        background: C.bgBase,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          padding: '10px 16px',
          borderBottom: `1px solid ${C.border}`,
          background: C.bgElevated,
        }}>
          {cols.map(col => (
            <div
              key={col.id}
              onClick={() => handleSort(col.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <span style={{
                fontFamily: F.mono,
                fontSize: 10,
                color: sortCol === col.id ? C.brand : C.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {col.label}
              </span>
              {sortCol === col.id && (
                <span style={{ fontSize: 9, color: C.brand }}>
                  {sortDir === 'asc' ? '▲' : '▼'}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Rows */}
        {sorted.map((row, i) => (
          <div
            key={row.periodo}
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              padding: '11px 16px',
              alignItems: 'center',
              background: i % 2 === 0 ? C.bgRaised : C.bgBase,
              borderBottom: i < sorted.length - 1 ? `1px solid ${C.border}` : 'none',
            }}
          >
            <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary }}>{row.periodo}</span>
            <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{row.consultas.toLocaleString('es-AR')}</span>
            <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{row.leads}</span>
            <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{row.propuestas}</span>
            <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>{row.cierres}</span>
            <span style={{
              fontFamily: F.mono,
              fontSize: 12,
              fontWeight: 600,
              color: parseFloat(row.tasa) >= 3.2 ? C.success : C.textSecondary,
            }}>
              {row.tasa}
            </span>
          </div>
        ))}

        {/* Totals footer */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          padding: '11px 16px',
          borderTop: `2px solid ${C.border}`,
          background: C.bgSubtle,
        }}>
          <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 700 }}>Total</span>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 700 }}>{totals.consultas.toLocaleString('es-AR')}</span>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 700 }}>{totals.leads.toLocaleString('es-AR')}</span>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 700 }}>{totals.propuestas}</span>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 700 }}>{totals.cierres}</span>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.success, fontWeight: 700 }}>{avgTasa}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

export default function ReportDetailPage() {
  const [activeChartType, setActiveChartType] = useState<ChartType>('funnel');
  const [selectedDateRange, setSelectedDateRange] = useState<DatePreset>('30d');
  const [showDigestModal, setShowDigestModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const CHART_TABS: { id: ChartType; label: string; icon: React.ReactNode }[] = [
    { id: 'funnel',  label: 'Embudo',        icon: <Filter size={14} /> },
    { id: 'line',    label: 'Línea',          icon: <LineChart size={14} /> },
    { id: 'bar',     label: 'Barras',         icon: <BarChart2 size={14} /> },
    { id: 'table',   label: 'Tabla',          icon: <Table2 size={14} /> },
    { id: 'heatmap', label: 'Mapa de calor',  icon: <RefreshCw size={14} /> },
  ];

  const KPI_CARDS = [
    {
      label:    'CONSULTAS TOTALES',
      value:    '1,248',
      delta:    '+12.4%',
      positive: true,
      series:   SERIES_CONSULTAS,
      color:    C.brand,
    },
    {
      label:    'LEADS CALIFICADOS',
      value:    '423',
      delta:    '+8.7%',
      positive: true,
      series:   SERIES_LEADS,
      color:    C.success,
    },
    {
      label:    'PROPUESTAS ENVIADAS',
      value:    '156',
      delta:    '-3.2%',
      positive: false,
      series:   SERIES_PROPUESTAS,
      color:    C.error,
    },
    {
      label:    'CIERRES DEL MES',
      value:    '42',
      delta:    '+16.7%',
      positive: true,
      series:   SERIES_CIERRES,
      color:    C.success,
    },
  ];

  return (
    <div style={{
      fontFamily: F.body,
      background: C.bgBase,
      minHeight: '100vh',
      color: C.textPrimary,
    }}>
      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <div style={{
        padding: '20px 36px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          color: C.textSecondary,
          fontFamily: F.body,
          fontSize: 13,
          cursor: 'pointer',
          padding: 0,
        }}>
          <ArrowLeft size={14} />
          Reportes
        </button>
        <span style={{ color: C.textTertiary, fontSize: 13 }}>/</span>
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary }}>
          Conversión de Funnel
        </span>
      </div>

      {/* ── Page title ───────────────────────────────────────────────── */}
      <div style={{ padding: '16px 36px 0' }}>
        <h1 style={{
          fontFamily: F.display,
          fontSize: 24,
          fontWeight: 700,
          color: C.textPrimary,
          margin: '0 0 4px',
          letterSpacing: '-0.02em',
        }}>
          Conversión de Funnel
        </h1>
        <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: 0 }}>
          Tasa de conversión por etapa · Última actualización hace 12 min
        </p>
      </div>

      {/* ── Sticky filter bar ────────────────────────────────────────── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: C.bgRaised,
        borderBottom: `1px solid ${C.border}`,
        padding: '12px 36px',
        marginTop: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}>
        {/* Date range */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowDatePicker(v => !v);
              setShowExportDropdown(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 12px',
              borderRadius: 8,
              border: `1px solid ${showDatePicker ? C.brand : C.border}`,
              background: showDatePicker ? C.brandFaint : C.bgElevated,
              color: C.textPrimary,
              fontFamily: F.body,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <Calendar size={14} color={C.textSecondary} />
            {PRESET_LABELS[selectedDateRange]}
            <ChevronDown size={13} color={C.textTertiary} />
          </button>
          {showDatePicker && (
            <DatePickerDropdown
              selected={selectedDateRange}
              onSelect={p => { setSelectedDateRange(p); setShowDatePicker(false); }}
            />
          )}
        </div>

        {/* Pipeline filter */}
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 12px',
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          background: C.bgElevated,
          color: C.textSecondary,
          fontFamily: F.body,
          fontSize: 13,
          cursor: 'pointer',
        }}>
          Todos los pipelines <ChevronDown size={13} />
        </button>

        {/* Branch filter */}
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 12px',
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          background: C.bgElevated,
          color: C.textSecondary,
          fontFamily: F.body,
          fontSize: 13,
          cursor: 'pointer',
        }}>
          Todas las sucursales <ChevronDown size={13} />
        </button>

        {/* Agent filter */}
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 12px',
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          background: C.bgElevated,
          color: C.textSecondary,
          fontFamily: F.body,
          fontSize: 13,
          cursor: 'pointer',
        }}>
          Todos los agentes <ChevronDown size={13} />
        </button>

        <div style={{ flex: 1 }} />

        {/* Export dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowExportDropdown(v => !v);
              setShowDatePicker(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 12px',
              borderRadius: 8,
              border: `1px solid ${showExportDropdown ? C.brand : C.border}`,
              background: showExportDropdown ? C.brandFaint : C.bgElevated,
              color: C.textPrimary,
              fontFamily: F.body,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            Exportar
            <ChevronDown size={13} color={C.textTertiary} />
          </button>
          {showExportDropdown && (
            <ExportDropdown onClose={() => setShowExportDropdown(false)} />
          )}
        </div>

        {/* Programar envío */}
        <button
          onClick={() => setShowDigestModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 12px',
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: 'transparent',
            color: C.textSecondary,
            fontFamily: F.body,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <Mail size={14} />
          Programar envío
        </button>
      </div>

      <div style={{ padding: '28px 36px 48px' }}>
        {/* ── KPI cards ──────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 28,
        }}>
          {KPI_CARDS.map(kpi => (
            <div
              key={kpi.label}
              style={{
                background: C.bgRaised,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: '18px 18px 16px',
              }}
            >
              <p style={{
                fontFamily: F.mono,
                fontSize: 10,
                color: C.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 10px',
              }}>
                {kpi.label}
              </p>
              <p style={{
                fontFamily: F.display,
                fontSize: 28,
                fontWeight: 700,
                color: C.textPrimary,
                margin: '0 0 8px',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}>
                {kpi.value}
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {kpi.positive
                    ? <ArrowUpRight size={13} color={C.success} />
                    : <ArrowDownRight size={13} color={C.error} />
                  }
                  <span style={{
                    fontFamily: F.body,
                    fontSize: 12,
                    color: kpi.positive ? C.success : C.error,
                    fontWeight: 500,
                  }}>
                    {kpi.delta}
                  </span>
                  <span style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary }}>
                    {' '}vs mes anterior
                  </span>
                </div>
                <KpiSparkline data={kpi.series.slice(-12)} color={kpi.color} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Chart type switcher ─────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 16,
          background: C.bgElevated,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 4,
          width: 'fit-content',
        }}>
          {CHART_TABS.map(tab => {
            const active = activeChartType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveChartType(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 7,
                  border: 'none',
                  background: active ? C.brand : 'transparent',
                  color: active ? '#fff' : C.textSecondary,
                  fontFamily: F.body,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Chart area ─────────────────────────────────────────────── */}
        <div style={{
          background: C.bgRaised,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: '28px 28px 24px',
          marginBottom: 32,
          minHeight: 340,
        }}>
          {activeChartType === 'funnel'  && <FunnelChart />}
          {activeChartType === 'line'    && <LineChartView />}
          {activeChartType === 'bar'     && <BarChartView />}
          {activeChartType === 'table'   && <TableChartView />}
          {activeChartType === 'heatmap' && <HeatmapView />}
        </div>

        {/* ── Monthly history table ───────────────────────────────────── */}
        <MonthlyDataTable />
      </div>

      {/* ── Digest modal ─────────────────────────────────────────────── */}
      {showDigestModal && (
        <DigestModal onClose={() => setShowDigestModal(false)} />
      )}
    </div>
  );
}
