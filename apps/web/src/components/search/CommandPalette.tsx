import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  bgOverlay:     'rgba(7,13,26,0.85)',
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
}

/* ─── Mock data ─────────────────────────────────────────────── */
const MOCK_RESULTS: SearchResult[] = [
  // Propiedades
  { id: 'p1', entityType: 'propiedad', title: 'Av. Cabildo 1850, Belgrano',    subtitle: '3 amb · USD 285.000 · Disponible',    snippet: '…amplio departamento con cochera cubierta en planta baja, luminoso, patio…', score: 0.97, href: '/properties/BEL-00142' },
  { id: 'p2', entityType: 'propiedad', title: 'Thames 1440, Palermo',            subtitle: '2 amb · USD 165.000 · En oferta',      snippet: '…moderno estudio con balcón, reciclado 2024, expensas bajas, ideal inversión…',  score: 0.91, href: '/properties/PAL-00201' },
  { id: 'p3', entityType: 'propiedad', title: 'Zabala 1620, Belgrano',            subtitle: '4 amb · USD 420.000 · Disponible',    snippet: '…casa con jardín, pileta, quincho, garage triple, lote 420 m², silenciosa…',  score: 0.88, href: '/properties/BEL-00129' },
  // Contactos
  { id: 'c1', entityType: 'contacto',  title: 'Juan García',                     subtitle: 'Comprador · +54 9 11 2345-6789',       snippet: '…interesado en 3 ambientes Belgrano, presupuesto hasta USD 300k…',           score: 0.94, href: '/contacts/C-01024' },
  { id: 'c2', entityType: 'contacto',  title: 'María López',                     subtitle: 'Propietaria · maria@belgrano.com',     snippet: '…titular de BEL-00142 y BEL-00137, representada por estudio Rivas…',         score: 0.85, href: '/contacts/C-00891' },
  { id: 'c3', entityType: 'contacto',  title: 'Carlos Ramos',                    subtitle: 'Vendedor · carlos@example.com',        snippet: '…agente externo colaborador, especializado en propiedades premium…',          score: 0.82, href: '/contacts/C-00445' },
  // Operaciones
  { id: 'o1', entityType: 'operacion', title: 'Compra BEL-00142 · García / López', subtitle: 'En curso · USD 275.000 · Etapa 3/5', snippet: '…firma de boleto pendiente, reserva aprobada el 22 de abril…',               score: 0.90, href: '/pipelines/OP-0087' },
  { id: 'o2', entityType: 'operacion', title: 'Alquiler PAL-00198 · Martínez',   subtitle: 'Cerrado · $850.000/mes · Abr 2026',   snippet: '…contrato firmado digitalmente, cláusula ajuste UVA trimestral…',             score: 0.79, href: '/pipelines/OP-0074' },
  // Documentos
  { id: 'd1', entityType: 'documento', title: 'Boleto de compraventa BEL-00142', subtitle: 'Borrador · Generado 28 abr 2026',      snippet: '…pendiente firma de vendedor Carlos Ramos, cláusula 4 sin completar…',        score: 0.86, href: '/documents/DOC-00312' },
];

const ENTITY_CONFIG: Record<EntityType, { icon: string; label: string; color: string }> = {
  propiedad:  { icon: '🏠', label: 'Propiedades',  color: C.brand    },
  contacto:   { icon: '👤', label: 'Contactos',    color: C.success  },
  operacion:  { icon: '📋', label: 'Operaciones',  color: C.warning  },
  documento:  { icon: '📄', label: 'Documentos',   color: C.ai       },
  tarea:      { icon: '✅', label: 'Tareas',        color: C.textSecondary },
};

/* ─── Highlight matched text ────────────────────────────────── */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: `${C.brand}30`, color: C.brandLight, borderRadius: 2 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ─── Props ─────────────────────────────────────────────────── */
interface CommandPaletteProps {
  open:    boolean;
  onClose: () => void;
  onNavigate?: (href: string) => void;
  onOpenSearchPage?: (query: string) => void;
}

