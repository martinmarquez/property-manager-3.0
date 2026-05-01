import React, { useState, useMemo } from 'react';

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  bgOverlay:     '#121D33',
  bgSubtle:      '#162035',
  border:        '#1F2D48',
  borderHover:   '#2A3D5C',
  brand:         '#1654d9',
  brandLight:    '#4669ff',
  brandFaint:    'rgba(22,84,217,0.10)',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  success:       '#18A659',
  successFaint:  'rgba(24,166,89,0.10)',
  warning:       '#E88A14',
  warningFaint:  'rgba(232,138,20,0.10)',
  error:         '#E83B3B',
  errorFaint:    'rgba(232,59,59,0.10)',
  ai:            '#7E3AF2',
  aiFaint:       'rgba(126,58,242,0.10)',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

/* ─── Types ─────────────────────────────────────────────────── */
type EntityType = 'propiedad' | 'contacto' | 'operacion' | 'documento';

interface SearchResult {
  id: string;
  entityType: EntityType;
  code: string;
  title: string;
  subtitle: string;
  snippet: string;
  date: string;
  status: string;
  statusColor: string;
}

/* ─── Mock data ─────────────────────────────────────────────── */
const MOCK_RESULTS: SearchResult[] = [
  { id: 'p1',  entityType: 'propiedad', code: 'BEL-00142', title: 'Av. Cabildo 1850, Belgrano',      subtitle: '3 amb · USD 285.000 · Venta',     snippet: 'Piso 4 con balcón corrido, vista parcial al río, cochera opcional. Edificio con portero 24h.', date: '28 abr 2026', status: 'Disponible',      statusColor: C.success },
  { id: 'p2',  entityType: 'propiedad', code: 'PAL-00201', title: 'Thames 1440, Palermo',             subtitle: '2 amb · USD 165.000 · Alquiler',   snippet: 'Luminoso, planta baja, patio interno propio 18m², pets friendly, no se requiere garantía.', date: '25 abr 2026', status: 'Disponible',      statusColor: C.success },
  { id: 'p3',  entityType: 'propiedad', code: 'NUN-00089', title: 'Av. del Libertador 5200, Núñez',  subtitle: '4 amb · USD 420.000 · Venta',     snippet: 'Edificio premium con amenities completos: piscina, gym, SUM. Seguridad 24h, vista al río.', date: '20 abr 2026', status: 'En negociación',   statusColor: C.warning },
  { id: 'p4',  entityType: 'propiedad', code: 'BEL-00137', title: 'Echeverría 2340, Belgrano',        subtitle: '3 amb · USD 240.000 · Venta',     snippet: 'Reciclado completo 2024. Cocina americana, piso porcelanato 80x80, thermolac.', date: '18 abr 2026', status: 'Disponible',      statusColor: C.success },
  { id: 'p5',  entityType: 'propiedad', code: 'BEL-00129', title: 'Zabala 1620, Belgrano',            subtitle: '3 amb · USD 265.000 · Venta',     snippet: 'Contrafrente, muy silencioso. Expensas bajas. A pasos del parque Barrancas.', date: '15 abr 2026', status: 'Reservada',        statusColor: C.warning },
  { id: 'c1',  entityType: 'contacto',  code: 'CON-00312', title: 'Juan García',                      subtitle: 'Cliente comprador · +54 11 4523-8901', snippet: 'Busca 3 ambientes en Belgrano o Núñez. Presupuesto USD 250k–300k. Contacto desde feb 2026.', date: '29 abr 2026', status: 'Activo',           statusColor: C.success },
  { id: 'c2',  entityType: 'contacto',  code: 'CON-00287', title: 'María López',                      subtitle: 'Corredor CUCICBA 09876',           snippet: 'Especialista zona norte: Belgrano, Núñez, Saavedra. Más de 12 años en el mercado.', date: '25 abr 2026', status: 'Colaboradora',     statusColor: C.brand },
  { id: 'c3',  entityType: 'contacto',  code: 'CON-00401', title: 'Carlos Ramos',                     subtitle: 'Propietario · DNI 22.345.678',     snippet: 'Vende departamento en Cabildo, acepta permuta parcial con inmueble zona GBA norte.', date: '22 abr 2026', status: 'Propietario',      statusColor: C.textSecondary },
  { id: 'o1',  entityType: 'operacion', code: 'OPE-2026-0042', title: 'Boleto Av. Corrientes 1234',  subtitle: 'En firma · USD 250.000',           snippet: 'Compraventa entre Juan García y Carlos Ramos. Escritura prevista 30 jun 2026.', date: '25 abr 2026', status: 'En firma',         statusColor: C.warning },
  { id: 'o2',  entityType: 'operacion', code: 'OPE-2026-0038', title: 'Reserva Thames 1440',          subtitle: 'Activa · USD 12.000',             snippet: 'Reserva de alquiler, validez hasta 15 mayo 2026. Pendiente aprobación garantía.', date: '20 abr 2026', status: 'Activa',           statusColor: C.brand },
  { id: 'o3',  entityType: 'operacion', code: 'OPE-2026-0031', title: 'Escritura Núñez lote 3',       subtitle: 'Cerrada · USD 380.000',            snippet: 'Operación completada 10 abr 2026. Comisión liquidada. Archivado.', date: '10 abr 2026', status: 'Cerrada',          statusColor: C.success },
  { id: 'd1',  entityType: 'documento', code: 'DOC-2026-0042', title: 'Boleto de Compraventa — Corrientes 1234', subtitle: 'Pendiente firma · 3 firmantes', snippet: 'Partes: Juan García (comprador), Carlos Ramos (vendedor), María López (corredor).', date: '25 abr 2026', status: 'Pendiente firma',  statusColor: C.warning },
  { id: 'd2',  entityType: 'documento', code: 'DOC-2026-0039', title: 'Contrato de locación Thames',   subtitle: 'Borrador',                        snippet: 'Plantilla estándar Art. 1187 CCyCN. Plazo 2 años, actualización trimestral ICL.', date: '20 abr 2026', status: 'Borrador',         statusColor: C.textSecondary },
];

