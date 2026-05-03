import React from 'react';
import { C, F } from '../../../components/copilot/tokens.js';
import ReportShell from '../ReportShell.js';
import type { FilterConfig, ExportableData } from '../ReportShell.js';
import {
  KpiRow,
  DataTable,
  WidgetCard,
  HorizontalBarChart,
  ScatterChart,
  HistogramChart,
} from '../charts.js';
import type { TableColumn } from '../charts.js';

/* ─── Mock data ─────────────────────────────────────────────── */

const LISTINGS: Record<string, unknown>[] = [
  { address: 'Av. Libertador 4200, Núñez',       operation_kind: 'Venta', price: 285000, days_on_market: 12,  total_portal_views: 2340, total_portal_leads: 48, price_reduction_pct: 0   },
  { address: 'Thames 1850, Palermo',              operation_kind: 'Alquiler', price: 1200,  days_on_market: 5,   total_portal_views: 1890, total_portal_leads: 62, price_reduction_pct: 0   },
  { address: 'Juncal 3100, Recoleta',             operation_kind: 'Venta', price: 420000, days_on_market: 34,  total_portal_views: 1560, total_portal_leads: 35, price_reduction_pct: 3.5 },
  { address: 'Defensa 900, San Telmo',            operation_kind: 'Venta', price: 195000, days_on_market: 67,  total_portal_views: 890,  total_portal_leads: 18, price_reduction_pct: 5.2 },
  { address: 'Av. Cabildo 2800, Belgrano',        operation_kind: 'Alquiler', price: 980,   days_on_market: 8,   total_portal_views: 1450, total_portal_leads: 55, price_reduction_pct: 0   },
  { address: 'Honduras 5400, Palermo Soho',       operation_kind: 'Venta', price: 310000, days_on_market: 95,  total_portal_views: 620,  total_portal_leads: 9,  price_reduction_pct: 0   },
  { address: 'Av. Santa Fe 3200, Barrio Norte',   operation_kind: 'Venta', price: 375000, days_on_market: 110, total_portal_views: 480,  total_portal_leads: 6,  price_reduction_pct: 0   },
  { address: 'Gorriti 4800, Palermo',             operation_kind: 'Alquiler', price: 1500,  days_on_market: 22,  total_portal_views: 1120, total_portal_leads: 41, price_reduction_pct: 2.1 },
  { address: 'Arenales 1600, Recoleta',           operation_kind: 'Venta', price: 520000, days_on_market: 48,  total_portal_views: 1340, total_portal_leads: 28, price_reduction_pct: 4.8 },
  { address: 'Av. Corrientes 5600, Villa Crespo', operation_kind: 'Alquiler', price: 850,   days_on_market: 130, total_portal_leads: 3,  total_portal_views: 310,  price_reduction_pct: 0   },
];

/* ─── Table columns ─────────────────────────────────────────── */

const LISTING_COLUMNS: TableColumn<Record<string, unknown>>[] = [
  {
    id: 'address',
    label: 'Dirección',
    width: '2fr',
    render: (r) => (
      <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
        {String(r.address)}
      </span>
    ),
  },
  {
    id: 'operation_kind',
    label: 'Operación',
    width: '0.8fr',
    render: (r) => {
      const isRent = String(r.operation_kind) === 'Alquiler';
      return (
        <span style={{
          fontFamily: F.body, fontSize: 12, fontWeight: 500,
          padding: '3px 8px', borderRadius: 4,
          background: isRent ? 'rgba(22,84,217,0.12)' : 'rgba(24,166,89,0.12)',
          color: isRent ? C.brandLight : C.success,
        }}>
          {String(r.operation_kind)}
        </span>
      );
    },
  },
  {
    id: 'price',
    label: 'Precio',
    width: '1fr',
    mono: true,
    render: (r) => {
      const isRent = String(r.operation_kind) === 'Alquiler';
      const formatted = isRent
        ? `$${Number(r.price).toLocaleString('es-AR')}/m`
        : `USD ${Number(r.price).toLocaleString('es-AR')}`;
      return (
        <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>
          {formatted}
        </span>
      );
    },
  },
  {
    id: 'days_on_market',
    label: 'DOM',
    width: '0.7fr',
    mono: true,
    render: (r) => {
      const dom = Number(r.days_on_market);
      const priceCut = Number(r.price_reduction_pct);
      const flagged = dom > 90 && priceCut === 0;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: F.mono, fontSize: 12, fontWeight: 600,
            color: dom > 90 ? '#E83B3B' : dom > 60 ? C.warning : C.textSecondary,
          }}>
            {dom}d
          </span>
          {flagged && (
            <span
              title="DOM > 90 sin reducción de precio"
              style={{
                fontFamily: F.mono, fontSize: 9, fontWeight: 700,
                padding: '2px 5px', borderRadius: 4,
                background: 'rgba(232,138,20,0.15)',
                color: C.warning,
                whiteSpace: 'nowrap',
              }}
            >
              SIN REBAJA
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: 'total_portal_views',
    label: 'Vistas',
    width: '0.7fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
        {Number(r.total_portal_views).toLocaleString('es-AR')}
      </span>
    ),
  },
  {
    id: 'total_portal_leads',
    label: 'Leads',
    width: '0.7fr',
    mono: true,
    render: (r) => (
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.brand, fontWeight: 600 }}>
        {String(r.total_portal_leads)}
      </span>
    ),
  },
  {
    id: 'price_reduction_pct',
    label: 'Rebaja %',
    width: '0.7fr',
    mono: true,
    render: (r) => {
      const pct = Number(r.price_reduction_pct);
      return (
        <span style={{
          fontFamily: F.mono, fontSize: 12,
          color: pct > 0 ? C.warning : C.textTertiary,
        }}>
          {pct > 0 ? `-${pct}%` : '—'}
        </span>
      );
    },
  },
];

