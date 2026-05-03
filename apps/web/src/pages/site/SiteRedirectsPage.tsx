import React, { useState } from 'react';
import { C, F } from '../../components/copilot/tokens.js';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */

interface Redirect {
  id: string;
  from: string;
  to: string;
  code: 301 | 302;
  active: boolean;
}

/* ─── Mock data ──────────────────────────────────────────────── */

const INITIAL_REDIRECTS: Redirect[] = [
  { id: 'r1', from: '/propiedades-en-venta', to: '/propiedades?op=venta',     code: 301, active: true  },
  { id: 'r2', from: '/alquileres',           to: '/propiedades?op=alquiler',  code: 301, active: true  },
  { id: 'r3', from: '/home',                 to: '/',                         code: 301, active: true  },
  { id: 'r4', from: '/old-contact',          to: '/contacto',                 code: 302, active: false },
  { id: 'r5', from: '/promo-verano',         to: '/propiedades?tag=verano',   code: 302, active: true  },
];

/* ─── Constants ──────────────────────────────────────────────── */

const DANGER = '#D63B3B';
const DANGER_FAINT = 'rgba(214,59,59,0.12)';
const COL_GRID = '1fr 1.4fr 90px 100px 100px';
const MIN_TOUCH = 44;

/* ─── Reusable inline-style helpers ──────────────────────────── */

const headerCellStyle: React.CSSProperties = {
  fontFamily: F.mono,
  fontSize: 10,
  color: C.textTertiary,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '10px 16px',
  userSelect: 'none',
};

const cellStyle: React.CSSProperties = {
  padding: '0 16px',
  display: 'flex',
  alignItems: 'center',
  minHeight: MIN_TOUCH,
};

