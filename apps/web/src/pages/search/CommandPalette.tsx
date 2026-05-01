import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  warning:       '#E88A14',
  error:         '#E83B3B',
  ai:            '#7E3AF2',
  aiFaint:       'rgba(126,58,242,0.10)',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

/* ─── Types ─────────────────────────────────────────────────── */
type EntityType = 'propiedad' | 'contacto' | 'operacion' | 'documento' | 'consulta';

interface SearchResult {
  id: string;
  entityType: EntityType;
  code: string;
  title: string;
  subtitle: string;
  snippet: string;
}

/* ─── Mock search results ────────────────────────────────────── */
const ALL_RESULTS: SearchResult[] = [
  // Propiedades
  { id: 'p1', entityType: 'propiedad', code: 'BEL-00142', title: 'Av. Cabildo 1850, Belgrano', subtitle: '3 amb · USD 285.000 · Venta', snippet: 'Piso 4 con balcón, vista parcial al río, cochera opcional…' },
  { id: 'p2', entityType: 'propiedad', code: 'PAL-00201', title: 'Thames 1440, Palermo', subtitle: '2 amb · USD 165.000 · Alquiler', snippet: 'Luminoso, planta baja, patio interno, pets friendly…' },
  { id: 'p3', entityType: 'propiedad', code: 'NUN-00089', title: 'Av. del Libertador 5200, Núñez', subtitle: '4 amb · USD 420.000 · Venta', snippet: 'Edificio premium, amenities completos, seguridad 24h…' },
  // Contactos
  { id: 'c1', entityType: 'contacto', code: 'CON-00312', title: 'Juan García', subtitle: 'Cliente comprador · +54 11 4523-8901', snippet: 'Busca 3 ambientes en Belgrano, presupuesto USD 250k–300k…' },
  { id: 'c2', entityType: 'contacto', code: 'CON-00287', title: 'María López', subtitle: 'Corredor CUCICBA 09876', snippet: 'Especialista en zona norte, más de 12 años de experiencia…' },
  { id: 'c3', entityType: 'contacto', code: 'CON-00401', title: 'Carlos Ramos', subtitle: 'Propietario · DNI 22.345.678', snippet: 'Vende departamento en Cabildo, acepta permuta parcial…' },
  // Operaciones
  { id: 'o1', entityType: 'operacion', code: 'OPE-2026-0042', title: 'Boleto Av. Corrientes 1234', subtitle: 'En firma · USD 250.000', snippet: 'Compraventa entre García y Ramos, escritura 30 jun 2026…' },
  { id: 'o2', entityType: 'operacion', code: 'OPE-2026-0038', title: 'Reserva Thames 1440', subtitle: 'Activa · USD 12.000', snippet: 'Reserva de alquiler, validez hasta 15 mayo 2026…' },
  { id: 'o3', entityType: 'operacion', code: 'OPE-2026-0031', title: 'Escritura Núñez lote 3', subtitle: 'Cerrada · USD 380.000', snippet: 'Operación completada 10 abr 2026, comisión liquidada…' },
  // Documentos
  { id: 'd1', entityType: 'documento', code: 'DOC-2026-0042', title: 'Boleto de Compraventa', subtitle: 'Pendiente firma · 3 firmantes', snippet: 'Partes: Juan García, Carlos Ramos, María López…' },
  { id: 'd2', entityType: 'documento', code: 'DOC-2026-0039', title: 'Contrato de locación Thames', subtitle: 'Borrador', snippet: 'Plantilla estándar, plazo 2 años, actualización trimestral…' },
];

const ENTITY_META: Record<EntityType, { label: string; icon: string; color: string }> = {
  propiedad: { label: 'Propiedades', icon: '🏠', color: C.brand },
  contacto:  { label: 'Contactos',   icon: '👤', color: C.success },
  operacion: { label: 'Operaciones', icon: '📋', color: C.warning },
  documento: { label: 'Documentos',  icon: '📄', color: C.textSecondary },
  consulta:  { label: 'Consultas',   icon: '💬', color: C.ai },
};

