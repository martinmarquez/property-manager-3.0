import React, { useState, useRef } from 'react';
import { useEditor, EditorContent as TiptapEditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgOverlay:     '#121D33',
  bgSubtle:      '#162035',
  border:        '#1F2D48',
  borderHover:   '#2A3D5C',
  brand:         '#1654d9',
  brandLight:    '#4669ff',
  brandFaint:    '#1654d918',
  brandFaintMid: '#1654d930',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  success:       '#18A659',
  successFaint:  '#18A65918',
  warning:       '#E88A14',
  warningFaint:  '#E88A1418',
  error:         '#E83B3B',
  errorFaint:    '#E83B3B18',
  ai:            '#7E3AF2',
  aiFaint:       '#7E3AF218',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

/* ─── Types ─────────────────────────────────────────────────── */
type Tab = 'editor' | 'preview' | 'history';
type TemplateKind =
  | 'reserva' | 'boleto' | 'escritura' | 'recibo_sena'
  | 'autorizacion_venta' | 'contrato_locacion' | 'recibo_alquiler'
  | 'carta_oferta' | 'custom';

interface Variable {
  path: string;
  label: string;
  example: string;
}

interface VariableGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  vars: Variable[];
}

interface Clause {
  id: string;
  name: string;
  jurisdiction: string;
  required: boolean;
  preview: string;
}

interface Revision {
  id: string;
  number: number;
  changedBy: string;
  changedAt: string;
  summary: string;
}

/* ─── Mock data ─────────────────────────────────────────────── */
const VARIABLE_GROUPS: VariableGroup[] = [
  {
    key: 'property',
    label: 'Propiedad',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
    vars: [
      { path: 'property.address',        label: 'Dirección completa',   example: 'Av. Corrientes 1234, CABA' },
      { path: 'property.reference_code', label: 'Código de referencia', example: 'CAP-0142' },
      { path: 'property.price',          label: 'Precio',               example: '250.000' },
      { path: 'property.currency',       label: 'Moneda',               example: 'USD' },
      { path: 'property.surface_m2',     label: 'Superficie (m²)',      example: '75' },
      { path: 'property.type',           label: 'Tipo de propiedad',    example: 'Departamento' },
      { path: 'property.neighborhood',   label: 'Barrio',               example: 'Palermo' },
    ],
  },
  {
    key: 'contacts',
    label: 'Contactos',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    vars: [
      { path: 'contact.buyer.full_name',   label: 'Comprador — nombre',  example: 'Juan García' },
      { path: 'contact.buyer.national_id', label: 'Comprador — DNI',     example: 'DNI 30.456.789' },
      { path: 'contact.buyer.email',       label: 'Comprador — email',   example: 'juan@example.com' },
      { path: 'contact.seller.full_name',  label: 'Vendedor — nombre',   example: 'Carlos Ramos' },
      { path: 'contact.seller.national_id',label: 'Vendedor — DNI',      example: 'DNI 22.345.678' },
      { path: 'contact.seller.email',      label: 'Vendedor — email',    example: 'carlos@example.com' },
    ],
  },
  {
    key: 'operation',
    label: 'Operación',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
    vars: [
      { path: 'operation.commission_pct',      label: 'Comisión (%)',          example: '3%' },
      { path: 'operation.escritura_deadline',  label: 'Fecha límite escritura', example: '30 de junio de 2026' },
      { path: 'operation.kind',                label: 'Tipo de operación',      example: 'venta' },
      { path: 'operation.deposit_amount',      label: 'Monto de seña',          example: '11.000' },
      { path: 'operation.penalty_clause_pct',  label: 'Penalidad por rescisión',example: '10%' },
    ],
  },
  {
    key: 'agent',
    label: 'Agente',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    vars: [
      { path: 'agent.full_name',   label: 'Nombre completo', example: 'María López' },
      { path: 'agent.email',       label: 'Email',           example: 'maria@belgrano.com.ar' },
      { path: 'agent.phone',       label: 'Teléfono',        example: '+54 11 5555-1234' },
      { path: 'agent.license_no',  label: 'Matrícula',       example: 'CUCICBA 12345' },
    ],
  },
  {
    key: 'tenant',
    label: 'Inmobiliaria',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    vars: [
      { path: 'tenant.name',             label: 'Nombre de la inmobiliaria', example: 'Inmobiliaria Belgrano' },
      { path: 'tenant.cucicba_matricula', label: 'Matrícula CUCICBA',         example: 'CUCICBA 09876' },
      { path: 'tenant.address',          label: 'Domicilio legal',            example: 'Av. Cabildo 2000, Belgrano' },
      { path: 'today',                   label: 'Fecha actual',               example: '25 de abril de 2026' },
    ],
  },
];