const monoText: React.CSSProperties = {
  fontFamily: F.mono,
  fontSize: 13,
  color: C.textSecondary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 6,
  border: `1px solid ${C.border}`,
  background: C.bgBase,
  color: C.textPrimary,
  fontFamily: F.mono,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const focusRing = `0 0 0 2px ${C.brand}`;

/* ─── Sub-components ─────────────────────────────────────────── */

function CodeBadge({ code }: { code: 301 | 302 }) {
  const is301 = code === 301;
  return (
    <span style={{
      fontFamily: F.mono,
      fontSize: 11,
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 20,
      background: is301 ? C.successFaint : C.brandFaint,
      color: is301 ? C.success : C.brand,
      border: `1px solid ${is301 ? C.success : C.brand}40`,
      whiteSpace: 'nowrap',
    }}>
      {code}
    </span>
  );
}

function ActiveToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={active}
      aria-label={active ? 'Desactivar redirección' : 'Activar redirección'}
      style={{
        position: 'relative',
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        background: active ? C.success : C.bgElevated,
        cursor: 'pointer',
        transition: 'background 0.2s',
        padding: 0,
        outline: 'none',
        minWidth: 40,
        minHeight: MIN_TOUCH,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span style={{
        position: 'absolute',
        top: '50%',
        left: active ? 20 : 2,
        transform: 'translateY(-50%)',
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

function IconButton({
  onClick,
  ariaLabel,
  variant = 'default',
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  variant?: 'default' | 'danger' | 'success' | 'cancel';
  children: React.ReactNode;
}) {
  const colorMap = {
    default: { bg: 'transparent', fg: C.textSecondary, hoverBg: C.bgElevated },
    danger:  { bg: 'transparent', fg: DANGER,          hoverBg: DANGER_FAINT },
    success: { bg: C.brandFaint,  fg: C.brand,         hoverBg: C.brandFaint },
    cancel:  { bg: 'transparent', fg: C.textTertiary,  hoverBg: C.bgElevated },
  };
  const c = colorMap[variant];

  return (
    <button type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: MIN_TOUCH,
        height: MIN_TOUCH,
        minWidth: MIN_TOUCH,
        minHeight: MIN_TOUCH,
        borderRadius: 8,
        border: 'none',
        background: c.bg,
        color: c.fg,
        cursor: 'pointer',
        transition: 'background 0.15s',
        padding: 0,
        outline: 'none',
      }}
      onFocus={e => { e.currentTarget.style.boxShadow = focusRing; }}
      onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
      onMouseEnter={e => { e.currentTarget.style.background = c.hoverBg; }}
      onMouseLeave={e => { e.currentTarget.style.background = c.bg; }}
    >
      {children}
    </button>
  );
}

/* ─── EditableRow ────────────────────────────────────────────── */

interface EditRowState {
  from: string;
  to: string;
  code: 301 | 302;
}

function EditableRow({
  initial,
  onSave,
  onCancel,
  isNew,
}: {
  initial: EditRowState;
  onSave: (state: EditRowState) => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  const [draft, setDraft] = useState<EditRowState>(initial);

  return (
    <div
      role="row"
      style={{
        display: 'grid',
        gridTemplateColumns: COL_GRID,
        alignItems: 'center',
        background: C.bgElevated,
        borderBottom: `1px solid ${C.border}`,
        minHeight: 56,
      }}
    >
      {/* from */}
      <div style={cellStyle}>
        <input
          aria-label="URL de origen"
          value={draft.from}
          onChange={e => setDraft({ ...draft, from: e.target.value })}
          placeholder="/url-anterior"
          autoFocus={isNew}
          style={inputStyle}
          onFocus={e => { e.currentTarget.style.boxShadow = focusRing; }}
          onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>

      {/* to */}
      <div style={cellStyle}>
        <input
          aria-label="URL de destino"
          value={draft.to}
          onChange={e => setDraft({ ...draft, to: e.target.value })}
          placeholder="/url-nueva"
          style={inputStyle}
          onFocus={e => { e.currentTarget.style.boxShadow = focusRing; }}
          onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>

      {/* code selector */}
      <div style={cellStyle}>
        <select
          aria-label="Código de redirección"
          value={draft.code}
          onChange={e => setDraft({ ...draft, code: Number(e.target.value) as 301 | 302 })}
          style={{
            ...inputStyle,
            fontFamily: F.mono,
            fontSize: 12,
            appearance: 'auto',
            cursor: 'pointer',
            minHeight: 34,
          }}
          onFocus={e => { e.currentTarget.style.boxShadow = focusRing; }}
          onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <option value={301}>301 Permanente</option>
          <option value={302}>302 Temporal</option>
        </select>
      </div>

      {/* placeholder for estado column */}
      <div style={cellStyle} />

      {/* actions: save / cancel */}
      <div style={{ ...cellStyle, gap: 4, justifyContent: 'center' }}>
        <IconButton
          onClick={() => onSave(draft)}
          ariaLabel="Guardar redirección"
          variant="success"
        >
          <Check size={16} />
        </IconButton>
        <IconButton
          onClick={onCancel}
          ariaLabel="Cancelar edición"
          variant="cancel"
        >
          <X size={16} />
        </IconButton>
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────── */

export default function SiteRedirectsPage() {
  const [redirects, setRedirects] = useState<Redirect[]>(INITIAL_REDIRECTS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  /* ── handlers ── */

  const handleToggle = (id: string) => {
    setRedirects(prev =>
      prev.map(r => (r.id === id ? { ...r, active: !r.active } : r)),
    );
  };

  const handleDelete = (id: string) => {
    if (pendingDeleteId === id) {
      setRedirects(prev => prev.filter(r => r.id !== id));
      setPendingDeleteId(null);
    } else {
      setPendingDeleteId(id);
    }
  };

  const handleEditSave = (id: string, state: EditRowState) => {
    setRedirects(prev =>
      prev.map(r =>
        r.id === id ? { ...r, from: state.from, to: state.to, code: state.code } : r,
      ),
    );
    setEditingId(null);
  };

  const handleAddSave = (state: EditRowState) => {
    const newId = `r${Date.now()}`;
    setRedirects(prev => [
      { id: newId, from: state.from, to: state.to, code: state.code, active: true },
      ...prev,
    ]);
    setAddingNew(false);
  };

  const handleAddCancel = () => setAddingNew(false);

  /* ── render ── */

  return (
    <div style={{ padding: '28px 32px', maxWidth: 960, fontFamily: F.body }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 28,
      }}>
        <div>
          <h1 style={{
            fontFamily: F.display,
            fontSize: 22,
            fontWeight: 700,
            color: C.textPrimary,
            margin: 0,
          }}>
            Redirecciones
          </h1>
          <p style={{
            fontFamily: F.body,
            fontSize: 13,
            color: C.textSecondary,
            margin: '4px 0 0',
          }}>
            Redirigí URLs antiguas a las nuevas
          </p>
        </div>
        <button type="button"
          onClick={() => { setAddingNew(true); setEditingId(null); }}
          aria-label="Agregar nueva redirección"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: C.brand,
            color: '#fff',
            fontFamily: F.body,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            minHeight: MIN_TOUCH,
            outline: 'none',
          }}
          onFocus={e => { e.currentTarget.style.boxShadow = focusRing; }}
          onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Plus size={16} />
          + Nueva redirección
        </button>
      </div>

      {/* Table */}
      <div
        role="table"
        aria-label="Tabla de redirecciones"
        style={{
          background: C.bgRaised,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          overflow: 'hidden',
        }}
      >
        {/* Header row */}
        <div
          role="row"
          style={{
            display: 'grid',
            gridTemplateColumns: COL_GRID,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <span role="columnheader" style={headerCellStyle}>Origen</span>
          <span role="columnheader" style={headerCellStyle}>Destino</span>
          <span role="columnheader" style={headerCellStyle}>Código</span>
          <span role="columnheader" style={headerCellStyle}>Estado</span>
          <span role="columnheader" style={{ ...headerCellStyle, textAlign: 'center' }}>Acciones</span>
        </div>

        {/* Add-new row */}
        {addingNew && (
          <EditableRow
            initial={{ from: '', to: '', code: 301 }}
            onSave={handleAddSave}
            onCancel={handleAddCancel}
            isNew
          />
        )}

        {/* Data rows */}
        {redirects.map((r, idx) => {
          if (editingId === r.id) {
            return (
              <EditableRow
                key={r.id}
                initial={{ from: r.from, to: r.to, code: r.code }}
                onSave={state => handleEditSave(r.id, state)}
                onCancel={() => setEditingId(null)}
                isNew={false}
              />
            );
          }

          const isEvenRow = idx % 2 === 1;
          const isConfirmingDelete = pendingDeleteId === r.id;

          return (
            <div
              key={r.id}
              role="row"
              style={{
                display: 'grid',
                gridTemplateColumns: COL_GRID,
                alignItems: 'center',
                borderBottom: idx < redirects.length - 1 ? `1px solid ${C.border}` : 'none',
                background: isConfirmingDelete
                  ? DANGER_FAINT
                  : isEvenRow
                    ? C.bgSubtle
                    : 'transparent',
                transition: 'background 0.15s',
                minHeight: 52,
              }}
            >
              {/* from */}
              <div role="cell" style={cellStyle}>
                <span style={monoText}>{r.from}</span>
              </div>

              {/* to */}
              <div role="cell" style={cellStyle}>
                <span style={monoText}>{r.to}</span>
              </div>

              {/* code */}
              <div role="cell" style={cellStyle}>
                <CodeBadge code={r.code} />
              </div>

              {/* active toggle */}
              <div role="cell" style={cellStyle}>
                <ActiveToggle active={r.active} onToggle={() => handleToggle(r.id)} />
              </div>

              {/* actions */}
              <div role="cell" style={{ ...cellStyle, gap: 4, justifyContent: 'center' }}>
                {isConfirmingDelete ? (
                  <>
                    <IconButton
                      onClick={() => handleDelete(r.id)}
                      ariaLabel="Confirmar eliminación"
                      variant="danger"
                    >
                      <Check size={16} />
                    </IconButton>
                    <IconButton
                      onClick={() => setPendingDeleteId(null)}
                      ariaLabel="Cancelar eliminación"
                      variant="cancel"
                    >
                      <X size={16} />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <IconButton
                      onClick={() => { setEditingId(r.id); setAddingNew(false); setPendingDeleteId(null); }}
                      ariaLabel={`Editar redirección ${r.from}`}
                    >
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(r.id)}
                      ariaLabel={`Eliminar redirección ${r.from}`}
                      variant="danger"
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {redirects.length === 0 && !addingNew && (
          <div style={{
            padding: '48px 0',
            textAlign: 'center',
          }}>
            <p style={{
              fontFamily: F.body,
              fontSize: 14,
              color: C.textTertiary,
              margin: 0,
            }}>
              No hay redirecciones configuradas
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