const ENTITY_META: Record<EntityType, { label: string; icon: string; color: string }> = {
  propiedad: { label: 'Propiedades', icon: '🏠', color: C.brand },
  contacto:  { label: 'Contactos',   icon: '👤', color: C.success },
  operacion: { label: 'Operaciones', icon: '📋', color: C.warning },
  documento: { label: 'Documentos',  icon: '📄', color: C.textSecondary },
};

const ALL_TYPES: EntityType[] = ['propiedad', 'contacto', 'operacion', 'documento'];

const PAGE_SIZE = 5;

/* ─── Filter chip ────────────────────────────────────────────── */
function FilterChip({
  label,
  icon,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  icon: string;
  count: number;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          8,
        width:        '100%',
        padding:      '9px 12px',
        borderRadius: 8,
        background:   active ? `${color}18` : 'transparent',
        border:       active ? `1px solid ${color}40` : `1px solid transparent`,
        cursor:       'pointer',
        textAlign:    'left',
        transition:   'all 0.12s',
      }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{
        fontFamily: F.body,
        fontSize:   13,
        fontWeight: active ? 600 : 400,
        color:      active ? C.textPrimary : C.textSecondary,
        flex:       1,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily:   F.mono,
        fontSize:     11,
        color:        active ? color : C.textTertiary,
        background:   active ? `${color}20` : C.bgSubtle,
        padding:      '1px 6px',
        borderRadius: 10,
        fontWeight:   600,
      }}>
        {count}
      </span>
    </button>
  );
}

/* ─── Result card ────────────────────────────────────────────── */
function ResultCard({ result, query }: { result: SearchResult; query: string }) {
  const meta = ENTITY_META[result.entityType];

  const highlightText = (text: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: `${C.brand}35`, color: C.brandLight, borderRadius: 2, padding: '0 1px' }}>
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div style={{
      padding:      '16px 20px',
      background:   C.bgRaised,
      border:       `1px solid ${C.border}`,
      borderRadius: 10,
      display:      'flex',
      gap:          14,
      cursor:       'pointer',
      transition:   'border-color 0.15s',
    }}
    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.borderHover}
    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.border}
    >
      {/* Entity icon */}
      <div style={{
        width:          44,
        height:         44,
        borderRadius:   10,
        background:     `${meta.color}15`,
        border:         `1px solid ${meta.color}30`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       20,
        flexShrink:     0,
      }}>
        {meta.icon}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
                {highlightText(result.title)}
              </span>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary, flexShrink: 0 }}>
                {result.code}
              </span>
            </div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
              {result.subtitle}
            </div>
            <div style={{
              fontFamily:   F.body,
              fontSize:     12,
              color:        C.textTertiary,
              marginTop:    6,
              lineHeight:   1.5,
              display:      '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow:     'hidden',
            }}>
              {highlightText(result.snippet)}
            </div>
          </div>

          {/* Status + date */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <span style={{
              padding:      '3px 8px',
              borderRadius: 6,
              background:   `${result.statusColor}18`,
              color:        result.statusColor,
              fontFamily:   F.body,
              fontSize:     11,
              fontWeight:   600,
            }}>
              {result.status}
            </span>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary }}>
              {result.date}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */
