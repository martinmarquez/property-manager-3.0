import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import {
  useSearchQuery,
  useEntityCounts,
  saveRecentSearch,
  ENTITY_DISPLAY,
  ENTITY_HREF,
  type EntityType,
  type SearchResult,
} from '../../hooks/useSearch.js';

const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  border:        '#1F2D48',
  borderHover:   '#2A3D5C',
  brand:         '#1654d9',
  brandLight:    '#4669ff',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

const PAGE_SIZE = 5;
const ENTITY_TYPES: EntityType[] = ['property', 'contact', 'lead', 'document'];

const TABLET_MQ = '(max-width: 1023px)';
function useIsCompact() {
  return useSyncExternalStore(
    (cb) => { const mql = matchMedia(TABLET_MQ); mql.addEventListener('change', cb); return () => mql.removeEventListener('change', cb); },
    () => matchMedia(TABLET_MQ).matches,
    () => false,
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: `${C.brand}30`, color: C.brandLight, borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function ResultCard({ result, query, onNavigate }: { result: SearchResult; query: string; onNavigate: (href: string) => void }) {
  const config = ENTITY_DISPLAY[result.entityType];
  const [hovered, setHovered] = useState(false);
  const href = ENTITY_HREF[result.entityType](result.entityId);

  return (
    <a
      href={href}
      onClick={e => { e.preventDefault(); onNavigate(href); }}
      style={{
        display: 'block',
        padding: '18px 20px',
        borderRadius: 12,
        background: hovered ? C.bgElevated : C.bgRaised,
        border: `1px solid ${hovered ? C.borderHover : C.border}`,
        textDecoration: 'none',
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${config.color}18`,
          border: `1px solid ${config.color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}>
          {config.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 15, color: C.textPrimary }}>
              <Highlight text={result.title} query={query} />
            </span>
            {result.matchedOn === 'keyword+semantic' && (
              <span style={{
                padding: '1px 6px',
                borderRadius: 4,
                background: 'rgba(126,58,242,0.12)',
                border: '1px solid rgba(126,58,242,0.25)',
                color: '#7E3AF2',
                fontFamily: F.mono,
                fontSize: 9,
                fontWeight: 600,
              }}>
                AI match
              </span>
            )}
            <span style={{
              marginLeft: 'auto',
              fontFamily: F.mono,
              fontSize: 11,
              color: hovered ? config.color : C.textTertiary,
              flexShrink: 0,
            }}>
              {Math.round(result.relevanceScore * 100)}%
            </span>
          </div>

          {result.subtitle && (
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, marginTop: 3 }}>
              <Highlight text={result.subtitle} query={query} />
            </div>
          )}

          {result.snippet && (
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginTop: 6, lineHeight: 1.5 }}>
              <Highlight text={result.snippet} query={query} />
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

interface SearchPageProps {
  initialQuery?: string;
  initialEntityType?: EntityType;
  onNavigate?: (href: string) => void;
  onOpenPalette?: () => void;
}

export default function SearchPage({ initialQuery = '', initialEntityType, onNavigate, onOpenPalette }: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<EntityType | undefined>(initialEntityType);
  const [cursor, setCursor] = useState(0);
  const isCompact = useIsCompact();

  const { results, total, hasMore, isLoading, isFetching, phase } = useSearchQuery({
    query,
    entityType: activeFilter,
    limit: PAGE_SIZE,
    cursor,
    debounceMs: 300,
  });

  const entityCounts = useEntityCounts(query, 300);

  // Reset pagination on query/filter change
  useEffect(() => { setCursor(0); }, [query, activeFilter]);

  // Sync URL query + type params
  useEffect(() => {
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }
    if (activeFilter) {
      url.searchParams.set('type', activeFilter);
    } else {
      url.searchParams.delete('type');
    }
    window.history.replaceState({}, '', url.toString());
  }, [query, activeFilter]);

  const handleNavigate = useCallback((href: string) => {
    saveRecentSearch(query);
    onNavigate?.(href);
  }, [query, onNavigate]);

  const currentPage = Math.floor(cursor / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ minHeight: '100%', fontFamily: F.body }}>
      {/* Page header */}
      <div style={{
        padding: '28px 32px 22px',
        borderBottom: `1px solid ${C.border}`,
        background: C.bgRaised,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <h1 style={{
              fontFamily: F.display,
              fontSize: 22,
              fontWeight: 700,
              color: C.textPrimary,
              margin: 0,
            }}>
              Resultados de búsqueda
            </h1>
            {onOpenPalette && (
              <button
                onClick={onOpenPalette}
                style={{
                  marginLeft: 'auto',
                  padding: '5px 12px',
                  borderRadius: 8,
                  background: C.bgElevated,
                  border: `1px solid ${C.border}`,
                  color: C.textSecondary,
                  fontFamily: F.mono,
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>Paleta rápida</span>
                <kbd style={{ background: C.bgBase, padding: '1px 5px', borderRadius: 4, border: `1px solid ${C.border}` }}>⌘K</kbd>
              </button>
            )}
          </div>

          {/* Search input */}
          <div style={{ position: 'relative', maxWidth: 580 }}>
            <svg
              width="16" height="16" viewBox="0 0 18 18" fill="none"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="8" cy="8" r="5.5" stroke={C.textTertiary} strokeWidth="1.5" />
              <path d="M12.5 12.5 L16 16" stroke={C.textTertiary} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar en todas las entidades…"
              aria-label="Búsqueda"
              style={{
                width: '100%',
                padding: '11px 16px 11px 40px',
                borderRadius: 10,
                background: C.bgElevated,
                border: `1px solid ${C.border}`,
                color: C.textPrimary,
                fontFamily: F.body,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = `${C.brand}60`; }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = C.border; }}
            />
            {isFetching && (
              <div style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                animation: 'search-spin 0.8s linear infinite',
              }}>
                <svg viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke={C.border} strokeWidth="2" />
                  <path d="M9 2A7 7 0 0 1 16 9" stroke={C.brand} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>

          {query && (
            <div style={{ marginTop: 10, fontFamily: F.body, fontSize: 13, color: C.textTertiary }}>
              {isLoading ? 'Buscando…' : `${total} resultado${total !== 1 ? 's' : ''}`}
              {activeFilter && ` en ${ENTITY_DISPLAY[activeFilter].label}`}
            </div>
          )}
        </div>
      </div>

      {/* Compact filter chips (tablet/mobile) */}
      {isCompact && (
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${C.border}`,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
            <button
              onClick={() => setActiveFilter(undefined)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 20,
                background: !activeFilter ? `${C.brand}20` : C.bgElevated,
                border: !activeFilter ? `1px solid ${C.brand}50` : `1px solid ${C.border}`,
                color: !activeFilter ? C.textPrimary : C.textSecondary,
                fontFamily: F.body,
                fontSize: 12,
                fontWeight: !activeFilter ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Todos {query && <span style={{ fontFamily: F.mono, fontSize: 10 }}>({total})</span>}
            </button>
            {ENTITY_TYPES.map(et => {
              const config = ENTITY_DISPLAY[et];
              const isActive = activeFilter === et;
              return (
                <button
                  key={et}
                  onClick={() => setActiveFilter(isActive ? undefined : et)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 20,
                    background: isActive ? `${config.color}20` : C.bgElevated,
                    border: isActive ? `1px solid ${config.color}50` : `1px solid ${C.border}`,
                    color: isActive ? C.textPrimary : C.textSecondary,
                    fontFamily: F.body,
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{config.icon}</span>
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: isCompact ? '16px' : '24px 32px',
        display: 'flex',
        gap: 28,
        alignItems: 'flex-start',
      }}>
        {/* Left sidebar: filter chips (desktop only) */}
        {!isCompact && (
        <div style={{
          width: 240,
          flexShrink: 0,
          position: 'sticky',
          top: 24,
        }}>
          <div style={{
            fontFamily: F.mono,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: C.textTertiary,
            marginBottom: 10,
          }}>
            Filtrar por tipo
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <button
              onClick={() => setActiveFilter(undefined)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                background: !activeFilter ? `${C.brand}15` : 'transparent',
                border: !activeFilter ? `1px solid ${C.brand}40` : '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 14 }}>🔍</span>
              <span style={{
                fontFamily: F.body,
                fontSize: 13,
                color: !activeFilter ? C.textPrimary : C.textSecondary,
                flex: 1,
                fontWeight: !activeFilter ? 600 : 400,
              }}>
                Todos
              </span>
              {query && (
                <span style={{
                  padding: '1px 7px',
                  borderRadius: 20,
                  background: !activeFilter ? C.brand : C.bgElevated,
                  color: !activeFilter ? '#fff' : C.textTertiary,
                  fontFamily: F.mono,
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {total}
                </span>
              )}
            </button>

            {ENTITY_TYPES.map(et => {
              const config = ENTITY_DISPLAY[et];
              const isActive = activeFilter === et;
              return (
                <button
                  key={et}
                  onClick={() => setActiveFilter(isActive ? undefined : et)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 8,
                    background: isActive ? `${config.color}15` : 'transparent',
                    borderTop: isActive ? `1px solid ${config.color}40` : '1px solid transparent',
                    borderRight: isActive ? `1px solid ${config.color}40` : '1px solid transparent',
                    borderBottom: isActive ? `1px solid ${config.color}40` : '1px solid transparent',
                    borderLeft: isActive ? `2px solid ${config.color}` : '1px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = C.bgElevated;
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: 14 }}>{config.icon}</span>
                  <span style={{
                    fontFamily: F.body,
                    fontSize: 13,
                    color: isActive ? C.textPrimary : C.textSecondary,
                    flex: 1,
                    fontWeight: isActive ? 600 : 400,
                  }}>
                    {config.label}
                  </span>
                  {query && entityCounts[et] != null && (
                    <span style={{
                      padding: '1px 7px',
                      borderRadius: 20,
                      background: isActive ? config.color : C.bgElevated,
                      color: isActive ? '#fff' : C.textTertiary,
                      fontFamily: F.mono,
                      fontSize: 11,
                      fontWeight: 600,
                    }}>
                      {entityCounts[et]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeFilter && (
            <button
              onClick={() => setActiveFilter(undefined)}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                background: 'transparent',
                border: `1px solid ${C.border}`,
                color: C.textTertiary,
                fontFamily: F.body,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
            >
              Quitar filtros
            </button>
          )}

          {/* Keyboard hints */}
          <div style={{
            marginTop: 24,
            padding: 12,
            borderRadius: 8,
            background: C.bgRaised,
            border: `1px solid ${C.border}`,
          }}>
            <div style={{
              fontFamily: F.mono,
              fontSize: 10,
              color: C.textTertiary,
              marginBottom: 8,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              Atajos
            </div>
            {[['⌘K', 'Paleta rápida'], ['/', 'Buscar']].map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <kbd style={{
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: C.bgElevated,
                  border: `1px solid ${C.border}`,
                  color: C.textSecondary,
                  fontFamily: F.mono,
                  fontSize: 11,
                }}>{key}</kbd>
                <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Results list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!query && (
            <div style={{
              padding: 48,
              textAlign: 'center',
              color: C.textTertiary,
              fontFamily: F.body,
              fontSize: 14,
              background: C.bgRaised,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
            }}>
              Ingresa un término de búsqueda para encontrar propiedades, contactos, operaciones y documentos.
            </div>
          )}

          {query && isLoading && (
            <div style={{
              padding: 48,
              textAlign: 'center',
              color: C.textTertiary,
              fontFamily: F.body,
              fontSize: 14,
            }}>
              <div style={{ width: 24, height: 24, margin: '0 auto 12px', animation: 'search-spin 0.8s linear infinite' }}>
                <svg viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke={C.border} strokeWidth="2" />
                  <path d="M9 2A7 7 0 0 1 16 9" stroke={C.brand} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              Buscando…
            </div>
          )}

          {query && !isLoading && results.length === 0 && (
            <div style={{
              padding: 48,
              textAlign: 'center',
              color: C.textTertiary,
              fontFamily: F.body,
              fontSize: 14,
              background: C.bgRaised,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
            }}>
              No se encontraron resultados para &ldquo;<strong style={{ color: C.textSecondary }}>{query}</strong>&rdquo;
              {activeFilter && (
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => setActiveFilter(undefined)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: C.brandLight,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: F.body,
                    }}
                  >
                    Buscar en todas las categorías →
                  </button>
                </div>
              )}
            </div>
          )}

          {results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {results.map(r => (
                <ResultCard
                  key={`${r.entityType}-${r.entityId}`}
                  result={r}
                  query={query}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (() => {
            const pages: number[] = [];
            const maxVisible = 5;
            let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
            const end = Math.min(totalPages, start + maxVisible - 1);
            if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
            for (let p = start; p <= end; p++) pages.push(p);

            return (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
                marginTop: 24,
              }}>
                <button
                  onClick={() => setCursor(c => Math.max(0, c - PAGE_SIZE))}
                  disabled={cursor === 0}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: `1px solid ${C.border}`,
                    color: cursor === 0 ? C.textTertiary : C.textSecondary,
                    cursor: cursor === 0 ? 'default' : 'pointer',
                    fontFamily: F.body,
                    fontSize: 13,
                    opacity: cursor === 0 ? 0.5 : 1,
                  }}
                >
                  ←
                </button>

                {pages.map(p => {
                  const isCurrentPage = p === currentPage;
                  return (
                    <button
                      key={p}
                      onClick={() => setCursor((p - 1) * PAGE_SIZE)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: isCurrentPage ? C.brand : 'transparent',
                        border: isCurrentPage ? 'none' : `1px solid ${C.border}`,
                        color: isCurrentPage ? '#fff' : C.textSecondary,
                        cursor: isCurrentPage ? 'default' : 'pointer',
                        fontFamily: F.mono,
                        fontSize: 13,
                        fontWeight: isCurrentPage ? 700 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCursor(c => c + PAGE_SIZE)}
                  disabled={!hasMore}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: `1px solid ${C.border}`,
                    color: !hasMore ? C.textTertiary : C.textSecondary,
                    cursor: !hasMore ? 'default' : 'pointer',
                    fontFamily: F.body,
                    fontSize: 13,
                    opacity: !hasMore ? 0.5 : 1,
                  }}
                >
                  →
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      <style>{`
        @keyframes search-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
