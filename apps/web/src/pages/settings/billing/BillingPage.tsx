import React, { useState } from 'react';
import { C, F } from '../../../components/copilot/tokens.js';

/* ─── Types ──────────────────────────────────────────────────────── */

type PlanCode = 'solo' | 'agencia' | 'pro' | 'empresa';
type BillingCycle = 'monthly' | 'annual';
type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled';
type UpgradeStep = 'plan' | 'payment' | 'success';

interface Plan {
  code: PlanCode;
  label: string;
  priceMonthly: number | null;
  priceAnnual: number | null;
  users: string;
  properties: string;
  portals: string;
  ai: string;
  site: string;
  reports: string;
  afip: boolean;
  support: string;
}

interface PaymentMethod {
  id: string;
  type: 'stripe' | 'mercadopago';
  label: string;
  detail: string;
  isPrimary: boolean;
}

interface Invoice {
  id: string;
  date: string;
  period: string;
  amount: string;
  status: 'paid' | 'pending' | 'overdue';
  cae: string;
}

/* ─── Mock data ──────────────────────────────────────────────────── */

const PLANS: Plan[] = [
  {
    code: 'solo', label: 'Solo', priceMonthly: 12, priceAnnual: 10,
    users: '1', properties: '50', portals: '1', ai: '—',
    site: 'Subdominio', reports: 'Básicos', afip: false, support: 'Email',
  },
  {
    code: 'agencia', label: 'Agencia', priceMonthly: 45, priceAnnual: 36,
    users: 'hasta 10', properties: '500', portals: '3', ai: 'Básica',
    site: 'Dom. propio', reports: 'Básicos', afip: true, support: 'Email',
  },
  {
    code: 'pro', label: 'Pro', priceMonthly: 120, priceAnnual: 96,
    users: 'hasta 30', properties: 'Sin límite', portals: 'Sin límite', ai: 'Avanzada',
    site: 'Dom. propio', reports: 'Todos', afip: true, support: 'Prioritario',
  },
  {
    code: 'empresa', label: 'Empresa', priceMonthly: null, priceAnnual: null,
    users: 'Sin límite', properties: 'Sin límite', portals: 'Sin límite', ai: 'Avanzada',
    site: 'Dom. + CDN', reports: 'Todos + API', afip: true, support: 'Dedicado',
  },
];

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm1', type: 'stripe', label: 'Visa', detail: '****4242  · vence 12/27', isPrimary: true },
  { id: 'pm2', type: 'mercadopago', label: 'Mercado Pago', detail: 'gerencia@agencia.com', isPrimary: false },
];

const INVOICES: Invoice[] = [
  { id: 'inv3', date: '15/04/2026', period: 'Abr 2026', amount: '$120 USD', status: 'paid', cae: '73291048' },
  { id: 'inv2', date: '15/03/2026', period: 'Mar 2026', amount: '$120 USD', status: 'paid', cae: '73201947' },
  { id: 'inv1', date: '15/02/2026', period: 'Feb 2026', amount: '$120 USD', status: 'paid', cae: '72983421' },
];

const CURRENT_PLAN: PlanCode = 'pro';
const TRIAL_DAYS_LEFT: number | null = null; // set to number during trial

/* ─── Sub-components ─────────────────────────────────────────────── */

