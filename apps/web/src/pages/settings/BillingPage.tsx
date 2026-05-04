import React, { useState } from 'react';
import {
  CreditCard, Check, X, ChevronDown, ChevronUp, AlertTriangle, Download,
  Zap, Building2, Crown, ArrowUpCircle, Clock, Shield, RefreshCw, Plus,
  Trash2, MoreHorizontal, CheckCircle2, XCircle, AlertCircle, ExternalLink,
  Star, Package,
} from 'lucide-react';

/* ─── Design tokens ─────────────────────────────────────────── */

const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  bgSubtle:      '#162035',
  brand:         '#1654d9',
  brandHover:    '#1244b8',
  brandFaint:    'rgba(22,84,217,0.12)',
  ai:            '#7E3AF2',
  aiFaint:       'rgba(126,58,242,0.12)',
  success:       '#18A659',
  successFaint:  'rgba(24,166,89,0.12)',
  warning:       '#E88A14',
  warningFaint:  'rgba(232,138,20,0.12)',
  error:         '#E83B3B',
  errorFaint:    'rgba(232,59,59,0.12)',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#6B809E',
  border:        '#1F2D48',
} as const;

const F = {
  display: "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
  mono:    "'DM Mono', monospace",
} as const;

/* ─── Data ──────────────────────────────────────────────────── */

type FeatureValue = string | true | false;

interface Plan {
  id: string;
  name: string;
  price: string;
  isCurrent: boolean;
  ctaLabel: string;
  ctaVariant: 'disabled' | 'primary' | 'ghost';
}

const FEATURE_ROWS: { label: string; values: FeatureValue[] }[] = [
  { label: 'Propiedades',           values: ['50', '200', 'Ilimitadas', 'Ilimitadas'] },
  { label: 'Usuarios',              values: ['1',  '3',   '20',         'Ilimitados'] },
  { label: 'Portales sincronizados',values: ['1',  '3',   'Todos',      'Todos']      },
  { label: 'IA Copilot',            values: [false, true,  true,         true]         },
  { label: 'Website Builder',       values: [false, false, true,         true]         },
  { label: 'Analytics avanzado',    values: ['Básico','Completo','Completo','Personalizado'] },
  { label: 'Tasaciones',            values: [false, '5/mes','Ilimitadas','Ilimitadas'] },
  { label: 'Soporte',               values: ['Email','Email+Chat','Prioritario','Dedicado'] },
  { label: 'White-label',           values: [false, false, true, true]                 },
  { label: 'Acceso API',            values: [false, false, true, true]                 },
];

const PLANS: Plan[] = [
  { id: 'solo',       name: 'Solo',       price: '$29/mes',           isCurrent: true,  ctaLabel: 'Tu plan actual', ctaVariant: 'disabled' },
  { id: 'pro',        name: 'Pro',        price: '$99/mes',           isCurrent: false, ctaLabel: 'Actualizar',     ctaVariant: 'primary'  },
  { id: 'agencia',    name: 'Agencia',    price: '$299/mes',          isCurrent: false, ctaLabel: 'Actualizar',     ctaVariant: 'primary'  },
  { id: 'enterprise', name: 'Enterprise', price: 'Precio a consultar',isCurrent: false, ctaLabel: 'Personalizar',   ctaVariant: 'ghost'    },
];

interface Invoice {
  date: string;
  number: string;
  period: string;
  amount: string;
  status: 'pagada' | 'pendiente' | 'vencida';
  cae: string;
}

const INVOICES: Invoice[] = [
  { date: '01/05/2026', number: 'FC-2026-0047', period: 'Mayo 2026',  amount: '$29.00', status: 'pagada', cae: '72547891234' },
  { date: '01/04/2026', number: 'FC-2026-0038', period: 'Abril 2026', amount: '$29.00', status: 'pagada', cae: '72547882341' },
  { date: '01/03/2026', number: 'FC-2026-0029', period: 'Marzo 2026', amount: '$29.00', status: 'pagada', cae: '72547873421' },
  { date: '01/02/2026', number: 'FC-2026-0021', period: 'Feb 2026',   amount: '$29.00', status: 'pagada', cae: '72547864231' },
  { date: '01/01/2026', number: 'FC-2026-0012', period: 'Ene 2026',   amount: '$29.00', status: 'pagada', cae: '72547854321' },
  { date: '01/12/2025', number: 'FC-2025-0098', period: 'Dic 2025',   amount: '$29.00', status: 'pagada', cae: '72547843211' },
];

