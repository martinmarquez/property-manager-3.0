import React, { useState } from 'react';
import { C, F } from '../../components/copilot/tokens.js';

type WizardStep = 1 | 2 | 3 | 4;

const STEPS = [
  { n: 1, label: 'Ingresá tu dominio' },
  { n: 2, label: 'Verificá DNS' },
  { n: 3, label: 'SSL / HTTPS' },
  { n: 4, label: 'Listo' },
] as const;

const DNS_RECORDS = [
  { type: 'A',     name: '@',           value: '76.76.21.21',              status: 'verified' as const },
  { type: 'CNAME', name: 'www',         value: 'cname.corredor.io',        status: 'pending'  as const },
];

function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36 }}>
      {STEPS.map((step, idx) => {
        const done    = step.n < current;
        const active  = step.n === current;
        const last    = idx === STEPS.length - 1;
        return (
          <React.Fragment key={step.n}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontFamily: F.mono, fontSize: 13, fontWeight: 700,
                border: `2px solid ${done ? C.success : active ? C.brand : C.border}`,
                background: done ? C.success : active ? C.brandFaint : 'transparent',
                color: done ? '#fff' : active ? C.brand : C.textTertiary,
                transition: 'all 0.2s',
              }}>
                {done ? '✓' : step.n}
              </div>
              <span style={{
                fontFamily: F.body, fontSize: 11, color: active ? C.textPrimary : C.textTertiary,
                fontWeight: active ? 600 : 400, whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>
            {!last && (
              <div style={{
                flex: 1, height: 2, marginBottom: 20,
                background: done ? C.success : C.border, transition: 'background 0.3s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Step1({ domain, setDomain, onNext }: {
  domain: string; setDomain: (d: string) => void; onNext: () => void;
}) {
  const [error, setError] = useState('');
  const validate = () => {
    if (!domain.includes('.')) { setError('Ingresá un dominio válido (ej: miinmobiliaria.com.ar)'); return; }
    setError('');
    onNext();
  };

  return (
    <div>
      <h2 style={{ fontFamily: F.display, fontSize: 18, color: C.textPrimary, margin: '0 0 6px' }}>
        ¿Cuál es tu dominio?
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '0 0 24px' }}>
        Ingresá el dominio que ya tenés registrado. Podés comprarlo en NIC.ar, GoDaddy, o Namecheap.
      </p>
      <label style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, display: 'block', marginBottom: 6 }}>
        Nombre de dominio
      </label>
      <input
        value={domain}
        onChange={e => setDomain(e.target.value)}
        placeholder="miinmobiliaria.com.ar"
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
          border: `1px solid ${error ? C.error : C.border}`,
          background: C.bgBase, color: C.textPrimary, fontFamily: F.mono, fontSize: 14,
          outline: 'none',
        }}
      />
      {error && <p style={{ color: C.error, fontSize: 12, fontFamily: F.body, marginTop: 6 }}>{error}</p>}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={validate} style={{
          padding: '9px 20px', borderRadius: 8, border: 'none', background: C.brand,
          color: '#fff', fontFamily: F.body, fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}>
          Continuar →
        </button>
      </div>
    </div>
  );
}

function Step2({ domain, onNext }: { domain: string; onNext: () => void }) {
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleCheck = () => {
    setChecking(true);
    setTimeout(() => { setChecking(false); setVerified(true); }, 1800);
  };

  return (
    <div>
      <h2 style={{ fontFamily: F.display, fontSize: 18, color: C.textPrimary, margin: '0 0 6px' }}>
        Configurá los registros DNS
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '0 0 20px' }}>
        En el panel de DNS de <strong>{domain}</strong>, agregá estos registros:
      </p>

      {/* DNS records table */}
      <div style={{ background: C.bgBase, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 90px', padding: '8px 16px', borderBottom: `1px solid ${C.border}` }}>
          {['Tipo', 'Nombre', 'Valor', 'Estado'].map(h => (
            <span key={h} style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>
        {DNS_RECORDS.map((rec, idx) => (
          <div key={idx} style={{
            display: 'grid', gridTemplateColumns: '80px 80px 1fr 90px',
            padding: '12px 16px', alignItems: 'center',
            borderBottom: idx === 0 ? `1px solid ${C.border}` : 'none',
          }}>
            <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary, fontWeight: 700 }}>{rec.type}</span>
            <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{rec.name}</span>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.value}</span>
            <span style={{
              fontFamily: F.mono, fontSize: 10, padding: '2px 8px', borderRadius: 20, width: 'fit-content',
              background: verified ? C.successFaint : (rec.status === 'verified' ? C.successFaint : `${C.warning}18`),
              color: verified ? C.success : (rec.status === 'verified' ? C.success : C.warning),
              border: `1px solid ${verified ? C.success : (rec.status === 'verified' ? C.success : C.warning)}40`,
            }}>
              {verified ? '✓ ok' : rec.status === 'verified' ? '✓ ok' : '⏳ pendiente'}
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, margin: '0 0 20px' }}>
        Los cambios DNS pueden demorar hasta 48 horas en propagarse.
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={handleCheck} disabled={checking || verified} style={{
          padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`,
          background: C.bgElevated, color: checking ? C.textTertiary : C.textSecondary,
          fontFamily: F.body, fontSize: 13, cursor: checking ? 'wait' : 'pointer',
        }}>
          {checking ? '🔄 Verificando…' : verified ? '✓ DNS verificado' : '🔍 Verificar ahora'}
        </button>
        {verified && (
          <button onClick={onNext} style={{
            padding: '9px 20px', borderRadius: 8, border: 'none', background: C.brand,
            color: '#fff', fontFamily: F.body, fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>
            Continuar →
          </button>
        )}
      </div>
    </div>
  );
}

function Step3({ domain, onNext }: { domain: string; onNext: () => void }) {
  const [provisioning, setProvisioning] = useState(false);
  const [done, setDone] = useState(false);

  const handleProvision = () => {
    setProvisioning(true);
    setTimeout(() => { setProvisioning(false); setDone(true); }, 2200);
  };

  return (
    <div>
      <h2 style={{ fontFamily: F.display, fontSize: 18, color: C.textPrimary, margin: '0 0 6px' }}>
        Certificado SSL / HTTPS
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '0 0 24px' }}>
        Corredor gestiona automáticamente el certificado TLS para <strong>{domain}</strong> via Let's Encrypt.
      </p>

      <div style={{
        padding: 20, borderRadius: 10, border: `1px solid ${done ? C.success : C.border}`,
        background: done ? C.successFaint : C.bgBase, marginBottom: 24, transition: 'all 0.3s',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <span style={{ fontSize: 28 }}>{done ? '🔒' : '🔓'}</span>
        <div>
          <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: done ? C.success : C.textPrimary, margin: 0 }}>
            {done ? 'HTTPS activado' : 'HTTPS no configurado'}
          </p>
          <p style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary, margin: '2px 0 0' }}>
            {done ? `https://${domain} está protegido con TLS.` : 'Activá HTTPS para proteger tu sitio.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!done && (
          <button onClick={handleProvision} disabled={provisioning} style={{
            padding: '9px 20px', borderRadius: 8, border: 'none',
            background: provisioning ? C.bgElevated : C.success,
            color: provisioning ? C.textTertiary : '#fff',
            fontFamily: F.body, fontWeight: 600, fontSize: 14, cursor: provisioning ? 'wait' : 'pointer',
          }}>
            {provisioning ? '🔄 Provisionando…' : '🔒 Activar HTTPS'}
          </button>
        )}
        {done && (
          <button onClick={onNext} style={{
            padding: '9px 20px', borderRadius: 8, border: 'none', background: C.brand,
            color: '#fff', fontFamily: F.body, fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>
            Finalizar →
          </button>
        )}
      </div>
    </div>
  );
}

function Step4({ domain }: { domain: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontFamily: F.display, fontSize: 22, color: C.textPrimary, margin: '0 0 8px' }}>
        ¡Dominio conectado!
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: '0 0 24px' }}>
        Tu sitio ahora es accesible en <a href={`https://${domain}`} target="_blank" rel="noreferrer"
          style={{ color: C.brand, fontFamily: F.mono }}>
          https://{domain}
        </a>
      </p>
      <button style={{
        padding: '10px 24px', borderRadius: 8, border: 'none', background: C.brand,
        color: '#fff', fontFamily: F.body, fontWeight: 600, fontSize: 14, cursor: 'pointer',
      }}>
        Ver mi sitio
      </button>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────── */

export default function SiteDomainsPage() {
  const [step, setStep] = useState<WizardStep>(1);
  const [domain, setDomain] = useState('');

  return (
    <div style={{ padding: '28px 32px', maxWidth: 600, fontFamily: F.body }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
          Dominio personalizado
        </h1>
        <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '4px 0 0' }}>
          Conectá tu propio dominio al sitio de Corredor
        </p>
      </div>

      <StepIndicator current={step} />

      <div style={{
        background: C.bgRaised, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: '28px 32px',
      }}>
        {step === 1 && <Step1 domain={domain} setDomain={setDomain} onNext={() => setStep(2)} />}
        {step === 2 && <Step2 domain={domain} onNext={() => setStep(3)} />}
        {step === 3 && <Step3 domain={domain} onNext={() => setStep(4)} />}
        {step === 4 && <Step4 domain={domain} />}
      </div>
    </div>
  );
}