const CLAUSES: Clause[] = [
  {
    id: 'cucicba_1',
    name: 'Intervención del corredor (CUCICBA)',
    jurisdiction: 'CABA',
    required: true,
    preview: 'El suscripto Corredor Inmobiliario, matrícula CUCICBA Nº {{tenant.cucicba_matricula}}, interviene en la presente operación en carácter de intermediario...',
  },
  {
    id: 'penalty_1',
    name: 'Cláusula penal por incumplimiento',
    jurisdiction: 'Nacional',
    required: false,
    preview: 'En caso de incumplimiento de cualquiera de las partes, la parte incumplidora deberá abonar el {{operation.penalty_clause_pct}} del valor total de la operación...',
  },
  {
    id: 'adjustment_1',
    name: 'Cláusula de ajuste por ICL/IPC',
    jurisdiction: 'Nacional',
    required: false,
    preview: 'El canon locativo se actualizará cada {{operation.adjustment_months}} meses según el Índice para Contratos de Locación (ICL) publicado por el BCRA...',
  },
  {
    id: 'cmcpba_1',
    name: 'Intervención del corredor (CMCPBA)',
    jurisdiction: 'Buenos Aires',
    required: true,
    preview: 'El suscripto Corredor Público Inmobiliario, matrícula CMCPBA Nº {{tenant.cmcpba_matricula}}, en cumplimiento de la Ley 10.973...',
  },
  {
    id: 'afip_1',
    name: 'Declaración AFIP — Prevención de Lavado',
    jurisdiction: 'Nacional',
    required: true,
    preview: 'Las partes declaran bajo juramento que los fondos utilizados en la presente transacción son de origen lícito, conforme Resolución UIF 30/2017...',
  },
];

const REVISIONS: Revision[] = [
  { id: 'r4', number: 4, changedBy: 'María López',  changedAt: '2026-04-25 16:32', summary: 'Cláusula CUCICBA actualizada a modelo 2026' },
  { id: 'r3', number: 3, changedBy: 'Diego Torres',  changedAt: '2026-04-22 11:15', summary: 'Agregada cláusula de penalidad por incumplimiento' },
  { id: 'r2', number: 2, changedBy: 'María López',  changedAt: '2026-04-20 09:44', summary: 'Corrección de variables de contacto vendedor' },
  { id: 'r1', number: 1, changedBy: 'Sistema',       changedAt: '2026-04-18 08:00', summary: 'Creación desde plantilla base (Reserva v2024)' },
];