/* ─── Keyboard hint badge ────────────────────────────────────── */
function KbdBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      display:       'inline-flex',
      alignItems:    'center',
      padding:       '2px 6px',
      borderRadius:  4,
      background:    C.bgSubtle,
      border:        `1px solid ${C.border}`,
      color:         C.textTertiary,
      fontFamily:    F.mono,
      fontSize:      10,
      fontWeight:    500,
      letterSpacing: '0.04em',
    }}>
      {children}
    </kbd>
  );
}

/* ─── Result item ────────────────────────────────────────────── */
function ResultItem({
  result,
  isActive,
  onSelect,
  onHover,
}: {
  result: SearchResult;
  isActive: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const meta = ENTITY_META[result.entityType];

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      style={{
        width:        '100%',
        display:      'flex',
        alignItems:   'flex-start',
        gap:          12,
        padding:      '10px 16px',
        background:   isActive ? C.bgElevated : 'transparent',
        border:       'none',
        borderLeft:   isActive ? `2px solid ${C.brand}` : '2px solid transparent',
        cursor:       'pointer',
        textAlign:    'left',
        transition:   'background 0.1s',
      }}
    >
      {/* Entity icon */}
      <div style={{
        width:        32,
        height:       32,
        borderRadius: 8,
        background:   `${meta.color}18`,
        border:       `1px solid ${meta.color}30`,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        fontSize:     16,
        flexShrink:   0,
      }}>
        {meta.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontFamily:   F.body,
            fontSize:     14,
            fontWeight:   600,
            color:        C.textPrimary,
            whiteSpace:   'nowrap',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
          }}>
            {result.title}
          </span>
          <span style={{
            fontFamily:   F.mono,
            fontSize:     11,
            color:        C.textTertiary,
            flexShrink:   0,
          }}>
            {result.code}
          </span>
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
        <div style={{
          fontFamily:   F.body,
          fontSize:     12,
          color:        C.textTertiary,
          marginTop:    3,
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
        }}>
          {result.snippet}
        </div>
      </div>

      {/* Enter hint (only when active) */}
      {isActive && (
        <KbdBadge>↵</KbdBadge>
      )}
    </button>
  );
}

