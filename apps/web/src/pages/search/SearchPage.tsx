import React, { useState, useEffect } from 'react';
import CommandPalette from '../../components/search/CommandPalette';

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  border:        '#1F2D48',
  borderHover:   '#2A3D5C',
  brand:         '#1654d9',
  brandLight:    '#4669ff',
  brandFaint:    'rgba(22,84,217,0.12)',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  ai:            '#7E3AF2',
  aiFaint:       'rgba(126,58,242,0.12)',
  success:       '#18A659',
  warning:       '#E88A14',
  error:         '#E83B3B',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

/* ─── Types ─────────────────────────────────────────────────── */
type EntityType = 'propiedad' | 'contacto' | 'operacion' | 'documento' | 'tarea';

interface SearchResult {
  id:          string;
  entityType:  EntityType;
  title:       string;
  subtitle:    string;
  snippet:     string;
  score:       number;
  href:        string;
  tags?:       string[];
}

interface FilterGroup {
  entityType: EntityType;
  label:      string;
  icon:       string;
  count:      number;
  color:      string;
}

/* ─── Mock data ─────────────────────────────────────────────── */
const ALL_RESULTS: SearchResult[] = [
  { id: 'p1', entityType: 'propiedad', title: 'Av. Cabildo 1850, Belgrano',         subtitle: '3 amb · 95 m² · USD 285.000 · Disponible',       snippet: '…amplio departamento con cochera cubierta en planta baja, luminoso, patio interior, a metros del subte…', score: 0.97, href: '/properties/BEL-00142', tags: ['Con cochera', 'Belgrano'] },
  { id: 'p2', entityType: 'propiedad', title: 'Thames 1440, Palermo',                subtitle: '2 amb · 55 m² · USD 165.000 · En oferta',          snippet: '…moderno estudio con balcón orientación norte, reciclado 2024, expensas bajas, ideal inversión…',          score: 0.91, href: '/properties/PAL-00201', tags: ['Balcón', 'Palermo'] },
  { id: 'p3', entityType: 'propiedad', title: 'Zabala 1620, Belgrano',               subtitle: '4 amb · 180 m² · USD 420.000 · Disponible',        snippet: '…casa con jardín, pileta, quincho, garage triple, lote 420 m², barrio silencioso y arbolado…',              score: 0.88, href: '/properties/BEL-00129', tags: ['Casa', 'Pileta'] },
  { id: 'p4', entityType: 'propiedad', title: 'Echeverría 2340, Belgrano',           subtitle: '3 amb · 85 m² · USD 210.000 · Disponible',         snippet: '…departamento en piso alto con vistas, calefacción central, amenities completos, buena iluminación…',       score: 0.85, href: '/properties/BEL-00137', tags: ['Piso alto', 'Amenities'] },
  { id: 'p5', entityType: 'propiedad', title: 'Dorrego 1800, Palermo Hollywood',     subtitle: '1 amb · 40 m² · USD 98.000 · Reservado',           snippet: '…loft estilo industrial con doble altura, vigas originales, zona gastronómica, apto alquiler temporal…',   score: 0.80, href: '/properties/PH-00088', tags: ['Loft', 'Hollywood'] },
  { id: 'c1', entityType: 'contacto',  title: 'Juan García',                         subtitle: 'Comprador · +54 9 11 2345-6789',                    snippet: '…interesado en 3 ambientes Belgrano, presupuesto hasta USD 300k, busca cochera incluida…',                 score: 0.94, href: '/contacts/C-01024', tags: ['Activo'] },
  { id: 'c2', entityType: 'contacto',  title: 'María López',                         subtitle: 'Propietaria · maria@belgrano.com',                  snippet: '…titular de BEL-00142 y BEL-00137, representada por estudio Rivas, acepta contraofertas…',                  score: 0.85, href: '/contacts/C-00891', tags: ['Propietaria'] },
  { id: 'c3', entityType: 'contacto',  title: 'Carlos Ramos',                        subtitle: 'Vendedor · carlos@example.com',                     snippet: '…agente externo colaborador, especializado en propiedades premium Palermo-Belgrano…',                      score: 0.82, href: '/contacts/C-00445', tags: ['Agente externo'] },
  { id: 'o1', entityType: 'operacion', title: 'Compra BEL-00142 · García / López',  subtitle: 'En curso · USD 275.000 · Etapa 3 de 5',             snippet: '…firma de boleto pendiente, reserva aprobada el 22 de abril, vence en 15 días…',                            score: 0.90, href: '/pipelines/OP-0087', tags: ['Urgente'] },
  { id: 'o2', entityType: 'operacion', title: 'Alquiler PAL-00198 · Martínez',      subtitle: 'Cerrado · $850.000/mes · Abr 2026',                 snippet: '…contrato firmado digitalmente, cláusula ajuste UVA trimestral, depósito cobrado…',                         score: 0.79, href: '/pipelines/OP-0074', tags: ['Cerrado'] },
  { id: 'd1', entityType: 'documento', title: 'Boleto de compraventa BEL-00142',    subtitle: 'Borrador · Generado 28 abr 2026',                   snippet: '…pendiente firma de vendedor Carlos Ramos, cláusula 4 sin completar por datos faltantes…',                  score: 0.86, href: '/documents/DOC-00312', tags: ['Pendiente'] },
  { id: 'd2', entityType: 'documento', title: 'Contrato alquiler PAL-00198',        subtitle: 'Firmado · 1 abr 2026',                              snippet: '…contrato 3 años ajuste UVA, inquilino Luis Martínez, garantes aprobados, seguro de caución…',               score: 0.77, href: '/documents/DOC-00289', tags: ['Vigente'] },
];