export interface SearchResultsPageProps {
  initialQuery?: string;
  initialEntityType?: EntityType;
}

export default function SearchResultsPage({
  initialQuery = 'belgrano',
  initialEntityType,
}: SearchResultsPageProps) {
  const [query, setQuery]                 = useState(initialQuery);
  const [activeFilter, setActiveFilter]   = useState<EntityType | null>(initialEntityType ?? null);
  const [page, setPage]                   = useState(1);
  const inputRef                          = useRef<HTMLInputElement>(null);

  const import_useRef = React.useRef;
  const inputRefLocal = import_useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return MOCK_RESULTS.filter(r => {
      const matchesType = !activeFilter || r.entityType === activeFilter;
      const matchesQuery = !q || (
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.snippet.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q)
      );
      return matchesType && matchesQuery;
    });
  }, [query, activeFilter]);

  const counts = useMemo(() => {
    const q = query.toLowerCase();
    const base = !q ? MOCK_RESULTS : MOCK_RESULTS.filter(r =>
      r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q) ||
      r.snippet.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
    );
    const result: Partial<Record<EntityType, number>> = {};
    ALL_TYPES.forEach(t => {
      result[t] = base.filter(r => r.entityType === t).length;
    });
    return result;
  }, [query]);

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const pageResults = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (type: EntityType | null) => {
    setActiveFilter(type);
    setPage(1);
  };

  return (
    <div style={{
      minHeight:  '100vh',
      background: C.bgBase,
      fontFamily: F.body,
    }}>
      {/* Wireframe banner */}
      <div style={{
        background:   C.bgRaised,
        borderBottom: `1px solid ${C.border}`,
        padding:      '8px 20px',
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        fontSize:     12,
        fontFamily:   F.mono,
        color:        C.textTertiary,
      }}>
        <span style={{ color: C.ai, fontWeight: 600 }}>✦ WIREFRAME · RENA-78</span>
        <span>Search Results Page</span>
      </div>

      {/* Top search bar */}
      <div style={{
        background:   C.bgRaised,
        borderBottom: `1px solid ${C.border}`,
        padding:      '16px 24px',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Back button */}
            <button
              type="button"
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          6,
                padding:      '8px 12px',
                borderRadius: 8,
                background:   'transparent',
                border:       `1px solid ${C.border}`,
                color:        C.textSecondary,
                fontSize:     13,
                cursor:       'pointer',
                flexShrink:   0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
              Volver
            </button>

            {/* Search input */}
            <div style={{
              flex:         1,
              display:      'flex',
              alignItems:   'center',
              gap:          10,
              padding:      '10px 14px',
              borderRadius: 10,
              background:   C.bgElevated,
              border:       `1px solid ${C.border}`,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary} strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={inputRefLocal}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(1); }}
                placeholder="Buscar…"
                style={{
                  flex:       1,
                  background: 'transparent',
                  border:     'none',
                  outline:    'none',
                  color:      C.textPrimary,
                  fontFamily: F.body,
                  fontSize:   15,
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setPage(1); }}
                  style={{ background: 'transparent', border: 'none', color: C.textTertiary, cursor: 'pointer', fontSize: 13 }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Result count */}
          <div style={{ marginTop: 8, fontSize: 13, color: C.textTertiary }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            {query ? ` para "${query}"` : ''}
            {activeFilter ? ` en ${ENTITY_META[activeFilter].label}` : ''}
          </div>
        </div>
      </div>

      {/* Body: sidebar + results */}
      <div style={{
        maxWidth:  960,
        margin:    '0 auto',
        padding:   '24px',
        display:   'flex',
        gap:       24,
        alignItems: 'flex-start',
      }}>
        {/* Left sidebar — filters */}
        <div style={{
          width:        220,
          flexShrink:   0,
          position:     'sticky',
          top:          24,
        }}>
          <div style={{
            background:   C.bgRaised,
            border:       `1px solid ${C.border}`,
            borderRadius: 10,
            overflow:     'hidden',
            padding:      '12px',
          }}>
            <div style={{
              fontFamily:    F.mono,
              fontSize:      11,
              fontWeight:    600,
              color:         C.textTertiary,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding:       '0 0 10px',
              marginBottom:  4,
              borderBottom:  `1px solid ${C.border}`,
            }}>
              Filtros
            </div>

            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* All filter */}
              <FilterChip
                label="Todos"
                icon="🔍"
                count={MOCK_RESULTS.length}
                active={activeFilter === null}
                color={C.brand}
                onClick={() => handleFilterChange(null)}
              />
              {/* Entity type filters */}
              {ALL_TYPES.map(type => (
                <FilterChip
                  key={type}
                  label={ENTITY_META[type].label}
                  icon={ENTITY_META[type].icon}
                  count={counts[type] ?? 0}
                  active={activeFilter === type}
                  color={ENTITY_META[type].color}
                  onClick={() => handleFilterChange(type)}
                />
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: C.border, margin: '12px 0' }} />

            {/* Date filter label */}
            <div style={{
              fontFamily:    F.mono,
              fontSize:      11,
              fontWeight:    600,
              color:         C.textTertiary,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom:  8,
            }}>
              Fecha
            </div>
            {['Hoy', 'Esta semana', 'Este mes', 'Todo'].map((label, i) => (
              <button
                key={label}
                type="button"
                style={{
                  display:      'block',
                  width:        '100%',
                  textAlign:    'left',
                  padding:      '7px 12px',
                  borderRadius: 6,
                  background:   i === 3 ? C.bgSubtle : 'transparent',
                  border:       i === 3 ? `1px solid ${C.border}` : '1px solid transparent',
                  color:        i === 3 ? C.textPrimary : C.textSecondary,
                  fontFamily:   F.body,
                  fontSize:     13,
                  cursor:       'pointer',
                  marginBottom: 2,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Right — results list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {pageResults.length === 0 ? (
            <div style={{
              background:   C.bgRaised,
              border:       `1px solid ${C.border}`,
              borderRadius: 10,
              padding:      '48px 24px',
              textAlign:    'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <p style={{ fontFamily: F.body, fontSize: 15, color: C.textSecondary, margin: 0 }}>
                Sin resultados
                {query ? ` para "${query}"` : ''}
                {activeFilter ? ` en ${ENTITY_META[activeFilter].label}` : ''}
              </p>
              <button
                type="button"
                onClick={() => { setQuery(''); setActiveFilter(null); }}
                style={{
                  marginTop:    16,
                  padding:      '8px 20px',
                  borderRadius: 8,
                  background:   'transparent',
                  border:       `1px solid ${C.border}`,
                  color:        C.brand,
                  fontFamily:   F.body,
                  fontSize:     13,
                  cursor:       'pointer',
                }}
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pageResults.map(result => (
                  <ResultCard key={result.id} result={result} query={query} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'space-between',
                  marginTop:      24,
                  padding:        '12px 0',
                  borderTop:      `1px solid ${C.border}`,
                }}>
                  <span style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary }}>
                    Página {page} de {totalPages} · {filtered.length} resultados
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                      style={{
                        padding:      '7px 14px',
                        borderRadius: 7,
                        background:   'transparent',
                        border:       `1px solid ${C.border}`,
                        color:        page <= 1 ? C.textTertiary : C.textSecondary,
                        fontFamily:   F.body,
                        fontSize:     13,
                        cursor:       page <= 1 ? 'not-allowed' : 'pointer',
                        opacity:      page <= 1 ? 0.5 : 1,
                      }}
                    >
                      ← Anterior
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        style={{
                          width:        34,
                          height:       34,
                          borderRadius: 7,
                          background:   p === page ? C.brand : 'transparent',
                          border:       `1px solid ${p === page ? C.brand : C.border}`,
                          color:        p === page ? '#fff' : C.textSecondary,
                          fontFamily:   F.body,
                          fontSize:     13,
                          cursor:       'pointer',
                          fontWeight:   p === page ? 700 : 400,
                        }}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                      style={{
                        padding:      '7px 14px',
                        borderRadius: 7,
                        background:   'transparent',
                        border:       `1px solid ${C.border}`,
                        color:        page >= totalPages ? C.textTertiary : C.textSecondary,
                        fontFamily:   F.body,
                        fontSize:     13,
                        cursor:       page >= totalPages ? 'not-allowed' : 'pointer',
                        opacity:      page >= totalPages ? 0.5 : 1,
                      }}
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
