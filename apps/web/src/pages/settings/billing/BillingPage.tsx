import React, { useState } from 'react';
import { C, F } from '../../../components/copilot/tokens.js';

/* ─── Types ──────────────────────────────────────────────────────── */

type TabKey = 'plan' | 'pago' | 'facturas' | 'fiscal' | 'cancelar';
type PlanCode = 'solo' | 'agencia' | 'pro' | 'empresa';
type BillingCycle = 'monthly' | 'annual';
type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
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
  year: number;
  amount: string;
  currency: string;
  status: 'paid' | 'pending' | 'overdue';
  cae: string;
}

interface FiscalData {
  cuit: string;
  razonSocial: string;
  condicionFiscal: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

/* ─── Tab definitions ────────────────────────────────────────────── */

const TABS: { key: TabKey; label: string }[] = [
  { key: 'plan', label: 'Plan' },
  { key: 'pago', label: 'Pago' },
  { key: 'facturas', label: 'Facturas' },
  { key: 'fiscal', label: 'Datos fiscales' },
  { key: 'cancelar', label: 'Cancelar' },
];

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
  { id: 'inv6', date: '15/04/2026', period: 'Abr 2026', year: 2026, amount: '$120', currency: 'USD', status: 'paid', cae: '73291048' },
  { id: 'inv5', date: '15/03/2026', period: 'Mar 2026', year: 2026, amount: '$120', currency: 'USD', status: 'paid', cae: '73201947' },
  { id: 'inv4', date: '15/02/2026', period: 'Feb 2026', year: 2026, amount: '$120', currency: 'USD', status: 'paid', cae: '72983421' },
  { id: 'inv3', date: '15/01/2026', period: 'Ene 2026', year: 2026, amount: '$120', currency: 'USD', status: 'paid', cae: '72871029' },
  { id: 'inv2', date: '15/12/2025', period: 'Dic 2025', year: 2025, amount: '$120', currency: 'USD', status: 'paid', cae: '72501823' },
  { id: 'inv1', date: '15/11/2025', period: 'Nov 2025', year: 2025, amount: '$120', currency: 'USD', status: 'paid', cae: '72310194' },
];

const CURRENT_PLAN: PlanCode = 'pro';
const SUBSCRIPTION_STATUS: SubscriptionStatus = 'active';
const TRIAL_DAYS_LEFT: number | null = null;

const FISCAL_CONDITION_OPTIONS = [
  'Responsable Inscripto',
  'Monotributista',
  'Exento',
  'Consumidor Final',
];

const CANCEL_REASONS = [
  'Ya no necesito el servicio',
  'Es muy caro para mi negocio',
  'No tiene las funciones que necesito',
  'Problemas técnicos frecuentes',
  'Me mudo a otra plataforma',
  'Otro',
];

/* ─── Shared styles ──────────────────────────────────────────────── */

const cardStyle: React.CSSProperties = {
  background: C.bgRaised, border: `1px solid ${C.border}`,
  borderRadius: 12, padding: 24,
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: C.bgElevated, border: `1px solid ${C.border}`,
  borderRadius: 8, padding: '10px 12px', color: C.textPrimary,
  fontFamily: F.body, fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontFamily: F.body, fontSize: 13, color: C.textSecondary,
  display: 'block', marginBottom: 6, fontWeight: 500,
};

const primaryBtn: React.CSSProperties = {
  background: C.brand, color: '#fff', border: 'none',
  borderRadius: 8, padding: '10px 20px', fontFamily: F.body,
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  background: 'none', border: `1px solid ${C.border}`,
  borderRadius: 8, padding: '10px 20px', color: C.textSecondary,
  fontFamily: F.body, fontSize: 14, cursor: 'pointer',
};

const dangerBtn: React.CSSProperties = {
  background: 'rgba(232,58,59,0.12)', color: '#E83B3B',
  border: '1px solid rgba(232,58,59,0.25)',
  borderRadius: 8, padding: '10px 20px', fontFamily: F.body,
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
};

