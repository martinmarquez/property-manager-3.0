import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Layout, Type, Image, Grid3x3, Send, ChevronDown, ChevronRight, Eye,
  Monitor, Smartphone, Save, Globe, Settings, Trash2, Copy, Plus,
  GripVertical, Palette, FileText, Link2, BarChart2, ArrowLeft, Check,
  X, ExternalLink, Layers, Columns2, AlignLeft, FormInput, Share2,
  MoreHorizontal, Home, Edit3, PlusCircle, Upload,
  Undo2, Redo2, Clock, RotateCcw,
} from 'lucide-react';
import { C, F } from '../../components/copilot/tokens.js';

/* ─── Undo / Redo (50 steps) ───────────────────────────────────── */

interface CanvasBlock {
  id: string;
  label: string;
  sublabel: string;
  height: number;
  bg: string;
}

interface EditorSnapshot {
  blocks: CanvasBlock[];
  timestamp: number;
}

const MAX_UNDO_STEPS = 50;

function useUndoRedo(initial: CanvasBlock[]) {
  const [history, setHistory] = useState<EditorSnapshot[]>([{ blocks: initial, timestamp: Date.now() }]);
  const [pointer, setPointer] = useState(0);

  const current = history[pointer]!.blocks;

  const push = useCallback((blocks: CanvasBlock[]) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, pointer + 1);
      const next = [...trimmed, { blocks, timestamp: Date.now() }];
      if (next.length > MAX_UNDO_STEPS) next.shift();
      return next;
    });
    setPointer(prev => Math.min(prev + 1, MAX_UNDO_STEPS - 1));
  }, [pointer]);

  const undo = useCallback(() => {
    setPointer(prev => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setPointer(prev => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  const canUndo = pointer > 0;
  const canRedo = pointer < history.length - 1;

  return { current, push, undo, redo, canUndo, canRedo };
}

/* ─── Publish history mock data ────────────────────────────────── */

interface PublishEntry {
  id: string;
  version: string;
  date: string;
  time: string;
  author: string;
  changes: string;
  isCurrent: boolean;
}

const PUBLISH_HISTORY: PublishEntry[] = [
  { id: 'v6', version: 'v6', date: '02/05/2026', time: '14:30', author: 'Martín M.', changes: 'Actualizado hero y CTA', isCurrent: true },
  { id: 'v5', version: 'v5', date: '01/05/2026', time: '11:15', author: 'Martín M.', changes: 'Nuevo bloque de propiedades', isCurrent: false },
  { id: 'v4', version: 'v4', date: '29/04/2026', time: '09:45', author: 'Martín M.', changes: 'Cambio de tema a Clásico', isCurrent: false },
  { id: 'v3', version: 'v3', date: '25/04/2026', time: '16:20', author: 'Ana G.', changes: 'Formulario de contacto agregado', isCurrent: false },
  { id: 'v2', version: 'v2', date: '22/04/2026', time: '10:00', author: 'Martín M.', changes: 'Sección servicios', isCurrent: false },
  { id: 'v1', version: 'v1', date: '20/04/2026', time: '14:00', author: 'Martín M.', changes: 'Publicación inicial', isCurrent: false },
];

/* ─── Types ─────────────────────────────────────────────────────── */

type PreviewMode   = 'desktop' | 'mobile';
type SelectedBlock = 'hero' | 'text' | 'cta' | null;
type LeftTab       = 'bloques' | 'capas' | 'config';
type RightTab      = 'contenido' | 'diseno' | 'avanzado';

/* ─── Block catalogue ───────────────────────────────────────────── */

interface BlockCategory {
  label: string;
  items: { id: string; label: string; icon: React.ReactNode }[];
}

const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    label: 'Layout',
    items: [
      { id: 'hero',      label: 'Hero',         icon: <Layout size={14} /> },
      { id: '2col',      label: '2 Columnas',   icon: <Columns2 size={14} /> },
      { id: '3col',      label: '3 Columnas',   icon: <Grid3x3 size={14} /> },
      { id: 'sep',       label: 'Separador',    icon: <AlignLeft size={14} /> },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { id: 'heading',   label: 'Encabezado',   icon: <Type size={14} /> },
      { id: 'paragraph', label: 'Párrafo',      icon: <AlignLeft size={14} /> },
      { id: 'image',     label: 'Imagen',       icon: <Image size={14} /> },
      { id: 'gallery',   label: 'Galería',      icon: <Grid3x3 size={14} /> },
      { id: 'video',     label: 'Video',        icon: <Eye size={14} /> },
      { id: 'quote',     label: 'Cita',         icon: <FileText size={14} /> },
    ],
  },
  {
    label: 'Formularios',
    items: [
      { id: 'contact',   label: 'Contacto',     icon: <Send size={14} /> },
      { id: 'newsletter',label: 'Newsletter',   icon: <FormInput size={14} /> },
      { id: 'search',    label: 'Búsqueda',     icon: <BarChart2 size={14} /> },
    ],
  },
  {
    label: 'Social',
    items: [
      { id: 'social',    label: 'Redes sociales',icon: <Share2 size={14} /> },
      { id: 'map',       label: 'Mapa',          icon: <Globe size={14} /> },
    ],
  },
];

const CANVAS_BLOCKS = [
  { id: 'hero', label: 'Hero', sublabel: 'Encabezado principal', height: 240, bg: C.bgSubtle },
  { id: 'text', label: 'Párrafo', sublabel: 'Texto de contenido', height: 120, bg: C.bgElevated },
  { id: 'cta',  label: 'CTA', sublabel: 'Llamada a la acción', height: 100, bg: C.bgRaised },
] as const;

const THEMES = [
  { id: 'clasico',  label: 'Clásico',  bg: C.bgElevated,  accent: C.brand,     text: C.textPrimary, font: 'Syne' },
  { id: 'oscuro',   label: 'Oscuro',   bg: '#0A0A0A',     accent: '#E0E0E0',   text: '#FFFFFF',    font: 'DM Sans' },
  { id: 'tierra',   label: 'Tierra',   bg: '#2C1810',     accent: '#8B5E3C',   text: '#F5EDE0',    font: 'Syne' },
  { id: 'moderno',  label: 'Moderno',  bg: '#0A1628',     accent: '#0ED2A0',   text: '#EFF4FF',    font: 'DM Sans' },
  { id: 'minimal',  label: 'Minimal',  bg: '#F5F5F5',     accent: '#1A1A1A',   text: '#1A1A1A',    font: 'DM Mono' },
] as const;

/* ─── Helpers ───────────────────────────────────────────────────── */

function Divider() {
  return <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: F.mono, fontSize: 10, color: C.textTertiary,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>
      {children}
    </span>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontFamily: F.body, fontSize: 11, color: C.textTertiary,
        marginBottom: 5, fontWeight: 500,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '7px 10px', borderRadius: 6,
        border: `1px solid ${focused ? C.brand : C.border}`,
        background: C.bgBase, color: C.textPrimary,
        fontFamily: F.body, fontSize: 12, outline: 'none',
        boxSizing: 'border-box', transition: 'border-color 0.15s',
      }}
    />
  );
}