function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const urgent = daysLeft <= 3;
  const lastDay = daysLeft === 1;

  let message = `Período de prueba activo · Te quedan ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`;
  if (lastDay) message = '¡Último día! 50% off los primeros 3 meses si te suscribís hoy.';
  else if (daysLeft <= 5) message = `Faltan ${daysLeft} días · No pierdas el acceso a tus datos.`;

  return (
    <div style={{
      background: urgent ? `rgba(232,58,59,0.1)` : `rgba(232,138,20,0.1)`,
      border: `1px solid ${urgent ? C.warning : C.warning}`,
      borderRadius: 8, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
    }}>
      <span style={{ fontSize: 18 }}>⚡</span>
      <span style={{ fontFamily: F.body, color: C.textPrimary, flex: 1, fontSize: 14 }}>
        {message}
      </span>
      <button style={{
        background: C.warning, color: '#fff', border: 'none',
        borderRadius: 6, padding: '6px 14px', fontFamily: F.body, fontSize: 13,
        fontWeight: 600, cursor: 'pointer',
      }}>
        {lastDay ? 'Aprovechar oferta' : 'Suscribirme ahora'}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Cerrar banner de prueba"
        style={{ background: 'none', border: 'none', color: C.textTertiary, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  );
}

function CurrentPlanCard({ onChangePlan }: { onChangePlan: () => void }) {
  const plan = PLANS.find(p => p.code === CURRENT_PLAN)!;
  return (
    <div style={{
      background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: 24, marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.textPrimary }}>
              Plan {plan.label}
            </span>
            <span style={{
              background: C.successFaint, color: C.success, borderRadius: 99,
              padding: '2px 10px', fontSize: 12, fontFamily: F.body, fontWeight: 600,
            }}>
              ✅ Activo
            </span>
          </div>
          <span style={{ fontFamily: F.mono, fontSize: 13, color: C.textSecondary }}>
            Próximo cobro: <strong style={{ color: C.textPrimary }}>$120 USD</strong> el 15 de mayo de 2026
          </span>
        </div>
        <button onClick={onChangePlan} style={{
          background: C.brandFaint, color: C.brand, border: `1px solid ${C.brand}`,
          borderRadius: 8, padding: '8px 16px', fontFamily: F.body, fontSize: 13,
          fontWeight: 600, cursor: 'pointer',
        }}>
          Cambiar plan
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
          Método de pago:
        </span>
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary }}>
          💳 Visa ****4242
        </span>
        <button style={{
          background: 'none', border: 'none', color: C.brand, fontFamily: F.body,
          fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
        }}>
          Cambiar método
        </button>
      </div>

      {/* Usage meters */}
      <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
        {[
          { label: 'Usuarios', value: 8, max: 30, unit: '' },
          { label: 'Propiedades', value: 312, max: Infinity, unit: '' },
          { label: 'Portales activos', value: 3, max: Infinity, unit: '' },
        ].map(m => {
          const pct = m.max === Infinity ? 0 : Math.round((m.value / m.max) * 100);
          const barColor = pct >= 100 ? '#E83B3B' : pct >= 80 ? C.warning : C.brand;
          return (
            <div key={m.label} style={{
              flex: 1, background: C.bgElevated, borderRadius: 10, padding: 14,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginBottom: 6 }}>
                {m.label}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 18, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
                {m.value}{m.max !== Infinity ? ` / ${m.max}` : ''}
              </div>
              {m.max !== Infinity && (
                <div style={{ height: 4, background: C.bgBase, borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlanComparisonTable({ cycle, setCycle, onSelectPlan }: {
  cycle: BillingCycle;
  setCycle: (c: BillingCycle) => void;
  onSelectPlan: (p: PlanCode) => void;
}) {
  const ROWS: { label: string; key: keyof Plan }[] = [
    { label: 'Usuarios', key: 'users' },
    { label: 'Propiedades', key: 'properties' },
    { label: 'Portales', key: 'portals' },
    { label: 'IA Copilot', key: 'ai' },
    { label: 'Sitio web', key: 'site' },
    { label: 'Reportes', key: 'reports' },
    { label: 'Facturación AFIP', key: 'afip' },
    { label: 'Soporte', key: 'support' },
  ];

  return (
    <div style={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
          Cambiá de plan
        </h3>
        <div style={{ display: 'flex', background: C.bgElevated, borderRadius: 8, padding: 3, gap: 2 }}>
          {(['monthly', 'annual'] as BillingCycle[]).map(c => (
            <button key={c} onClick={() => setCycle(c)} style={{
              padding: '5px 14px', border: 'none', borderRadius: 6, cursor: 'pointer',
              fontFamily: F.body, fontSize: 13, fontWeight: 500,
              background: cycle === c ? C.brand : 'transparent',
              color: cycle === c ? '#fff' : C.textSecondary,
            }}>
              {c === 'monthly' ? 'Mensual' : 'Anual −20%'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: F.body }}>
          <thead>
            <tr>
              <th style={{ width: 140, textAlign: 'left', padding: '8px 12px', color: C.textTertiary, fontSize: 12 }} />
              {PLANS.map(p => (
                <th key={p.code} style={{
                  padding: '8px 12px', textAlign: 'center',
                  border: p.code === CURRENT_PLAN ? `2px solid ${C.brand}` : `1px solid ${C.border}`,
                  borderBottom: 'none',
                  borderRadius: p.code === CURRENT_PLAN ? '8px 8px 0 0' : 0,
                  background: p.code === CURRENT_PLAN ? C.brandFaint : 'transparent',
                }}>
                  <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.textPrimary }}>{p.label}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
                    {p.priceMonthly
                      ? `$${cycle === 'monthly' ? p.priceMonthly : p.priceAnnual}/mes`
                      : 'Consultar'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={row.key} style={{ background: i % 2 === 0 ? 'transparent' : `rgba(255,255,255,0.01)` }}>
                <td style={{ padding: '9px 12px', color: C.textSecondary, fontSize: 13, borderTop: `1px solid ${C.border}` }}>
                  {row.label}
                </td>
                {PLANS.map(p => {
                  const val = p[row.key];
                  const display = typeof val === 'boolean'
                    ? (val ? <span style={{ color: C.success }}>✓</span> : <span style={{ color: C.textTertiary }}>—</span>)
                    : val;
                  return (
                    <td key={p.code} style={{
                      padding: '9px 12px', textAlign: 'center', fontSize: 13,
                      color: C.textPrimary,
                      borderTop: `1px solid ${C.border}`,
                      borderLeft: p.code === CURRENT_PLAN ? `2px solid ${C.brand}` : `1px solid ${C.border}`,
                      borderRight: p.code === CURRENT_PLAN ? `2px solid ${C.brand}` : `1px solid ${C.border}`,
                      background: p.code === CURRENT_PLAN ? C.brandFaint : 'transparent',
                    }}>
                      {display as React.ReactNode}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td style={{ padding: '12px', borderTop: `1px solid ${C.border}` }} />
              {PLANS.map(p => (
                <td key={p.code} style={{
                  padding: '12px', textAlign: 'center',
                  borderTop: `1px solid ${C.border}`,
                  borderLeft: p.code === CURRENT_PLAN ? `2px solid ${C.brand}` : `1px solid ${C.border}`,
                  borderRight: p.code === CURRENT_PLAN ? `2px solid ${C.brand}` : `1px solid ${C.border}`,
                  borderBottom: p.code === CURRENT_PLAN ? `2px solid ${C.brand}` : `1px solid ${C.border}`,
                  borderRadius: p.code === CURRENT_PLAN ? '0 0 8px 8px' : 0,
                  background: p.code === CURRENT_PLAN ? C.brandFaint : 'transparent',
                }}>
                  {p.code === CURRENT_PLAN ? (
                    <span style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, fontStyle: 'italic' }}>
                      Plan actual
                    </span>
                  ) : p.code === 'empresa' ? (
                    <button onClick={() => window.open('mailto:sales@corredor.app')} style={{
                      background: 'none', border: `1px solid ${C.border}`, color: C.textSecondary,
                      borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: F.body, fontSize: 13,
                    }}>
                      Contactar
                    </button>
                  ) : (
                    <button onClick={() => onSelectPlan(p.code)} style={{
                      background: p.code === 'pro' ? C.brand : C.brandFaint,
                      color: p.code === 'pro' ? '#fff' : C.brand,
                      border: `1px solid ${C.brand}`,
                      borderRadius: 6, padding: '6px 14px', cursor: 'pointer',
                      fontFamily: F.body, fontSize: 13, fontWeight: 600,
                    }}>
                      {PLANS.indexOf(p) > PLANS.findIndex(x => x.code === CURRENT_PLAN) ? 'Actualizar' : 'Bajar'}
                    </button>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentMethodsSection() {
  const [methods, setMethods] = useState(PAYMENT_METHODS);

  function setPrimary(id: string) {
    setMethods(m => m.map(pm => ({ ...pm, isPrimary: pm.id === id })));
  }

  return (
    <div style={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
          Métodos de pago
        </h3>
        <button style={{
          background: C.brandFaint, color: C.brand, border: `1px solid ${C.brand}`,
          borderRadius: 8, padding: '6px 14px', fontFamily: F.body, fontSize: 13,
          fontWeight: 600, cursor: 'pointer',
        }}>
          + Agregar método
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {methods.map(pm => (
          <div key={pm.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: C.bgElevated, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '12px 16px',
          }}>
            <span style={{ fontSize: 20 }}>{pm.type === 'stripe' ? '💳' : '🇦🇷'}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: F.body, fontSize: 14, color: C.textPrimary, fontWeight: 500 }}>
                {pm.label}
              </span>
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary, marginLeft: 10 }}>
                {pm.detail}
              </span>
            </div>
            {pm.isPrimary ? (
              <span style={{
                background: C.successFaint, color: C.success, borderRadius: 99,
                padding: '2px 10px', fontSize: 12, fontFamily: F.body, fontWeight: 600,
              }}>
                ★ Principal
              </span>
            ) : (
              <button onClick={() => setPrimary(pm.id)} style={{
                background: 'none', border: 'none', color: C.brand, fontFamily: F.body,
                fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
              }}>
                Usar como principal
              </button>
            )}
            <button style={{
              background: 'none', border: 'none', color: C.textTertiary,
              cursor: methods.length === 1 ? 'not-allowed' : 'pointer',
              opacity: methods.length === 1 ? 0.4 : 1, fontSize: 16,
            }}
              disabled={methods.length === 1}
              title={methods.length === 1 ? 'Necesitás al menos un método de pago' : 'Eliminar método'}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvoiceHistory() {
  function statusStyle(s: Invoice['status']) {
    if (s === 'paid') return { color: C.success, bg: C.successFaint, label: '✅ Pagada' };
    if (s === 'pending') return { color: C.warning, bg: 'rgba(232,138,20,0.12)', label: '⏳ Pendiente' };
    return { color: '#E83B3B', bg: 'rgba(232,58,59,0.12)', label: '⚠️ Vencida' };
  }

  return (
    <div style={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
      <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: '0 0 16px' }}>
        Historial de facturas
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: F.body }}>
        <thead>
          <tr>
            {['Fecha', 'Período', 'Monto', 'Estado', 'CAE AFIP', 'Factura'].map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: '8px 12px',
                fontFamily: F.mono, fontSize: 11, color: C.textTertiary,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                borderBottom: `1px solid ${C.border}`,
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INVOICES.map(inv => {
            const st = statusStyle(inv.status);
            return (
              <tr key={inv.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 12px', color: C.textSecondary, fontSize: 13 }}>{inv.date}</td>
                <td style={{ padding: '10px 12px', color: C.textPrimary, fontSize: 13 }}>{inv.period}</td>
                <td style={{ padding: '10px 12px', fontFamily: F.mono, fontSize: 13, color: C.textPrimary }}>{inv.amount}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    background: st.bg, color: st.color, borderRadius: 99,
                    padding: '2px 8px', fontSize: 12, fontWeight: 600,
                  }}>
                    {st.label}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', fontFamily: F.mono, fontSize: 12, color: C.textTertiary }}>{inv.cae}</td>
                <td style={{ padding: '10px 12px' }}>
                  <button style={{
                    background: 'none', border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                    fontFamily: F.body, fontSize: 12, color: C.textSecondary,
                  }}>
                    📄 PDF
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UpgradeWizard({ targetPlan, cycle, onClose }: {
  targetPlan: PlanCode;
  cycle: BillingCycle;
  onClose: () => void;
}) {
  const [step, setStep] = useState<UpgradeStep>('plan');
  const [paymentType, setPaymentType] = useState<'stripe' | 'mp'>('stripe');
  const plan = PLANS.find(p => p.code === targetPlan)!;
  const price = cycle === 'monthly' ? plan.priceMonthly : plan.priceAnnual;
  const isUpgrade = PLANS.indexOf(plan) > PLANS.findIndex(p => p.code === CURRENT_PLAN);

  const STEPS: { key: UpgradeStep; label: string }[] = [
    { key: 'plan', label: 'Confirmá el plan' },
    { key: 'payment', label: 'Método de pago' },
    { key: 'success', label: '¡Listo!' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(7,13,26,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div style={{
        background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 16,
        width: '100%', maxWidth: 520, padding: 32, position: 'relative',
      }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {STEPS.map((s, i) => {
            const done = STEPS.indexOf(STEPS.find(x => x.key === step)!) > i;
            const active = s.key === step;
            return (
              <React.Fragment key={s.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                    background: done ? C.success : active ? C.brand : C.bgElevated,
                    color: (done || active) ? '#fff' : C.textTertiary,
                    border: `2px solid ${done ? C.success : active ? C.brand : C.border}`,
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{
                    fontFamily: F.body, fontSize: 13,
                    color: active ? C.textPrimary : C.textTertiary,
                    fontWeight: active ? 600 : 400,
                  }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 1, alignSelf: 'center', background: C.border }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {step === 'plan' && (
          <>
            <h3 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 16 }}>
              {isUpgrade ? `Actualizar a ${plan.label}` : `Cambiar a ${plan.label}`}
            </h3>
            <div style={{ background: C.bgElevated, borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: F.body, color: C.textSecondary }}>Plan {plan.label}</span>
                <span style={{ fontFamily: F.mono, fontSize: 20, fontWeight: 700, color: C.textPrimary }}>
                  ${price} USD/mes
                </span>
              </div>
              {cycle === 'annual' && (
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.success, marginTop: 4 }}>
                  ✓ Ahorrás 20% con facturación anual
                </div>
              )}
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginBottom: 20 }}>
              Al suscribirte, aceptás los{' '}
              <a href="/legal/terms" style={{ color: C.brand }}>términos de servicio</a>.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={onClose} style={{
                flex: 1, background: 'none', border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '10px 16px', color: C.textSecondary,
                fontFamily: F.body, cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button onClick={() => setStep('payment')} style={{
                flex: 2, background: C.brand, color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 16px', fontFamily: F.body,
                fontWeight: 600, cursor: 'pointer', fontSize: 14,
              }}>
                Continuar →
              </button>
            </div>
          </>
        )}

        {step === 'payment' && (
          <>
            <h3 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 16 }}>
              Método de pago
            </h3>
            {[
              { key: 'stripe' as const, icon: '💳', label: 'Tarjeta de crédito (Stripe)', desc: '' },
              { key: 'mp' as const, icon: '🇦🇷', label: 'Mercado Pago (ARS)', desc: 'Serás redirigido a Mercado Pago.' },
            ].map(opt => (
              <div key={opt.key} onClick={() => setPaymentType(opt.key)} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                background: paymentType === opt.key ? C.brandFaint : C.bgElevated,
                border: `1px solid ${paymentType === opt.key ? C.brand : C.border}`,
                borderRadius: 10, padding: 14, marginBottom: 12, cursor: 'pointer',
              }}>
                <input type="radio" checked={paymentType === opt.key} readOnly style={{ marginTop: 2 }} />
                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                <div>
                  <div style={{ fontFamily: F.body, fontSize: 14, color: C.textPrimary, fontWeight: 500 }}>
                    {opt.label}
                  </div>
                  {opt.desc && <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{opt.desc}</div>}
                </div>
              </div>
            ))}

            {paymentType === 'stripe' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {[
                  { placeholder: '4242 4242 4242 4242', label: 'Número de tarjeta' },
                  { placeholder: 'MM/AA', label: 'Vencimiento' },
                  { placeholder: 'CVC', label: 'Código de seguridad' },
                  { placeholder: 'Nombre en la tarjeta', label: 'Nombre' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, display: 'block', marginBottom: 4 }}>
                      {f.label}
                    </label>
                    <input placeholder={f.placeholder} style={{
                      width: '100%', background: C.bgElevated, border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: '10px 12px', color: C.textPrimary,
                      fontFamily: F.mono, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }} />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep('plan')} style={{
                background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '10px 16px', color: C.textSecondary, fontFamily: F.body, cursor: 'pointer',
              }}>
                ← Atrás
              </button>
              <button onClick={() => setStep('success')} style={{
                flex: 1, background: C.brand, color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 16px', fontFamily: F.body,
                fontWeight: 600, cursor: 'pointer', fontSize: 14,
              }}>
                Confirmar y suscribirme → ${price} USD/mes
              </button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
              ¡Suscripción activada!
            </h3>
            <p style={{ fontFamily: F.body, color: C.textSecondary, marginBottom: 4 }}>
              Ya tenés acceso completo al plan <strong style={{ color: C.textPrimary }}>{plan.label}</strong>.
            </p>
            <p style={{ fontFamily: F.body, color: C.textSecondary, marginBottom: 4, fontSize: 13 }}>
              Tu próxima factura será el 15 de junio de 2026.
            </p>
            <p style={{ fontFamily: F.body, color: C.textTertiary, fontSize: 13, marginBottom: 28 }}>
              La factura AFIP fue enviada a tu email.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={onClose} style={{
                background: C.brandFaint, color: C.brand, border: `1px solid ${C.brand}`,
                borderRadius: 8, padding: '10px 20px', fontFamily: F.body, fontWeight: 600, cursor: 'pointer',
              }}>
                Ir a mis reportes
              </button>
              <button onClick={onClose} style={{
                background: C.brand, color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 20px', fontFamily: F.body, fontWeight: 600, cursor: 'pointer',
              }}>
                Configurar mi sitio web
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */

export default function BillingPage() {
  const [showComparison, setShowComparison] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [upgradePlan, setUpgradePlan] = useState<PlanCode | null>(null);

  function handleSelectPlan(code: PlanCode) {
    setUpgradePlan(code);
    setShowComparison(false);
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bgBase, padding: '32px 40px',
      fontFamily: F.body,
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: F.display, fontSize: 26, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
            Facturación y suscripción
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: '4px 0 0' }}>
            Administrá tu plan, métodos de pago y facturas AFIP.
          </p>
        </div>

        {/* Trial Banner */}
        {TRIAL_DAYS_LEFT !== null && <TrialBanner daysLeft={TRIAL_DAYS_LEFT} />}

        {/* Current Plan */}
        <CurrentPlanCard onChangePlan={() => setShowComparison(v => !v)} />

        {/* Plan Comparison (expandable) */}
        {showComparison && (
          <PlanComparisonTable
            cycle={billingCycle}
            setCycle={setBillingCycle}
            onSelectPlan={handleSelectPlan}
          />
        )}

        {/* Payment Methods */}
        <PaymentMethodsSection />

        {/* Invoice History */}
        <InvoiceHistory />

        {/* Cancel subscription */}
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button style={{
            background: 'none', border: 'none', color: C.textTertiary,
            fontFamily: F.body, fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
          }}>
            Cancelar suscripción
          </button>
        </div>
      </div>

      {/* Upgrade wizard overlay */}
      {upgradePlan && (
        <UpgradeWizard
          targetPlan={upgradePlan}
          cycle={billingCycle}
          onClose={() => setUpgradePlan(null)}
        />
      )}
    </div>
  );
}
