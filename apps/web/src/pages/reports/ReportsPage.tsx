import React, { useState } from 'react';
import { C, F } from '../../components/copilot/tokens.js';

/* ─── Types ─────────────────────────────────────────────────────── */

interface Report {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: 'conversion' | 'listings' | 'agents' | 'financial' | 'operations';
  audience: ('agent' | 'manager' | 'admin')[];
  lastRefresh: string;
  kpi: { label: string; value: string; delta?: string; deltaDir?: 'up' | 'down' };
  sparkline: number[];
}

/* ─── Mock data ──────────────────────────────────────────────────── */

const REPORTS: Report[] = [
  {
    id: 'r1', slug: 'funnel-conversion', title: 'Conversión de Pipeline',
    subtitle: 'Tasa de conversión por etapa y cohorte',
    category: 'conversion', audience: ['manager', 'admin'],
    lastRefresh: 'hace 12 min',
    kpi: { label: 'Tasa global', value: '18.4%', delta: '+2.1pp', deltaDir: 'up' },
    sparkline: [12, 15, 14, 17, 16, 19, 18, 21, 18, 22, 20, 18],
  },
  {
    id: 'r2', slug: 'agent-productivity', title: 'Productividad de Agentes',
    subtitle: 'Ranking por leads, cierres y tiempo de respuesta',
    category: 'agents', audience: ['manager', 'admin'],
    lastRefresh: 'hace 1h',
    kpi: { label: 'Tiempo resp. promedio', value: '2.4h', delta: '-18 min', deltaDir: 'up' },
    sparkline: [8, 9, 7, 10, 11, 10, 12, 11, 13, 14, 12, 14],
  },
  {
    id: 'r3', slug: 'listing-performance', title: 'Performance de Listings',
    subtitle: 'Días en mercado, visitas, consultas por publicación',
    category: 'listings', audience: ['agent', 'manager', 'admin'],
    lastRefresh: 'hace 45 min',
    kpi: { label: 'DOM promedio', value: '34 días', delta: '-6 días', deltaDir: 'up' },
    sparkline: [40, 38, 42, 36, 35, 33, 37, 34, 32, 30, 33, 34],
  },
  {
    id: 'r4', slug: 'inquiry-heatmap', title: 'Mapa de Consultas',
    subtitle: 'Distribución horaria y geográfica de leads entrantes',
    category: 'conversion', audience: ['manager', 'admin'],
    lastRefresh: 'hace 2h',
    kpi: { label: 'Pico horario', value: '19–21 hs', delta: 'Lun–Vie', deltaDir: 'up' },
    sparkline: [2, 4, 3, 6, 8, 10, 12, 14, 13, 11, 9, 6],
  },
  {
    id: 'r5', slug: 'revenue-forecast', title: 'Pronóstico de Ingresos',
    subtitle: 'Proyección de comisiones basada en pipeline activo',
    category: 'financial', audience: ['admin'],
    lastRefresh: 'noche anterior',
    kpi: { label: 'Proyección 90d', value: 'USD 48.2K', delta: '+12%', deltaDir: 'up' },
    sparkline: [30, 32, 31, 35, 38, 37, 40, 41, 43, 42, 45, 48],
  },
  {
    id: 'r6', slug: 'portal-reach', title: 'Alcance en Portales',
    subtitle: 'Impresiones y CTR en Zonaprop, Argenprop, MercadoLibre',
    category: 'listings', audience: ['agent', 'manager', 'admin'],
    lastRefresh: 'hace 3h',
    kpi: { label: 'CTR promedio', value: '3.7%', delta: '+0.4pp', deltaDir: 'up' },
    sparkline: [3.1, 3.2, 3.0, 3.4, 3.5, 3.3, 3.6, 3.5, 3.7, 3.6, 3.8, 3.7],
  },
  {
    id: 'r7', slug: 'sla-compliance', title: 'Cumplimiento de SLA',
    subtitle: 'Primera respuesta, seguimiento y cierre por pipeline',
    category: 'operations', audience: ['manager', 'admin'],
    lastRefresh: 'hace 30 min',
    kpi: { label: 'SLA compliance', value: '82%', delta: '+4pp', deltaDir: 'up' },
    sparkline: [72, 74, 76, 73, 78, 80, 79, 81, 80, 83, 82, 82],
  },
  {
    id: 'r8', slug: 'contact-growth', title: 'Crecimiento de Contactos',
    subtitle: 'Nuevos contactos, fuentes y segmentación',
    category: 'conversion', audience: ['manager', 'admin'],
    lastRefresh: 'noche anterior',
    kpi: { label: 'Nuevos este mes', value: '+147', delta: '+23 vs mes ant.', deltaDir: 'up' },
    sparkline: [80, 85, 90, 88, 95, 100, 105, 110, 108, 115, 120, 147],
  },
  {
    id: 'r9', slug: 'deal-velocity', title: 'Velocidad de Cierre',
    subtitle: 'Tiempo promedio por etapa hasta el cierre',
    category: 'conversion', audience: ['agent', 'manager', 'admin'],
    lastRefresh: 'hace 1h',
    kpi: { label: 'Días hasta cierre', value: '47 días', delta: '-8 días', deltaDir: 'up' },
    sparkline: [62, 58, 55, 53, 56, 50, 48, 52, 47, 49, 46, 47],
  },
  {
    id: 'r10', slug: 'ai-adoption', title: 'Adopción de IA',
    subtitle: 'Uso del copilot, descripciones generadas y acierto de clasificación',
    category: 'operations', audience: ['admin'],
    lastRefresh: 'hace 4h',
    kpi: { label: 'Sesiones copilot/día', value: '34', delta: '+18%', deltaDir: 'up' },
    sparkline: [15, 18, 20, 22, 24, 23, 26, 28, 30, 32, 33, 34],
  },
];