/* ─── Trial Banner ───────────────────────────────────────────────── */

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
      background: urgent ? 'rgba(232,58,59,0.1)' : 'rgba(232,138,20,0.1)',
      border: `1px solid ${urgent ? '#E83B3B' : C.warning}`,
      borderRadius: 8, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
    }}>
      <span style={{ fontSize: 18 }}>{urgent ? '⚠️' : '⚡'}</span>
      <span style={{ fontFamily: F.body, color: C.textPrimary, flex: 1, fontSize: 14 }}>
        {message}
      </span>
      <button style={{
        background: urgent ? '#E83B3B' : C.warning, color: '#fff', border: 'none',
        borderRadius: 6, padding: '6px 14px', fontFamily: F.body, fontSize: 13,
        fontWeight: 600, cursor: 'pointer',
      }}>
        {lastDay ? 'Aprovechar oferta' : 'Elegir plan'}
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

/* ─── Tab: Plan ──────────────────────────────────────────────────── */

function UsageMeter({ label, value, max }: { label: string; value: number; max: number }) {
  const unlimited = max === Infinity;
  const pct = unlimited ? 0 : Math.round((value / max) * 100);
  const barColor = pct >= 95 ? '#E83B3B' : pct >= 80 ? C.warning : C.brand;

  return (
    <div style={{
      flex: 1, background: C.bgElevated, borderRadius: 10, padding: 14,
      border: `1px solid ${C.border}`, minWidth: 140,
    }}>
      <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 18, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
        {value}{!unlimited ? ` / ${max}` : ''}
      </div>
      {!unlimited && (
        <>
          <div style={{ height: 4, background: C.bgBase, borderRadius: 2 }}>
            <div style={{
              height: '100%', width: `${Math.min(pct, 100)}%`,
              background: barColor, borderRadius: 2, transition: 'width 0.4s ease',
            }} />
          </div>
          {pct >= 80 && (
            <div style={{
              fontFamily: F.body, fontSize: 11, marginTop: 4,
              color: pct >= 95 ? '#E83B3B' : C.warning,
            }}>
              {pct >= 95 ? 'Límite casi alcanzado' : `${pct}% utilizado`}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CurrentPlanCard({ onChangePlan }: { onChangePlan: () => void }) {
  const plan = PLANS.find(p => p.code === CURRENT_PLAN)!;
  return (
    <div style={{ ...cardStyle, marginBottom: 24 }}>
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
              Activo
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 20 }}>
        <UsageMeter label="Usuarios" value={8} max={30} />
        <UsageMeter label="Propiedades" value={312} max={Infinity} />
        <UsageMeter label="Portales activos" value={3} max={Infinity} />
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
    <div style={{ ...cardStyle, marginBottom: 24 }}>
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
              {c === 'monthly' ? 'Mensual' : 'Anual · 2 meses gratis'}
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
              <tr key={row.key} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
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
                    <button onClick={() => window.open('https://wa.me/5491155551234?text=Hola,%20quiero%20info%20sobre%20el%20plan%20Empresa', '_blank')} style={{
                      background: 'none', border: `1px solid ${C.border}`, color: C.textSecondary,
                      borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: F.body, fontSize: 13,
                    }}>
                      Contactar
                    </button>
                  ) : (
                    <button onClick={() => onSelectPlan(p.code)} style={{
                      background: PLANS.indexOf(p) > PLANS.findIndex(x => x.code === CURRENT_PLAN) ? C.brand : C.brandFaint,
                      color: PLANS.indexOf(p) > PLANS.findIndex(x => x.code === CURRENT_PLAN) ? '#fff' : C.brand,
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

function PlanTab({ onOpenUpgrade }: { onOpenUpgrade: (plan: PlanCode) => void }) {
  const [showComparison, setShowComparison] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  return (
    <>
      <CurrentPlanCard onChangePlan={() => setShowComparison(v => !v)} />
      {showComparison && (
        <PlanComparisonTable
          cycle={billingCycle}
          setCycle={setBillingCycle}
          onSelectPlan={(code) => { onOpenUpgrade(code); setShowComparison(false); }}
        />
      )}
    </>
  );
}

/* ─── Tab: Pago ──────────────────────────────────────────────────── */

function PagoTab() {
  const [methods, setMethods] = useState(PAYMENT_METHODS);

  function setPrimary(id: string) {
    setMethods(m => m.map(pm => ({ ...pm, isPrimary: pm.id === id })));
  }

  function removeMethod(id: string) {
    if (methods.length <= 1) return;
    setMethods(m => m.filter(pm => pm.id !== id));
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            Métodos de pago
          </h3>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, margin: '4px 0 0' }}>
            Administrá tus tarjetas y cuentas vinculadas.
          </p>
        </div>
        <button style={{
          background: C.brandFaint, color: C.brand, border: `1px solid ${C.brand}`,
          borderRadius: 8, padding: '8px 16px', fontFamily: F.body, fontSize: 13,
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
            borderRadius: 10, padding: '14px 16px',
          }}>
            <span style={{ fontSize: 22, width: 32, textAlign: 'center' }}>
              {pm.type === 'stripe' ? '💳' : '🇦🇷'}
            </span>
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
            <button
              onClick={() => removeMethod(pm.id)}
              disabled={methods.length === 1}
              title={methods.length === 1 ? 'Necesitás al menos un método de pago' : 'Eliminar método'}
              style={{
                background: 'none', border: 'none', color: C.textTertiary,
                cursor: methods.length === 1 ? 'not-allowed' : 'pointer',
                opacity: methods.length === 1 ? 0.4 : 1, fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginTop: 16, lineHeight: 1.5 }}>
        Los pagos con tarjeta son procesados por Stripe. La información de tu tarjeta nunca se almacena en nuestros servidores.
      </p>
    </div>
  );
}

/* ─── Tab: Facturas ──────────────────────────────────────────────── */

function FacturasTab() {
  const years = [...new Set(INVOICES.map(i => i.year))].sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  const filtered = selectedYear === 'all'
    ? INVOICES
    : INVOICES.filter(i => i.year === selectedYear);

  function statusStyle(s: Invoice['status']) {
    if (s === 'paid') return { color: C.success, bg: C.successFaint, label: 'Pagada' };
    if (s === 'pending') return { color: C.warning, bg: 'rgba(232,138,20,0.12)', label: 'Pendiente' };
    return { color: '#E83B3B', bg: 'rgba(232,58,59,0.12)', label: 'Vencida' };
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            Historial de facturas
          </h3>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, margin: '4px 0 0' }}>
            Descargará facturas electrónicas con CAE AFIP.
          </p>
        </div>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          style={{
            ...inputStyle, width: 'auto', minWidth: 120,
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238DA0C0' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            paddingRight: 32,
          }}
        >
          <option value="all">Todos los años</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{
                  padding: '32px 12px', textAlign: 'center',
                  color: C.textTertiary, fontSize: 14,
                }}>
                  No hay facturas para este período.
                </td>
              </tr>
            ) : filtered.map(inv => {
              const st = statusStyle(inv.status);
              return (
                <tr key={inv.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '10px 12px', color: C.textSecondary, fontSize: 13 }}>{inv.date}</td>
                  <td style={{ padding: '10px 12px', color: C.textPrimary, fontSize: 13 }}>{inv.period}</td>
                  <td style={{ padding: '10px 12px', fontFamily: F.mono, fontSize: 13, color: C.textPrimary }}>
                    {inv.amount} <span style={{ color: C.textTertiary, fontSize: 11 }}>{inv.currency}</span>
                  </td>
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
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      PDF
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: Datos fiscales ────────────────────────────────────────── */

function DatosFiscalesTab() {
  const [data, setData] = useState<FiscalData>({
    cuit: '30-71234567-9',
    razonSocial: 'Inmobiliaria Del Centro S.R.L.',
    condicionFiscal: 'Responsable Inscripto',
    street: 'Av. Corrientes 1234, Piso 8',
    city: 'Ciudad Autónoma de Buenos Aires',
    province: 'Buenos Aires',
    postalCode: 'C1043AAZ',
  });
  const [saved, setSaved] = useState(false);

  function update<K extends keyof FiscalData>(key: K, value: FiscalData[K]) {
    setData(d => ({ ...d, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
          Datos fiscales
        </h3>
        <p style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, margin: '4px 0 0' }}>
          Estos datos se usan para la emisión de facturas electrónicas AFIP.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>CUIT</label>
          <input
            style={{ ...inputStyle, fontFamily: F.mono }}
            value={data.cuit}
            onChange={e => update('cuit', e.target.value)}
            placeholder="XX-XXXXXXXX-X"
          />
        </div>
        <div>
          <label style={labelStyle}>Condición fiscal</label>
          <select
            value={data.condicionFiscal}
            onChange={e => update('condicionFiscal', e.target.value)}
            style={{
              ...inputStyle,
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238DA0C0' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: 32,
            }}
          >
            {FISCAL_CONDITION_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Razón social</label>
          <input
            style={inputStyle}
            value={data.razonSocial}
            onChange={e => update('razonSocial', e.target.value)}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Dirección de facturación</label>
          <input
            style={inputStyle}
            value={data.street}
            onChange={e => update('street', e.target.value)}
            placeholder="Calle, número, piso, depto."
          />
        </div>
        <div>
          <label style={labelStyle}>Ciudad</label>
          <input
            style={inputStyle}
            value={data.city}
            onChange={e => update('city', e.target.value)}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Provincia</label>
            <input
              style={inputStyle}
              value={data.province}
              onChange={e => update('province', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Código postal</label>
            <input
              style={{ ...inputStyle, fontFamily: F.mono }}
              value={data.postalCode}
              onChange={e => update('postalCode', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
        {saved && (
          <span style={{ fontFamily: F.body, fontSize: 13, color: C.success }}>
            Datos guardados correctamente
          </span>
        )}
        <button onClick={handleSave} style={primaryBtn}>
          Guardar datos fiscales
        </button>
      </div>
    </div>
  );
}

/* ─── Tab: Cancelar ──────────────────────────────────────────────── */

function CancelarTab() {
  const [reason, setReason] = useState('');
  const [cancelMode, setCancelMode] = useState<'period_end' | 'now'>('period_end');
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  if (cancelled) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{'👋'}</div>
        <h3 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
          Suscripción cancelada
        </h3>
        <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, maxWidth: 400, margin: '0 auto 24px' }}>
          {cancelMode === 'period_end'
            ? 'Tu acceso continuará hasta el final del período actual (15 de mayo de 2026). Después de esa fecha, tu cuenta pasará a modo solo lectura.'
            : 'Tu cuenta ha sido cambiada a modo solo lectura. Podés reactivar tu suscripción en cualquier momento.'
          }
        </p>
        <button style={primaryBtn}>
          Reactivar suscripción
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={cardStyle}>
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            Cancelar suscripción
          </h3>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, margin: '4px 0 0' }}>
            Antes de cancelar, tené en cuenta lo siguiente:
          </p>
        </div>

        <div style={{
          background: 'rgba(232,138,20,0.06)', border: `1px solid rgba(232,138,20,0.2)`,
          borderRadius: 10, padding: 16, marginBottom: 24,
        }}>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.warning, fontWeight: 600, marginBottom: 8 }}>
            Al cancelar perderás acceso a:
          </div>
          <ul style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Generación de reportes y tasaciones</li>
            <li>IA Copilot y descripciones automáticas</li>
            <li>Portales de propietarios activos</li>
            <li>Facturación electrónica AFIP</li>
            <li>Sitio web personalizado</li>
          </ul>
          <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginTop: 12, marginBottom: 0 }}>
            Tus datos se conservarán por 90 días después de la cancelación. Podés exportarlos en cualquier momento.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Motivo de cancelación</label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{
              ...inputStyle,
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238DA0C0' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: 32,
            }}
          >
            <option value="">Seleccioná un motivo...</option>
            {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Cuándo cancelar</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {([
              { key: 'period_end' as const, label: 'Al final del período actual', desc: 'Mantén acceso hasta el 15 de mayo de 2026.' },
              { key: 'now' as const, label: 'Cancelar ahora', desc: 'El acceso se suspende inmediatamente.' },
            ]).map(opt => (
              <div
                key={opt.key}
                onClick={() => setCancelMode(opt.key)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  background: cancelMode === opt.key ? 'rgba(232,58,59,0.06)' : C.bgElevated,
                  border: `1px solid ${cancelMode === opt.key ? 'rgba(232,58,59,0.3)' : C.border}`,
                  borderRadius: 10, padding: 14, cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="cancelMode"
                  checked={cancelMode === opt.key}
                  readOnly
                  style={{ marginTop: 2, accentColor: '#E83B3B' }}
                />
                <div>
                  <div style={{ fontFamily: F.body, fontSize: 14, color: C.textPrimary, fontWeight: 500 }}>
                    {opt.label}
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                    {opt.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            style={{
              background: 'none', border: 'none', color: C.brand,
              fontFamily: F.body, fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar mis datos
          </button>
          <button
            disabled={!reason}
            onClick={() => setShowConfirm(true)}
            style={{
              ...dangerBtn,
              opacity: reason ? 1 : 0.5,
              cursor: reason ? 'pointer' : 'not-allowed',
            }}
          >
            Cancelar suscripción
          </button>
        </div>
      </div>

      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(7,13,26,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div style={{
            background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 16,
            width: '100%', maxWidth: 440, padding: 32,
          }}>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>{'⚠️'}</div>
            <h3 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textPrimary, textAlign: 'center', marginBottom: 8 }}>
              {cancelMode === 'now' ? '¿Cancelar ahora?' : 'Confirmar cancelación'}
            </h3>
            <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
              {cancelMode === 'now'
                ? 'Tu acceso se suspenderá inmediatamente. No podrás acceder a funciones premium hasta que reactives tu suscripción.'
                : 'Tu plan seguirá activo hasta el 15 de mayo de 2026. Después de esa fecha, tu cuenta pasará a modo solo lectura.'
              }
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowConfirm(false)} style={{ ...primaryBtn, flex: 1, background: C.brand }}>
                Quedarme
              </button>
              <button onClick={() => { setShowConfirm(false); setCancelled(true); }} style={{ ...dangerBtn, flex: 1 }}>
                Confirmar cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Upgrade Wizard (modal) ─────────────────────────────────────── */

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
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', color: C.textTertiary,
            cursor: 'pointer', fontSize: 18, lineHeight: 1,
          }}
        >
          ✕
        </button>

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
                  ✓ Ahorrás 2 meses con facturación anual
                </div>
              )}
            </div>
            {!isUpgrade && (
              <div style={{
                background: 'rgba(232,138,20,0.06)', border: `1px solid rgba(232,138,20,0.2)`,
                borderRadius: 10, padding: 14, marginBottom: 20,
              }}>
                <div style={{ fontFamily: F.body, fontSize: 13, color: C.warning }}>
                  Al bajar de plan, algunas funciones dejarán de estar disponibles al final del período de facturación actual.
                </div>
              </div>
            )}
            <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginBottom: 20 }}>
              Al suscribirte, aceptás los{' '}
              <a href="/legal/terms" style={{ color: C.brand }}>términos de servicio</a>.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={onClose} style={{ ...secondaryBtn, flex: 1 }}>
                Cancelar
              </button>
              <button onClick={() => setStep('payment')} style={{ ...primaryBtn, flex: 2 }}>
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
                    <label style={labelStyle}>{f.label}</label>
                    <input placeholder={f.placeholder} style={{ ...inputStyle, fontFamily: F.mono }} />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep('plan')} style={secondaryBtn}>
                ← Atrás
              </button>
              <button onClick={() => setStep('success')} style={{ ...primaryBtn, flex: 1 }}>
                Confirmar → ${price} USD/mes
              </button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{'✅'}</div>
            <h3 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
              ¡Suscripción activada!
            </h3>
            <p style={{ fontFamily: F.body, color: C.textSecondary, marginBottom: 4 }}>
              Ya tenés acceso completo al plan <strong style={{ color: C.textPrimary }}>{plan.label}</strong>.
            </p>
            <p style={{ fontFamily: F.body, color: C.textSecondary, fontSize: 13, marginBottom: 4 }}>
              Tu próxima factura será el 15 de junio de 2026.
            </p>
            <p style={{ fontFamily: F.body, color: C.textTertiary, fontSize: 13, marginBottom: 28 }}>
              La factura AFIP fue enviada a tu email.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={onClose} style={{
                ...secondaryBtn, borderColor: C.brand, color: C.brand,
              }}>
                Ir a mis reportes
              </button>
              <button onClick={onClose} style={primaryBtn}>
                Configurar mi sitio web
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Expired Overlay ────────────────────────────────────────────── */

function ExpiredOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(7,13,26,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
    }}>
      <div style={{
        background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 16,
        width: '100%', maxWidth: 480, padding: 40, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{'🔒'}</div>
        <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 800, color: C.textPrimary, marginBottom: 8 }}>
          Tu suscripción venció
        </h2>
        <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, marginBottom: 24, lineHeight: 1.6 }}>
          Tu cuenta está en modo solo lectura. Para recuperar el acceso completo, elegí un plan.
        </p>
        <button style={{ ...primaryBtn, padding: '12px 32px', fontSize: 15 }}>
          Elegir plan
        </button>
        <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginTop: 16, marginBottom: 0 }}>
          Tus datos están seguros. Podés exportarlos desde Configuración.
        </p>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('plan');
  const [upgradePlan, setUpgradePlan] = useState<PlanCode | null>(null);
  const [upgradeCycle] = useState<BillingCycle>('monthly');

  return (
    <div style={{
      minHeight: '100vh', background: C.bgBase, padding: '32px 40px',
      fontFamily: F.body,
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <h2 style={{ fontFamily: F.display, fontSize: 26, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
            Facturación y suscripción
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: '4px 0 0' }}>
            Administrá tu plan, métodos de pago y facturas AFIP.
          </p>
        </div>

        {/* Trial Banner */}
        {TRIAL_DAYS_LEFT !== null && (
          <div style={{ marginTop: 20 }}>
            <TrialBanner daysLeft={TRIAL_DAYS_LEFT} />
          </div>
        )}

        {/* Tab Navigation */}
        <nav
          role="tablist"
          aria-label="Secciones de facturación"
          style={{
            display: 'flex', gap: 0,
            borderBottom: `1px solid ${C.border}`,
            marginBottom: 24, marginTop: 16,
          }}
        >
          {TABS.map(tab => {
            const isActive = tab.key === activeTab;
            const isDanger = tab.key === 'cancelar';
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? (isDanger ? '#E83B3B' : C.brand) : 'transparent'}`,
                  color: isActive
                    ? (isDanger ? '#E83B3B' : C.textPrimary)
                    : (isDanger ? C.textTertiary : C.textSecondary),
                  fontFamily: F.body,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'color 150ms ease, border-color 150ms ease',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={activeTab}
        >
          {activeTab === 'plan' && <PlanTab onOpenUpgrade={setUpgradePlan} />}
          {activeTab === 'pago' && <PagoTab />}
          {activeTab === 'facturas' && <FacturasTab />}
          {activeTab === 'fiscal' && <DatosFiscalesTab />}
          {activeTab === 'cancelar' && <CancelarTab />}
        </div>
      </div>

      {/* Upgrade wizard overlay */}
      {upgradePlan && (
        <UpgradeWizard
          targetPlan={upgradePlan}
          cycle={upgradeCycle}
          onClose={() => setUpgradePlan(null)}
        />
      )}

      {/* Expired subscription overlay */}
      {SUBSCRIPTION_STATUS === 'expired' && <ExpiredOverlay />}
    </div>
  );
}