/* ─── Helpers ───────────────────────────────────────────────── */

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, (used / limit) * 100);
  const color = pct >= 90 ? C.error : pct >= 70 ? C.warning : C.brand;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>{label}</span>
        <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary }}>
          {used}/{limit}
        </span>
      </div>
      <div style={{
        height: 6, borderRadius: 6, background: C.bgElevated,
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: '0 auto 0 0',
          width: `${pct}%`, borderRadius: 6,
          background: color,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Invoice['status'] }) {
  const map = {
    pagada:    { bg: C.successFaint, color: C.success,  label: 'Pagada'    },
    pendiente: { bg: C.warningFaint, color: C.warning,  label: 'Pendiente' },
    vencida:   { bg: C.errorFaint,   color: C.error,    label: 'Vencida'   },
  };
  const s = map[status];
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontFamily: F.mono, fontSize: 10, fontWeight: 600,
      padding: '3px 8px', borderRadius: 6,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {s.label}
    </span>
  );
}

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true)  return <CheckCircle2 size={16} color={C.success} />;
  if (value === false) return <XCircle size={16} color={C.textTertiary} />;
  return (
    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary }}>
      {value as string}
    </span>
  );
}

/* ─── Section A: Suscripción actual ────────────────────────── */

function CurrentSubscription() {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: '0 0 16px', letterSpacing: '-0.01em' }}>
        Suscripción actual
      </h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

        {/* Card 1: Plan actual */}
        <div style={{
          flex: '1 1 300px', background: C.bgRaised, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '20px 22px',
        }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              PLAN ACTUAL
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.textPrimary }}>
              Starter
            </span>
            <span style={{
              background: C.successFaint, color: C.success,
              fontFamily: F.mono, fontSize: 10, fontWeight: 600,
              padding: '3px 9px', borderRadius: 6,
            }}>
              Activo
            </span>
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 18, color: C.textSecondary, marginBottom: 4 }}>
            $29/mes
          </div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, marginBottom: 20 }}>
            Próximo cobro: 1 jun 2026
          </div>

          <div style={{ height: 1, background: C.border, marginBottom: 20 }} />

          <UsageBar label="Propiedades" used={68} limit={100} />
          <UsageBar label="Usuarios"    used={3}  limit={5}   />
          <UsageBar label="Portales"    used={2}  limit={3}   />

          <button style={{
            marginTop: 8,
            background: 'transparent', border: `1px solid ${C.border}`,
            color: C.brand, fontFamily: F.body, fontSize: 13, fontWeight: 600,
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
          }}>
            Cambiar plan →
          </button>
        </div>

        {/* Card 2: Método de pago */}
        <div style={{
          flex: '1 1 300px', background: C.bgRaised, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '20px 22px',
        }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              MÉTODO DE PAGO
            </span>
          </div>

          {/* Card row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            {/* Card mock */}
            <div style={{
              width: 48, height: 32, borderRadius: 5,
              background: 'linear-gradient(135deg, #1654d9 0%, #0a3494 100%)',
              flexShrink: 0, display: 'flex', alignItems: 'flex-end',
              padding: '4px 5px',
            }}>
              <div style={{ width: 10, height: 7, borderRadius: 1, background: 'rgba(255,255,255,0.4)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.mono, fontSize: 13, color: C.textPrimary, marginBottom: 2 }}>
                Visa ···· 4242
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary }}>
                Vence 12/27
              </div>
            </div>
            <span style={{
              background: C.brandFaint, color: C.brand,
              fontFamily: F.mono, fontSize: 9, fontWeight: 600,
              padding: '3px 7px', borderRadius: 5,
              marginRight: 6,
            }}>
              Predeterminado
            </span>
            <button style={{
              background: 'transparent', border: 'none',
              color: C.brand, fontFamily: F.body, fontSize: 12,
              cursor: 'pointer', padding: 0,
            }}>
              Cambiar
            </button>
          </div>

          <div style={{ flex: 1 }} />

          <button style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'transparent', border: `1px dashed ${C.border}`,
            color: C.brand, fontFamily: F.body, fontSize: 13, fontWeight: 500,
            padding: '9px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 14,
          }}>
            <Plus size={14} />
            Agregar método de pago
          </button>

          {/* Mercado Pago */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: '#009EE3', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, color: '#fff' }}>MP</span>
            </div>
            <button style={{
              background: 'transparent', border: 'none',
              color: C.brand, fontFamily: F.body, fontSize: 13,
              cursor: 'pointer', padding: 0,
            }}>
              Vincular Mercado Pago
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section B: Comparar planes ───────────────────────────── */

function UpgradeModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(7,13,26,0.85)',
      backdropFilter: 'blur(6px)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bgRaised, border: `1px solid ${C.border}`,
          borderRadius: 14, width: 460, padding: '28px 32px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            Actualizar a Pro
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textTertiary, padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Summary */}
        <div style={{
          background: C.bgElevated, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '14px 16px', marginBottom: 16,
        }}>
          <div style={{ fontFamily: F.mono, fontSize: 13, color: C.textSecondary, marginBottom: 6 }}>
            De Solo ($29/mes) → Pro ($99/mes)
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertCircle size={14} color={C.warning} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
              Se cobrará <strong style={{ color: C.textPrimary, fontFamily: F.mono }}>$46.67</strong> ahora por los días restantes del ciclo actual
            </span>
          </div>
        </div>

        {/* Feature gains */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Incluye en Pro
          </p>
          {[
            'Hasta 200 propiedades (vs. 50 en Solo)',
            'Hasta 3 usuarios colaboradores',
            'IA Copilot para redacción y tasaciones',
          ].map((feat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <CheckCircle2 size={14} color={C.success} />
              <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>{feat}</span>
            </div>
          ))}
        </div>

        {/* Payment method */}
        <div style={{
          background: C.bgSubtle, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 22,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <CreditCard size={14} color={C.textTertiary} />
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
            Visa ···· 4242 · Vence 12/27
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: F.mono, fontSize: 9, color: C.brand }}>Predeterminado</span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '11px', borderRadius: 9, border: 'none',
              background: C.brand, color: '#fff',
              fontFamily: F.body, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            Confirmar actualización
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px', borderRadius: 9,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.textSecondary, fontFamily: F.body, fontSize: 14, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanComparison() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const COL_COUNT = 5; // 1 label + 4 plans
  const colWidth = `${100 / COL_COUNT}%`;

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
        Comparar planes
      </h2>

      <div style={{
        background: C.bgRaised, border: `1px solid ${C.border}`,
        borderRadius: 12, overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex' }}>
          {/* Feature label column header */}
          <div style={{ width: colWidth, flexShrink: 0, padding: '20px 20px', background: C.bgBase }} />

          {PLANS.map((plan, i) => {
            const isCurrent = plan.isCurrent;
            return (
              <div key={plan.id} style={{
                width: colWidth, flexShrink: 0,
                background: isCurrent ? C.brandFaint : i % 2 === 0 ? C.bgRaised : C.bgBase,
                borderTop: isCurrent ? `3px solid ${C.brand}` : '3px solid transparent',
                padding: '20px 16px 18px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary }}>
                  {plan.name}
                </span>
                <span style={{ fontFamily: F.mono, fontSize: 13, color: C.textSecondary, marginBottom: 10 }}>
                  {plan.price}
                </span>
                {plan.ctaVariant === 'disabled' && (
                  <button disabled style={{
                    width: '100%', padding: '8px', borderRadius: 7,
                    border: `1px solid ${C.border}`, background: C.bgElevated,
                    color: C.textTertiary, fontFamily: F.body, fontSize: 12,
                    cursor: 'default', opacity: 0.7,
                  }}>
                    Tu plan actual
                  </button>
                )}
                {plan.ctaVariant === 'primary' && (
                  <button
                    onClick={() => plan.id === 'pro' && setShowUpgradeModal(true)}
                    style={{
                      width: '100%', padding: '8px', borderRadius: 7,
                      border: 'none', background: C.brand,
                      color: '#fff', fontFamily: F.body, fontWeight: 600, fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Actualizar
                  </button>
                )}
                {plan.ctaVariant === 'ghost' && (
                  <button style={{
                    width: '100%', padding: '8px', borderRadius: 7,
                    border: `1px solid ${C.border}`, background: 'transparent',
                    color: C.textSecondary, fontFamily: F.body, fontSize: 12,
                    cursor: 'pointer',
                  }}>
                    Personalizar
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature rows */}
        {FEATURE_ROWS.map((row, rowIdx) => (
          <div key={row.label} style={{ display: 'flex', borderTop: `1px solid ${C.border}` }}>
            {/* Label */}
            <div style={{
              width: colWidth, flexShrink: 0,
              padding: '13px 20px',
              background: rowIdx % 2 === 0 ? C.bgRaised : C.bgBase,
              display: 'flex', alignItems: 'center',
            }}>
              <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
                {row.label}
              </span>
            </div>

            {/* Values */}
            {row.values.map((val, planIdx) => {
              const plan = PLANS[planIdx] as Plan | undefined;
              const isCurrentPlan = plan?.isCurrent ?? false;
              return (
                <div key={planIdx} style={{
                  width: colWidth, flexShrink: 0,
                  padding: '13px 16px',
                  background: isCurrentPlan
                    ? C.brandFaint
                    : rowIdx % 2 === 0 ? C.bgRaised : C.bgBase,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FeatureCell value={val} />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showUpgradeModal && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          onConfirm={() => setShowUpgradeModal(false)}
        />
      )}
    </section>
  );
}

/* ─── Section C: Métodos de pago / Facturas ─────────────────── */

function KebabMenu({ open, onToggle, onSetDefault, onDelete }: {
  open: boolean;
  onToggle: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        style={{
          background: 'transparent', border: `1px solid ${C.border}`,
          borderRadius: 6, padding: '4px 7px', cursor: 'pointer', color: C.textTertiary,
          display: 'flex', alignItems: 'center',
        }}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 50,
          background: C.bgElevated, border: `1px solid ${C.border}`,
          borderRadius: 8, overflow: 'hidden', minWidth: 180,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <button
            onClick={onSetDefault}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 14px', background: 'transparent', border: 'none',
              color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
            }}
          >
            Establecer predeterminado
          </button>
          <button
            onClick={onDelete}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 14px', background: 'transparent', border: 'none',
              color: C.error, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
              borderTop: `1px solid ${C.border}`,
            }}
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

function CardMock({ gradient }: { gradient: string }) {
  return (
    <div style={{
      width: 48, height: 32, borderRadius: 5, flexShrink: 0,
      background: gradient,
      display: 'flex', alignItems: 'flex-end', padding: '4px 5px',
    }}>
      <div style={{ width: 10, height: 7, borderRadius: 1, background: 'rgba(255,255,255,0.4)' }} />
    </div>
  );
}

function PaymentMethodsTab() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const toggleMenu = (id: string) => setOpenMenu(prev => prev === id ? null : id);

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {/* Visa */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: C.bgRaised, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '14px 18px',
        }}>
          <CardMock gradient="linear-gradient(135deg,#1654d9 0%,#0a3494 100%)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.mono, fontSize: 13, color: C.textPrimary, marginBottom: 2 }}>Visa ···· 4242</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary }}>Vence 12/27</div>
          </div>
          <span style={{
            background: C.brandFaint, color: C.brand,
            fontFamily: F.mono, fontSize: 9, padding: '3px 7px', borderRadius: 5,
          }}>
            Predeterminado
          </span>
          <KebabMenu
            open={openMenu === 'visa'}
            onToggle={() => toggleMenu('visa')}
            onSetDefault={() => setOpenMenu(null)}
            onDelete={() => setOpenMenu(null)}
          />
        </div>

        {/* Mastercard */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: C.bgRaised, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '14px 18px',
        }}>
          <CardMock gradient="linear-gradient(135deg,#eb5d1e 0%,#c0351e 100%)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.mono, fontSize: 13, color: C.textPrimary, marginBottom: 2 }}>Mastercard ···· 9876</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary }}>Vence 03/28</div>
          </div>
          <KebabMenu
            open={openMenu === 'mc'}
            onToggle={() => toggleMenu('mc')}
            onSetDefault={() => setOpenMenu(null)}
            onDelete={() => setOpenMenu(null)}
          />
        </div>
      </div>

      {/* Add new */}
      <button style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: 'transparent', border: `1px dashed ${C.border}`,
        color: C.brand, fontFamily: F.body, fontSize: 13, fontWeight: 500,
        padding: '11px', borderRadius: 10, cursor: 'pointer', marginBottom: 16,
      }}>
        <Plus size={14} />
        Agregar método de pago
      </button>

      {/* Mercado Pago card */}
      <div style={{
        background: C.bgRaised, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#009EE3', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, color: '#fff' }}>MP</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 2 }}>
            Mercado Pago no vinculado
          </div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary }}>
            Pagá con tu cuenta de Mercado Pago
          </div>
        </div>
        <button style={{
          padding: '8px 16px', borderRadius: 8,
          border: 'none', background: C.brand,
          color: '#fff', fontFamily: F.body, fontWeight: 600, fontSize: 13, cursor: 'pointer',
        }}>
          Vincular cuenta
        </button>
      </div>
    </div>
  );
}

function InvoicesTab() {
  const [yearFilter, setYearFilter]     = useState('2026');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'pagada' | 'pendiente' | 'vencida'>('todas');
  const [page] = useState(1);
  const total = INVOICES.length;

  const filtered = INVOICES.filter(inv =>
    (statusFilter === 'todas' || inv.status === statusFilter) &&
    inv.date.includes(yearFilter === '2026' ? '2026' : '2025'),
  );

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 7,
    background: active ? C.bgElevated : 'transparent',
    border: active ? `1px solid ${C.border}` : '1px solid transparent',
    color: active ? C.textPrimary : C.textTertiary,
    fontFamily: F.body, fontSize: 13, cursor: 'pointer',
  });

  const selectStyle: React.CSSProperties = {
    background: C.bgElevated, border: `1px solid ${C.border}`,
    color: C.textSecondary, fontFamily: F.mono, fontSize: 12,
    padding: '6px 10px', borderRadius: 7, cursor: 'pointer',
    appearance: 'none' as const,
  };

  const thStyle: React.CSSProperties = {
    fontFamily: F.mono, fontSize: 10, color: C.textTertiary,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    padding: '10px 14px', textAlign: 'left',
    background: C.bgBase, borderBottom: `1px solid ${C.border}`,
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '11px 14px', verticalAlign: 'middle',
  };

  return (
    <div>
      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={selectStyle}>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>

        <div style={{ display: 'flex', gap: 4, background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 9, padding: 3 }}>
          {(['todas', 'pagada', 'pendiente', 'vencida'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={tabStyle(statusFilter === s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <button style={{
          marginLeft: 'auto',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 8,
          border: `1px solid ${C.border}`, background: 'transparent',
          color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
        }}>
          <Download size={13} />
          Exportar todo
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: C.bgRaised, border: `1px solid ${C.border}`,
        borderRadius: 12, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>N° Factura</th>
              <th style={thStyle}>Período</th>
              <th style={thStyle}>Monto</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>CAE AFIP</th>
              <th style={{ ...thStyle, textAlign: 'center' as const }}>PDF</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv, idx) => (
              <tr
                key={inv.number}
                style={{ background: idx % 2 === 0 ? C.bgRaised : C.bgBase, borderTop: `1px solid ${C.border}` }}
              >
                <td style={tdStyle}>
                  <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{inv.date}</span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary }}>{inv.number}</span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>{inv.period}</span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{inv.amount}</span>
                </td>
                <td style={tdStyle}>
                  <StatusBadge status={inv.status} />
                </td>
                <td style={tdStyle}>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary }}>{inv.cae}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' as const }}>
                  <button style={{
                    background: 'transparent', border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
                    color: C.textSecondary, display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                    <Download size={12} />
                    <span style={{ fontFamily: F.mono, fontSize: 10 }}>PDF</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderTop: `1px solid ${C.border}`,
          background: C.bgBase,
        }}>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textTertiary }}>
            1–{filtered.length} de {filtered.length}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled style={{
              padding: '5px 12px', borderRadius: 7,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.textTertiary, fontFamily: F.body, fontSize: 12,
              cursor: 'default', opacity: 0.4,
            }}>
              ← Anterior
            </button>
            <button disabled style={{
              padding: '5px 12px', borderRadius: 7,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.textTertiary, fontFamily: F.body, fontSize: 12,
              cursor: 'default', opacity: 0.4,
            }}>
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentSection() {
  const [activeTab, setActiveTab] = useState<'methods' | 'invoices'>('methods');

  const tabBtn = (tab: 'methods' | 'invoices', label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        padding: '8px 18px', borderRadius: 8,
        background: activeTab === tab ? C.bgElevated : 'transparent',
        border: activeTab === tab ? `1px solid ${C.border}` : '1px solid transparent',
        color: activeTab === tab ? C.textPrimary : C.textTertiary,
        fontFamily: F.body, fontWeight: activeTab === tab ? 600 : 400, fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <section style={{ marginBottom: 40 }}>
      {/* Tab switcher */}
      <div style={{
        display: 'flex', gap: 4,
        background: C.bgRaised, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 4, width: 'fit-content',
        marginBottom: 20,
      }}>
        {tabBtn('methods', 'Métodos de pago')}
        {tabBtn('invoices', 'Facturas')}
      </div>

      {activeTab === 'methods' ? <PaymentMethodsTab /> : <InvoicesTab />}
    </section>
  );
}

/* ─── Section D: Zona de peligro ───────────────────────────── */

function DangerZone() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section style={{ marginBottom: 40 }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          background: 'transparent', border: `1px solid ${C.border}`,
          borderRadius: expanded ? '12px 12px 0 0' : 12,
          padding: '14px 18px', cursor: 'pointer',
          color: C.textSecondary,
        }}
      >
        <AlertTriangle size={15} color={C.error} />
        <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 14, color: C.textSecondary, flex: 1, textAlign: 'left' }}>
          Zona de peligro
        </span>
        {expanded
          ? <ChevronUp size={15} color={C.textTertiary} />
          : <ChevronDown size={15} color={C.textTertiary} />
        }
      </button>

      {expanded && (
        <div style={{
          background: C.bgRaised,
          border: `1px solid ${C.border}`, borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          padding: '20px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: '0 0 6px' }}>
                Cancelar suscripción
              </h3>
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, margin: 0, lineHeight: 1.55 }}>
                Al cancelar, tu cuenta pasará al plan gratuito al final del ciclo de facturación.
                Tus datos se conservan durante 30 días.
              </p>
            </div>
            <button style={{
              padding: '9px 18px', borderRadius: 9,
              border: `1px solid ${C.error}`,
              background: 'transparent',
              color: C.error, fontFamily: F.body, fontWeight: 600, fontSize: 13,
              cursor: 'pointer', flexShrink: 0,
            }}>
              Cancelar suscripción
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

export default function BillingPage() {
  const [showBanner, setShowBanner] = useState(true);

  return (
    <div style={{
      background: C.bgBase,
      minHeight: '100vh',
      padding: '32px 36px',
      maxWidth: 1100,
      margin: '0 auto',
      fontFamily: F.body,
      color: C.textPrimary,
      boxSizing: 'border-box',
    }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: F.display, fontSize: 26, fontWeight: 700,
          color: C.textPrimary, margin: '0 0 6px', letterSpacing: '-0.02em',
        }}>
          Facturación
        </h1>
        <p style={{ fontFamily: F.body, fontSize: 14, color: C.textTertiary, margin: 0 }}>
          Administrá tu suscripción, métodos de pago y facturas.
        </p>
      </div>

      {/* Trial banner */}
      {showBanner && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          marginBottom: 24,
          background: 'rgba(232,138,20,0.10)',
          borderLeft: `4px solid ${C.warning}`,
          borderRadius: '0 10px 10px 0',
          padding: '13px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={16} color={C.warning} style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, flex: 1 }}>
            Período de prueba activo — 12 días restantes. Suscribite para no perder el acceso.
          </span>
          <button style={{
            background: 'transparent', border: 'none',
            color: C.brand, fontFamily: F.body, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', marginRight: 8, padding: 0,
          }}>
            Ver planes
          </button>
          <button
            onClick={() => setShowBanner(false)}
            style={{
              background: 'transparent', border: 'none',
              color: C.textTertiary, cursor: 'pointer', padding: 2,
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <CurrentSubscription />
      <PlanComparison />
      <PaymentSection />
      <DangerZone />
    </div>
  );
}
