import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { C, F } from '../../components/copilot/tokens.js';

/* ─── KPI Card ───────────────────────────────────────────────── */

export interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
  subtitle?: string;
  sparkline?: number[];
  color?: string;
  tooltip?: string;
}

export function KpiCard({ label, value, delta, positive, subtitle, sparkline, color = C.brand, tooltip }: KpiCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={tooltip}
      style={{
        background: hovered ? C.bgElevated : C.bgRaised,
        border: `1px solid ${hovered ? C.borderHover : C.border}`,
        borderRadius: 12,
        padding: '18px 18px 16px',
        transition: 'all 0.15s',
        cursor: tooltip ? 'help' : 'default',
      }}
    >
      <p style={{
        fontFamily: F.mono, fontSize: 10, color: C.textTertiary,
        textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px',
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{
            fontFamily: F.display, fontSize: 28, fontWeight: 700,
            color: C.textPrimary, margin: '0 0 6px',
            letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            {value}
          </p>
          {delta && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {positive !== undefined && (
                positive
                  ? <ArrowUpRight size={13} color={C.success} />
                  : <ArrowDownRight size={13} color={C.error} />
              )}
              <span style={{
                fontFamily: F.body, fontSize: 12, fontWeight: 500,
                color: positive ? C.success : positive === false ? C.error : C.textSecondary,
              }}>
                {delta}
              </span>
            </div>
          )}
          {subtitle && (
            <p style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, margin: '3px 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
        {sparkline && sparkline.length > 1 && (
          <MiniSparkline data={sparkline} color={color} />
        )}
      </div>
    </div>
  );
}

/* ─── KPI Row (grid of KPI cards) ────────────────────────────── */

export function KpiRow({ cards, columns = 4 }: { cards: KpiCardProps[]; columns?: number }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: 14,
      marginBottom: 24,
    }}>
      {cards.map((card, i) => <KpiCard key={i} {...card} />)}
    </div>
  );
}

/* ─── Mini sparkline ─────────────────────────────────────────── */