const FILTER_GROUPS: FilterGroup[] = [
  { entityType: 'propiedad',  label: 'Propiedades',  icon: '🏠', count: 5,  color: '#1654d9' },
  { entityType: 'contacto',   label: 'Contactos',    icon: '👤', count: 3,  color: '#18A659' },
  { entityType: 'operacion',  label: 'Operaciones',  icon: '📋', count: 2,  color: '#E88A14' },
  { entityType: 'documento',  label: 'Documentos',   icon: '📄', count: 2,  color: '#7E3AF2' },
];

const ENTITY_CONFIG: Record<EntityType, { icon: string; color: string }> = {
  propiedad:  { icon: '🏠', color: C.brand    },
  contacto:   { icon: '👤', color: C.success  },
  operacion:  { icon: '📋', color: C.warning  },
  documento:  { icon: '📄', color: C.ai       },
  tarea:      { icon: '✅', color: C.textSecondary },
};

const PAGE_SIZE = 5;

/* ─── Result card ───────────────────────────────────────────── */
function ResultCard({ result, query }: { result: SearchResult; query: string }) {
  const config = ENTITY_CONFIG[result.entityType];
  const [hovered, setHovered] = useState(false);

  const highlightSnippet = (text: string) => {
    if (!query) return text;
    const q   = query.toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: `${C.brand}30`, color: C.brandLight, borderRadius: 2 }}>
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <a
      href={result.href}
      style={{
        display:       'block',
        padding:       '18px 20px',
        borderRadius:  12,
        background:    hovered ? C.bgElevated : C.bgRaised,
        border:        `1px solid ${hovered ? C.borderHover : C.border}`,
        textDecoration: 'none',
        transition:    'all 0.15s',
        cursor:        'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Entity icon */}
        <div style={{
          width:          40,
          height:         40,
          borderRadius:   10,
          background:     `${config.color}18`,
          border:         `1px solid ${config.color}30`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       18,
          flexShrink:     0,
        }}>
          {config.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily:   F.body,
              fontWeight:   600,
              fontSize:     15,
              color:        C.textPrimary,
            }}>
              {result.title}
            </span>
            {result.tags?.map(tag => (
              <span key={tag} style={{
                padding:      '1px 8px',
                borderRadius: 20,
                background:   C.bgElevated,
                border:       `1px solid ${C.border}`,
                color:        C.textTertiary,
                fontFamily:   F.mono,
                fontSize:     10,
              }}>
                {tag}
              </span>
            ))}
            {/* Relevance */}
            <span style={{
              marginLeft:   'auto',
              fontFamily:   F.mono,
              fontSize:     11,
              color:        hovered ? config.color : C.textTertiary,
              flexShrink:   0,
            }}>
              {Math.round(result.score * 100)}% relevancia
            </span>
          </div>

          {/* Subtitle */}
          <div style={{
            fontFamily: F.body,
            fontSize:   13,
            color:      C.textSecondary,
            marginTop:  3,
          }}>
            {result.subtitle}
          </div>

          {/* Snippet */}
          <div style={{
            fontFamily: F.body,
            fontSize:   12,
            color:      C.textTertiary,
            marginTop:  6,
            lineHeight: 1.5,
          }}>
            {highlightSnippet(result.snippet)}
          </div>
        </div>
      </div>
    </a>
  );
}

