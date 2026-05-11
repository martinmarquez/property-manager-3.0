import React, { useState } from 'react';

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
  mono:    "'DM Mono', monospace",
};

/* ─── Types ─────────────────────────────────────────────────── */
type ReservationTab = 'timeline' | 'milestones' | 'commissions' | 'documents';

interface Milestone {
  id: string;
  label: string;
  amount: number;
  currency: string;
  dueDate: string;
  paidAt?: string;
  paidAmount?: number;
  isOverdue: boolean;
  isPartial?: boolean;
}

interface CommissionSplit {
  id: string;
  partyName: string;
  partyType: 'internal' | 'external';
  splitPct: number;
  amount: number;
  currency: string;
  paidAt?: string;
}

interface ActivityEvent {
  id: string;
  date: string;
  icon: string;
  title: string;
  description: string;
  kind: 'created' | 'payment' | 'signature' | 'document' | 'milestone' | 'status';
}

/* ─── Mock data ─────────────────────────────────────────────── */
const MILESTONES: Milestone[] = [
  { id: 'm1', label: 'Seña',             amount: 11000,  currency: 'USD', dueDate: '10 abr 2026', paidAt: '10 abr 2026', paidAmount: 11000,  isOverdue: false },
  { id: 'm2', label: 'Primer cuota',     amount: 50000,  currency: 'USD', dueDate: '25 abr 2026', paidAt: '25 abr 2026', paidAmount: 50000,  isOverdue: false },
  { id: 'm3', label: 'Segunda cuota',    amount: 50000,  currency: 'USD', dueDate: '25 may 2026',                                            isOverdue: false },
  { id: 'm4', label: 'Saldo escritura',  amount: 139000, currency: 'USD', dueDate: '30 jun 2026',                                            isOverdue: false },
];

const COMMISSION_SPLITS: CommissionSplit[] = [
  { id: 'c1', partyName: 'María López',       partyType: 'internal', splitPct: 50, amount: 3750, currency: 'USD', paidAt: '26 abr 2026' },
  { id: 'c2', partyName: 'Rodrigo Fernández', partyType: 'external', splitPct: 50, amount: 3750, currency: 'USD' },
];

const ACTIVITY: ActivityEvent[] = [
  { id: 'e6', date: '25 abr 2026 · 16:21', icon: '✍️', title: 'María López firmó el Boleto',    description: 'Firma digital completada. Corredor (orden 3/3).',     kind: 'signature' },
  { id: 'e5', date: '25 abr 2026 · 14:08', icon: '✍️', title: 'Carlos Ramos firmó el Boleto',   description: 'Firma digital completada. Vendedor (orden 2/3).',      kind: 'signature' },
  { id: 'e4', date: '25 abr 2026 · 10:15', icon: '📄', title: 'Boleto generado',                 description: 'Generado a partir de plantilla v3. DOC-2026-0042.',    kind: 'document' },
  { id: 'e3', date: '24 abr 2026 · 11:32', icon: '✍️', title: 'Juan García firmó el Boleto',    description: 'Firma digital completada. Comprador (orden 1/3).',     kind: 'signature' },
  { id: 'e2', date: '25 abr 2026 · 08:00', icon: '💵', title: 'Cuota 1 registrada como pagada', description: 'USD 50.000 recibidos. Recibo adjunto.',                 kind: 'payment' },
  { id: 'e1', date: '10 abr 2026 · 12:00', icon: '📋', title: 'Reserva creada',                  description: 'Desde lead Pipeline #1042. Agente: María López.',      kind: 'created' },
];

const MOCK_DOCS = [
  { id: 'd1', name: 'Recibo de seña',         status: 'firmado',        date: '10 abr 2026', ref: 'DOC-2026-0038' },
  { id: 'd2', name: 'Boleto de compraventa',  status: 'firmado',        date: '25 abr 2026', ref: 'DOC-2026-0042' },
  { id: 'd3', name: 'Recibo cuota 1',         status: 'borrador',       date: '25 abr 2026', ref: 'DOC-2026-0049' },
];