/* ─── Scatter data: Views vs Leads ──────────────────────────── */

const SCATTER_POINTS = LISTINGS.map(l => ({
  x: Number(l.total_portal_views),
  y: Number(l.total_portal_leads),
  size: Math.max(4, Math.min(16, Number(l.days_on_market) / 8)),
  label: String(l.address).split(',')[0],
  color: Number(l.days_on_market) > 90 ? '#E83B3B' : C.brand,
}));

/* ─── Histogram bins: DOM distribution ──────────────────────── */

const DOM_BINS = [
  { label: '0–15',  count: LISTINGS.filter(l => Number(l.days_on_market) <= 15).length,                                                        color: C.success },
  { label: '16–30', count: LISTINGS.filter(l => Number(l.days_on_market) > 15 && Number(l.days_on_market) <= 30).length,                       color: C.success },
  { label: '31–60', count: LISTINGS.filter(l => Number(l.days_on_market) > 30 && Number(l.days_on_market) <= 60).length,                       color: C.brand },
  { label: '61–90', count: LISTINGS.filter(l => Number(l.days_on_market) > 60 && Number(l.days_on_market) <= 90).length,                       color: C.warning },
  { label: '90+',   count: LISTINGS.filter(l => Number(l.days_on_market) > 90).length,                                                         color: '#E83B3B' },
];

/* ─── Top 3 listings by views ───────────────────────────────── */

const TOP_3_BY_VIEWS = [...LISTINGS]
  .sort((a, b) => Number(b.total_portal_views) - Number(a.total_portal_views))
  .slice(0, 3);

/* ─── Avg DOM by property type bar chart ────────────────────── */

const DOM_BY_TYPE = [
  { label: 'Departamento',  value: 42, suffix: 'd', color: C.brand },
  { label: 'Casa',          value: 58, suffix: 'd', color: C.brandLight },
  { label: 'PH',            value: 36, suffix: 'd', color: C.success },
  { label: 'Local',         value: 71, suffix: 'd', color: C.warning },
  { label: 'Oficina',       value: 29, suffix: 'd', color: '#7E3AF2' },
  { label: 'Terreno',       value: 88, suffix: 'd', color: '#E83B3B' },
];

/* ─── Sparklines for KPIs ───────────────────────────────────── */

const SPARK_DOM   = [42, 40, 38, 37, 36, 34];
const SPARK_VIEWS = [8400, 9200, 9800, 10500, 11200, 12450];
const SPARK_LEADS = [320, 345, 360, 380, 398, 423];

/* ─── Filters ───────────────────────────────────────────────── */

const FILTERS: FilterConfig[] = [
  {
    id: 'operation',
    label: 'Operación',
    options: [
      { value: 'all',  label: 'Todas' },
      { value: 'sale', label: 'Venta' },
      { value: 'rent', label: 'Alquiler' },
    ],
  },
  {
    id: 'status',
    label: 'Estado',
    options: [
      { value: 'all',    label: 'Todos' },
      { value: 'active', label: 'Activos' },
    ],
  },
  {
    id: 'neighborhood',
    label: 'Barrio',
    multi: true,
    options: [
      { value: 'palermo',      label: 'Palermo' },
      { value: 'recoleta',     label: 'Recoleta' },
      { value: 'belgrano',     label: 'Belgrano' },
      { value: 'nunez',        label: 'Núñez' },
      { value: 'san-telmo',    label: 'San Telmo' },
      { value: 'villa-crespo', label: 'Villa Crespo' },
      { value: 'barrio-norte', label: 'Barrio Norte' },
    ],
  },
  {
    id: 'property_type',
    label: 'Tipo',
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
    id: 'agent',
    label: 'Agente',
    multi: true,
    options: [
      { value: 'garcia',    label: 'García, J.' },
      { value: 'lopez',     label: 'López, M.' },
      { value: 'martinez',  label: 'Martínez, C.' },
      { value: 'rodriguez', label: 'Rodríguez, A.' },
    ],
  },
];

