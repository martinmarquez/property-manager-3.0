import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  usePaletteSearch,
  useDebounce,
  getRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
  ENTITY_DISPLAY,
  ENTITY_HREF,
  type EntityType,
  type SearchResult,
  type AutocompleteResult,
} from '../../hooks/useSearch.js';

const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  bgOverlay:     'rgba(7,13,26,0.85)',
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

const ENTITY_ORDER: EntityType[] = ['property', 'contact', 'lead', 'document'];

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

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (href: string) => void;
  onOpenSearchPage?: (query: string) => void;
}

export default function CommandPalette({
  open,
  onClose,
  onNavigate,
  onOpenSearchPage,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { results, suggestions, isLoading, phase } = usePaletteSearch(query, open);

  // Group results by entity type (max 3 per type)
  const grouped = results.reduce<Partial<Record<EntityType, SearchResult[]>>>((acc, r) => {
    if (!acc[r.entityType]) acc[r.entityType] = [];
    if (acc[r.entityType]!.length < 3) acc[r.entityType]!.push(r);
    return acc;
  }, {});

  const visibleGroups = ENTITY_ORDER.filter(t => grouped[t]?.length);
  const flatItems: SearchResult[] = visibleGroups.flatMap(t => grouped[t]!);

  // Build navigable items: suggestions first (if no results yet), then grouped results
  const showSuggestions = suggestions.length > 0 && results.length === 0 && query.length >= 2;
  const totalNavigable = showSuggestions ? suggestions.length : flatItems.length;

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setActiveIdx(0);
      setRecentSearches(getRecentSearches());
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [results, suggestions]);

  const navigateToResult = useCallback((result: SearchResult) => {
    saveRecentSearch(query);
    const href = ENTITY_HREF[result.entityType](result.entityId);
    onNavigate?.(href);
    onClose();
  }, [query, onNavigate, onClose]);

  const navigateToSuggestion = useCallback((suggestion: AutocompleteResult) => {
    saveRecentSearch(suggestion.label);
    const href = ENTITY_HREF[suggestion.entityType](suggestion.entityId);
    onNavigate?.(href);
    onClose();
  }, [onNavigate, onClose]);

  const openFullSearch = useCallback(() => {
    if (query.trim()) {
      saveRecentSearch(query);
      onOpenSearchPage?.(query);
      onClose();
    }
  }, [query, onOpenSearchPage, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, totalNavigable - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (showSuggestions && suggestions[activeIdx]) {
          navigateToSuggestion(suggestions[activeIdx]);
        } else if (flatItems[activeIdx]) {
          navigateToResult(flatItems[activeIdx]);
        } else {
          openFullSearch();
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [totalNavigable, showSuggestions, suggestions, flatItems, activeIdx, navigateToResult, navigateToSuggestion, openFullSearch, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector('[data-active="true"]') as HTMLElement | null;
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  const showEmpty = !query && recentSearches.length === 0;
  const showRecent = !query && recentSearches.length > 0;
  const showNoResults = query.trim().length > 0 && !isLoading && results.length === 0 && suggestions.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: C.bgOverlay,
          backdropFilter: 'blur(6px)',
          zIndex: 9990,
          animation: 'palette-fade-in 0.15s ease-out',
        }}
      />

      {/* Palette */}
      <div
        role="combobox"
        aria-expanded={results.length > 0 || suggestions.length > 0}
        aria-haspopup="listbox"
        aria-label="Búsqueda rápida"
        style={{
          position: 'fixed',
          top: '18%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 640,
          background: C.bgRaised,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          boxShadow: '0 40px 100px rgba(0,0,0,0.75), 0 0 0 1px rgba(22,84,217,0.08)',
          zIndex: 9991,
          overflow: 'hidden',
          animation: 'palette-slide-in 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          {isLoading ? (
            <div style={{ width: 18, height: 18, flexShrink: 0, animation: 'palette-spin 0.8s linear infinite' }}>
              <svg viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke={C.border} strokeWidth="2" />
                <path d="M9 2A7 7 0 0 1 16 9" stroke={C.brand} strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="5.5" stroke={C.textTertiary} strokeWidth="1.5" />
              <path d="M12.5 12.5 L16 16" stroke={C.textTertiary} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar propiedades, contactos, operaciones…"
            aria-autocomplete="list"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: C.textPrimary,
              fontFamily: F.body,
              fontSize: 15,
            }}
          />
          {/* Phase indicator */}
          {phase === 'keyword' && query && (
            <span style={{
              fontSize: 10,
              fontFamily: F.mono,
              color: C.textTertiary,
              flexShrink: 0,
              padding: '2px 6px',
              borderRadius: 4,
              background: C.bgElevated,
            }}>
              buscando…
            </span>
          )}
          <kbd style={{
            padding: '2px 8px',
            borderRadius: 5,
            background: C.bgElevated,
            border: `1px solid ${C.border}`,
            color: C.textTertiary,
            fontFamily: F.mono,
            fontSize: 11,
            flexShrink: 0,
          }}>
            Esc
          </kbd>
        </div>

        {/* Results area */}
        <div ref={listRef} role="listbox" style={{ maxHeight: 460, overflowY: 'auto' }}>
          {/* Empty state */}
          {showEmpty && (
            <div style={{
              padding: '28px 18px',
              color: C.textTertiary,
              fontFamily: F.body,
              fontSize: 13,
              textAlign: 'center',
            }}>
              Empieza a escribir para buscar…
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16 }}>
                {([['↑↓', 'navegar'], ['↵', 'abrir'], ['Esc', 'cerrar']] as [string, string][]).map(([key, label]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <kbd style={{
                      padding: '2px 7px',
                      borderRadius: 5,
                      background: C.bgElevated,
                      border: `1px solid ${C.border}`,
                      color: C.textSecondary,
                      fontFamily: F.mono,
                      fontSize: 12,
                    }}>{key}</kbd>
                    <span style={{ fontSize: 12 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent searches */}
          {showRecent && (
            <div>
              <div style={{
                padding: '10px 18px 4px',
                fontSize: 11,
                fontFamily: F.mono,
                fontWeight: 600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: C.textTertiary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>Búsquedas recientes</span>
                <button
                  onClick={() => { clearRecentSearches(); setRecentSearches([]); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: C.textTertiary,
                    fontSize: 10,
                    fontFamily: F.mono,
                    cursor: 'pointer',
                    textTransform: 'none',
                    letterSpacing: 'normal',
                  }}
                >
                  Limpiar
                </button>
              </div>
              {recentSearches.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(s)}
                  style={{
                    width: '100%',
                    padding: '8px 18px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: C.textSecondary,
                    fontFamily: F.body,
                    fontSize: 13,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.bgElevated; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Autocomplete suggestions (shown before full results arrive) */}
          {showSuggestions && (
            <div>
              <div style={{
                padding: '10px 18px 4px',
                fontSize: 11,
                fontFamily: F.mono,
                fontWeight: 600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: C.textTertiary,
              }}>
                Sugerencias
              </div>
              {suggestions.map((s, i) => {
                const config = ENTITY_DISPLAY[s.entityType];
                const isActive = i === activeIdx;
                return (
                  <button
                    key={`${s.entityType}-${s.entityId}`}
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    onClick={() => navigateToSuggestion(s)}
                    onMouseEnter={() => setActiveIdx(i)}
                    style={{
                      width: '100%',
                      padding: '9px 18px',
                      background: isActive ? C.bgElevated : 'transparent',
                      border: 'none',
                      borderLeft: isActive ? `2px solid ${config.color}` : '2px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{config.icon}</span>
                    <span style={{ fontFamily: F.body, fontSize: 14, color: C.textPrimary, fontWeight: 500 }}>
                      <Highlight text={s.label} query={query} />
                    </span>
                    {s.secondaryLabel && (
                      <span style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary }}>
                        {s.secondaryLabel}
                      </span>
                    )}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary} strokeWidth="2" strokeLinecap="round" style={{ marginLeft: 'auto', opacity: isActive ? 1 : 0 }}>
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {showNoResults && (
            <div style={{
              padding: '28px 18px',
              textAlign: 'center',
              color: C.textTertiary,
              fontFamily: F.body,
              fontSize: 13,
            }}>
              No se encontraron resultados para &ldquo;<strong style={{ color: C.textSecondary }}>{query}</strong>&rdquo;
            </div>
          )}

          {/* Grouped results */}
          {visibleGroups.map(entityType => {
            const config = ENTITY_DISPLAY[entityType];
            const items = grouped[entityType]!;

            return (
              <div key={entityType}>
                <div style={{
                  padding: '10px 18px 4px',
                  fontSize: 11,
                  fontFamily: F.mono,
                  fontWeight: 600,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: C.textTertiary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span style={{ color: config.color }}>{config.icon}</span>
                  {config.label}
                  {items.length >= 3 && (
                    <button
                      onClick={() => { onOpenSearchPage?.(`${query}&type=${entityType}`); onClose(); }}
                      style={{
                        marginLeft: 'auto',
                        background: 'none',
                        border: 'none',
                        color: C.brandLight,
                        fontSize: 10,
                        fontFamily: F.mono,
                        cursor: 'pointer',
                        textTransform: 'none',
                        letterSpacing: 'normal',
                      }}
                    >
                      Ver todos →
                    </button>
                  )}
                </div>

                {items.map(result => {
                  const globalIdx = flatItems.indexOf(result);
                  const isActive = !showSuggestions && globalIdx === activeIdx;

                  return (
                    <button
                      key={`${result.entityType}-${result.entityId}`}
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      onClick={() => navigateToResult(result)}
                      onMouseEnter={() => { if (!showSuggestions) setActiveIdx(globalIdx); }}
                      style={{
                        width: '100%',
                        padding: '10px 18px',
                        background: isActive ? C.bgElevated : 'transparent',
                        border: 'none',
                        borderLeft: isActive ? `2px solid ${config.color}` : '2px solid transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        transition: 'background 0.1s',
                      }}
                    >
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: isActive ? `${config.color}20` : C.bgElevated,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 15,
                        flexShrink: 0,
                        transition: 'background 0.1s',
                      }}>
                        {config.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: F.body,
                          fontWeight: 600,
                          fontSize: 14,
                          color: C.textPrimary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          <Highlight text={result.title} query={query} />
                        </div>
                        <div style={{
                          fontFamily: F.body,
                          fontSize: 12,
                          color: C.textSecondary,
                          marginTop: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {result.subtitle}
                        </div>
                        {isActive && result.snippet && (
                          <div style={{
                            fontFamily: F.body,
                            fontSize: 11,
                            color: C.textTertiary,
                            marginTop: 4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {result.snippet}
                          </div>
                        )}
                      </div>

                      {/* Match type + score */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 10,
                          fontFamily: F.mono,
                          color: isActive ? config.color : C.textTertiary,
                        }}>
                          {Math.round(result.relevanceScore * 100)}%
                        </span>
                        {result.matchedOn === 'keyword+semantic' && (
                          <span style={{
                            fontSize: 9,
                            fontFamily: F.mono,
                            color: C.textTertiary,
                            background: C.bgElevated,
                            padding: '1px 4px',
                            borderRadius: 3,
                          }}>
                            AI
                          </span>
                        )}
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
                onClick={openFullSearch}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: C.textSecondary,
                  fontFamily: F.body,
                  fontSize: 13,
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = C.bgElevated;
                  (e.currentTarget as HTMLElement).style.color = C.textPrimary;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = C.textSecondary;
                }}
              >
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                  <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12.5 12.5 L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>Ver todos los resultados de &ldquo;{query}&rdquo;</span>
                <kbd style={{
                  marginLeft: 'auto',
                  padding: '2px 7px',
                  borderRadius: 5,
                  background: C.bgElevated,
                  border: `1px solid ${C.border}`,
                  color: C.textTertiary,
                  fontFamily: F.mono,
                  fontSize: 11,
                }}>↵</kbd>
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes palette-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes palette-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes palette-slide-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