const CATEGORY_CONFIG = {
  conversion:  { label: 'Conversión',  color: C.brand,   bg: C.brandFaint },
  listings:    { label: 'Listings',    color: '#18A659', bg: 'rgba(24,166,89,0.12)' },
  agents:      { label: 'Agentes',     color: '#E88A14', bg: 'rgba(232,138,20,0.12)' },
  financial:   { label: 'Financiero',  color: '#9B59FF', bg: 'rgba(155,89,255,0.12)' },
  operations:  { label: 'Operaciones', color: C.textSecondary, bg: 'rgba(141,160,192,0.1)' },
} as const;

const AUDIENCE_LABELS: Record<string, string> = {
  agent: 'Agente', manager: 'Manager', admin: 'Admin',
};

type CategoryFilter = 'all' | Report['category'];
type SortBy = 'name' | 'refresh' | 'category';

/* ─── Sub-components ─────────────────────────────────────────────── */

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 80, h = 28;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      {/* Last point dot */}
      {data.length > 0 && (() => {
        const last = data[data.length - 1];
        const lx = w;
        const ly = h - ((last - min) / range) * (h - 4) - 2;
        return <circle cx={lx} cy={ly} r={3} fill={color} />;
      })()}
    </svg>
  );
}

function ReportCard({ report, onOpen }: { report: Report; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const cat = CATEGORY_CONFIG[report.category];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
      style={{
        background: hovered ? C.bgElevated : C.bgRaised,
        border: `1px solid ${hovered ? C.borderHover : C.border}`,
        borderRadius: 12, padding: '20px 20px 18px',
        cursor: 'pointer', transition: 'all 0.15s',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      {/* Top row: category + audience badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: F.mono, fontSize: 10, fontWeight: 600,
          color: cat.color, background: cat.bg,
          padding: '2px 8px', borderRadius: 20, letterSpacing: '0.04em',
        }}>
          {cat.label}
        </span>
        {report.audience.map(a => (
          <span key={a} style={{
            fontFamily: F.mono, fontSize: 9, color: C.textTertiary,
            background: C.bgBase, border: `1px solid ${C.border}`,
            padding: '1px 6px', borderRadius: 10,
          }}>
            {AUDIENCE_LABELS[a]}
          </span>
        ))}
      </div>

      {/* Title */}
      <div>
        <h3 style={{
          fontFamily: F.display, fontSize: 15, fontWeight: 700,
          color: C.textPrimary, margin: '0 0 4px', lineHeight: 1.3,
        }}>
          {report.title}
        </h3>
        <p style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.4 }}>
          {report.subtitle}
        </p>
      </div>

      {/* KPI + sparkline */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
            {report.kpi.label}
          </p>
          <p style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: 0, lineHeight: 1 }}>
            {report.kpi.value}
          </p>
          {report.kpi.delta && (
            <p style={{
              fontFamily: F.body, fontSize: 11, margin: '4px 0 0',
              color: report.kpi.deltaDir === 'up' ? C.success : '#E83B3B',
            }}>
              {report.kpi.deltaDir === 'up' ? '↑' : '↓'} {report.kpi.delta}
            </p>
          )}
        </div>
        <Sparkline data={report.sparkline} color={cat.color} />
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 10, borderTop: `1px solid ${C.border}`,
      }}>
        <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>
          Actualizado {report.lastRefresh}
        </span>
        <span style={{ fontFamily: F.body, fontSize: 11, color: hovered ? C.brandLight : C.textTertiary, transition: 'color 0.15s' }}>
          Ver reporte →
        </span>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

export default function ReportsPage() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('category');

  const filtered = REPORTS.filter(r => {
    const matchesSearch = !search
      || r.title.toLowerCase().includes(search.toLowerCase())
      || r.subtitle.toLowerCase().includes(search.toLowerCase());
    const matchesCat = catFilter === 'all' || r.category === catFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ padding: '28px 32px', fontFamily: F.body, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: '0 0 6px' }}>
          Reportes
        </h1>
        <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: 0 }}>
          {REPORTS.length} reportes operativos y estratégicos · datos en tiempo real y nocturnos
        </p>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap',
      }}>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar reporte…"
          style={{
            padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.bgRaised, color: C.textPrimary,
            fontFamily: F.body, fontSize: 13, outline: 'none', width: 220,
          }}
        />

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'conversion', 'listings', 'agents', 'financial', 'operations'] as const).map(cat => {
            const active = catFilter === cat;
            const cfg = cat !== 'all' ? CATEGORY_CONFIG[cat] : null;
            return (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: `1px solid ${active ? (cfg?.color ?? C.brand) : C.border}`,
                  background: active ? (cfg?.bg ?? C.brandFaint) : 'transparent',
                  color: active ? (cfg?.color ?? C.brand) : C.textSecondary,
                  fontFamily: F.body, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {cat === 'all' ? 'Todos' : CATEGORY_CONFIG[cat].label}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary }}>Ordenar:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            style={{
              padding: '5px 10px', borderRadius: 6, border: `1px solid ${C.border}`,
              background: C.bgRaised, color: C.textSecondary,
              fontFamily: F.body, fontSize: 12, cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="category">Categoría</option>
            <option value="name">Nombre A–Z</option>
            <option value="refresh">Actualización</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16,
      }}>
        {filtered.map(report => (
          <ReportCard
            key={report.id}
            report={report}
            onOpen={() => window.location.assign(`/reports/${report.slug}`)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>📊</span>
          <p style={{ fontFamily: F.body, fontSize: 14, color: C.textTertiary }}>
            No se encontraron reportes para "{search}"
          </p>
        </div>
      )}
    </div>
  );
}