/* ─── Exportable data ──────────────────────────────────────── */

const EXPORT_DATA: ExportableData = {
  headers: ['Dirección', 'Operación', 'Precio', 'DOM', 'Vistas', 'Leads', 'Rebaja %'],
  rows: LISTINGS.map((r) => [
    String(r.address),
    String(r.operation_kind),
    Number(r.price),
    Number(r.days_on_market),
    Number(r.total_portal_views),
    Number(r.total_portal_leads),
    Number(r.price_reduction_pct),
  ]),
  filename: 'listing-performance',
};

/* ─── Component ─────────────────────────────────────────────── */

export default function ListingPerformanceView() {
  return (
    <ReportShell
      slug="listing-performance"
      title="Rendimiento de Avisos"
      subtitle="Vistas, leads, días en mercado y rendimiento por aviso publicado"
      refreshedAt="Hace 15 min"
      filters={FILTERS}
      exportData={EXPORT_DATA}
    >
      {/* ── KPIs ──────────────────────────────────────────────── */}
      <KpiRow cards={[
        { label: 'DOM promedio',         value: '34 días', delta: '-6 días',  positive: true,  sparkline: SPARK_DOM,   color: C.success },
        { label: 'Vistas en portales',   value: '12,450',  delta: '+18%',     positive: true,  sparkline: SPARK_VIEWS, color: C.brand },
        { label: 'Leads totales',        value: '423',     delta: '+8.7%',    positive: true,  sparkline: SPARK_LEADS, color: C.brandLight },
        { label: 'Rebaja promedio',      value: '4.2%',    delta: '-0.8pp',   positive: true,  color: C.success },
      ]} />

      {/* ── Performance table ─────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <WidgetCard title="Tabla de rendimiento por aviso">
          <DataTable
            columns={LISTING_COLUMNS}
            data={LISTINGS}
            defaultSort={{ col: 'total_portal_views', dir: 'desc' }}
          />
        </WidgetCard>
      </div>

      {/* ── Two-column: scatter + histogram ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <WidgetCard title="Vistas vs Leads">
          <ScatterChart
            points={SCATTER_POINTS}
            xLabel="Vistas en portales"
            yLabel="Leads recibidos"
          />
          {/* Size legend */}
          <div style={{ display: 'flex', gap: 14, marginTop: 10, alignItems: 'center' }}>
            <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>
              Tamaño = DOM
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.brand }} />
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>{'<'} 90d</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E83B3B' }} />
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>{'>'} 90d</span>
            </div>
          </div>
        </WidgetCard>

        <WidgetCard title="Distribución de DOM">
          <HistogramChart bins={DOM_BINS} color={C.brand} />
        </WidgetCard>
      </div>

      {/* ── Two-column: top 3 cards + DOM by type ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top 3 by views */}
        <WidgetCard title="Top 3 por vistas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TOP_3_BY_VIEWS.map((listing, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: C.bgElevated, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: '14px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 6,
                    background: i === 0 ? 'rgba(22,84,217,0.20)' : C.bgBase,
                    fontFamily: F.mono, fontSize: 13, fontWeight: 700,
                    color: i === 0 ? C.brand : C.textSecondary,
                  }}>
                    {i + 1}
                  </span>
                  <div>
                    <p style={{
                      fontFamily: F.body, fontSize: 13, color: C.textPrimary,
                      fontWeight: 500, margin: '0 0 2px',
                    }}>
                      {String(listing.address).split(',')[0]}
                    </p>
                    <p style={{
                      fontFamily: F.body, fontSize: 11, color: C.textTertiary, margin: 0,
                    }}>
                      {String(listing.operation_kind)}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{
                    fontFamily: F.mono, fontSize: 14, fontWeight: 700,
                    color: C.textPrimary, margin: '0 0 2px',
                  }}>
                    {Number(listing.total_portal_views).toLocaleString('es-AR')}
                  </p>
                  <p style={{
                    fontFamily: F.mono, fontSize: 11, color: C.brand, margin: 0,
                  }}>
                    {String(listing.total_portal_leads)} leads
                  </p>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>

        {/* Avg DOM by property type */}
        <WidgetCard title="DOM promedio por tipo de propiedad">
          <HorizontalBarChart data={DOM_BY_TYPE} />
        </WidgetCard>
      </div>
    </ReportShell>
  );
}
