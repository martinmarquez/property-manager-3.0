import React, { useRef, useState, useEffect } from 'react';
import type { SavedView, PropertyFilter, ViewMode } from '../../routes/properties/-types.js';

/* ─────────────────────────────────────────────────────────
   SavedViewsMenu — dropdown button for saved filter views.

   - "Guardar vista actual" inline input at the top
   - List of existing saved views
   - Click view → apply filter + viewMode
   - Delete button per view
   ───────────────────────────────────────────────────────── */

const C = {
  bgOverlay:    '#121D33',
  bgRaised:     '#0D1526',
  border:       '#1F2D48',
  brand:        '#1654d9',
  brandLight:   '#4669ff',
  textPrimary:  '#EFF4FF',
  textSecondary:'#8DA0C0',
  textTertiary: '#506180',
};

interface SavedViewsMenuProps {
  views: SavedView[];
  onSave: (name: string) => void;
  onApply: (filter: PropertyFilter, viewMode: ViewMode) => void;
  onDelete: (id: string) => void;
  /** Count of active filters (shown on button badge) */
  activeFilterCount: number;
}

export function SavedViewsMenu({
  views, onSave, onApply, onDelete, activeFilterCount,
}: SavedViewsMenuProps) {
  const [open, setOpen] = useState(false);
  const [saveInput, setSaveInput] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Close on outside click ── */
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* ── Focus input when menu opens ── */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const name = saveInput.trim();
    if (!name) return;
    onSave(name);
    setSaveInput('');
    setOpen(false);
  }

  function relativeDate(iso: string): string {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const days = Math.floor(diff / 86_400_000);
      if (days === 0) return 'hoy';
      if (days === 1) return 'ayer';
      if (days < 30) return `hace ${days} días`;
      const months = Math.floor(days / 30);
      return `hace ${months} mes${months > 1 ? 'es' : ''}`;
    } catch {
      return '';
    }
  }

  const VIEW_ICONS: Record<ViewMode, React.ReactNode> = {
    table: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    ),
    cards: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
    map: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      </svg>
    ),
  };

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
          background: C.bgRaised,
          border: `1px solid ${open ? C.brand : C.border}`,
          color: open ? C.brandLight : C.textSecondary,
          cursor: 'pointer', transition: 'all 0.15s',
          position: 'relative',
        }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        Vistas guardadas
        {views.length > 0 && (
          <span style={{
            minWidth: 16, height: 16, borderRadius: 8,
            background: C.brand, color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
          }}>
            {views.length}
          </span>
        )}
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100,
            width: 280, background: C.bgOverlay,
            border: `1px solid ${C.border}`, borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
          role="menu"
        >
          {/* Save current view */}
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, color: C.textTertiary, margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Guardar vista actual
            </p>
            <form onSubmit={handleSave} style={{ display: 'flex', gap: 6 }}>
              <input
                ref={inputRef}
                type="text"
                value={saveInput}
                onChange={(e) => setSaveInput(e.target.value)}
                placeholder={`Vista${activeFilterCount > 0 ? ` (${activeFilterCount} filtros)` : ''}`}
                maxLength={60}
                style={{
                  flex: 1, padding: '6px 9px', borderRadius: 5, fontSize: 12,
                  background: '#0A1120', border: `1px solid ${C.border}`,
                  color: C.textPrimary, outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!saveInput.trim()}
                style={{
                  padding: '6px 12px', borderRadius: 5, fontSize: 12,
                  background: saveInput.trim() ? C.brand : 'transparent',
                  border: `1px solid ${saveInput.trim() ? C.brand : C.border}`,
                  color: saveInput.trim() ? '#fff' : C.textTertiary,
                  cursor: saveInput.trim() ? 'pointer' : 'default',
                }}
              >
                Guardar
              </button>
            </form>
          </div>

          {/* View list */}
          {views.length === 0 ? (
            <div style={{ padding: '20px 14px', textAlign: 'center', color: C.textTertiary, fontSize: 12 }}>
              No hay vistas guardadas
            </div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {views.map((view) => (
                <div
                  key={view.id}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '9px 14px',
                    borderBottom: `1px solid ${C.border}`,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#0D1526'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  {/* Apply */}
                  <button
                    onClick={() => { onApply(view.filter, view.viewMode); setOpen(false); }}
                    style={{
                      flex: 1, textAlign: 'left', background: 'none', border: 'none',
                      cursor: 'pointer', padding: 0,
                    }}
                    role="menuitem"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ color: C.textSecondary, flexShrink: 0 }}>
                        {VIEW_ICONS[view.viewMode]}
                      </span>
                      <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {view.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: C.textTertiary, paddingLeft: 16 }}>
                      {relativeDate(view.savedAt)}
                    </div>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => onDelete(view.id)}
                    title="Eliminar vista"
                    style={{
                      flexShrink: 0, width: 24, height: 24, borderRadius: 4,
                      background: 'transparent', border: 'none',
                      color: C.textTertiary, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.textTertiary; }}
                    aria-label={`Eliminar vista ${view.name}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