/* ─── Status badge ───────────────────────────────────────────── */
function StatusBadge({ status, fontSize = 12 }: { status: string; fontSize?: number }) {
  const meta: Record<string, { label: string; bg: string; color: string }> = {
    borrador:        { label: 'Borrador',   bg: C.bgSubtle,       color: C.textSecondary },
    firmado:         { label: 'Firmado',    bg: C.successFaint,   color: C.success },
    pendiente:       { label: 'Pendiente',  bg: C.warningFaint,   color: C.warning },
    pagado:          { label: 'Pagado',     bg: C.successFaint,   color: C.success },
    vencido:         { label: 'Vencido',    bg: C.errorFaint,     color: C.error },
    pago_parcial:    { label: 'Parcial',    bg: C.warningFaint,   color: C.warning },
    pendiente_firma: { label: 'Pend. firma', bg: C.warningFaint,  color: C.warning },
    activa:          { label: 'Activa',     bg: C.successFaint,   color: C.success },
    converted:       { label: 'Convertida', bg: C.brandFaint,     color: C.brand },
  };
  const m = meta[status] ?? { label: status, bg: C.bgSubtle, color: C.textSecondary };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 5, fontSize, fontWeight: 700,
      background: m.bg, color: m.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

/* ─── Transaction stepper ────────────────────────────────────── */
function TransactionStepper() {
  const stages = [
    {
      id: 'reserva',
      label: 'Reserva',
      status: 'activa' as const,
      date: '10 abr 2026',
      details: [
        { label: 'Oferta',   value: 'USD 250.000' },
        { label: 'Seña',     value: 'USD 11.000 (5%)' },
        { label: 'Comprador', value: 'Juan García' },
        { label: 'Vendedor',  value: 'Carlos Ramos' },
      ],
      actions: [
        { label: 'Ver Reserva',            primary: false },
        { label: 'Descargar recibo seña',   primary: false },
        { label: 'Convertir a Boleto →',    primary: true },
      ],
      done: true,
    },
    {
      id: 'boleto',
      label: 'Boleto de compraventa',
      status: 'firmado' as const,
      date: '25 abr 2026',
      details: [
        { label: 'Precio',             value: 'USD 250.000' },
        { label: 'Escritura',          value: '30 jun 2026' },
        { label: 'Cuotas restantes',   value: '2 de 4' },
        { label: 'Penalidad',          value: '10%' },
      ],
      actions: [
        { label: 'Ver Boleto',              primary: false },
        { label: 'Descargar PDF firmado',   primary: false },
      ],
      done: true,
    },
    {
      id: 'escritura',
      label: 'Escritura',
      status: 'pendiente' as const,
      date: null,
      details: [],
      actions: [
        { label: 'Adjuntar escritura',  primary: true },
      ],
      done: false,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {stages.map((stage, idx) => (
        <div key={stage.id} style={{ display: 'flex', gap: 0 }}>
          {/* Vertical timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
            {/* Dot */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0, zIndex: 1,
              background: stage.done ? C.success : stage.id === 'escritura' ? C.bgSubtle : C.brand,
              border: `3px solid ${stage.done ? C.success : stage.id === 'escritura' ? C.border : C.brand}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: stage.done ? `0 0 0 4px ${C.success}20` : '',
              marginTop: 2,
            }}>
              {stage.done ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              ) : (
                <span style={{ fontSize: 11, color: stage.id === 'escritura' ? C.textTertiary : '#fff', fontWeight: 700 }}>
                  {idx + 1}
                </span>
              )}
            </div>
            {/* Line */}
            {idx < stages.length - 1 && (
              <div style={{
                width: 2, flex: 1, minHeight: 40,
                background: stage.done ? C.success : C.border,
                marginTop: 4, marginBottom: 4,
              }} />
            )}
          </div>

          {/* Stage card */}
          <div style={{
            flex: 1, marginLeft: 16, marginBottom: idx < stages.length - 1 ? 8 : 0,
            background: stage.id === 'escritura' ? 'transparent' : C.bgRaised,
            border: `1px solid ${stage.id === 'escritura' ? C.border + '60' : C.border}`,
            borderRadius: 10, padding: '16px 18px',
            opacity: stage.id === 'escritura' ? 0.65 : 1,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: stage.details.length ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
                  {stage.label}
                </h3>
                <StatusBadge status={stage.status} />
              </div>
              {stage.date && (
                <span style={{ fontSize: 12, color: C.textTertiary }}>{stage.date}</span>
              )}
            </div>

            {/* Details grid */}
            {stage.details.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', marginBottom: 14 }}>
                {stage.details.map(d => (
                  <div key={d.label} style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 12, color: C.textTertiary, flexShrink: 0 }}>{d.label}:</span>
                    <span style={{ fontSize: 12, color: C.textPrimary, fontWeight: 500 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Escritura placeholder */}
            {stage.id === 'escritura' && (
              <p style={{ margin: '0 0 10px', fontSize: 12, color: C.textTertiary, fontStyle: 'italic' }}>
                Disponible una vez que el Boleto sea firmado y las cuotas sean saldadas
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {stage.actions.map(a => (
                <button key={a.label} type="button" style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: a.primary ? C.brand : 'transparent',
                  border: `1px solid ${a.primary ? C.brand : C.border}`,
                  color: a.primary ? '#fff' : C.textSecondary,
                  cursor: 'pointer',
                }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Milestones tab ─────────────────────────────────────────── */
function MilestonesTab() {
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const total = MILESTONES.reduce((s, m) => s + m.amount, 0);
  const paid = MILESTONES.filter(m => m.paidAt).reduce((s, m) => s + (m.paidAmount ?? m.amount), 0);

  return (
    <div>
      {/* Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 12, marginBottom: 20,
      }}>
        {[
          { label: 'Total a pagar',     value: `USD ${total.toLocaleString('es-AR')}`,  color: C.textPrimary },
          { label: 'Pagado',            value: `USD ${paid.toLocaleString('es-AR')}`,   color: C.success },
          { label: 'Pendiente',         value: `USD ${(total - paid).toLocaleString('es-AR')}`, color: C.warning },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: '12px 16px', borderRadius: 8,
            background: C.bgRaised, border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: F.display }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
          <span style={{ color: C.textSecondary }}>Progreso de pagos</span>
          <span style={{ color: C.success, fontWeight: 700 }}>{Math.round(paid / total * 100)}%</span>
        </div>
        <div style={{ height: 8, background: C.bgSubtle, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: C.success, width: `${paid / total * 100}%`, borderRadius: 4, transition: 'width 400ms ease' }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 120px',
          padding: '10px 16px', background: C.bgSubtle,
          borderBottom: `1px solid ${C.border}`,
          fontSize: 11, fontWeight: 700, color: C.textTertiary,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <span>Concepto</span>
          <span>Monto</span>
          <span>Vencimiento</span>
          <span>Estado</span>
          <span></span>
        </div>

        {MILESTONES.map(m => {
          const status = m.paidAt ? (m.isPartial ? 'pago_parcial' : 'pagado') : m.isOverdue ? 'vencido' : 'pendiente';
          return (
            <div key={m.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 120px',
              padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
              alignItems: 'center',
              background: m.isOverdue ? C.errorFaint : 'transparent',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{m.label}</div>
                {m.paidAt && (
                  <div style={{ fontSize: 11, color: C.textTertiary }}>Pagado {m.paidAt}</div>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: F.mono }}>
                {m.currency} {m.amount.toLocaleString('es-AR')}
              </div>
              <div style={{ fontSize: 12, color: m.isOverdue ? C.error : C.textSecondary }}>{m.dueDate}</div>
              <div><StatusBadge status={status} fontSize={11} /></div>
              <div>
                {!m.paidAt && (
                  <button
                    type="button"
                    onClick={() => { setSelectedMilestone(m); setShowPayModal(true); }}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: m.isOverdue ? C.error : C.brand,
                      border: 'none', color: '#fff', cursor: 'pointer',
                    }}
                  >
                    Registrar pago
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Register payment modal (simplified) */}
      {showPayModal && selectedMilestone && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          background: '#00000090', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowPayModal(false)}>
          <div
            style={{
              background: C.bgOverlay, border: `1px solid ${C.border}`,
              borderRadius: 12, width: 420, padding: 24,
              boxShadow: '0 24px 60px #00000080',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: '0 0 4px' }}>
              Registrar pago
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: C.textTertiary }}>
              {selectedMilestone.label} · USD {selectedMilestone.amount.toLocaleString('es-AR')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Monto pagado (USD)', type: 'number', placeholder: selectedMilestone.amount.toString() },
                { label: 'Fecha de pago', type: 'date', placeholder: '' },
              ].map(field => (
                <div key={field.label}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: C.bgSubtle, border: `1px solid ${C.border}`,
                      borderRadius: 6, padding: '9px 12px',
                      color: C.textPrimary, fontSize: 13, fontFamily: F.body, outline: 'none',
                    }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>
                  Documento de respaldo (opcional)
                </label>
                <div style={{
                  borderRadius: 6, border: `1px dashed ${C.border}`, padding: '20px 0',
                  textAlign: 'center', cursor: 'pointer', color: C.textTertiary, fontSize: 12,
                }}>
                  Arrastrá un recibo o hacé clic para adjuntar
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowPayModal(false)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 7, fontSize: 13, fontWeight: 600,
                  background: 'transparent', border: `1px solid ${C.border}`,
                  color: C.textSecondary, cursor: 'pointer',
                }}>Cancelar</button>
                <button type="button" onClick={() => setShowPayModal(false)} style={{
                  flex: 2, padding: '9px 0', borderRadius: 7, fontSize: 13, fontWeight: 700,
                  background: C.brand, border: 'none', color: '#fff', cursor: 'pointer',
                }}>Confirmar pago</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Commissions tab ────────────────────────────────────────── */
function CommissionsTab() {
  const salePrice = 250000;
  const commissionPct = 3;
  const totalCommission = salePrice * commissionPct / 100;

  return (
    <div>
      {/* Commission summary */}
      <div style={{
        padding: '16px 20px', borderRadius: 10,
        background: C.bgRaised, border: `1px solid ${C.border}`, marginBottom: 20,
        display: 'flex', gap: 24, alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Comisión total</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, fontFamily: F.display }}>
            USD {totalCommission.toLocaleString('es-AR')}
          </div>
          <div style={{ fontSize: 12, color: C.textTertiary }}>
            {commissionPct}% de USD {salePrice.toLocaleString('es-AR')}
          </div>
        </div>
        <div style={{ width: 1, height: 40, background: C.border }} />
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Partes', value: `${COMMISSION_SPLITS.length}` },
            { label: 'Cobrado', value: `USD ${COMMISSION_SPLITS.filter(s => s.paidAt).reduce((acc, s) => acc + s.amount, 0).toLocaleString('es-AR')}` },
            { label: 'Pendiente', value: `USD ${COMMISSION_SPLITS.filter(s => !s.paidAt).reduce((acc, s) => acc + s.amount, 0).toLocaleString('es-AR')}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Splits */}
      <div style={{ borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{
          padding: '10px 16px', background: C.bgSubtle, borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary }}>Distribución de comisión</span>
          <button type="button" style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: C.brandFaint, border: `1px solid ${C.brand}40`,
            color: C.brand, cursor: 'pointer',
          }}>
            + Agregar parte
          </button>
        </div>

        {COMMISSION_SPLITS.map(split => (
          <div key={split.id} style={{
            padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: split.partyType === 'internal' ? C.brandFaint : C.bgSubtle,
              border: `2px solid ${split.partyType === 'internal' ? C.brand + '40' : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
              color: split.partyType === 'internal' ? C.brand : C.textTertiary,
            }}>
              {split.partyName.charAt(0)}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{split.partyName}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                  background: split.partyType === 'internal' ? C.brandFaint : C.bgSubtle,
                  color: split.partyType === 'internal' ? C.brand : C.textTertiary,
                }}>
                  {split.partyType === 'internal' ? 'Interno' : 'Externo'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.textTertiary }}>
                {split.splitPct}% → USD {split.amount.toLocaleString('es-AR')}
              </div>
            </div>

            {split.paidAt ? (
              <div style={{ textAlign: 'right' }}>
                <StatusBadge status="pagado" fontSize={11} />
                <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 4 }}>{split.paidAt}</div>
              </div>
            ) : (
              <button type="button" style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                background: C.brand, border: 'none', color: '#fff', cursor: 'pointer',
              }}>
                Marcar pagado
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Validation note */}
      <p style={{ marginTop: 12, fontSize: 12, color: C.textTertiary, textAlign: 'center' }}>
        Los porcentajes deben sumar 100% para poder guardar.
        <strong style={{ color: C.success }}> ✓ 100%</strong>
      </p>
    </div>
  );
}

/* ─── Documents tab ──────────────────────────────────────────── */
function DocumentsTab() {
  return (
    <div>
      <div style={{ borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {MOCK_DOCS.map((doc, i) => (
          <div key={doc.id} style={{
            padding: '14px 16px',
            borderBottom: i < MOCK_DOCS.length - 1 ? `1px solid ${C.border}` : 'none',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: C.bgSubtle, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.textTertiary,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 2 }}>{doc.name}</div>
              <div style={{ fontSize: 11, color: C.textTertiary }}>{doc.ref} · {doc.date}</div>
            </div>
            <StatusBadge status={doc.status} fontSize={11} />
            <button type="button" style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 12,
              background: 'transparent', border: `1px solid ${C.border}`,
              color: C.textSecondary, cursor: 'pointer',
            }}>Ver</button>
          </div>
        ))}
      </div>
      <button type="button" style={{
        width: '100%', marginTop: 12, padding: '10px 0', borderRadius: 7,
        background: 'transparent', border: `1px dashed ${C.border}`,
        color: C.textSecondary, fontSize: 13, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Generar nuevo documento
      </button>
    </div>
  );
}

/* ─── Activity timeline ──────────────────────────────────────── */
function ActivityTimeline() {
  const kindColors: Record<string, string> = {
    created: C.brand,
    payment: C.success,
    signature: C.success,
    document: C.textTertiary,
    milestone: C.warning,
    status: C.brand,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {ACTIVITY.map((ev, i) => (
        <div key={ev.id} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
          {/* Dot + line */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: `${kindColors[ev.kind]}18`,
              border: `2px solid ${kindColors[ev.kind]}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12,
            }}>
              {ev.icon}
            </div>
            {i < ACTIVITY.length - 1 && (
              <div style={{ width: 2, flex: 1, background: C.border, minHeight: 16, marginTop: 4 }} />
            )}
          </div>
          {/* Content */}
          <div style={{ flex: 1, paddingTop: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{ev.title}</span>
              <span style={{ fontSize: 11, color: C.textTertiary, flexShrink: 0, marginLeft: 12 }}>{ev.date}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: C.textSecondary, lineHeight: 1.4 }}>{ev.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export interface ReservationDetailPageProps {
  reservationId: string;
}

export function ReservationDetailPage({ reservationId: _id }: ReservationDetailPageProps) {
  const [tab, setTab] = useState<ReservationTab>('timeline');

  const tabs: { key: ReservationTab; label: string }[] = [
    { key: 'timeline',    label: 'Línea de tiempo' },
    { key: 'milestones',  label: 'Cuotas' },
    { key: 'commissions', label: 'Comisiones' },
    { key: 'documents',   label: 'Documentos' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bgBase, fontFamily: F.body }}>

      {/* ── Header ── */}
      <div style={{
        padding: '18px 24px', borderBottom: `1px solid ${C.border}`,
        background: C.bgRaised, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <button type="button" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.textSecondary, fontSize: 13, padding: '5px 10px', cursor: 'pointer',
            marginTop: 2, flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15,18 9,12 15,6"/>
            </svg>
            Reservas
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                Av. Corrientes 1234, CABA
              </h1>
              <StatusBadge status="firmado" />
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Comprador',  value: 'Juan García' },
                { label: 'Vendedor',   value: 'Carlos Ramos' },
                { label: 'Precio',     value: 'USD 250.000' },
                { label: 'Agente',     value: 'María López' },
                { label: 'Etapa',      value: 'Boleto firmado' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 13, color: C.textTertiary }}>{label}:</span>
                  <span style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick KPIs */}
        <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
          {[
            { label: 'Escritura',     value: '30 jun 2026',       color: C.warning },
            { label: 'Cuotas pagas', value: '2 / 4',              color: C.success },
            { label: 'Comisión',      value: 'USD 7.500',          color: C.textPrimary },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: '10px 14px', borderRadius: 8,
              background: C.bgSubtle, border: `1px solid ${C.border}`,
              textAlign: 'center', minWidth: 80,
            }}>
              <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: F.display }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ display: 'flex', gap: 0 }}>

        {/* Left: main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tab bar */}
          <div style={{
            display: 'flex', padding: '0 24px', borderBottom: `1px solid ${C.border}`,
            background: C.bgRaised,
          }}>
            {tabs.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                style={{
                  padding: '14px 16px', fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
                  background: 'transparent', border: 'none',
                  borderBottom: `2px solid ${tab === t.key ? C.brand : 'transparent'}`,
                  color: tab === t.key ? C.textPrimary : C.textSecondary,
                  cursor: 'pointer', transition: 'all 150ms',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>
            {tab === 'timeline' && <TransactionStepper />}
            {tab === 'milestones' && <MilestonesTab />}
            {tab === 'commissions' && <CommissionsTab />}
            {tab === 'documents' && <DocumentsTab />}
          </div>
        </div>

        {/* Right: activity feed */}
        <div style={{
          width: 320, flexShrink: 0, borderLeft: `1px solid ${C.border}`,
          background: C.bgRaised,
        }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
            <h3 style={{ fontFamily: F.display, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              Actividad
            </h3>
          </div>
          <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
            <ActivityTimeline />
          </div>
        </div>
      </div>
    </div>
  );
}