export function MiniSparkline({ data, color, width = 80, height = 28 }: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 3 - ((v - min) / range) * (height - 6);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints =
    `0,${height} ` + points + ` ${width},${height}`;

  const uid = `spark-${color.replace(/[^a-z0-9]/gi, '')}-${data.length}`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${uid})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─── Donut chart ────────────────────────────────────────────── */

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  segments,
  size = 180,
  thickness = 28,
  centerLabel,
  centerValue,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;

  let cumAngle = -90;
  const arcs = segments.map((seg, i) => {
    const angle = total > 0 ? (seg.value / total) * 360 : 0;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const largeArc = angle > 180 ? 1 : 0;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
    const isHovered = hoveredIdx === i;

    return (
      <path
        key={i}
        d={d}
        fill="none"
        stroke={seg.color}
        strokeWidth={isHovered ? thickness + 4 : thickness}
        strokeLinecap="butt"
        opacity={hoveredIdx !== null && !isHovered ? 0.4 : 1}
        style={{ transition: 'all 0.15s', cursor: 'pointer' }}
        onMouseEnter={() => setHoveredIdx(i)}
        onMouseLeave={() => setHoveredIdx(null)}
      />
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {arcs}
        {centerValue && (
          <>
            <text
              x={cx} y={cy - 6}
              textAnchor="middle"
              dominantBaseline="auto"
              fontFamily={F.display}
              fontSize={22}
              fontWeight={700}
              fill={C.textPrimary}
            >
              {centerValue}
            </text>
            {centerLabel && (
              <text
                x={cx} y={cy + 14}
                textAnchor="middle"
                dominantBaseline="auto"
                fontFamily={F.body}
                fontSize={11}
                fill={C.textTertiary}
              >
                {centerLabel}
              </text>
            )}
          </>
        )}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center' }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.5 : 1,
              transition: 'opacity 0.15s', cursor: 'pointer',
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color }} />
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>
              {seg.label}
            </span>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary }}>
              {total > 0 ? Math.round((seg.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Horizontal bar chart ───────────────────────────────────── */

export interface HBarDatum {
  label: string;
  value: number;
  color?: string;
  suffix?: string;
}

export function HorizontalBarChart({
  data,
  barHeight = 28,
  gap = 8,
  color = C.brand,
}: {
  data: HBarDatum[];
  barHeight?: number;
  gap?: number;
  color?: string;
}) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 120, fontFamily: F.body, fontSize: 13,
            color: C.textSecondary, textAlign: 'right', flexShrink: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {d.label}
          </span>
          <div style={{ flex: 1, height: barHeight, background: C.bgElevated, borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                width: `${(d.value / maxVal) * 100}%`,
                height: '100%',
                background: d.color ?? color,
                borderRadius: 4,
                opacity: 0.85,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{
            width: 60, fontFamily: F.mono, fontSize: 12,
            color: C.textPrimary, fontWeight: 600, textAlign: 'right', flexShrink: 0,
          }}>
            {d.value}{d.suffix ?? ''}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Stacked bar chart ────────────────────────────────────── */

export interface StackedBarSeries {
  label: string;
  color: string;
}

export interface StackedBarDatum {
  label: string;
  values: number[];
}

export function StackedBarChart({
  series,
  data,
  height = 220,
  xLabels,
}: {
  series: StackedBarSeries[];
  data: StackedBarDatum[];
  height?: number;
  xLabels?: string[];
}) {
  const [hoveredBar, setHoveredBar] = useState<{ idx: number; x: number } | null>(null);
  const W = 700, H = height;
  const padL = 48, padR = 20, padT = 16, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const totals = data.map(d => d.values.reduce((s, v) => s + v, 0));
  const maxVal = Math.max(...totals, 1);
  const barW = Math.min(36, (chartW / data.length) * 0.65);
  const gap = (chartW - barW * data.length) / (data.length + 1);

  const toY = (v: number) => padT + chartH - (v / maxVal) * chartH;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: 'visible' }}
        onMouseLeave={() => setHoveredBar(null)}
      >
        {/* Y grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = padT + chartH - pct * chartH;
          return (
            <g key={pct}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke={C.border} strokeWidth={0.5} />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontFamily={F.mono} fontSize={9} fill={C.textTertiary}>
                {Math.round(maxVal * pct)}
              </text>
            </g>
          );
        })}

        {/* Stacked bars */}
        {data.map((d, i) => {
          const x = padL + gap + i * (barW + gap);
          let cumY = padT + chartH;
          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredBar({ idx: i, x: x + barW / 2 })}
              style={{ cursor: 'pointer' }}
            >
              {d.values.map((v, si) => {
                const barH = (v / maxVal) * chartH;
                cumY -= barH;
                return (
                  <rect key={si} x={x} y={cumY} width={barW} height={barH} rx={si === series.length - 1 ? 3 : 0} fill={series[si]?.color ?? C.brand} opacity={0.85} />
                );
              })}
              {/* X label */}
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontFamily={F.mono} fontSize={9} fill={C.textTertiary}>
                {xLabels?.[i] ?? d.label}
              </text>
            </g>
          );
        })}

        {/* Hover crosshair */}
        {hoveredBar && (
          <line x1={hoveredBar.x} x2={hoveredBar.x} y1={padT} y2={padT + chartH} stroke={C.border} strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>

      {/* Tooltip */}
      {hoveredBar && (
        <div style={{
          position: 'absolute', top: 8,
          left: Math.min(hoveredBar.x + 12, 560),
          background: C.bgRaised, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '10px 14px',
          pointerEvents: 'none', minWidth: 140,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', zIndex: 10,
        }}>
          <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, margin: '0 0 6px', textTransform: 'uppercase' }}>
            {data[hoveredBar.idx]?.label}
          </p>
          {series.map((s, si) => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 3 }}>
              <span style={{ fontFamily: F.body, fontSize: 12, color: s.color }}>{s.label}</span>
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
                {data[hoveredBar.idx]?.values[si] ?? 0}
              </span>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>Total</span>
            <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 700 }}>
              {totals[hoveredBar.idx]}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
        {series.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Line chart (multi-series) ──────────────────────────────── */

export interface LineSeries {
  label: string;
  data: number[];
  color: string;
}

export function MultiLineChart({
  series,
  xLabels,
  height = 220,
}: {
  series: LineSeries[];
  xLabels?: string[];
  height?: number;
}) {
  const [tooltip, setTooltip] = useState<{ idx: number; x: number } | null>(null);

  const W = 700;
  const H = height;
  const padL = 48, padR = 20, padT = 16, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const allVals = series.flatMap(s => s.data);
  const maxVal = Math.max(...allVals, 1);
  const len = Math.max(...series.map(s => s.data.length), 2);

  const toX = (i: number) => padL + (i / (len - 1)) * chartW;
  const toY = (v: number) => padT + chartH - (v / maxVal) * chartH;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) * (W / rect.width);
    const idx = Math.round(((relX - padL) / chartW) * (len - 1));
    const clamped = Math.max(0, Math.min(len - 1, idx));
    setTooltip({ idx: clamped, x: toX(clamped) });
  };

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
            <linearGradient key={s.label} id={`ml-${s.label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* Y grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = padT + chartH - pct * chartH;
          return (
            <g key={pct}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke={C.border} strokeWidth={0.5} />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontFamily={F.mono} fontSize={9} fill={C.textTertiary}>
                {Math.round(maxVal * pct)}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {xLabels && xLabels.map((label, i) => (
          <text
            key={i}
            x={toX(i)}
            y={H - 6}
            textAnchor="middle"
            fontFamily={F.mono}
            fontSize={9}
            fill={C.textTertiary}
          >
            {label}
          </text>
        ))}

        {/* Area fills + lines */}
        {series.map(s => {
          const pts = s.data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
          const area = `${toX(0)},${padT + chartH} ${pts} ${toX(s.data.length - 1)},${padT + chartH}`;
          return (
            <g key={s.label}>
              <polygon points={area} fill={`url(#ml-${s.label.replace(/\s/g, '')})`} />
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}

        {/* Hover crosshair */}
        {tooltip && (
          <line x1={tooltip.x} x2={tooltip.x} y1={padT} y2={padT + chartH} stroke={C.border} strokeWidth={1} strokeDasharray="3 3" />
        )}

        {/* Hover dots */}
        {tooltip && series.map(s => (
          <circle
            key={`dot-${s.label}`}
            cx={tooltip.x}
            cy={toY(s.data[tooltip.idx] ?? 0)}
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
          position: 'absolute', top: 8,
          left: Math.min(tooltip.x + 12, 560),
          background: C.bgRaised, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '10px 14px',
          pointerEvents: 'none', minWidth: 140,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', zIndex: 10,
        }}>
          {xLabels && (
            <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, margin: '0 0 6px', textTransform: 'uppercase' }}>
              {xLabels[tooltip.idx]}
            </p>
          )}
          {series.map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 3 }}>
              <span style={{ fontFamily: F.body, fontSize: 12, color: s.color }}>{s.label}</span>
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>{s.data[tooltip.idx] ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
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

/* ─── Data table ─────────────────────────────────────────────── */

export interface TableColumn<T> {
  id: string;
  label: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T, idx: number) => React.ReactNode;
  sortable?: boolean;
  mono?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  defaultSort,
  onRowClick,
  highlightRow,
}: {
  columns: TableColumn<T>[];
  data: T[];
  defaultSort?: { col: string; dir: 'asc' | 'desc' };
  onRowClick?: (row: T, idx: number) => void;
  highlightRow?: (row: T, idx: number) => boolean;
}) {
  const [sortCol, setSortCol] = useState(defaultSort?.col ?? columns[0]?.id ?? '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSort?.dir ?? 'desc');

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const sorted = [...data].sort((a, b) => {
    const av = a[sortCol];
    const bv = b[sortCol];
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    const an = Number(av) || 0;
    const bn = Number(bv) || 0;
    return sortDir === 'asc' ? an - bn : bn - an;
  });

  const gridCols = columns.map(c => c.width ?? '1fr').join(' ');

  return (
    <div style={{
      background: C.bgBase,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: gridCols,
        padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
        background: C.bgElevated,
      }}>
        {columns.map(col => (
          <div
            key={col.id}
            onClick={col.sortable !== false ? () => handleSort(col.id) : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              cursor: col.sortable !== false ? 'pointer' : 'default',
              userSelect: 'none', justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start',
            }}
          >
            <span style={{
              fontFamily: F.mono, fontSize: 10,
              color: sortCol === col.id ? C.brand : C.textTertiary,
              textTransform: 'uppercase', letterSpacing: '0.06em',
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
      {sorted.map((row, i) => {
        const highlighted = highlightRow?.(row, i);
        return (
          <div
            key={i}
            onClick={onRowClick ? () => onRowClick(row, i) : undefined}
            style={{
              display: 'grid', gridTemplateColumns: gridCols,
              padding: '11px 16px', alignItems: 'center',
              background: highlighted ? C.brandFaint : i % 2 === 0 ? C.bgRaised : C.bgBase,
              borderBottom: i < sorted.length - 1 ? `1px solid ${C.border}` : 'none',
              cursor: onRowClick ? 'pointer' : 'default',
              borderLeft: highlighted ? `3px solid ${C.brand}` : '3px solid transparent',
            }}
          >
            {columns.map(col => (
              <div key={col.id} style={{ textAlign: col.align ?? 'left' }}>
                {col.render
                  ? col.render(row, i)
                  : (
                    <span style={{
                      fontFamily: col.mono ? F.mono : F.body,
                      fontSize: col.mono ? 12 : 13,
                      color: C.textSecondary,
                    }}>
                      {String(row[col.id] ?? '')}
                    </span>
                  )
                }
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Widget card (wraps a chart section) ────────────────────── */

export function WidgetCard({
  title,
  children,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      background: C.bgRaised,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: '20px 24px 18px',
    }}>
      {(title || action) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          {title && (
            <h3 style={{
              fontFamily: F.mono, fontSize: 10, fontWeight: 600,
              color: C.textTertiary, textTransform: 'uppercase',
              letterSpacing: '0.06em', margin: 0,
            }}>
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Alert card ─────────────────────────────────────────────── */

export function AlertCard({
  title,
  description,
  severity = 'warning',
}: {
  title: string;
  description: string;
  severity?: 'warning' | 'error' | 'info';
}) {
  const colorMap = {
    warning: { bg: 'rgba(232,138,20,0.08)', border: C.warning, text: C.warning },
    error:   { bg: 'rgba(232,59,59,0.08)',  border: C.error,   text: C.error },
    info:    { bg: C.brandFaint,             border: C.brand,   text: C.brand },
  };
  const colors = colorMap[severity];

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      padding: '14px 18px',
    }}>
      <p style={{
        fontFamily: F.body, fontSize: 14, fontWeight: 600,
        color: colors.text, margin: '0 0 4px',
      }}>
        {title}
      </p>
      <p style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary, margin: 0 }}>
        {description}
      </p>
    </div>
  );
}

/* ─── Funnel chart ───────────────────────────────────────────── */

export interface FunnelStage {
  label: string;
  count: number;
  color: string;
}

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const W = 540, H = stages.length * 80 + 20;
  const maxCount = stages[0]?.count ?? 1;
  const maxTopW = W - 80;
  const minW = 130;
  const stageH = 48;
  const gapH = 24;
  const totalH = stages.length * stageH + (stages.length - 1) * gapH;
  const topY = (H - totalH) / 2;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', maxWidth: W }}>
      {stages.map((stage, i) => {
        const pct = stage.count / maxCount;
        const barW = minW + pct * (maxTopW - minW);
        const y = topY + i * (stageH + gapH);
        const x0 = (W - barW) / 2;
        const x1 = (W + barW) / 2;

        const next = stages[i + 1];
        const nextBarW = next ? minW + (next.count / maxCount) * (maxTopW - minW) : barW;
        const nx0 = (W - nextBarW) / 2;
        const nx1 = (W + nextBarW) / 2;

        const convRate = next ? ((next.count / stage.count) * 100).toFixed(1) : null;

        return (
          <g key={stage.label}>
            <rect x={x0} y={y} width={barW} height={stageH} rx={6} fill={stage.color} opacity={0.9} />
            <text x={x0 - 10} y={y + stageH / 2 + 1} textAnchor="end" dominantBaseline="middle"
              fontFamily={F.body} fontSize={12} fill={C.textSecondary}>
              {stage.label}
            </text>
            <text x={x1 + 10} y={y + stageH / 2 - 7} textAnchor="start"
              fontFamily={F.mono} fontSize={15} fontWeight="bold" fill={C.textPrimary}>
              {stage.count.toLocaleString('es-AR')}
            </text>
            <text x={x1 + 10} y={y + stageH / 2 + 10} textAnchor="start"
              fontFamily={F.mono} fontSize={11} fill={C.textTertiary}>
              {Math.round(pct * 100)}%
            </text>

            {next && (
              <>
                <polygon
                  points={`${x0},${y + stageH} ${x1},${y + stageH} ${nx1},${y + stageH + gapH} ${nx0},${y + stageH + gapH}`}
                  fill={stage.color} opacity={0.25}
                />
                <text x={W / 2} y={y + stageH + gapH / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                  fontFamily={F.mono} fontSize={10} fill={C.textTertiary}>
                  {convRate}% ↓
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Scatter chart ──────────────────────────────────────────── */

export interface ScatterPoint {
  x: number;
  y: number;
  size?: number;
  color?: string;
  label?: string;
}

export function ScatterChart({
  points,
  xLabel,
  yLabel,
  height = 260,
}: {
  points: ScatterPoint[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const W = 600, H = height;
  const padL = 50, padR = 20, padT = 16, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxX = Math.max(...points.map(p => p.x), 1);
  const maxY = Math.max(...points.map(p => p.y), 1);

  const toSvgX = (v: number) => padL + (v / maxX) * chartW;
  const toSvgY = (v: number) => padT + chartH - (v / maxY) * chartH;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = padT + chartH - pct * chartH;
        return (
          <g key={pct}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke={C.border} strokeWidth={0.5} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontFamily={F.mono} fontSize={9} fill={C.textTertiary}>
              {Math.round(maxY * pct)}
            </text>
          </g>
        );
      })}

      {/* Axis labels */}
      {xLabel && (
        <text x={padL + chartW / 2} y={H - 4} textAnchor="middle" fontFamily={F.body} fontSize={10} fill={C.textTertiary}>
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text x={12} y={padT + chartH / 2} textAnchor="middle" fontFamily={F.body} fontSize={10} fill={C.textTertiary}
          transform={`rotate(-90, 12, ${padT + chartH / 2})`}>
          {yLabel}
        </text>
      )}

      {/* Points */}
      {points.map((p, i) => {
        const r = Math.max(4, Math.min(20, (p.size ?? 6)));
        const isHovered = hoveredIdx === i;
        return (
          <g key={i} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
            <circle
              cx={toSvgX(p.x)} cy={toSvgY(p.y)} r={isHovered ? r + 2 : r}
              fill={p.color ?? C.brand} opacity={isHovered ? 1 : 0.7}
              stroke={isHovered ? C.textPrimary : 'none'} strokeWidth={2}
              style={{ transition: 'all 0.12s', cursor: 'pointer' }}
            />
            {isHovered && p.label && (
              <text x={toSvgX(p.x)} y={toSvgY(p.y) - r - 6} textAnchor="middle"
                fontFamily={F.body} fontSize={11} fill={C.textPrimary} fontWeight={600}>
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Histogram ──────────────────────────────────────────────── */

export interface HistogramBin {
  label: string;
  count: number;
  color?: string;
}

export function HistogramChart({
  bins,
  height = 200,
  color = C.brand,
}: {
  bins: HistogramBin[];
  height?: number;
  color?: string;
}) {
  const W = 560, H = height;
  const padL = 44, padR = 16, padT = 12, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxCount = Math.max(...bins.map(b => b.count), 1);
  const barW = chartW / bins.length - 4;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {/* Y grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = padT + chartH - pct * chartH;
        return (
          <g key={pct}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke={C.border} strokeWidth={0.5} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontFamily={F.mono} fontSize={9} fill={C.textTertiary}>
              {Math.round(maxCount * pct)}
            </text>
          </g>
        );
      })}

      {bins.map((bin, i) => {
        const barH = (bin.count / maxCount) * chartH;
        const x = padL + i * (chartW / bins.length) + 2;
        const y = padT + chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill={bin.color ?? color} opacity={0.85} />
            <text x={x + barW / 2} y={H - 12} textAnchor="middle" fontFamily={F.mono} fontSize={9} fill={C.textTertiary}>
              {bin.label}
            </text>
            <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontFamily={F.mono} fontSize={10} fontWeight="bold" fill={C.textPrimary}>
              {bin.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Cohort heatmap grid ────────────────────────────────────── */

export function CohortGrid({
  rows,
  colHeaders,
  getValue,
  formatCell,
}: {
  rows: { label: string; values: number[] }[];
  colHeaders: string[];
  getValue: (value: number) => { bg: string; text: string };
  formatCell?: (value: number) => string;
}) {
  const cellW = 56;
  const cellH = 32;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, minWidth: 'fit-content' }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 100 }}>
          {colHeaders.map(h => (
            <div key={h} style={{
              width: cellW, fontFamily: F.mono, fontSize: 9,
              color: C.textTertiary, textAlign: 'center',
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div style={{
              width: 96, fontFamily: F.body, fontSize: 11,
              color: C.textSecondary, textAlign: 'right', paddingRight: 6, flexShrink: 0,
            }}>
              {row.label}
            </div>
            {row.values.map((v, ci) => {
              const { bg, text } = getValue(v);
              return (
                <div
                  key={ci}
                  style={{
                    width: cellW, height: cellH, borderRadius: 4,
                    background: bg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: text }}>
                    {formatCell ? formatCell(v) : `${v}%`}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Heatmap (7×N grid) ─────────────────────────────────────── */

export function HeatmapGrid({
  rowLabels,
  colLabels,
  data,
  colorFn,
  formatFn,
}: {
  rowLabels: string[];
  colLabels: string[];
  data: number[][];
  colorFn: (value: number) => string;
  formatFn?: (value: number) => string;
}) {
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);
  const cellW = 36, cellH = 26;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 3, minWidth: 'fit-content' }}>
        <div style={{ display: 'flex', gap: 3, marginLeft: 48 }}>
          {colLabels.map(l => (
            <div key={l} style={{ width: cellW, fontFamily: F.mono, fontSize: 9, color: C.textTertiary, textAlign: 'center' }}>
              {l}
            </div>
          ))}
        </div>
        {data.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 44, fontFamily: F.body, fontSize: 11, color: C.textSecondary, textAlign: 'right', paddingRight: 6, flexShrink: 0 }}>
              {rowLabels[ri]}
            </div>
            {row.map((v, ci) => {
              const isHov = hoveredCell?.r === ri && hoveredCell?.c === ci;
              return (
                <div
                  key={ci}
                  onMouseEnter={() => setHoveredCell({ r: ri, c: ci })}
                  onMouseLeave={() => setHoveredCell(null)}
                  title={`${rowLabels[ri]} ${colLabels[ci]}: ${formatFn ? formatFn(v) : v}`}
                  style={{
                    width: cellW, height: cellH, borderRadius: 4,
                    background: colorFn(v),
                    border: isHov ? `1px solid ${C.brand}` : '1px solid transparent',
                    cursor: 'default', flexShrink: 0, transition: 'border-color 0.1s',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── MapLibre geographic heatmap ───────────────────────────── */

export interface GeoHeatmapPoint {
  lat: number;
  lng: number;
  value: number;
  label?: string;
}

export function GeoHeatmap({
  points,
  center,
  zoom = 12,
  height = 400,
}: {
  points: GeoHeatmapPoint[];
  center: [number, number];
  zoom?: number;
  height?: number;
}) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstance = React.useRef<maplibregl.Map | null>(null);

  React.useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [{
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        }],
      },
      center,
      zoom,
    });

    map.on('load', () => {
      map.addSource('heat-data', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: points.map(p => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
            properties: { value: p.value, label: p.label ?? '' },
          })),
        },
      });

      map.addLayer({
        id: 'heat-layer',
        type: 'heatmap',
        source: 'heat-data',
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'value'], 0, 0, 1, 1],
          'heatmap-intensity': 1.2,
          'heatmap-radius': 30,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(7,13,26,0)',
            0.2, 'rgba(22,84,217,0.3)',
            0.4, 'rgba(22,84,217,0.5)',
            0.6, 'rgba(22,84,217,0.7)',
            0.8, 'rgba(24,166,89,0.8)',
            1, 'rgba(232,138,20,0.9)',
          ],
          'heatmap-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'heat-points',
        type: 'circle',
        source: 'heat-data',
        minzoom: 14,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'value'], 0, 4, 1, 12],
          'circle-color': C.brand,
          'circle-stroke-color': C.bgBase,
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.9,
        },
      });
    });

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}` }}>
      <div ref={mapRef} style={{ width: '100%', height }} />
      <div style={{
        position: 'absolute', bottom: 12, left: 12,
        background: `${C.bgRaised}ee`, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: '8px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>Baja</span>
        {['rgba(22,84,217,0.3)', 'rgba(22,84,217,0.5)', 'rgba(22,84,217,0.7)', 'rgba(24,166,89,0.8)', 'rgba(232,138,20,0.9)'].map((bg, i) => (
          <div key={i} style={{ width: 20, height: 12, borderRadius: 2, background: bg }} />
        ))}
        <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>Alta</span>
      </div>
    </div>
  );
}

/* ─── MV Refresh status indicator ──────────────────────────── */

export type RefreshStatus = 'idle' | 'refreshing' | 'done' | 'error';

export function RefreshIndicator({
  status,
  lastRefreshed,
  onRefresh,
}: {
  status: RefreshStatus;
  lastRefreshed?: string;
  onRefresh?: () => void;
}) {
  const [showDone, setShowDone] = React.useState(false);

  React.useEffect(() => {
    if (status !== 'done') return;
    setShowDone(true);
    const t = setTimeout(() => setShowDone(false), 2500);
    return () => clearTimeout(t);
  }, [status]);

  const isRefreshing = status === 'refreshing';
  const displayStatus = showDone ? 'done' : status;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 12px', borderRadius: 8,
      background: isRefreshing ? C.brandFaint : displayStatus === 'done' ? C.successFaint : displayStatus === 'error' ? 'rgba(232,59,59,0.08)' : C.bgElevated,
      border: `1px solid ${isRefreshing ? C.brand : displayStatus === 'done' ? C.success : displayStatus === 'error' ? C.error : C.border}`,
      transition: 'all 0.2s',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: isRefreshing ? C.brand : displayStatus === 'done' ? C.success : displayStatus === 'error' ? C.error : C.textTertiary,
        animation: isRefreshing ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
      }} />
      <span style={{
        fontFamily: F.mono, fontSize: 11,
        color: isRefreshing ? C.brand : displayStatus === 'done' ? C.success : displayStatus === 'error' ? C.error : C.textTertiary,
      }}>
        {isRefreshing ? 'Actualizando MV…' : displayStatus === 'done' ? 'Datos actualizados' : displayStatus === 'error' ? 'Error al refrescar' : lastRefreshed ?? 'Sin datos'}
      </span>
      {(status === 'idle' || status === 'error') && onRefresh && (
        <button
          onClick={onRefresh}
          style={{
            width: 22, height: 22, borderRadius: 4,
            border: 'none', background: 'transparent',
            color: C.textTertiary, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}
          aria-label="Refrescar"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      )}
      <style>{`@keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}

/* ─── Rank badge ─────────────────────────────────────────────── */

export function RankBadge({ rank, change }: { rank: number; change?: number }) {
  const colors = rank <= 3
    ? { bg: 'rgba(22,84,217,0.15)', text: C.brand }
    : { bg: C.bgElevated, text: C.textSecondary };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, borderRadius: 6,
        background: colors.bg, fontFamily: F.mono,
        fontSize: 12, fontWeight: 700, color: colors.text,
      }}>
        {rank}
      </span>
      {change !== undefined && change !== 0 && (
        <span style={{
          fontFamily: F.mono, fontSize: 10,
          color: change > 0 ? C.success : C.error,
        }}>
          {change > 0 ? `↑${change}` : `↓${Math.abs(change)}`}
        </span>
      )}
    </div>
  );
}
