import React, { useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgOverlay:     '#121D33',
  bgSubtle:      '#162035',
  border:        '#1F2D48',
  borderHover:   '#2A3D5C',
  brand:         '#1654d9',
  brandLight:    '#5577FF',
  brandFaint:    '#1654d918',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#6B809E',
  success:       '#18A659',
  successFaint:  '#18A65918',
  warning:       '#E88A14',
  warningFaint:  '#E88A1418',
  error:         '#E83B3B',
  errorFaint:    '#E83B3B18',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

/* ─── Types ─────────────────────────────────────────────────── */
type FlowKind = 'sequential' | 'parallel';
type SignatureLevel = 'firma_digital' | 'firma_electronica';

interface SignerDraft {
  id: string;
  name: string;
  email: string;
  role: string;
  signatureLevel: SignatureLevel;
  inPerson: boolean;
  order: number;
}

/* ─── Mock initial signers ───────────────────────────────────── */
const INITIAL_SIGNERS: SignerDraft[] = [
  { id: 's1', name: 'Juan García',  email: 'juan@example.com',   role: 'Comprador', signatureLevel: 'firma_digital', inPerson: false, order: 1 },
  { id: 's2', name: 'Carlos Ramos', email: 'carlos@example.com', role: 'Vendedor',  signatureLevel: 'firma_digital', inPerson: false, order: 2 },
  { id: 's3', name: 'María López',  email: 'maria@belgrano.com', role: 'Corredor',  signatureLevel: 'firma_digital', inPerson: true,  order: 3 },
];

/* ─── Step indicator ─────────────────────────────────────────── */
function StepIndicator({ step, total }: { step: number; total: number }) {
  const labels = ['Firmantes', 'Configuración', 'Vista previa'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {labels.map((label, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <React.Fragment key={idx}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done ? C.success : active ? C.brand : C.bgSubtle,
                border: `2px solid ${done ? C.success : active ? C.brand : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                color: done || active ? '#fff' : C.textTertiary,
                transition: 'all 200ms',
              }}>
                {done ? '✓' : idx}
              </div>
              <span style={{
                fontSize: 11, fontWeight: active ? 600 : 400,
                color: active ? C.textPrimary : C.textTertiary,
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div style={{
                flex: 1, height: 2,
                background: done ? C.success : C.border,
                margin: '-14px 8px 0',
                transition: 'background 200ms',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Signer row (real dnd-kit sortable) ─────────────────────── */
function SignerDraftRow({
  signer,
  onUpdate,
  onRemove,
  flowKind,
}: {
  signer: SignerDraft;
  onUpdate: (id: string, patch: Partial<SignerDraft>) => void;
  onRemove: (id: string) => void;
  flowKind: FlowKind;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: signer.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '14px 0', borderBottom: `1px solid ${C.border}`,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {/* Drag handle + order */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 8 }}>
        {flowKind === 'sequential' && (
          <div
            {...attributes}
            {...listeners}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              color: C.textTertiary, fontSize: 12, lineHeight: 1,
              touchAction: 'none',
            }}
          >⠿</div>
        )}
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          background: C.brandFaint, border: `2px solid ${C.brand}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: C.brand,
        }}>
          {signer.order}
        </span>
      </div>

      {/* Fields */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={signer.name}
            onChange={e => onUpdate(signer.id, { name: e.target.value })}
            placeholder="Nombre completo"
            style={{
              flex: 1, background: C.bgSubtle, border: `1px solid ${C.border}`,
              borderRadius: 6, padding: '8px 10px', color: C.textPrimary,
              fontSize: 13, fontFamily: F.body, outline: 'none',
            }}
          />
          <input
            value={signer.role}
            onChange={e => onUpdate(signer.id, { role: e.target.value })}
            placeholder="Rol"
            style={{
              width: 120, background: C.bgSubtle, border: `1px solid ${C.border}`,
              borderRadius: 6, padding: '8px 10px', color: C.textPrimary,
              fontSize: 13, fontFamily: F.body, outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={signer.email}
            onChange={e => onUpdate(signer.id, { email: e.target.value })}
            placeholder="email@ejemplo.com"
            type="email"
            style={{
              flex: 1, background: C.bgSubtle, border: `1px solid ${C.border}`,
              borderRadius: 6, padding: '8px 10px', color: C.textPrimary,
              fontSize: 13, fontFamily: F.body, outline: 'none',
            }}
          />
          {/* Signature level */}
          <select
            value={signer.signatureLevel}
            onChange={e => onUpdate(signer.id, { signatureLevel: e.target.value as SignatureLevel })}
            style={{
              background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 6,
              padding: '8px 10px', color: C.textPrimary, fontSize: 12,
              fontFamily: F.body, cursor: 'pointer',
            }}
          >
            <option value="firma_digital">Firma digital</option>
            <option value="firma_electronica">Firma electrónica</option>
          </select>
        </div>
        {/* In-person toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <div
            onClick={() => onUpdate(signer.id, { inPerson: !signer.inPerson })}
            style={{
              width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
              background: signer.inPerson ? C.brand : C.bgSubtle,
              border: `1px solid ${signer.inPerson ? C.brand : C.border}`,
              position: 'relative', transition: 'background 150ms',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 14, height: 14, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 2,
              left: signer.inPerson ? 18 : 2,
              transition: 'left 150ms',
            }} />
          </div>
          <span style={{ fontSize: 12, color: C.textSecondary }}>Firma presencial (firmará en un dispositivo en la oficina)</span>
        </label>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(signer.id)}
        style={{
          width: 28, height: 28, borderRadius: 6, background: 'transparent',
          border: `1px solid ${C.border}`, color: C.textTertiary,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 4,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

/* ─── Step 1: Signers ────────────────────────────────────────── */
function StepSigners({
  signers,
  flowKind,
  onSignersChange,
  onFlowKindChange,
}: {
  signers: SignerDraft[];
  flowKind: FlowKind;
  onSignersChange: (s: SignerDraft[]) => void;
  onFlowKindChange: (k: FlowKind) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = signers.findIndex(s => s.id === active.id);
      const newIdx = signers.findIndex(s => s.id === over.id);
      onSignersChange(
        arrayMove(signers, oldIdx, newIdx).map((s, i) => ({ ...s, order: i + 1 })),
      );
    }
  };

  const updateSigner = (id: string, patch: Partial<SignerDraft>) =>
    onSignersChange(signers.map(s => s.id === id ? { ...s, ...patch } : s));

  const removeSigner = (id: string) =>
    onSignersChange(signers.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));

  const addSigner = () => onSignersChange([
    ...signers,
    { id: `s-${Date.now()}`, name: '', email: '', role: '', signatureLevel: 'firma_digital', inPerson: false, order: signers.length + 1 },
  ]);

  return (
    <div>
      {/* Flow kind */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: C.textSecondary }}>
          Tipo de flujo
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {([
            { key: 'sequential', label: 'Secuencial', desc: 'Cada firmante recibe la solicitud sólo cuando el anterior firma' },
            { key: 'parallel',   label: 'Paralelo',   desc: 'Todos los firmantes reciben la solicitud al mismo tiempo' },
          ] as const).map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onFlowKindChange(opt.key)}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 8, textAlign: 'left',
                background: flowKind === opt.key ? C.brandFaint : C.bgSubtle,
                border: `2px solid ${flowKind === opt.key ? C.brand : C.border}`,
                cursor: 'pointer', transition: 'all 150ms',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: flowKind === opt.key ? C.brand : C.textPrimary, marginBottom: 4 }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 11, color: C.textTertiary, lineHeight: 1.4 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Sequential note */}
      {flowKind === 'sequential' && (
        <div style={{
          padding: '8px 12px', borderRadius: 6, marginBottom: 16,
          background: C.brandFaint, border: `1px solid ${C.brand}30`,
          fontSize: 12, color: C.textSecondary,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Arrastrá los firmantes para cambiar el orden de firma
        </div>
      )}

      {/* Signer list — real dnd-kit sortable */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={signers.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {signers.map(s => (
            <SignerDraftRow
              key={s.id}
              signer={s}
              onUpdate={updateSigner}
              onRemove={removeSigner}
              flowKind={flowKind}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add signer */}
      <button
        type="button"
        onClick={addSigner}
        style={{
          width: '100%', marginTop: 12, padding: '10px 0', borderRadius: 7,
          background: 'transparent', border: `1px dashed ${C.border}`,
          color: C.textSecondary, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 150ms',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.brand; (e.currentTarget as HTMLElement).style.color = C.brand; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Agregar firmante
      </button>
    </div>
  );
}

/* ─── Step 2: Settings ───────────────────────────────────────── */
function StepSettings({
  expiryDays,
  reminderDays,
  message,
  onUpdate,
}: {
  expiryDays: number;
  reminderDays: number;
  message: string;
  onUpdate: (patch: { expiryDays?: number; reminderDays?: number; message?: string }) => void;
}) {
  const reminderOptions = [
    { value: 1, label: 'Cada día' },
    { value: 2, label: 'Cada 2 días' },
    { value: 3, label: 'Cada 3 días' },
    { value: 5, label: 'Cada 5 días' },
    { value: 7, label: 'Cada semana' },
    { value: 0, label: 'Sin recordatorios' },
  ];

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);
  const expiryFormatted = expiryDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Expiry */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>
          Fecha de vencimiento
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range" min={1} max={90} value={expiryDays}
            onChange={e => onUpdate({ expiryDays: Number(e.target.value) })}
            style={{ flex: 1, accentColor: C.brand }}
          />
          <div style={{
            padding: '6px 14px', borderRadius: 6, minWidth: 90, textAlign: 'center',
            background: C.bgSubtle, border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, fontFamily: F.display }}>{expiryDays}</div>
            <div style={{ fontSize: 10, color: C.textTertiary }}>días</div>
          </div>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: C.textTertiary }}>
          Vence el {expiryFormatted}
        </p>
      </div>

      {/* Reminder */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>
          Recordatorios automáticos
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {reminderOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdate({ reminderDays: opt.value })}
              style={{
                padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: reminderDays === opt.value ? C.brandFaint : 'transparent',
                border: `1px solid ${reminderDays === opt.value ? C.brand : C.border}`,
                color: reminderDays === opt.value ? C.brand : C.textSecondary,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>
          Mensaje personalizado
          <span style={{ marginLeft: 8, fontSize: 11, color: C.textTertiary, fontWeight: 400 }}>
            (generado por IA · editable)
          </span>
        </label>
        <textarea
          value={message}
          onChange={e => onUpdate({ message: e.target.value })}
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: C.bgSubtle, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '10px 12px',
            color: C.textPrimary, fontSize: 13, fontFamily: F.body,
            resize: 'vertical', lineHeight: 1.5, outline: 'none',
          }}
        />
        <p style={{ margin: '6px 0 0', fontSize: 11, color: C.textTertiary }}>
          Los firmantes ven este mensaje en el email de solicitud
        </p>
      </div>
    </div>
  );
}

/* ─── Step 3: Preview & Send ─────────────────────────────────── */
function StepPreview({
  signers,
  flowKind,
  expiryDays,
  reminderDays,
  onSend,
  isSending,
}: {
  signers: SignerDraft[];
  flowKind: FlowKind;
  expiryDays: number;
  reminderDays: number;
  onSend: () => void;
  isSending: boolean;
}) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { label: 'Firmantes', value: `${signers.length} personas` },
          { label: 'Flujo',     value: flowKind === 'sequential' ? 'Secuencial' : 'Paralelo' },
          { label: 'Vencimiento', value: expiryDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) },
          { label: 'Recordatorios', value: reminderDays === 0 ? 'Sin recordatorios' : `Cada ${reminderDays} días` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            padding: '12px 14px', borderRadius: 8,
            background: C.bgSubtle, border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Signing order preview */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: C.textSecondary }}>
          {flowKind === 'sequential' ? 'Orden de firma' : 'Firmantes (simultáneo)'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {signers.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {flowKind === 'sequential' && i > 0 && (
                <div style={{ width: 22, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 2, height: 16, background: C.border }} />
                </div>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8,
                background: C.bgSubtle, border: `1px solid ${C.border}`,
                flex: 1, marginTop: flowKind === 'sequential' && i > 0 ? 0 : 0,
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: C.brandFaint, border: `2px solid ${C.brand}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: C.brand, flexShrink: 0,
                }}>{s.order}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{s.name || '(sin nombre)'}</div>
                  <div style={{ fontSize: 11, color: C.textTertiary }}>{s.role} · {s.email}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                  background: s.signatureLevel === 'firma_digital' ? C.brandFaint : C.bgOverlay,
                  color: s.signatureLevel === 'firma_digital' ? C.brand : C.textTertiary,
                  border: `1px solid ${s.signatureLevel === 'firma_digital' ? C.brand + '40' : C.border}`,
                }}>
                  {s.signatureLevel === 'firma_digital' ? 'Digital' : 'Electrónica'}
                </span>
                {s.inPerson && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                    background: C.warningFaint, color: C.warning,
                    border: `1px solid ${C.warning}40`,
                  }}>Presencial</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document preview thumbnail */}
      <div style={{
        borderRadius: 8, border: `1px solid ${C.border}`,
        overflow: 'hidden', background: C.bgSubtle,
      }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary} strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
          <span style={{ fontSize: 12, color: C.textSecondary }}>boleto-2026-0042.pdf</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: C.textTertiary }}>3 páginas · 184 KB</span>
        </div>
        <div style={{
          height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.textTertiary, fontSize: 13,
        }}>
          <span>Vista previa del PDF · 3 firmantes · flujo {flowKind === 'sequential' ? 'secuencial' : 'paralelo'}</span>
        </div>
      </div>

      {/* Send button */}
      <button
        type="button"
        onClick={onSend}
        disabled={isSending}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 8,
          background: isSending ? C.border : C.brand,
          border: 'none', color: '#fff',
          fontSize: 15, fontWeight: 700, cursor: isSending ? 'not-allowed' : 'pointer',
          fontFamily: F.display,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 150ms',
        }}
      >
        {isSending ? (
          <>Enviando solicitud de firma…</>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22,2 15,22 11,13 2,9"/>
            </svg>
            Enviar para firma ({signers.length} firmantes)
          </>
        )}
      </button>
      <p style={{ margin: '-12px 0 0', textAlign: 'center', fontSize: 11, color: C.textTertiary }}>
        Se enviarán notificaciones por email a todos los firmantes
      </p>
    </div>
  );
}

/* ─── Main ESignModal component ──────────────────────────────── */
export interface ESignModalProps {
  documentTitle?: string;
  onClose: () => void;
  onSent?: () => void;
}

export function ESignModal({
  documentTitle = 'Boleto de Compraventa — DOC-2026-0042',
  onClose,
  onSent,
}: ESignModalProps) {
  const [step, setStep] = useState(1);
  const [signers, setSigners] = useState<SignerDraft[]>(INITIAL_SIGNERS);
  const [flowKind, setFlowKind] = useState<FlowKind>('sequential');
  const [expiryDays, setExpiryDays] = useState(14);
  const [reminderDays, setReminderDays] = useState(2);
  const [message, setMessage] = useState(
    'Hola [Nombre], te enviamos el Boleto de Compraventa para que lo firmes. Por favor completá tu firma antes del [fecha].'
  );
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSent(true);
      onSent?.();
    }, 1800);
  };

  const canContinue = () => {
    if (step === 1) return signers.length > 0 && signers.every(s => s.name && s.email);
    return true;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: '#00000090', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: C.bgOverlay, border: `1px solid ${C.border}`,
          borderRadius: 14, width: 620, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 32px 80px #00000090',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: '0 0 4px' }}>
                Enviar para firma
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: C.textTertiary }}>{documentTitle}</p>
            </div>
            <button type="button" onClick={onClose} style={{
              background: 'none', border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.textSecondary, cursor: 'pointer', padding: '4px 8px', fontSize: 14,
            }}>✕</button>
          </div>
          <StepIndicator step={step} total={3} />
        </div>

        {/* Body */}
        {sent ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: C.successFaint, border: `2px solid ${C.success}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </div>
            <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              Solicitud enviada
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 1.6 }}>
              Se enviaron las solicitudes de firma a <strong style={{ color: C.textPrimary }}>{signers.length} firmantes</strong>.<br />
              {flowKind === 'sequential' ? 'Juan García recibirá el email ahora. Los demás serán notificados en orden.' : 'Todos recibieron la notificación simultáneamente.'}
            </p>
            <button type="button" onClick={onClose} style={{
              marginTop: 8, padding: '10px 24px', borderRadius: 8,
              background: C.brand, border: 'none', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              Ver estado del documento
            </button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {step === 1 && (
                <StepSigners
                  signers={signers}
                  flowKind={flowKind}
                  onSignersChange={setSigners}
                  onFlowKindChange={setFlowKind}
                />
              )}
              {step === 2 && (
                <StepSettings
                  expiryDays={expiryDays}
                  reminderDays={reminderDays}
                  message={message}
                  onUpdate={patch => {
                    if (patch.expiryDays !== undefined) setExpiryDays(patch.expiryDays);
                    if (patch.reminderDays !== undefined) setReminderDays(patch.reminderDays);
                    if (patch.message !== undefined) setMessage(patch.message);
                  }}
                />
              )}
              {step === 3 && (
                <StepPreview
                  signers={signers}
                  flowKind={flowKind}
                  expiryDays={expiryDays}
                  reminderDays={reminderDays}
                  onSend={handleSend}
                  isSending={isSending}
                />
              )}
            </div>

            {/* Footer navigation */}
            {step < 3 && (
              <div style={{
                padding: '16px 24px', borderTop: `1px solid ${C.border}`,
                display: 'flex', justifyContent: 'space-between', flexShrink: 0,
              }}>
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  disabled={step === 1}
                  style={{
                    padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                    background: 'transparent', border: `1px solid ${C.border}`,
                    color: step === 1 ? C.textTertiary : C.textSecondary,
                    cursor: step === 1 ? 'not-allowed' : 'pointer',
                    opacity: step === 1 ? 0.5 : 1,
                  }}
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canContinue()}
                  style={{
                    padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 700,
                    background: canContinue() ? C.brand : C.bgSubtle,
                    border: 'none',
                    color: canContinue() ? '#fff' : C.textTertiary,
                    cursor: canContinue() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Continuar →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