/* ─── Main component ────────────────────────────────────────── */
export default function SearchPage() {
  const [query,          setQuery]          = useState('belgrano');
  const [activeFilters,  setActiveFilters]  = useState<EntityType[]>([]);
  const [page,           setPage]           = useState(1);
  const [paletteOpen,    setPaletteOpen]    = useState(false);

  // Filter and paginate
  const filtered = ALL_RESULTS.filter(r =>
    (activeFilters.length === 0 || activeFilters.includes(r.entityType)) &&
    (
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      r.snippet.toLowerCase().includes(query.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [activeFilters, query]);

  const toggleFilter = (et: EntityType) => {
    setActiveFilters(prev =>
      prev.includes(et) ? prev.filter(f => f !== et) : [...prev, et]
    );
  };

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{
      minHeight:   '100vh',
      background:  C.bgBase,
      fontFamily:  F.body,
    }}>
      {/* Wireframe badge */}
      <div style={{
        background:   C.bgRaised,
        borderBottom: `1px solid ${C.border}`,
        padding:      '8px 24px',
        fontSize:     12,
        fontFamily:   F.mono,
        color:        C.textTertiary,
        display:      'flex',
        alignItems:   'center',
        gap:          16,
      }}>
        <span style={{ color: C.ai, fontWeight: 600 }}>✦ WIREFRAME · RENA-79</span>
        <button
          onClick={() => setPaletteOpen(true)}
          style={{
            marginLeft:   'auto',
            padding:      '4px 12px',
            borderRadius: 8,
            background:   C.bgElevated,
            border:       `1px solid ${C.border}`,
            color:        C.textSecondary,
            fontFamily:   F.mono,
            fontSize:     11,
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            gap:          8,
          }}
        >
          <span>Abrir paleta</span>
          <kbd style={{ background: C.bgBase, padding: '1px 5px', borderRadius: 4, border: `1px solid ${C.border}` }}>
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Page header */}
      <div style={{
        padding:      '32px 32px 24px',
        borderBottom: `1px solid ${C.border}`,
        background:   C.bgRaised,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{
            fontFamily:  F.display,
            fontSize:    24,
            fontWeight:  700,
            color:       C.textPrimary,
            margin:      '0 0 16px',
          }}>
            Resultados de búsqueda
          </h1>
          {/* Search input */}
          <div style={{ position: 'relative', maxWidth: 560 }}>
            <svg
              width="16" height="16" viewBox="0 0 18 18" fill="none"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="8" cy="8" r="5.5" stroke={C.textTertiary} strokeWidth="1.5"/>
              <path d="M12.5 12.5 L16 16" stroke={C.textTertiary} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Refinar búsqueda…"
              style={{
                width:        '100%',
                padding:      '10px 16px 10px 40px',
                borderRadius: 10,
                background:   C.bgElevated,
                border:       `1px solid ${C.border}`,
                color:        C.textPrimary,
                fontFamily:   F.body,
                fontSize:     14,
                outline:      'none',
                boxSizing:    'border-box',
              }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = `${C.brand}60`; }}
              onBlur={e  => { (e.target as HTMLElement).style.borderColor = C.border; }}
            />
          </div>
          <div style={{ marginTop: 10, fontFamily: F.body, fontSize: 13, color: C.textTertiary }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para &ldquo;<strong style={{ color: C.textSecondary }}>{query}</strong>&rdquo;
          </div>
        </div>
      </div>

      {/* Body: sidebar + results */}
      <div style={{
        maxWidth:   1100,
        margin:     '0 auto',
        padding:    '24px 32px',
        display:    'flex',
        gap:        32,
        alignItems: 'flex-start',
      }}>
        {/* Left sidebar filters */}
        <div style={{
          width:      240,
          flexShrink: 0,
          position:   'sticky',
          top:        24,
        }}>
          <div style={{
            fontFamily:    F.mono,
            fontSize:      11,
            fontWeight:    600,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color:         C.textTertiary,
            marginBottom:  12,
          }}>
            Filtrar por tipo
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {FILTER_GROUPS.map(fg => {
              const isActive = activeFilters.includes(fg.entityType);
              const countInQuery = ALL_RESULTS.filter(r =>
                r.entityType === fg.entityType &&
                (r.title.toLowerCase().includes(query.toLowerCase()) ||
                 r.subtitle.toLowerCase().includes(query.toLowerCase()) ||
                 r.snippet.toLowerCase().includes(query.toLowerCase()))
              ).length;

              return (
                <button
                  key={fg.entityType}
                  onClick={() => toggleFilter(fg.entityType)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          10,
                    padding:      '9px 12px',
                    borderRadius: 8,
                    background:   isActive ? `${fg.color}15` : 'transparent',
                    border:       isActive ? `1px solid ${fg.color}40` : `1px solid transparent`,
                    cursor:       'pointer',
                    textAlign:    'left',
                    transition:   'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = C.bgElevated;
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: 16 }}>{fg.icon}</span>
                  <span style={{
                    fontFamily: F.body,
                    fontSize:   13,
                    color:      isActive ? C.textPrimary : C.textSecondary,
                    flex:       1,
                    fontWeight: isActive ? 600 : 400,
                  }}>
                    {fg.label}
                  </span>
                  <span style={{
                    padding:      '1px 7px',
                    borderRadius: 20,
                    background:   isActive ? fg.color : C.bgElevated,
                    color:        isActive ? '#fff' : C.textTertiary,
                    fontFamily:   F.mono,
                    fontSize:     11,
                    fontWeight:   600,
                    minWidth:     22,
                    textAlign:    'center',
                  }}>
                    {countInQuery}
                  </span>
                </button>
              );
            })}
          </div>

          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              style={{
                marginTop:    12,
                width:        '100%',
                padding:      '7px 12px',
                borderRadius: 8,
                background:   'transparent',
                border:       `1px solid ${C.border}`,
                color:        C.textTertiary,
                fontFamily:   F.body,
                fontSize:     12,
                cursor:       'pointer',
              }}
            >
              Quitar filtros
            </button>
          )}

          {/* Keyboard nav hint */}
          <div style={{
            marginTop:    24,
            padding:      12,
            borderRadius: 8,
            background:   C.bgRaised,
            border:       `1px solid ${C.border}`,
          }}>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Atajos de teclado
            </div>
            {[
              ['⌘K', 'Paleta rápida'],
              ['↑↓', 'Navegar'],
              ['↵',  'Abrir'],
            ].map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <kbd style={{
                  padding:      '2px 6px',
                  borderRadius: 4,
                  background:   C.bgElevated,
                  border:       `1px solid ${C.border}`,
                  color:        C.textSecondary,
                  fontFamily:   F.mono,
                  fontSize:     11,
                }}>
                  {key}
                </kbd>
                <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Results list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {paged.length === 0 ? (
            <div style={{
              padding:    48,
              textAlign:  'center',
              color:      C.textTertiary,
              fontFamily: F.body,
              fontSize:   14,
              background: C.bgRaised,
              borderRadius: 12,
              border:     `1px solid ${C.border}`,
            }}>
              No se encontraron resultados con los filtros actuales.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {paged.map(r => (
                <ResultCard key={r.id} result={r} query={query} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display:        'flex',
              justifyContent: 'center',
              alignItems:     'center',
              gap:            8,
              marginTop:      24,
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding:      '7px 14px',
                  borderRadius: 8,
                  background:   'transparent',
                  border:       `1px solid ${C.border}`,
                  color:        page === 1 ? C.textTertiary : C.textSecondary,
                  cursor:       page === 1 ? 'default' : 'pointer',
                  fontFamily:   F.body,
                  fontSize:     13,
                }}
              >
                ← Anterior
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width:        34,
                    height:       34,
                    borderRadius: 8,
                    background:   page === p ? C.brand : 'transparent',
                    border:       `1px solid ${page === p ? C.brand : C.border}`,
                    color:        page === p ? '#fff' : C.textSecondary,
                    cursor:       'pointer',
                    fontFamily:   F.mono,
                    fontSize:     13,
                    fontWeight:   page === p ? 700 : 400,
                  }}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding:      '7px 14px',
                  borderRadius: 8,
                  background:   'transparent',
                  border:       `1px solid ${C.border}`,
                  color:        page === totalPages ? C.textTertiary : C.textSecondary,
                  cursor:       page === totalPages ? 'default' : 'pointer',
                  fontFamily:   F.body,
                  fontSize:     13,
                }}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Command palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={href => console.log('Navigate to:', href)}
        onOpenSearchPage={q => setQuery(q)}
      />
    </div>
  );
}