/* ─── Result group ───────────────────────────────────────────── */
function ResultGroup({
  entityType,
  results,
  activeIndex,
  globalOffset,
  onSelect,
  onHover,
  onVerTodos,
  query,
}: {
  entityType: EntityType;
  results: SearchResult[];
  activeIndex: number;
  globalOffset: number;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
  onVerTodos: (entityType: EntityType) => void;
  query: string;
}) {
  const meta = ENTITY_META[entityType];
  const shown = results.slice(0, 3);

  return (
    <div>
      {/* Group header */}
      <div style={{
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding:    '8px 16px 4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>{meta.icon}</span>
          <span style={{
            fontFamily:    F.mono,
            fontSize:      11,
            fontWeight:    600,
            color:         C.textTertiary,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {meta.label}
          </span>
        </div>
        {results.length > 3 && (
          <button
            type="button"
            onClick={() => onVerTodos(entityType)}
            style={{
              background:  'transparent',
              border:      'none',
              color:       C.brand,
              fontSize:    12,
              fontFamily:  F.body,
              cursor:      'pointer',
              padding:     '0 2px',
            }}
          >
            Ver todos ({results.length}) →
          </button>
        )}
      </div>

      {/* Results */}
      {shown.map((result, i) => (
        <ResultItem
          key={result.id}
          result={result}
          isActive={activeIndex === globalOffset + i}
          onSelect={() => onSelect(result)}
          onHover={() => onHover(globalOffset + i)}
        />
      ))}

      {results.length > 0 && (
        <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
      )}
    </div>
  );
}

/* ─── Main CommandPalette ────────────────────────────────────── */
export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (result: SearchResult) => void;
  onVerTodos?: (entityType?: EntityType, query?: string) => void;
}

export function CommandPalette({ isOpen, onClose, onNavigate, onVerTodos }: CommandPaletteProps) {
  const [query, setQuery]             = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading]     = useState(false);
  const inputRef                      = useRef<HTMLInputElement>(null);
  const listRef                       = useRef<HTMLDivElement>(null);

  /* Filter results by query */
  const filteredByType = (() => {
    if (!query.trim()) return {};
    const q = query.toLowerCase();
    const matched = ALL_RESULTS.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.subtitle.toLowerCase().includes(q) ||
      r.snippet.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q)
    );
    const groups: Partial<Record<EntityType, SearchResult[]>> = {};
    matched.forEach(r => {
      if (!groups[r.entityType]) groups[r.entityType] = [];
      groups[r.entityType]!.push(r);
    });
    return groups;
  })();

  const allVisible: SearchResult[] = Object.values(filteredByType).flatMap(g => g!.slice(0, 3));
  const totalVisible = allVisible.length;

  /* Simulate loading */
  useEffect(() => {
    if (!query.trim()) return;
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(t);
  }, [query]);

  /* Reset on open */
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, totalVisible - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = allVisible[activeIndex];
      if (selected) {
        onNavigate?.(selected);
        onClose();
      } else if (query.trim()) {
        onVerTodos?.(undefined, query);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [activeIndex, allVisible, onNavigate, onClose, onVerTodos, query, totalVisible]);

  if (!isOpen) return null;

  let groupOffset = 0;
  const entityOrder: EntityType[] = ['propiedad', 'contacto', 'operacion', 'documento'];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          background: 'rgba(2,6,18,0.7)',
          zIndex:     1000,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Palette panel */}
      <div
        onKeyDown={handleKeyDown}
        style={{
          position:    'fixed',
          top:         '15vh',
          left:        '50%',
          transform:   'translateX(-50%)',
          width:       '100%',
          maxWidth:    640,
          borderRadius: 14,
          background:  C.bgRaised,
          border:      `1px solid ${C.border}`,
          boxShadow:   '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          zIndex:      1001,
          overflow:    'hidden',
          display:     'flex',
          flexDirection: 'column',
          maxHeight:   '65vh',
        }}
      >
        {/* Search input row */}
        <div style={{
          display:     'flex',
          alignItems:  'center',
          gap:         10,
          padding:     '14px 16px',
          borderBottom: query.trim() ? `1px solid ${C.border}` : 'none',
        }}>
          {/* Search icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary} strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
            placeholder="Buscar propiedades, contactos, operaciones…"
            style={{
              flex:       1,
              background: 'transparent',
              border:     'none',
              outline:    'none',
              color:      C.textPrimary,
              fontFamily: F.body,
              fontSize:   16,
            }}
          />

          {/* Spinner / clear */}
          {isLoading ? (
            <div style={{
              width:        16,
              height:       16,
              borderRadius: '50%',
              border:       `2px solid ${C.border}`,
              borderTopColor: C.brand,
              animation:    'cmd-spin 0.6s linear infinite',
              flexShrink:   0,
            }} />
          ) : query ? (
            <button
              type="button"
              onClick={() => { setQuery(''); setActiveIndex(0); inputRef.current?.focus(); }}
              style={{
                background: 'transparent',
                border:     'none',
                color:      C.textTertiary,
                cursor:     'pointer',
                fontSize:   14,
                padding:    2,
              }}
            >
              ✕
            </button>
          ) : (
            <KbdBadge>Esc</KbdBadge>
          )}
        </div>

        {/* Results area */}
        <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
          {!query.trim() ? (
            /* Empty / initial state */
            <div style={{
              padding:    '24px 16px 28px',
              textAlign:  'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: '0 0 16px' }}>
                Escribe para buscar en toda tu base de datos
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[
                  { label: 'Propiedades', icon: '🏠', hint: 'BEL-00142' },
                  { label: 'Contactos',   icon: '👤', hint: 'Juan García' },
                  { label: 'Operaciones', icon: '📋', hint: 'OPE-2026' },
                  { label: 'Documentos',  icon: '📄', hint: 'Boleto' },
                ].map(({ label, icon, hint }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setQuery(hint)}
                    style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          6,
                      padding:      '6px 12px',
                      borderRadius: 8,
                      background:   C.bgSubtle,
                      border:       `1px solid ${C.border}`,
                      color:        C.textSecondary,
                      fontFamily:   F.body,
                      fontSize:     12,
                      cursor:       'pointer',
                    }}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>
          ) : !isLoading && totalVisible === 0 ? (
            /* No results */
            <div style={{
              padding:   '32px 16px',
              textAlign: 'center',
            }}>
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: 0 }}>
                Sin resultados para <strong style={{ color: C.textPrimary }}>"{query}"</strong>
              </p>
            </div>
          ) : (
            /* Results grouped */
            !isLoading && entityOrder.map(type => {
              const group = filteredByType[type];
              if (!group || group.length === 0) return null;
              const offset = groupOffset;
              groupOffset += Math.min(group.length, 3);
              return (
                <ResultGroup
                  key={type}
                  entityType={type}
                  results={group}
                  activeIndex={activeIndex}
                  globalOffset={offset}
                  onSelect={r => { onNavigate?.(r); onClose(); }}
                  onHover={setActiveIndex}
                  onVerTodos={t => { onVerTodos?.(t, query); onClose(); }}
                  query={query}
                />
              );
            })
          )}
        </div>

        {/* Footer keyboard hints */}
        {query.trim() && totalVisible > 0 && (
          <div style={{
            padding:      '8px 16px',
            borderTop:    `1px solid ${C.border}`,
            display:      'flex',
            alignItems:   'center',
            gap:          12,
            background:   C.bgOverlay,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <KbdBadge>↑</KbdBadge>
              <KbdBadge>↓</KbdBadge>
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, marginLeft: 4 }}>navegar</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <KbdBadge>↵</KbdBadge>
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, marginLeft: 4 }}>abrir</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <KbdBadge>Esc</KbdBadge>
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, marginLeft: 4 }}>cerrar</span>
            </div>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => { onVerTodos?.(undefined, query); onClose(); }}
              style={{
                background:  'transparent',
                border:      'none',
                color:       C.brand,
                fontFamily:  F.body,
                fontSize:    12,
                cursor:      'pointer',
                fontWeight:  600,
              }}
            >
              Ver todos los resultados →
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes cmd-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

