import React, { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  BarChart2, TrendingUp, TrendingDown, LineChart, PieChart,
  Download, Mail, Calendar, Filter, Search, Clock,
  ArrowUpRight, ArrowDownRight, Users, Home, FileText,
  AlertTriangle, Check,
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

type Category = 'all' | 'operational' | 'strategic';

interface SparklineData {
  points: number[];
  type: 'line' | 'bar';
}

interface ReportCard {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  name: string;
  category: 'operational' | 'strategic';
  badge: string;
  badgeColor: string;
  badgeBg: string;
  metric: string;
  delta: string;
  deltaPositive: boolean;
  deltaFlat?: boolean;
  sparkline: SparklineData;
}

/* ─── Sparkline SVG ──────────────────────────────────────────────── */

function MiniSparkline({ data, color }: { data: SparklineData; color: string }) {
  const W = 60;
  const H = 30;
  const pts = data.points;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;

  if (data.type === 'line') {
    const points = pts
      .map((v, i) => {
        const x = (i / (pts.length - 1)) * W;
        const y = H - 4 - ((v - min) / range) * (H - 8);
        return `${x},${y}`;
      })
      .join(' ');

    const areaPoints =
      `0,${H} ` +
      pts
        .map((v, i) => {
          const x = (i / (pts.length - 1)) * W;
          const y = H - 4 - ((v - min) / range) * (H - 8);
          return `${x},${y}`;
        })
        .join(' ') +
      ` ${W},${H}`;

    return (
      <svg width={W} height={H} style={{ overflow: 'visible', flexShrink: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon
          points={areaPoints}
          fill={`url(#sg-${color.replace('#', '')})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {(() => {
          const last = pts[pts.length - 1] ?? min;
          const lx = W;
          const ly = H - 4 - ((last - min) / range) * (H - 8);
          return <circle cx={lx} cy={ly} r={2.5} fill={color} />;
        })()}
      </svg>
    );
  }

  // Bar sparkline
  const barW = Math.floor(W / pts.length) - 2;
  return (
    <svg width={W} height={H} style={{ overflow: 'visible', flexShrink: 0 }}>
      {pts.map((v, i) => {
        const barH = Math.max(2, ((v - min) / range) * (H - 4));
        const x = i * (W / pts.length);
        const y = H - barH;
        return (
          <rect
            key={i}
            x={x + 1}
            y={y}
            width={Math.max(barW, 2)}
            height={barH}
            rx={1}
            fill={color}
            opacity={i === pts.length - 1 ? 1 : 0.5}
          />
        );
      })}
    </svg>
  );
}

/* ─── Report card data ───────────────────────────────────────────── */

const TEAL = '#0ED2A0';
const PURPLE = '#7E3AF2';

const OPERATIONAL_CARDS: ReportCard[] = [
  {
    id: 'funnel-conversion',
    icon: <Filter size={16} color="#fff" />,
    iconBg: C.warning,
    name: 'Conversión de Funnel',
    category: 'operational',
    badge: 'Conversión',
    badgeColor: C.warning,
    badgeBg: C.warningFaint,
    metric: '34%',
    delta: '+4.2%',
    deltaPositive: true,
    sparkline: { type: 'line', points: [22, 25, 24, 27, 26, 29, 28, 30, 31, 29, 32, 34] },
  },
  {
    id: 'agent-productivity',
    icon: <Users size={16} color="#fff" />,
    iconBg: C.brand,
    name: 'Productividad de Agentes',
    category: 'operational',
    badge: 'Agentes',
    badgeColor: C.brand,
    badgeBg: C.brandFaint,
    metric: '8.4 ops/agente',
    delta: '+1.1%',
    deltaPositive: true,
    sparkline: { type: 'bar', points: [6.2, 6.8, 7.0, 7.1, 7.4, 7.6, 7.9, 8.0, 8.1, 8.2, 8.3, 8.4] },
  },
  {
    id: 'listing-performance',
    icon: <Home size={16} color="#fff" />,
    iconBg: TEAL,
    name: 'Performance de Propiedades',
    category: 'operational',
    badge: 'Propiedades',
    badgeColor: TEAL,
    badgeBg: 'rgba(14,210,160,0.12)',
    metric: '142 activas',
    delta: '-2.3%',
    deltaPositive: false,
    sparkline: { type: 'line', points: [155, 152, 150, 148, 149, 147, 145, 144, 143, 142, 143, 142] },
  },
  {
    id: 'portal-roi',
    icon: <BarChart2 size={16} color="#fff" />,
    iconBg: PURPLE,
    name: 'ROI de Portales',
    category: 'operational',
    badge: 'Portales',
    badgeColor: PURPLE,
    badgeBg: C.aiFaint,
    metric: '$124/lead',
    delta: '+12.5%',
    deltaPositive: true,
    sparkline: { type: 'bar', points: [88, 92, 96, 98, 100, 104, 108, 110, 114, 118, 121, 124] },
  },
  {
    id: 'sla-adherence',
    icon: <Clock size={16} color="#fff" />,
    iconBg: C.warning,
    name: 'SLA de Consultas',
    category: 'operational',
    badge: 'Operaciones',
    badgeColor: C.warning,
    badgeBg: C.warningFaint,
    metric: '2.3h resp.',
    delta: '-15%',
    deltaPositive: true,
    sparkline: { type: 'line', points: [3.8, 3.6, 3.5, 3.4, 3.2, 3.1, 3.0, 2.9, 2.8, 2.6, 2.4, 2.3] },
  },
  {
    id: 'inbox-activity',
    icon: <Mail size={16} color="#fff" />,
    iconBg: C.brand,
    name: 'Actividad de Inbox',
    category: 'operational',
    badge: 'Comunicaciones',
    badgeColor: C.brand,
    badgeBg: C.brandFaint,
    metric: '847 mensajes',
    delta: '+8.7%',
    deltaPositive: true,
    sparkline: { type: 'bar', points: [560, 590, 610, 640, 670, 695, 710, 730, 755, 780, 820, 847] },
  },
  {
    id: 'closing-calendar',
    icon: <Calendar size={16} color="#fff" />,
    iconBg: C.success,
    name: 'Calendario de Cierres',
    category: 'operational',
    badge: 'Cierres',
    badgeColor: C.success,
    badgeBg: C.successFaint,
    metric: '23 cierres',
    delta: '+3',
    deltaPositive: true,
    sparkline: { type: 'line', points: [12, 14, 15, 16, 17, 18, 18, 19, 20, 20, 22, 23] },
  },
  {
    id: 'pipeline-by-branch',
    icon: <Filter size={16} color="#fff" />,
    iconBg: C.bgSubtle,
    name: 'Pipeline por Rama',
    category: 'operational',
    badge: 'Pipeline',
    badgeColor: C.textSecondary,
    badgeBg: 'rgba(141,160,192,0.1)',
    metric: '$4.2M activo',
    delta: '+18.3%',
    deltaPositive: true,
    sparkline: { type: 'bar', points: [2.8, 2.9, 3.0, 3.1, 3.2, 3.4, 3.5, 3.7, 3.8, 3.9, 4.1, 4.2] },
  },
  {
    id: 'reservation-rates',
    icon: <Check size={16} color="#fff" />,
    iconBg: C.success,
    name: 'Tasas de Reserva',
    category: 'operational',
    badge: 'Reservas',
    badgeColor: C.success,
    badgeBg: C.successFaint,
    metric: '76% tasa',
    delta: '+5.1%',
    deltaPositive: true,
    sparkline: { type: 'line', points: [62, 65, 66, 68, 69, 70, 71, 72, 73, 74, 75, 76] },
  },
  {
    id: 'document-expiry',
    icon: <FileText size={16} color="#fff" />,
    iconBg: C.error,
    name: 'Vencimiento de Docs',
    category: 'operational',
    badge: 'Documentos',
    badgeColor: C.error,
    badgeBg: 'rgba(232,59,59,0.12)',
    metric: '7 vencen',
    delta: '0 nuevos',
    deltaPositive: true,
    deltaFlat: true,
    sparkline: { type: 'line', points: [7, 7, 7, 8, 8, 7, 7, 7, 7, 7, 7, 7] },
  },
  {
    id: 'captured-listings',
    icon: <TrendingUp size={16} color="#fff" />,
    iconBg: C.brand,
    name: 'Captaciones del Mes',
    category: 'operational',
    badge: 'Captaciones',
    badgeColor: C.brand,
    badgeBg: C.brandFaint,
    metric: '28 captadas',
    delta: '+14%',
    deltaPositive: true,
    sparkline: { type: 'line', points: [16, 18, 19, 20, 21, 22, 22, 23, 24, 25, 27, 28] },
  },
  {
    id: 'inventory-balance',
    icon: <BarChart2 size={16} color="#fff" />,
    iconBg: TEAL,
    name: 'Nuevos vs Vendidos',
    category: 'operational',
    badge: 'Inventario',
    badgeColor: TEAL,
    badgeBg: 'rgba(14,210,160,0.12)',
    metric: '28:12 ratio',
    delta: '+6%',
    deltaPositive: true,
    sparkline: { type: 'bar', points: [18, 19, 20, 20, 21, 22, 23, 24, 25, 26, 27, 28] },
  },
];

const STRATEGIC_CARDS: ReportCard[] = [
  {
    id: 'revenue-trend',
    icon: <TrendingUp size={16} color="#fff" />,
    iconBg: C.success,
    name: 'Tendencia de Ingresos',
    category: 'strategic',
    badge: 'Financiero',
    badgeColor: C.success,
    badgeBg: C.successFaint,
    metric: '$287K',
    delta: '+22.4%',
    deltaPositive: true,
    sparkline: { type: 'line', points: [180, 195, 200, 210, 215, 225, 235, 245, 255, 265, 278, 287] },
  },
  {
    id: 'pipeline-velocity',
    icon: <BarChart2 size={16} color="#fff" />,
    iconBg: C.brand,
    name: 'Pronóstico de Pipeline',
    category: 'strategic',
    badge: 'Pipeline',
    badgeColor: C.brand,
    badgeBg: C.brandFaint,
    metric: '$1.2M próx. 90d',
    delta: '+8%',
    deltaPositive: true,
    sparkline: { type: 'line', points: [900, 920, 940, 960, 980, 1000, 1040, 1080, 1100, 1130, 1160, 1200] },
  },
  {
    id: 'zone-analysis',
    icon: <PieChart size={16} color="#fff" />,
    iconBg: PURPLE,
    name: 'Participación de Mercado',
    category: 'strategic',
    badge: 'Estratégico',
    badgeColor: PURPLE,
    badgeBg: C.aiFaint,
    metric: '18.4% zona',
    delta: '+2.1%',
    deltaPositive: true,
    sparkline: { type: 'line', points: [16, 16, 16.5, 17, 17, 17.2, 17.5, 17.8, 18, 18.1, 18.3, 18.4] },
  },
  {
    id: 'retention-cohort',
    icon: <Users size={16} color="#fff" />,
    iconBg: C.warning,
    name: 'Análisis de Retención',
    category: 'strategic',
    badge: 'Retención',
    badgeColor: C.warning,
    badgeBg: C.warningFaint,
    metric: '84% retención',
    delta: '-1.2%',
    deltaPositive: false,
    sparkline: { type: 'line', points: [88, 87, 87, 86, 86, 86, 85, 85, 85, 84, 84, 84] },
  },
  {
    id: 'price-evolution',
    icon: <TrendingUp size={16} color="#fff" />,
    iconBg: TEAL,
    name: 'Evolución de Precios',
    category: 'strategic',
    badge: 'Mercado',
    badgeColor: TEAL,
    badgeBg: 'rgba(14,210,160,0.12)',
    metric: '$2,840/m²',
    delta: '+3.8%',
    deltaPositive: true,
    sparkline: { type: 'line', points: [2650, 2680, 2700, 2720, 2740, 2760, 2780, 2790, 2800, 2815, 2830, 2840] },
  },
  {
    id: 'customer-acquisition',
    icon: <AlertTriangle size={16} color="#fff" />,
    iconBg: C.error,
    name: 'Costo de Adquisición',
    category: 'strategic',
    badge: 'CAC',
    badgeColor: C.error,
    badgeBg: 'rgba(232,59,59,0.12)',
    metric: '$420/cliente',
    delta: '-12%',
    deltaPositive: true,
    sparkline: { type: 'line', points: [560, 540, 525, 510, 500, 490, 480, 470, 460, 450, 435, 420] },
  },
  {
    id: 'lead-cohorts',
    icon: <BarChart2 size={16} color="#fff" />,
    iconBg: C.brand,
    name: 'LTV por Segmento',
    category: 'strategic',
    badge: 'LTV',
    badgeColor: C.brand,
    badgeBg: C.brandFaint,
    metric: '$12.4K LTV',
    delta: '+5.3%',
    deltaPositive: true,
    sparkline: { type: 'bar', points: [10.2, 10.5, 10.8, 11.0, 11.2, 11.4, 11.6, 11.8, 12.0, 12.1, 12.3, 12.4] },
  },
  {
    id: 'ai-usage',
    icon: <BarChart2 size={16} color="#fff" />,
    iconBg: PURPLE,
    name: 'Análisis de Portales',
    category: 'strategic',
    badge: 'Portales',
    badgeColor: PURPLE,
    badgeBg: C.aiFaint,
    metric: '4 portales',
    delta: 'datos variados',
    deltaPositive: true,
    deltaFlat: true,
    sparkline: { type: 'bar', points: [3.1, 3.0, 3.2, 3.1, 3.3, 3.4, 3.2, 3.5, 3.6, 3.5, 3.7, 3.6] },
  },
  {
    id: 'revenue-forecast',
    icon: <TrendingUp size={16} color="#fff" />,
    iconBg: C.success,
    name: 'Expansión de Cartera',
    category: 'strategic',
    badge: 'Cartera',
    badgeColor: C.success,
    badgeBg: C.successFaint,
    metric: '+14 propiedades',
    delta: '+22%',
    deltaPositive: true,
    sparkline: { type: 'line', points: [4, 5, 6, 7, 7, 8, 9, 10, 11, 12, 13, 14] },
  },
  {
    id: 'commission-owed',
    icon: <FileText size={16} color="#fff" />,
    iconBg: C.bgSubtle,
    name: 'Reporte Ejecutivo',
    category: 'strategic',
    badge: 'Ejecutivo',
    badgeColor: C.textSecondary,
    badgeBg: 'rgba(141,160,192,0.1)',
    metric: 'Mensual',
    delta: 'actualizado hoy',
    deltaPositive: true,
    deltaFlat: true,
    sparkline: { type: 'line', points: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  },
];

/* ─── Single card component ──────────────────────────────────────── */

function Card({ card, onClick }: { card: ReportCard; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);

  const deltaColor = card.deltaFlat
    ? C.textTertiary
    : card.deltaPositive
    ? C.success
    : C.error;

  const sparkColor = card.deltaFlat
    ? C.textTertiary
    : card.deltaPositive
    ? C.brand
    : C.error;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: hovered ? C.bgElevated : C.bgRaised,
        border: `1px solid ${hovered ? '#2A3D5C' : C.border}`,
        borderRadius: 12,
        padding: '18px 18px 16px',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Icon */}
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: card.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {card.icon}
          </div>
          {/* Name */}
          <span style={{
            fontFamily: F.display,
            fontSize: 15,
            fontWeight: 500,
            color: C.textPrimary,
            lineHeight: 1.3,
          }}>
            {card.name}
          </span>
        </div>
        {/* Category badge */}
        <span style={{
          fontFamily: F.mono,
          fontSize: 10,
          color: card.badgeColor,
          background: card.badgeBg,
          padding: '2px 7px',
          borderRadius: 20,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          letterSpacing: '0.02em',
        }}>
          {card.badge}
        </span>
      </div>

      {/* Sparkline */}
      <div style={{ lineHeight: 0 }}>
        <MiniSparkline data={card.sparkline} color={sparkColor} />
      </div>

      {/* Metric row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontFamily: F.mono,
            fontSize: 22,
            fontWeight: 700,
            color: C.textPrimary,
            lineHeight: 1,
          }}>
            {card.metric}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            marginTop: 5,
          }}>
            {!card.deltaFlat && (
              card.deltaPositive
                ? <ArrowUpRight size={13} color={deltaColor} />
                : <ArrowDownRight size={13} color={deltaColor} />
            )}
            <span style={{
              fontFamily: F.body,
              fontSize: 12,
              color: deltaColor,
              fontWeight: 500,
            }}>
              {card.delta}
            </span>
          </div>
        </div>

        {/* "Ver informe" link */}
        <span style={{
          fontFamily: F.body,
          fontSize: 13,
          color: hovered ? C.brand : C.textTertiary,
          transition: 'color 0.15s',
          letterSpacing: '-0.01em',
        }}>
          Ver informe →
        </span>
      </div>
    </div>
  );
}

/* ─── Section header ─────────────────────────────────────────────── */

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 10,
      marginBottom: 16,
    }}>
      <h2 style={{
        fontFamily: F.display,
        fontSize: 18,
        fontWeight: 700,
        color: C.textPrimary,
        margin: 0,
      }}>
        {title}
      </h2>
      <span style={{
        fontFamily: F.mono,
        fontSize: 11,
        color: C.textTertiary,
        background: C.bgElevated,
        border: `1px solid ${C.border}`,
        padding: '1px 7px',
        borderRadius: 10,
      }}>
        {count}
      </span>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */

export default function ReportsIndexPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchFocused, setSearchFocused] = useState(false);
  const goToReport = useCallback((slug: string) => navigate({ to: `/reports/${slug}` }), [navigate]);

  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const matchesSearch = (card: ReportCard) => {
    if (!searchQuery) return true;
    const q = normalize(searchQuery);
    return normalize(card.name).includes(q) || normalize(card.badge).includes(q);
  };

  const matchesCategory = (card: ReportCard) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'operational') return card.category === 'operational';
    if (activeCategory === 'strategic') return card.category === 'strategic';
    return true;
  };

  const filteredOp = OPERATIONAL_CARDS.filter(c => matchesSearch(c) && matchesCategory(c));
  const filteredSt = STRATEGIC_CARDS.filter(c => matchesSearch(c) && matchesCategory(c));
  const totalFiltered = filteredOp.length + filteredSt.length;

  const PILLS: { id: Category; label: string }[] = [
    { id: 'all',          label: 'Todos' },
    { id: 'operational',  label: 'Operacional' },
    { id: 'strategic',    label: 'Estratégico' },
  ];

  return (
    <div style={{
      padding: '32px 36px 48px',
      fontFamily: F.body,
      maxWidth: 1200,
      margin: '0 auto',
      minHeight: '100vh',
      background: C.bgBase,
    }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: F.display,
          fontSize: 28,
          fontWeight: 700,
          color: C.textPrimary,
          margin: '0 0 8px',
          letterSpacing: '-0.02em',
        }}>
          Reportes
        </h1>
        <p style={{
          fontFamily: F.body,
          fontSize: 14,
          color: C.textSecondary,
          margin: 0,
        }}>
          Análisis y métricas de tu operación inmobiliaria
        </p>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 36,
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}>
          <Search
            size={14}
            color={searchFocused ? C.brand : C.textTertiary}
            style={{
              position: 'absolute',
              left: 11,
              pointerEvents: 'none',
              transition: 'color 0.15s',
            }}
          />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Buscar reporte…"
            style={{
              paddingLeft: 32,
              paddingRight: 12,
              paddingTop: 8,
              paddingBottom: 8,
              borderRadius: 8,
              border: `1px solid ${searchFocused ? C.brand : C.border}`,
              background: C.bgRaised,
              color: C.textPrimary,
              fontFamily: F.body,
              fontSize: 13,
              outline: 'none',
              width: 240,
              transition: 'border-color 0.15s',
            }}
          />
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {PILLS.map(pill => {
            const active = activeCategory === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setActiveCategory(pill.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: `1px solid ${active ? C.brand : C.border}`,
                  background: active ? C.brand : C.bgElevated,
                  color: active ? '#fff' : C.textSecondary,
                  fontFamily: F.body,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Result count */}
        {(searchQuery || activeCategory !== 'all') && (
          <span style={{
            fontFamily: F.mono,
            fontSize: 12,
            color: C.textTertiary,
            marginLeft: 4,
          }}>
            {totalFiltered} resultado{totalFiltered !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Operacional section */}
      {(activeCategory === 'all' || activeCategory === 'operational') && filteredOp.length > 0 && (
        <div style={{ marginBottom: 44 }}>
          <SectionHeader title="Operacional" count={filteredOp.length} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}>
            {filteredOp.map(card => (
              <Card key={card.id} card={card} onClick={() => goToReport(card.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Estratégico section */}
      {(activeCategory === 'all' || activeCategory === 'strategic') && filteredSt.length > 0 && (
        <div>
          <SectionHeader title="Estratégico" count={filteredSt.length} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}>
            {filteredSt.map(card => (
              <Card key={card.id} card={card} onClick={() => goToReport(card.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalFiltered === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '80px 0',
          color: C.textTertiary,
        }}>
          <LineChart size={40} color={C.border} style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: F.body, fontSize: 15, color: C.textSecondary, marginBottom: 6 }}>
            Sin resultados para &quot;{searchQuery}&quot;
          </p>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, margin: 0 }}>
            Intentá con otro término o cambiá la categoría
          </p>
        </div>
      )}
    </div>
  );
}