/* ─── Component ─────────────────────────────────────────────── */
export default function CommandPalette({
  open,
  onClose,
  onNavigate,
  onOpenSearchPage,
}: CommandPaletteProps) {
  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState<SearchResult[]>([]);
  const [flatItems,    setFlatItems]    = useState<SearchResult[]>([]);
  const [activeIdx,    setActiveIdx]    = useState(0);
  const [loading,      setLoading]      = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);

  // Focus on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setActiveIdx(0);
    }
  }, [open]);

  // Simulated search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setFlatItems([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      const q = query.toLowerCase();
      const filtered = MOCK_RESULTS.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.snippet.toLowerCase().includes(q)
      );
      setResults(filtered);
      setFlatItems(filtered);
      setActiveIdx(0);
      setLoading(false);
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  // Group results by entity type (max 3 per type)
  const grouped = results.reduce<Partial<Record<EntityType, SearchResult[]>>>((acc, r) => {
    if (!acc[r.entityType]) acc[r.entityType] = [];
    if ((acc[r.entityType]!.length) < 3) acc[r.entityType]!.push(r);
    return acc;
  }, {});

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatItems[activeIdx]) {
          onNavigate?.(flatItems[activeIdx].href);
          onClose();
        } else if (query.trim()) {
          onOpenSearchPage?.(query);
          onClose();
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [flatItems, activeIdx, query, onNavigate, onOpenSearchPage, onClose]);

  if (!open) return null;

  const entityOrder: EntityType[] = ['propiedad', 'contacto', 'operacion', 'documento', 'tarea'];
  const visibleGroups = entityOrder.filter(t => grouped[t]?.length);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          background: C.bgOverlay,
          backdropFilter: 'blur(4px)',
          zIndex:     9990,
        }}
      />

      {/* Palette */}
      <div
        role="dialog"
        aria-label="Búsqueda rápida"
        style={{
          position:     'fixed',
          top:          '20%',
          left:         '50%',
          transform:    'translateX(-50%)',
          width:        '100%',
          maxWidth:     620,
          background:   C.bgRaised,
          border:       `1px solid ${C.border}`,
          borderRadius: 16,
          boxShadow:    '0 32px 80px rgba(0,0,0,0.7)',
          zIndex:       9991,
          overflow:     'hidden',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input row */}
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          12,
          padding:      '14px 18px',
          borderBottom: query && !loading && results.length === 0 ? 'none' : `1px solid ${C.border}`,
        }}>
          {loading
            ? (
              <div style={{ width: 18, height: 18, flexShrink: 0, animation: 'palette-spin 0.8s linear infinite' }}>
                <svg viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke={C.border} strokeWidth="2"/>
                  <path d="M9 2A7 7 0 0 1 16 9" stroke={C.brand} strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            )
            : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="5.5" stroke={C.textTertiary} strokeWidth="1.5"/>
                <path d="M12.5 12.5 L16 16" stroke={C.textTertiary} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar propiedades, contactos, operaciones…"
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
          <kbd style={{
            padding:      '2px 8px',
            borderRadius: 5,
            background:   C.bgElevated,
            border:       `1px solid ${C.border}`,
            color:        C.textTertiary,
            fontFamily:   F.mono,
            fontSize:     11,
            flexShrink:   0,
          }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 460, overflowY: 'auto' }}>
          {!query && (
            <div style={{
              padding:    '24px 18px',
              color:      C.textTertiary,
              fontFamily: F.body,
              fontSize:   13,
              textAlign:  'center',
            }}>
              Empieza a escribir para buscar…
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                {([
                  ['↑↓', 'navegar'],
                  ['↵', 'abrir'],
                  ['Esc', 'cerrar'],
                ] as [string, string][]).map(([key, label]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <kbd style={{
                      padding:      '2px 7px',
                      borderRadius: 5,
                      background:   C.bgElevated,
                      border:       `1px solid ${C.border}`,
                      color:        C.textSecondary,
                      fontFamily:   F.mono,
                      fontSize:     12,
                    }}>
                      {key}
                    </kbd>
                    <span style={{ fontSize: 12 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {query && !loading && results.length === 0 && (
            <div style={{
              padding:    '28px 18px',
              textAlign:  'center',
              color:      C.textTertiary,
              fontFamily: F.body,
              fontSize:   13,
            }}>
              No se encontraron resultados para &ldquo;<strong style={{ color: C.textSecondary }}>{query}</strong>&rdquo;
            </div>
          )}

          {visibleGroups.map(entityType => {
            const config  = ENTITY_CONFIG[entityType];
            const items   = grouped[entityType]!;

            return (
              <div key={entityType}>
                <div style={{
                  padding:       '10px 18px 4px',
                  fontSize:      11,
                  fontFamily:    F.mono,
                  fontWeight:    600,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color:         C.textTertiary,
                  display:       'flex',
                  alignItems:    'center',
                  gap:           8,
                }}>
                  <span style={{ color: config.color }}>{config.icon}</span>
                  {config.label}
                </div>

                {items.map(result => {
                  const globalIdx = flatItems.indexOf(result);
                  const isActive  = globalIdx === activeIdx;

                  return (
                    <button
                      key={result.id}
                      onClick={() => { onNavigate?.(result.href); onClose(); }}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      style={{
                        width:        '100%',
                        padding:      '10px 18px',
                        background:   isActive ? C.bgElevated : 'transparent',
                        border:       'none',
                        borderLeft:   isActive ? `2px solid ${config.color}` : '2px solid transparent',
                        cursor:       'pointer',
                        textAlign:    'left',
                        display:      'flex',
                        alignItems:   'flex-start',
                        gap:          12,
                        transition:   'background 0.1s',
                      }}
                    >
                      <div style={{
                        width:          32,
                        height:         32,
                        borderRadius:   8,
                        background:     isActive ? `${config.color}20` : C.bgElevated,
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        fontSize:       15,
                        flexShrink:     0,
                        transition:     'background 0.1s',
                      }}>
                        {config.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily:   F.body,
                          fontWeight:   600,
                          fontSize:     14,
                          color:        C.textPrimary,
                          whiteSpace:   'nowrap',
                          overflow:     'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          <Highlight text={result.title} query={query} />
                        </div>
                        <div style={{
                          fontFamily:   F.body,
                          fontSize:     12,
                          color:        C.textSecondary,
                          marginTop:    1,
                          whiteSpace:   'nowrap',
                          overflow:     'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {result.subtitle}
                        </div>
                        {isActive && (
                          <div style={{
                            fontFamily:   F.body,
                            fontSize:     11,
                            color:        C.textTertiary,
                            marginTop:    4,
                            overflow:     'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace:   'nowrap',
                          }}>
                            {result.snippet}
                          </div>
                        )}
                      </div>

                      {/* Score badge */}
                      <div style={{
                        fontSize:   10,
                        fontFamily: F.mono,
                        color:      isActive ? config.color : C.textTertiary,
                        flexShrink: 0,
                        marginTop:  2,
                      }}>
                        {Math.round(result.score * 100)}%
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* "Ver todos los resultados" footer */}
          {results.length > 0 && (
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              <button
                onClick={() => { onOpenSearchPage?.(query); onClose(); }}
                style={{
                  width:      '100%',
                  padding:    '12px 18px',
                  background: 'transparent',
                  border:     'none',
                  cursor:     'pointer',
                  display:    'flex',
                  alignItems: 'center',
                  gap:        10,
                  color:      C.textSecondary,
                  fontFamily: F.body,
                  fontSize:   13,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = C.bgElevated;
                  (e.currentTarget as HTMLElement).style.color      = C.textPrimary;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color      = C.textSecondary;
                }}
              >
                <span>🔍</span>
                <span>Ver todos los resultados de &ldquo;{query}&rdquo;</span>
                <kbd style={{
                  marginLeft:   'auto',
                  padding:      '2px 7px',
                  borderRadius: 5,
                  background:   C.bgElevated,
                  border:       `1px solid ${C.border}`,
                  color:        C.textTertiary,
                  fontFamily:   F.mono,
                  fontSize:     11,
                }}>
                  ↵
                </kbd>
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes palette-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