/* ─── Standalone demo wrapper ────────────────────────────────── */
export default function CommandPaletteDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  /* Global keyboard shortcut ⌘K / Ctrl+K */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{
      minHeight:   '100vh',
      background:  C.bgBase,
      fontFamily:  F.body,
      display:     'flex',
      flexDirection: 'column',
      alignItems:  'center',
      justifyContent: 'center',
      gap:         24,
    }}>
      {/* Wireframe banner */}
      <div style={{
        position:     'fixed',
        top:          0,
        left:         0,
        right:        0,
        background:   C.bgRaised,
        borderBottom: `1px solid ${C.border}`,
        padding:      '8px 20px',
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        fontSize:     12,
        fontFamily:   F.mono,
        color:        C.textTertiary,
        zIndex:       2000,
      }}>
        <span style={{ color: C.ai, fontWeight: 600 }}>✦ WIREFRAME · RENA-78</span>
        <span>Command Palette — Smart Search</span>
      </div>

      <div style={{ textAlign: 'center', marginTop: 60 }}>
        <h1 style={{
          fontFamily: F.display,
          fontSize:   28,
          fontWeight: 700,
          color:      C.textPrimary,
          margin:     '0 0 8px',
        }}>
          Smart Search
        </h1>
        <p style={{ color: C.textSecondary, fontSize: 14, margin: '0 0 24px' }}>
          Presiona <strong style={{ color: C.textPrimary }}>⌘K</strong> o el botón para abrir la paleta de búsqueda
        </p>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          10,
            padding:      '10px 20px',
            borderRadius: 10,
            background:   C.bgRaised,
            border:       `1px solid ${C.border}`,
            color:        C.textSecondary,
            fontFamily:   F.body,
            fontSize:     14,
            cursor:       'pointer',
            boxShadow:    '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span>Buscar…</span>
          <KbdBadge>⌘K</KbdBadge>
        </button>

        {lastAction && (
          <div style={{
            marginTop:    16,
            padding:      '8px 16px',
            borderRadius: 8,
            background:   C.bgSubtle,
            border:       `1px solid ${C.border}`,
            color:        C.textSecondary,
            fontSize:     13,
            fontFamily:   F.mono,
          }}>
            {lastAction}
          </div>
        )}
      </div>

      <CommandPalette
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onNavigate={r => setLastAction(`→ Navegar a ${r.entityType}: ${r.title} (${r.code})`)}
        onVerTodos={(type, q) => setLastAction(`→ Ver todos ${type ? `(${type})` : ''} para: "${q}"`)}
      />
    </div>
  );
}