const SAMPLE_CONTENT = `<p style="font-weight:700;font-size:18px;text-align:center;margin-bottom:24px;">RESERVA DE COMPRAVENTA</p>

<p>En la ciudad de <strong>Buenos Aires</strong>, a los <strong>{{today}}</strong>, entre:</p>

<p><strong>PARTE VENDEDORA:</strong> <span data-var="contact.seller.full_name">{{contact.seller.full_name}}</span>, DNI <span data-var="contact.seller.national_id">{{contact.seller.national_id}}</span>; en adelante "EL VENDEDOR".</p>

<p><strong>PARTE COMPRADORA:</strong> <span data-var="contact.buyer.full_name">{{contact.buyer.full_name}}</span>, DNI <span data-var="contact.buyer.national_id">{{contact.buyer.national_id}}</span>; en adelante "EL COMPRADOR".</p>

<p>Se conviene la siguiente reserva de compraventa del inmueble ubicado en <span data-var="property.address">{{property.address}}</span> (Ref: <span data-var="property.reference_code">{{property.reference_code}}</span>).</p>

<p><strong>PRECIO:</strong> La operación se pactó en la suma de <span data-var="property.currency">{{property.currency}}</span> <span data-var="property.price">{{property.price}}</span>, moneda de los Estados Unidos de América.</p>

<p><strong>SEÑA:</strong> En este acto el COMPRADOR entrega la suma de USD <span data-var="operation.deposit_amount">{{operation.deposit_amount}}</span> en concepto de seña y principio de ejecución del contrato, en los términos del artículo 1060 del C.C.C.N.</p>

<p><strong>PLAZO:</strong> Las partes se obligan a firmar el Boleto de Compraventa antes del <span data-var="operation.escritura_deadline">{{operation.escritura_deadline}}</span>.</p>`;

/* ─── Helpers ────────────────────────────────────────────────── */
function VarPill({ path, onClick }: { path: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 4,
        background: C.brandFaint, border: `1px solid ${C.brand}40`,
        color: C.brandLight, fontSize: 12, fontFamily: F.mono,
        cursor: 'pointer', userSelect: 'none',
        transition: 'background 150ms',
      }}
    >
      {`{{${path}}}`}
    </button>
  );
}