/* ─── Topbar ────────────────────────────────────────────────────── */

function Topbar({
  previewMode, setPreviewMode,
  publishOpen, setPublishOpen,
  showThemePicker, setShowThemePicker,
  activeTheme, setActiveTheme,
  showPageDropdown, setShowPageDropdown,
  canUndo, canRedo, onUndo, onRedo, onHistoryOpen,
}: {
  previewMode: PreviewMode; setPreviewMode: (m: PreviewMode) => void;
  publishOpen: boolean; setPublishOpen: (v: boolean) => void;
  showThemePicker: boolean; setShowThemePicker: (v: boolean) => void;
  activeTheme: string; setActiveTheme: (id: string) => void;
  showPageDropdown: boolean; setShowPageDropdown: (v: boolean) => void;
  canUndo: boolean; canRedo: boolean;
  onUndo: () => void; onRedo: () => void;
  onHistoryOpen: () => void;
}) {
  const [hoverSave, setHoverSave] = useState(false);
  const [hoverExit, setHoverExit] = useState(false);
  const theme = THEMES.find(t => t.id === activeTheme) ?? THEMES[0];

  const PAGES_LIST = ['Inicio', 'Servicios', 'Contacto'];

  return (
    <div style={{
      height: 56, display: 'flex', alignItems: 'center',
      padding: '0 12px', gap: 8,
      borderBottom: `1px solid ${C.border}`,
      background: C.bgRaised,
      flexShrink: 0, position: 'relative', zIndex: 100,
    }}>
      {/* Left group */}
      <button type="button"
        onMouseEnter={() => setHoverExit(true)}
        onMouseLeave={() => setHoverExit(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 6,
          border: `1px solid ${hoverExit ? C.border : 'transparent'}`,
          background: hoverExit ? C.bgElevated : 'transparent',
          color: C.textSecondary, cursor: 'pointer', transition: 'all 0.15s',
          fontFamily: F.body, fontSize: 13,
        }}
      >
        <ArrowLeft size={14} />
        Salir
      </button>

      <Divider />

      {/* Site name dropdown */}
      <button type="button" style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 6, border: `1px solid ${C.border}`,
        background: C.bgElevated, cursor: 'pointer', transition: 'all 0.15s',
        fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textPrimary,
      }}>
        <Globe size={13} color={C.brand} />
        Mi Sitio
        <ChevronDown size={12} color={C.textTertiary} />
      </button>

      <Divider />

      {/* Page breadcrumb */}
      <div style={{ position: 'relative' }}>
        <button type="button"
          onClick={() => setShowPageDropdown(!showPageDropdown)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 6,
            border: `1px solid ${showPageDropdown ? C.brand : 'transparent'}`,
            background: showPageDropdown ? C.brandFaint : 'transparent',
            cursor: 'pointer', fontFamily: F.body, fontSize: 13,
            color: C.textPrimary, fontWeight: 500,
          }}
        >
          Inicio
          <ChevronDown size={12} color={C.textTertiary} />
        </button>

        {showPageDropdown && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 8, minWidth: 160, overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {PAGES_LIST.map((pg, i) => (
              <div
                key={pg}
                onClick={() => setShowPageDropdown(false)}
                style={{
                  padding: '9px 14px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', cursor: 'pointer',
                  borderBottom: i < PAGES_LIST.length - 1 ? `1px solid ${C.border}` : 'none',
                  fontFamily: F.body, fontSize: 13,
                  color: pg === 'Inicio' ? C.textPrimary : C.textSecondary,
                  background: 'transparent',
                }}
              >
                {pg}
                {pg === 'Inicio' && <Check size={12} color={C.brand} />}
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              <div
                onClick={() => setShowPageDropdown(false)}
                style={{
                  padding: '9px 14px', display: 'flex', alignItems: 'center',
                  gap: 6, cursor: 'pointer',
                  fontFamily: F.body, fontSize: 13, color: C.brand,
                }}
              >
                <PlusCircle size={13} />
                Nueva página
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Theme picker button */}
      <div style={{ position: 'relative' }}>
        <button type="button"
          onClick={() => setShowThemePicker(!showThemePicker)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 6,
            border: `1px solid ${showThemePicker ? C.brand : C.border}`,
            background: showThemePicker ? C.brandFaint : C.bgElevated,
            cursor: 'pointer', fontFamily: F.body, fontSize: 12,
            color: showThemePicker ? C.brand : C.textSecondary,
            transition: 'all 0.15s',
          }}
        >
          <Palette size={13} />
          {theme.label}
          <ChevronDown size={11} />
        </button>

        {showThemePicker && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6,
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: 12,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            display: 'flex', gap: 8, zIndex: 200,
          }}>
            {THEMES.map(th => (
              <button type="button"
                key={th.id}
                onClick={() => { setActiveTheme(th.id); setShowThemePicker(false); }}
                style={{
                  width: 120, padding: 0, border: `2px solid`,
                  borderColor: activeTheme === th.id ? C.brand : C.border,
                  borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                  background: 'transparent', transition: 'border-color 0.15s',
                }}
              >
                {/* Theme preview */}
                <div style={{
                  height: 80, background: th.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 4, position: 'relative',
                }}>
                  <div style={{
                    width: 40, height: 5, borderRadius: 3, background: th.accent,
                  }} />
                  <div style={{
                    width: 60, height: 3, borderRadius: 3,
                    background: th.text, opacity: 0.4,
                  }} />
                  <div style={{
                    width: 50, height: 3, borderRadius: 3,
                    background: th.text, opacity: 0.2,
                  }} />
                  {activeTheme === th.id && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 16, height: 16, borderRadius: '50%',
                      background: C.brand, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={9} color="#fff" />
                    </div>
                  )}
                </div>
                <div style={{
                  padding: '6px 8px', background: C.bgElevated, textAlign: 'left',
                }}>
                  <span style={{
                    fontFamily: F.body, fontSize: 11, fontWeight: 600,
                    color: activeTheme === th.id ? C.brand : C.textSecondary,
                  }}>
                    {th.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Preview toggle */}
      <div style={{
        display: 'flex', background: C.bgBase, borderRadius: 6,
        border: `1px solid ${C.border}`, overflow: 'hidden',
      }}>
        {(['desktop', 'mobile'] as PreviewMode[]).map(mode => (
          <button type="button"
            key={mode}
            onClick={() => setPreviewMode(mode)}
            title={mode === 'desktop' ? 'Escritorio' : 'Móvil'}
            style={{
              padding: '5px 9px', border: 'none', cursor: 'pointer',
              background: previewMode === mode ? C.brand : 'transparent',
              color: previewMode === mode ? '#fff' : C.textTertiary,
              transition: 'all 0.15s', display: 'flex', alignItems: 'center',
            }}
          >
            {mode === 'desktop' ? <Monitor size={14} /> : <Smartphone size={14} />}
          </button>
        ))}
      </div>

      <Divider />

      {/* Undo / Redo */}
      <div style={{ display: 'flex', gap: 2, background: C.bgBase, borderRadius: 6, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <button type="button"
          onClick={e => { e.stopPropagation(); onUndo(); }}
          disabled={!canUndo}
          aria-label="Deshacer (Ctrl+Z)"
          title="Deshacer"
          style={{
            padding: '5px 8px', border: 'none', cursor: canUndo ? 'pointer' : 'default',
            background: 'transparent',
            color: canUndo ? C.textSecondary : C.textTertiary,
            opacity: canUndo ? 1 : 0.4,
            display: 'flex', alignItems: 'center',
          }}
        >
          <Undo2 size={14} />
        </button>
        <div style={{ width: 1, background: C.border, alignSelf: 'stretch' }} />
        <button type="button"
          onClick={e => { e.stopPropagation(); onRedo(); }}
          disabled={!canRedo}
          aria-label="Rehacer (Ctrl+Shift+Z)"
          title="Rehacer"
          style={{
            padding: '5px 8px', border: 'none', cursor: canRedo ? 'pointer' : 'default',
            background: 'transparent',
            color: canRedo ? C.textSecondary : C.textTertiary,
            opacity: canRedo ? 1 : 0.4,
            display: 'flex', alignItems: 'center',
          }}
        >
          <Redo2 size={14} />
        </button>
      </div>

      <Divider />

      {/* History button */}
      <button type="button"
        onClick={e => { e.stopPropagation(); onHistoryOpen(); }}
        aria-label="Historial de publicación"
        title="Historial"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 6,
          border: `1px solid ${C.border}`,
          background: C.bgElevated,
          color: C.textSecondary, cursor: 'pointer', fontFamily: F.body,
          fontSize: 12, transition: 'all 0.15s',
        }}
      >
        <Clock size={13} />
        Historial
      </button>

      <Divider />

      {/* Save button */}
      <button type="button"
        onMouseEnter={() => setHoverSave(true)}
        onMouseLeave={() => setHoverSave(false)}
        aria-label="Guardar cambios"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 6,
          border: `1px solid ${C.border}`,
          background: hoverSave ? C.bgSubtle : C.bgElevated,
          color: C.textSecondary, cursor: 'pointer', fontFamily: F.body,
          fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
        }}
      >
        <Save size={13} />
        Guardar
      </button>

      {/* Publish button + dropdown */}
      <div style={{ position: 'relative', display: 'flex' }}>
        <button type="button" style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 14px', borderRadius: '6px 0 0 6px',
          border: 'none', background: C.brand, color: '#fff',
          cursor: 'pointer', fontFamily: F.body, fontSize: 13, fontWeight: 600,
          boxShadow: '0 2px 8px rgba(22,84,217,0.3)',
        }}>
          <Globe size={13} />
          Publicar
        </button>
        <button type="button"
          onClick={() => setPublishOpen(!publishOpen)}
          style={{
            padding: '6px 8px', borderRadius: '0 6px 6px 0',
            border: 'none', borderLeft: '1px solid rgba(255,255,255,0.2)',
            background: C.brand, color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}
        >
          <ChevronDown size={12} />
        </button>

        {publishOpen && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4,
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 8, overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 160, zIndex: 200,
          }}>
            {['Publicar ahora', 'Programar', 'Despublicar'].map((item, i) => (
              <button type="button"
                key={item}
                onClick={() => setPublishOpen(false)}
                style={{
                  display: 'block', width: '100%', padding: '10px 14px',
                  textAlign: 'left', border: 'none',
                  borderBottom: i < 2 ? `1px solid ${C.border}` : 'none',
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: F.body, fontSize: 13,
                  color: item === 'Despublicar' ? C.error : C.textPrimary,
                }}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Block Palette Sidebar ─────────────────────────────────────── */

function BlockPalette() {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hovered, setHovered] = useState<string | null>(null);

  const toggle = (label: string) =>
    setCollapsed(p => ({ ...p, [label]: !p[label] }));

  const filtered = BLOCK_CATEGORIES.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      search === '' || item.label.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
      <div style={{ padding: '0 4px 10px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar bloque…"
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 6,
            border: `1px solid ${C.border}`, background: C.bgBase,
            color: C.textPrimary, fontFamily: F.body, fontSize: 12,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {filtered.map(cat => (
        <div key={cat.label} style={{ marginBottom: 4 }}>
          <button type="button"
            onClick={() => toggle(cat.label)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '5px 8px', border: 'none',
              background: 'transparent', cursor: 'pointer',
            }}
          >
            <Label>{cat.label}</Label>
            <ChevronRight
              size={12}
              color={C.textTertiary}
              style={{
                transform: collapsed[cat.label] ? 'rotate(0deg)' : 'rotate(90deg)',
                transition: 'transform 0.15s',
              }}
            />
          </button>

          {!collapsed[cat.label] && (
            <div style={{ paddingBottom: 4 }}>
              {cat.items.map(item => {
                const isHov = hovered === item.id;
                return (
                  <div
                    key={item.id}
                    draggable
                    onMouseEnter={() => setHovered(item.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 8px', borderRadius: 6, marginBottom: 1,
                      cursor: 'grab', transition: 'all 0.12s',
                      background: isHov ? C.bgElevated : 'transparent',
                      border: `1px solid ${isHov ? C.border : 'transparent'}`,
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: isHov ? C.bgSubtle : C.bgElevated,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, border: `1px solid ${C.border}`,
                      color: isHov ? C.brand : C.textTertiary,
                      transition: 'all 0.12s',
                    }}>
                      {item.icon}
                    </div>
                    <span style={{
                      fontFamily: F.body, fontSize: 12, color: isHov ? C.textPrimary : C.textSecondary,
                      flex: 1, transition: 'color 0.12s',
                    }}>
                      {item.label}
                    </span>
                    {isHov && <GripVertical size={13} color={C.textTertiary} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LayersTab() {
  const layers = [
    { id: 'hero', label: 'Hero', icon: <Layout size={12} />, depth: 0 },
    { id: 'section', label: 'Section', icon: <Layers size={12} />, depth: 0 },
    { id: 'footer', label: 'Footer', icon: <AlignLeft size={12} />, depth: 0 },
  ];

  return (
    <div style={{ padding: '10px 8px' }}>
      {layers.map(layer => (
        <div
          key={layer.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 6, marginBottom: 2,
            cursor: 'pointer', color: C.textSecondary,
            border: `1px solid transparent`,
          }}
        >
          <GripVertical size={12} color={C.textTertiary} />
          <span style={{ color: C.textTertiary }}>{layer.icon}</span>
          <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>
            {layer.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function ConfigTab() {
  const [title, setTitle] = useState('Mi Sitio Inmobiliario');
  const [analyticsId, setAnalyticsId] = useState('');

  return (
    <div style={{ padding: '12px 12px' }}>
      <FieldRow label="Título del sitio">
        <TextInput value={title} onChange={setTitle} />
      </FieldRow>
      <FieldRow label="ID de Analytics">
        <TextInput value={analyticsId} onChange={setAnalyticsId} placeholder="G-XXXXXXXXXX" />
      </FieldRow>
      <FieldRow label="Favicon">
        <div style={{
          border: `1px dashed ${C.border}`, borderRadius: 6,
          padding: '10px', textAlign: 'center', cursor: 'pointer',
          background: C.bgBase,
        }}>
          <Upload size={14} color={C.textTertiary} style={{ display: 'block', margin: '0 auto 4px' }} />
          <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>
            Subir favicon
          </span>
        </div>
      </FieldRow>
    </div>
  );
}

/* ─── Left Sidebar ──────────────────────────────────────────────── */

function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<LeftTab>('bloques');
  const tabs: { id: LeftTab; label: string }[] = [
    { id: 'bloques', label: 'Bloques' },
    { id: 'capas',   label: 'Capas'   },
    { id: 'config',  label: 'Config'  },
  ];

  return (
    <div style={{
      width: 240, borderRight: `1px solid ${C.border}`,
      background: C.bgRaised, display: 'flex',
      flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
    }}>
      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${C.border}`,
        padding: '0 4px',
      }}>
        {tabs.map(tab => (
          <button type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '10px 4px', border: 'none',
              background: 'transparent', cursor: 'pointer',
              fontFamily: F.body, fontSize: 12, fontWeight: 500,
              color: activeTab === tab.id ? C.textPrimary : C.textTertiary,
              borderBottom: `2px solid ${activeTab === tab.id ? C.brand : 'transparent'}`,
              transition: 'all 0.15s', marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'bloques' && <BlockPalette />}
        {activeTab === 'capas'   && <LayersTab />}
        {activeTab === 'config'  && <ConfigTab />}
      </div>
    </div>
  );
}

/* ─── Canvas ─────────────────────────────────────────────────────── */

function Canvas({
  previewMode, selectedBlock, setSelectedBlock,
}: {
  previewMode: PreviewMode;
  selectedBlock: SelectedBlock;
  setSelectedBlock: (id: SelectedBlock) => void;
}) {
  const [dropActive, setDropActive] = useState(false);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);

  const canvasMaxWidth = previewMode === 'mobile' ? 390 : 1280;

  return (
    <div style={{
      flex: 1, background: '#050C18', overflowY: 'auto',
      display: 'flex', justifyContent: 'center',
      padding: previewMode === 'mobile' ? '24px 24px' : '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: canvasMaxWidth,
        transition: 'max-width 0.3s ease',
      }}>
        {/* Browser chrome frame (desktop only) */}
        {previewMode === 'desktop' && (
          <div style={{
            background: C.bgRaised, borderRadius: '8px 8px 0 0',
            border: `1px solid ${C.border}`, borderBottom: 'none',
            padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.error, opacity: 0.7 }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.warning, opacity: 0.7 }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.success, opacity: 0.7 }} />
            <div style={{
              flex: 1, marginLeft: 8, height: 20, borderRadius: 4,
              background: C.bgBase, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', padding: '0 8px',
            }}>
              <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary }}>
                misitio.corredor.ar
              </span>
            </div>
            <ExternalLink size={12} color={C.textTertiary} />
          </div>
        )}

        {/* Canvas frame */}
        <div style={{
          background: C.bgBase,
          borderRadius: previewMode === 'mobile' ? '16px 16px 0 0' : (previewMode === 'desktop' ? '0 0 8px 8px' : 8),
          border: `1px solid ${C.border}`,
          borderTop: previewMode === 'desktop' ? 'none' : `1px solid ${C.border}`,
          overflow: 'hidden',
          minHeight: 500,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          {CANVAS_BLOCKS.map(block => {
            const isSelected = selectedBlock === block.id;
            const isHov = hoveredBlock === block.id;

            return (
              <div
                key={block.id}
                onClick={() => setSelectedBlock(isSelected ? null : (block.id as SelectedBlock))}
                onMouseEnter={() => setHoveredBlock(block.id)}
                onMouseLeave={() => setHoveredBlock(null)}
                style={{
                  position: 'relative', cursor: 'pointer',
                  outline: `2px solid ${isSelected ? C.brand : isHov ? 'rgba(22,84,217,0.4)' : 'transparent'}`,
                  outlineOffset: -2,
                  transition: 'outline-color 0.15s',
                  height: block.height, background: block.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {/* Block content */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontFamily: F.display, fontSize: 13, fontWeight: 600,
                    color: C.textSecondary, margin: 0,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {block.label}
                  </p>
                  <p style={{
                    fontFamily: F.body, fontSize: 12, color: C.textTertiary,
                    margin: '4px 0 0',
                  }}>
                    {block.sublabel}
                  </p>
                </div>

                {/* Block label badge (top-left when hovered/selected) */}
                {(isSelected || isHov) && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0,
                    background: isSelected ? C.brand : 'rgba(22,84,217,0.6)',
                    padding: '2px 8px',
                    borderRadius: '0 0 6px 0',
                  }}>
                    <span style={{
                      fontFamily: F.mono, fontSize: 10,
                      color: '#fff', textTransform: 'uppercase',
                    }}>
                      {block.label}
                    </span>
                  </div>
                )}

                {/* Action toolbar (selected only) */}
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    display: 'flex', gap: 4,
                  }}>
                    {[
                      { icon: <Layout size={11} />, title: 'Mover arriba' },
                      { icon: <Copy size={11} />, title: 'Duplicar' },
                      { icon: <Trash2 size={11} />, title: 'Eliminar' },
                    ].map((action, i) => (
                      <button type="button"
                        key={i}
                        title={action.title}
                        onClick={e => e.stopPropagation()}
                        style={{
                          width: 26, height: 26, borderRadius: 5,
                          border: `1px solid ${C.border}`,
                          background: C.bgRaised, color: C.textSecondary,
                          cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {action.icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDropActive(true); }}
            onDragLeave={() => setDropActive(false)}
            onDrop={() => setDropActive(false)}
            style={{
              minHeight: 80, display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              border: `2px dashed ${dropActive ? C.brand : C.border}`,
              borderRadius: 6, margin: 12,
              background: dropActive ? C.brandFaint : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Plus
                size={18}
                color={dropActive ? C.brand : C.textTertiary}
                style={{ display: 'block', margin: '0 auto 6px' }}
              />
              <span style={{
                fontFamily: F.body, fontSize: 12,
                color: dropActive ? C.brand : C.textTertiary,
              }}>
                Arrastrá un bloque aquí
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Properties Panel ──────────────────────────────────────────── */

function PropertiesPanel({
  selectedBlock, setSelectedBlock,
}: {
  selectedBlock: SelectedBlock;
  setSelectedBlock: (id: SelectedBlock) => void;
}) {
  const [activeTab, setActiveTab] = useState<RightTab>('contenido');
  const [titulo, setTitulo] = useState('Bienvenidos a tu sitio');
  const [subtitulo, setSubtitulo] = useState('Tu inmobiliaria de confianza en Argentina');
  const [btnText, setBtnText] = useState('Contactanos');
  const [btnUrl, setBtnUrl]   = useState('');

  /* Page SEO state (no block selected) */
  const [seoTitle, setSeoTitle]   = useState('Mi Sitio | Corredor');
  const [metaDesc, setMetaDesc]   = useState('');

  const tabs: { id: RightTab; label: string }[] = [
    { id: 'contenido', label: 'Contenido' },
    { id: 'diseno',    label: 'Diseño'    },
    { id: 'avanzado',  label: 'Avanzado'  },
  ];

  if (!selectedBlock) {
    /* Page-level settings */
    return (
      <div style={{
        width: 280, borderLeft: `1px solid ${C.border}`,
        background: C.bgRaised, display: 'flex',
        flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{
          padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Settings size={14} color={C.textTertiary} />
          <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
            Configuración de página
          </span>
        </div>
        <div style={{ padding: '16px 16px', flex: 1, overflowY: 'auto' }}>
          <FieldRow label="SEO Título">
            <TextInput value={seoTitle} onChange={setSeoTitle} />
          </FieldRow>
          <FieldRow label="Meta descripción">
            <textarea
              value={metaDesc}
              onChange={e => setMetaDesc(e.target.value)}
              placeholder="Describí tu sitio para los buscadores…"
              rows={3}
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 6,
                border: `1px solid ${C.border}`, background: C.bgBase,
                color: C.textPrimary, fontFamily: F.body, fontSize: 12,
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </FieldRow>
          <FieldRow label="Imagen OG">
            <div style={{
              border: `1px dashed ${C.border}`, borderRadius: 6,
              padding: '14px', textAlign: 'center', cursor: 'pointer',
              background: C.bgBase,
            }}>
              <Image size={16} color={C.textTertiary} style={{ display: 'block', margin: '0 auto 6px' }} />
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>
                Subir imagen (1200×630)
              </span>
            </div>
          </FieldRow>
        </div>
      </div>
    );
  }

  const blockName = CANVAS_BLOCKS.find(b => b.id === selectedBlock)?.label ?? 'Bloque';

  return (
    <div style={{
      width: 280, borderLeft: `1px solid ${C.border}`,
      background: C.bgRaised, display: 'flex',
      flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Panel header */}
      <div style={{
        padding: '0 12px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 44,
      }}>
        <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
          {blockName}
        </span>
        <button type="button"
          onClick={() => setSelectedBlock(null)}
          style={{
            width: 24, height: 24, borderRadius: 5, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.textTertiary, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${C.border}`,
        padding: '0 4px',
      }}>
        {tabs.map(tab => (
          <button type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '9px 4px', border: 'none',
              background: 'transparent', cursor: 'pointer',
              fontFamily: F.body, fontSize: 11, fontWeight: 500,
              color: activeTab === tab.id ? C.textPrimary : C.textTertiary,
              borderBottom: `2px solid ${activeTab === tab.id ? C.brand : 'transparent'}`,
              transition: 'all 0.15s', marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px' }}>
        {activeTab === 'contenido' && (
          <>
            <FieldRow label="Título">
              <TextInput value={titulo} onChange={setTitulo} />
            </FieldRow>
            <FieldRow label="Subtítulo">
              <TextInput value={subtitulo} onChange={setSubtitulo} />
            </FieldRow>
            <FieldRow label="Botón texto">
              <TextInput value={btnText} onChange={setBtnText} placeholder="Contactanos" />
            </FieldRow>
            <FieldRow label="Botón URL">
              <TextInput value={btnUrl} onChange={setBtnUrl} placeholder="/contacto" />
            </FieldRow>
            <FieldRow label="Imagen de fondo">
              <div style={{
                border: `1px dashed ${C.border}`, borderRadius: 6,
                padding: '16px', textAlign: 'center', cursor: 'pointer',
                background: C.bgBase, transition: 'border-color 0.15s',
              }}>
                <Upload size={16} color={C.textTertiary} style={{ display: 'block', margin: '0 auto 6px' }} />
                <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>
                  Subir imagen
                </span>
              </div>
            </FieldRow>
          </>
        )}

        {activeTab === 'diseno' && (
          <>
            <FieldRow label="Color de fondo">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['#070D1A', '#1654d9', '#18A659', '#E88A14', '#7E3AF2'].map(color => (
                  <div
                    key={color}
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: color, cursor: 'pointer',
                      border: `2px solid ${C.border}`,
                    }}
                  />
                ))}
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: 'conic-gradient(red, yellow, green, blue, purple, red)',
                  cursor: 'pointer', border: `2px solid ${C.border}`,
                }} />
              </div>
            </FieldRow>
            <FieldRow label="Color de texto">
              <div style={{ display: 'flex', gap: 6 }}>
                {['#EFF4FF', '#8DA0C0', '#1654d9', '#18A659'].map(color => (
                  <div
                    key={color}
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: color, cursor: 'pointer',
                      border: `2px solid ${C.border}`,
                    }}
                  />
                ))}
              </div>
            </FieldRow>
            <FieldRow label="Alineación">
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { icon: <AlignLeft size={13} />, label: 'Izq.' },
                  { icon: <Layout size={13} />, label: 'Centro' },
                  { icon: <AlignLeft size={13} style={{ transform: 'scaleX(-1)' }} />, label: 'Der.' },
                ].map((btn, i) => (
                  <button type="button"
                    key={i}
                    style={{
                      flex: 1, padding: '6px 4px',
                      border: `1px solid ${i === 1 ? C.brand : C.border}`,
                      borderRadius: 5, background: i === 1 ? C.brandFaint : C.bgBase,
                      color: i === 1 ? C.brand : C.textTertiary,
                      cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {btn.icon}
                  </button>
                ))}
              </div>
            </FieldRow>
          </>
        )}

        {activeTab === 'avanzado' && (
          <>
            <FieldRow label="ID personalizado">
              <TextInput value="" onChange={() => {}} placeholder="mi-seccion" />
            </FieldRow>
            <FieldRow label="Clase CSS">
              <TextInput value="" onChange={() => {}} placeholder="clase-extra" />
            </FieldRow>
            <div style={{ marginTop: 8 }}>
              <Label>Visibilidad</Label>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Escritorio', active: true },
                  { label: 'Móvil', active: true },
                ].map(item => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px', borderRadius: 6,
                      background: C.bgBase, border: `1px solid ${C.border}`,
                    }}
                  >
                    <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>
                      {item.label}
                    </span>
                    <div style={{
                      width: 32, height: 18, borderRadius: 9,
                      background: item.active ? C.brand : C.bgElevated,
                      border: `1px solid ${C.border}`,
                      position: 'relative', cursor: 'pointer',
                    }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: '#fff', position: 'absolute',
                        top: 2, left: item.active ? 16 : 2,
                        transition: 'left 0.15s',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Publish History Sidebar ───────────────────────────────────── */

function PublishHistorySidebar({
  open, onClose, onRollback,
}: {
  open: boolean;
  onClose: () => void;
  onRollback: (versionId: string) => void;
}) {
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  if (!open) return null;

  const handleRollback = (id: string) => {
    setRollingBack(id);
    setTimeout(() => {
      onRollback(id);
      setRollingBack(null);
    }, 1200);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 340, background: C.bgRaised,
      borderLeft: `1px solid ${C.border}`,
      boxShadow: '-12px 0 40px rgba(0,0,0,0.4)',
      zIndex: 500, display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 0.2s ease-out',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={16} color={C.brand} />
          <span style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.textPrimary }}>
            Historial de publicación
          </span>
        </div>
        <button type="button"
          onClick={onClose}
          aria-label="Cerrar historial"
          style={{
            width: 32, height: 32, borderRadius: 6, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.textTertiary, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Entries */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {PUBLISH_HISTORY.map((entry, idx) => (
          <div
            key={entry.id}
            style={{
              position: 'relative', paddingLeft: 24, paddingBottom: 20,
              borderLeft: idx < PUBLISH_HISTORY.length - 1
                ? `2px solid ${entry.isCurrent ? C.brand : C.border}`
                : '2px solid transparent',
              marginLeft: 8,
            }}
          >
            {/* Timeline dot */}
            <div style={{
              position: 'absolute', left: -7, top: 2,
              width: 12, height: 12, borderRadius: '50%',
              background: entry.isCurrent ? C.brand : C.bgElevated,
              border: `2px solid ${entry.isCurrent ? C.brand : C.border}`,
            }} />

            <div style={{
              background: entry.isCurrent ? C.brandFaint : C.bgBase,
              borderRadius: 10, border: `1px solid ${entry.isCurrent ? C.brand : C.border}`,
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: F.mono, fontSize: 11, fontWeight: 700,
                    color: entry.isCurrent ? C.brand : C.textSecondary,
                    padding: '1px 6px', borderRadius: 4,
                    background: entry.isCurrent ? `${C.brand}20` : C.bgElevated,
                  }}>
                    {entry.version}
                  </span>
                  {entry.isCurrent && (
                    <span style={{
                      fontFamily: F.mono, fontSize: 9, padding: '1px 6px',
                      borderRadius: 20, background: C.successFaint, color: C.success,
                      border: `1px solid ${C.success}40`,
                    }}>
                      Actual
                    </span>
                  )}
                </div>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary }}>
                  {entry.date} {entry.time}
                </span>
              </div>

              <p style={{ fontFamily: F.body, fontSize: 12, color: C.textPrimary, margin: '0 0 4px' }}>
                {entry.changes}
              </p>
              <p style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, margin: 0 }}>
                por {entry.author}
              </p>

              {!entry.isCurrent && (
                <button type="button"
                  onClick={() => handleRollback(entry.id)}
                  disabled={rollingBack !== null}
                  aria-label={`Restaurar a ${entry.version}`}
                  style={{
                    marginTop: 10, padding: '5px 12px', borderRadius: 6,
                    border: `1px solid ${C.border}`, background: C.bgElevated,
                    color: rollingBack === entry.id ? C.warning : C.textSecondary,
                    fontFamily: F.body, fontSize: 11, fontWeight: 500,
                    cursor: rollingBack !== null ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <RotateCcw size={11} />
                  {rollingBack === entry.id ? 'Restaurando…' : 'Restaurar esta versión'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────── */

export default function SiteEditorPage() {
  const [previewMode, setPreviewMode]     = useState<PreviewMode>('desktop');
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlock>('hero');
  const [publishOpen, setPublishOpen]     = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [activeTheme, setActiveTheme]     = useState('clasico');
  const [showPageDropdown, setShowPageDropdown] = useState(false);
  const [historyOpen, setHistoryOpen]     = useState(false);

  const initialBlocks: CanvasBlock[] = CANVAS_BLOCKS.map(b => ({ ...b }));
  const { undo, redo, canUndo, canRedo } = useUndoRedo(initialBlocks);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) { redo(); } else { undo(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const handleWrapperClick = () => {
    if (publishOpen) setPublishOpen(false);
    if (showThemePicker) setShowThemePicker(false);
    if (showPageDropdown) setShowPageDropdown(false);
  };

  return (
    <div
      onClick={handleWrapperClick}
      style={{
        display: 'flex', flexDirection: 'column', height: '100vh',
        background: C.bgBase, overflow: 'hidden',
        fontFamily: F.body,
      }}
    >
      <Topbar
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
        publishOpen={publishOpen}
        setPublishOpen={v => { v ? setPublishOpen(true) : setPublishOpen(false); }}
        showThemePicker={showThemePicker}
        setShowThemePicker={v => { v ? setShowThemePicker(true) : setShowThemePicker(false); }}
        activeTheme={activeTheme}
        setActiveTheme={setActiveTheme}
        showPageDropdown={showPageDropdown}
        setShowPageDropdown={v => { v ? setShowPageDropdown(true) : setShowPageDropdown(false); }}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onHistoryOpen={() => setHistoryOpen(true)}
      />

      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', flex: 1, overflow: 'hidden' }}
      >
        <LeftSidebar />

        <Canvas
          previewMode={previewMode}
          selectedBlock={selectedBlock}
          setSelectedBlock={setSelectedBlock}
        />

        <PropertiesPanel
          selectedBlock={selectedBlock}
          setSelectedBlock={setSelectedBlock}
        />
      </div>

      <PublishHistorySidebar
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRollback={(_versionId) => {
          setHistoryOpen(false);
        }}
      />
    </div>
  );
}