function EditorArea({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  return (
    <div
      style={{
        minHeight: 600, padding: '32px 40px',
        fontFamily: F.body, fontSize: 15, lineHeight: 1.7,
        color: C.textPrimary,
      }}
    >
      <TiptapEditorContent editor={editor} />
    </div>
  );
}

/* ─── Clause Picker Modal ────────────────────────────────────── */
function ClausePickerModal({ onClose, onInsert }: { onClose: () => void; onInsert: (c: Clause) => void }) {
  const [search, setSearch] = useState('');
  const [jur, setJur] = useState<string>('all');

  const jurisdictions = ['all', 'Nacional', 'CABA', 'Buenos Aires'];
  const filtered = CLAUSES.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchJur = jur === 'all' || c.jurisdiction === jur;
    return matchSearch && matchJur;
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: C.bgOverlay, border: `1px solid ${C.border}`,
          borderRadius: 12, width: 600, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 64px #00000080',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              Insertar cláusula
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.textSecondary }}>
              Biblioteca de cláusulas por jurisdicción
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.textSecondary, cursor: 'pointer', padding: '4px 8px', fontSize: 13,
          }}>✕</button>
        </div>

        {/* Search + filter */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
          <input
            placeholder="Buscar cláusula..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, background: C.bgSubtle, border: `1px solid ${C.border}`,
              borderRadius: 6, padding: '8px 12px', color: C.textPrimary,
              fontSize: 13, fontFamily: F.body, outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {jurisdictions.map(j => (
              <button
                key={j}
                type="button"
                onClick={() => setJur(j)}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${jur === j ? C.brand : C.border}`,
                  background: jur === j ? C.brandFaint : 'transparent',
                  color: jur === j ? C.brand : C.textSecondary,
                  cursor: 'pointer',
                }}
              >
                {j === 'all' ? 'Todas' : j}
              </button>
            ))}
          </div>
        </div>

        {/* Clause list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filtered.map(clause => (
            <div
              key={clause.id}
              style={{
                padding: '14px 24px', borderBottom: `1px solid ${C.border}`,
                cursor: 'pointer', transition: 'background 120ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = C.bgSubtle)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{clause.name}</span>
                    {clause.required && (
                      <span style={{
                        padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: C.warningFaint, color: C.warning, letterSpacing: '0.05em',
                      }}>REQUERIDA</span>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: C.textTertiary }}>{clause.jurisdiction}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onInsert(clause)}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                    background: C.brand, color: '#fff', border: 'none', cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Insertar
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: C.textSecondary, lineHeight: 1.5, fontStyle: 'italic' }}>
                {clause.preview.substring(0, 120)}…
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Version History Panel ──────────────────────────────────── */
function VersionHistoryPanel({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
        <h3 style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
          Historial de versiones
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textTertiary }}>
          4 revisiones • versión actual: 4
        </p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {REVISIONS.map((rev, idx) => (
          <div
            key={rev.id}
            onClick={() => setSelected(rev.id)}
            style={{
              padding: '14px 20px', borderBottom: `1px solid ${C.border}`,
              cursor: 'pointer', background: selected === rev.id ? C.bgSubtle : 'transparent',
              transition: 'background 120ms',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: idx === 0 ? C.brand : C.bgSubtle,
                  border: `2px solid ${idx === 0 ? C.brand : C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  color: idx === 0 ? '#fff' : C.textTertiary,
                  flexShrink: 0,
                }}>
                  {rev.number}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                  v{rev.number} {idx === 0 && <span style={{ fontSize: 11, color: C.brand, fontWeight: 400 }}>• actual</span>}
                </span>
              </div>
              <span style={{ fontSize: 11, color: C.textTertiary }}>{rev.changedAt}</span>
            </div>
            <p style={{ margin: '0 0 4px 30px', fontSize: 12, color: C.textSecondary, lineHeight: 1.4 }}>
              {rev.summary}
            </p>
            <p style={{ margin: '0 0 0 30px', fontSize: 11, color: C.textTertiary }}>
              {rev.changedBy}
            </p>
            {selected === rev.id && idx > 0 && (
              <div style={{ marginTop: 10, marginLeft: 30, display: 'flex', gap: 8 }}>
                <button type="button" style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12,
                  background: 'transparent', border: `1px solid ${C.border}`,
                  color: C.textSecondary, cursor: 'pointer',
                }}>Ver diff</button>
                <button type="button" style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12,
                  background: C.bgSubtle, border: `1px solid ${C.border}`,
                  color: C.textPrimary, cursor: 'pointer',
                }}>Restaurar esta versión</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Variable Browser Panel ─────────────────────────────────── */
function VariableBrowserPanel({ onInsert }: { onInsert: (path: string) => void }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    property: true, contacts: true, operation: false, agent: false, tenant: false,
  });

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const filtered = VARIABLE_GROUPS.map(g => ({
    ...g,
    vars: search
      ? g.vars.filter(v => v.label.toLowerCase().includes(search.toLowerCase()) || v.path.includes(search))
      : g.vars,
  })).filter(g => !search || g.vars.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
        <h3 style={{ fontFamily: F.display, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 8px' }}>
          Variables disponibles
        </h3>
        <input
          placeholder="Buscar variable..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: C.bgSubtle, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: '7px 10px',
            color: C.textPrimary, fontSize: 12, fontFamily: F.body,
            outline: 'none',
          }}
        />
      </div>

      {/* Variable groups */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map(group => (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => toggle(group.key)}
              style={{
                width: '100%', padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'transparent', border: 'none',
                borderBottom: `1px solid ${C.border}`,
                color: C.textSecondary, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', textAlign: 'left',
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}
            >
              <span style={{ color: C.brand }}>{group.icon}</span>
              <span style={{ flex: 1 }}>{group.label}</span>
              <span style={{ fontSize: 10, transition: 'transform 150ms', transform: expanded[group.key] ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            </button>
            {(expanded[group.key] || search) && (
              <div>
                {group.vars.map(v => (
                  <div
                    key={v.path}
                    style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}20`, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.bgSubtle)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => onInsert(v.path)}
                  >
                    <div style={{ fontFamily: F.mono, fontSize: 11, color: C.brandLight, marginBottom: 2 }}>
                      {`{{${v.path}}}`}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 2 }}>{v.label}</div>
                    <div style={{ fontSize: 11, color: C.textTertiary, fontStyle: 'italic' }}>
                      ej: {v.example}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Drag hint */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.bgSubtle }}>
        <p style={{ margin: 0, fontSize: 11, color: C.textTertiary, lineHeight: 1.4, textAlign: 'center' }}>
          Hacé clic en una variable para insertarla en el cursor, o arrastrá al editor
        </p>
      </div>
    </div>
  );
}

/* ─── Preview Panel ──────────────────────────────────────────── */
function PreviewPanel() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32, display: 'flex', justifyContent: 'center' }}>
      {/* A4-like page */}
      <div style={{
        width: 794, minHeight: 1123,
        background: '#fff', color: '#111827',
        padding: '60px 72px',
        boxShadow: '0 8px 40px #00000060',
        borderRadius: 4,
        fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.8,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, paddingBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Inmobiliaria Belgrano</div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>Av. Cabildo 2000, Belgrano · CUCICBA 09876</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>Ref: DOC-2026-0042</div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>25 de abril de 2026</div>
          </div>
        </div>

        <h1 style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, marginBottom: 32, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          RESERVA DE COMPRAVENTA
        </h1>

        <p>En la ciudad de <strong>Buenos Aires</strong>, a los <strong>25 de abril de 2026</strong>, entre:</p>
        <p><strong>PARTE VENDEDORA:</strong> Carlos Ramos, DNI 22.345.678; en adelante "EL VENDEDOR".</p>
        <p><strong>PARTE COMPRADORA:</strong> Juan García, DNI 30.456.789; en adelante "EL COMPRADOR".</p>
        <p>Se conviene la siguiente reserva de compraventa del inmueble ubicado en <strong>Av. Corrientes 1234, CABA</strong> (Ref: CAP-0142).</p>
        <p><strong>PRECIO:</strong> La operación se pactó en la suma de <strong>USD 250.000</strong>, moneda de los Estados Unidos de América.</p>
        <p><strong>SEÑA:</strong> En este acto el COMPRADOR entrega la suma de USD 11.000 en concepto de seña y principio de ejecución del contrato, en los términos del artículo 1060 del C.C.C.N.</p>
        <p><strong>PLAZO:</strong> Las partes se obligan a firmar el Boleto de Compraventa antes del 30 de junio de 2026.</p>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 40, left: 72, right: 72, fontSize: 9, color: '#9ca3af', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
          <span>DOC-2026-0042 · Inmobiliaria Belgrano · 25/04/2026</span>
          <span>Página 1 / 3</span>
        </div>

        {/* Draft watermark */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', overflow: 'hidden',
        }}>
          <span style={{
            fontSize: 120, fontWeight: 900, color: '#0000001A',
            transform: 'rotate(-40deg)', letterSpacing: '0.2em', userSelect: 'none',
            whiteSpace: 'nowrap',
          }}>BORRADOR</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Toolbar ────────────────────────────────────────────────── */
function EditorToolbar({ onClause }: { onClause: () => void }) {
  const tools = [
    { label: 'N', title: 'Negrita', style: { fontWeight: 700 } },
    { label: 'I', title: 'Cursiva', style: { fontStyle: 'italic' } },
    { label: 'S', title: 'Subrayado', style: { textDecoration: 'underline' } },
  ];

  const blockTypes = ['Párrafo', 'Título 1', 'Título 2', 'Título 3'];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 16px', borderBottom: `1px solid ${C.border}`,
      background: C.bgRaised, flexWrap: 'wrap',
    }}>
      {/* Block type */}
      <select style={{
        background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 6,
        color: C.textSecondary, fontSize: 12, padding: '5px 8px', cursor: 'pointer',
        fontFamily: F.body,
      }}>
        {blockTypes.map(t => <option key={t}>{t}</option>)}
      </select>

      <div style={{ width: 1, height: 24, background: C.border }} />

      {/* Text styles */}
      {tools.map(t => (
        <button key={t.label} type="button" title={t.title} style={{
          width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: `1px solid ${C.border}`,
          color: C.textSecondary, cursor: 'pointer', fontSize: 13, ...t.style,
        }}>
          {t.label}
        </button>
      ))}

      <div style={{ width: 1, height: 24, background: C.border }} />

      {/* Alignment */}
      {['≡', '⫶', '≡'].map((icon, i) => (
        <button key={i} type="button" style={{
          width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: `1px solid ${C.border}`,
          color: C.textSecondary, cursor: 'pointer', fontSize: 14,
        }}>
          {icon}
        </button>
      ))}

      <div style={{ width: 1, height: 24, background: C.border }} />

      {/* Lists */}
      <button type="button" title="Lista con viñetas" style={{
        width: 32, height: 32, borderRadius: 6,
        background: 'transparent', border: `1px solid ${C.border}`,
        color: C.textSecondary, cursor: 'pointer', fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/>
          <line x1="9" y1="18" x2="20" y2="18"/>
          <circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/>
        </svg>
      </button>

      <div style={{ width: 1, height: 24, background: C.border }} />

      {/* Table */}
      <button type="button" title="Insertar tabla" style={{
        width: 32, height: 32, borderRadius: 6,
        background: 'transparent', border: `1px solid ${C.border}`,
        color: C.textSecondary, cursor: 'pointer', fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="3" y1="15" x2="21" y2="15"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <line x1="15" y1="3" x2="15" y2="21"/>
        </svg>
      </button>

      <div style={{ flex: 1 }} />

      {/* Insert clause CTA */}
      <button
        type="button"
        onClick={onClause}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 6,
          background: C.bgSubtle, border: `1px solid ${C.border}`,
          color: C.textSecondary, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: F.body,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Insertar cláusula
      </button>
    </div>
  );
}

/* ─── Validation Error Banner ────────────────────────────────── */
function ValidationBanner({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div style={{
      margin: '0 20px 0',
      background: C.errorFaint, border: `1px solid ${C.error}40`,
      borderRadius: 8, padding: '10px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.error} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div>
        {errors.map((e, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : '4px 0 0', fontSize: 13, color: C.error }}>{e}</p>
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export interface TemplateEditorPageProps {
  templateId: string;
}

export function TemplateEditorPage({ templateId: _templateId }: TemplateEditorPageProps) {
  const [tab, setTab] = useState<Tab>('editor');
  const [showClausePicker, setShowClausePicker] = useState(false);
  const [showVarBrowser, setShowVarBrowser] = useState(true);

  const editor = useEditor({
    extensions: [StarterKit],
    content: SAMPLE_CONTENT.replace(/\{\{([^}]+)\}\}/g, (_, path) =>
      `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:${C.brandFaint};border:1px solid ${C.brand}40;color:${C.brandLight};font-size:12px;font-family:'DM Mono',monospace;cursor:pointer;" contenteditable="false">{{${path}}}</span>`
    ),
    editorProps: {
      attributes: { style: 'outline:none;' },
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [validationErrors] = useState<string[]>([
    "Variable '{{contact.buyer.passport}}' no existe. Eliminala o usá una variable válida.",
  ]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'editor',  label: 'Editor' },
    { key: 'preview', label: 'Vista previa' },
    { key: 'history', label: 'Historial (4)' },
  ];

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSavedAt('16:48');
    }, 800);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bgBase, fontFamily: F.body }}>

      {/* ── Top header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 20px', height: 56, borderBottom: `1px solid ${C.border}`,
        background: C.bgRaised, flexShrink: 0,
      }}>
        {/* Back */}
        <button type="button" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: `1px solid ${C.border}`, borderRadius: 6,
          color: C.textSecondary, fontSize: 13, padding: '5px 10px', cursor: 'pointer',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Plantillas
        </button>

        <div style={{ width: 1, height: 20, background: C.border }} />

        {/* Template name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            defaultValue="Reserva de Compraventa"
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontFamily: F.display, fontSize: 15, fontWeight: 700,
              color: C.textPrimary, minWidth: 200,
            }}
          />
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
            background: C.brandFaint, color: C.brand,
          }}>reserva</span>
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
            background: C.successFaint, color: C.success,
          }}>Activa</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 13,
                background: tab === t.key ? C.bgSubtle : 'transparent',
                border: `1px solid ${tab === t.key ? C.border : 'transparent'}`,
                color: tab === t.key ? C.textPrimary : C.textSecondary,
                cursor: 'pointer', fontWeight: tab === t.key ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: C.border }} />

        {/* Variable browser toggle */}
        {tab === 'editor' && (
          <button
            type="button"
            onClick={() => setShowVarBrowser(v => !v)}
            title="Variables"
            style={{
              width: 36, height: 36, borderRadius: 6, border: `1px solid ${showVarBrowser ? C.brand : C.border}`,
              background: showVarBrowser ? C.brandFaint : 'transparent',
              color: showVarBrowser ? C.brand : C.textSecondary,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16,18 22,12 16,6"/>
              <polyline points="8,6 2,12 8,18"/>
            </svg>
          </button>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 6,
            background: C.brand, border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? 'Guardando…' : 'Guardar revisión'}
        </button>

        {savedAt && (
          <span style={{ fontSize: 12, color: C.textTertiary }}>Guardado a las {savedAt}</span>
        )}
      </div>

      {/* ── Validation banner ── */}
      {tab === 'editor' && validationErrors.length > 0 && (
        <div style={{ padding: '10px 20px', flexShrink: 0 }}>
          <ValidationBanner errors={validationErrors} />
        </div>
      )}

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {tab === 'editor' && (
          <>
            {/* Editor column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
              <EditorToolbar onClause={() => setShowClausePicker(true)} />
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <EditorArea editor={editor} />
              </div>
            </div>

            {/* Variable browser sidebar */}
            {showVarBrowser && (
              <div style={{
                width: 280, borderLeft: `1px solid ${C.border}`,
                background: C.bgRaised, display: 'flex', flexDirection: 'column',
                flexShrink: 0, overflow: 'hidden',
              }}>
                <VariableBrowserPanel onInsert={path => {
                  editor?.chain().focus().insertContent(
                    `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:${C.brandFaint};border:1px solid ${C.brand}40;color:${C.brandLight};font-size:12px;font-family:'DM Mono',monospace;cursor:pointer;" contenteditable="false">{{${path}}}</span>`
                  ).run();
                }} />
              </div>
            )}
          </>
        )}

        {tab === 'preview' && (
          <div style={{ flex: 1, background: C.bgSubtle, overflowY: 'auto', position: 'relative' }}>
            <PreviewPanel />
          </div>
        )}

        {tab === 'history' && (
          <div style={{
            width: 360, borderRight: `1px solid ${C.border}`,
            background: C.bgRaised, overflow: 'hidden', flexShrink: 0,
          }}>
            <VersionHistoryPanel onClose={() => setTab('editor')} />
          </div>
        )}

        {tab === 'history' && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.textTertiary, fontSize: 14,
          }}>
            <div style={{ textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: 16, opacity: 0.3 }}>
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              <p style={{ margin: 0, fontFamily: F.display, fontSize: 15, fontWeight: 600, color: C.textSecondary }}>
                Seleccioná una versión para ver el diff
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: C.textTertiary }}>
                Podés comparar dos versiones o restaurar una anterior
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Clause picker modal */}
      {showClausePicker && (
        <ClausePickerModal
          onClose={() => setShowClausePicker(false)}
          onInsert={clause => {
            console.log('insert clause:', clause.id);
            setShowClausePicker(false);
          }}
        />
      )}
    </div>
  );
}
