import React, { useState, useId } from 'react';

/* ─────────────────────────────────────────────────────────
   Corredor CRM — Register / Create Account Flow
   3-step wizard:
     1. Account details (nombre, email, password)
     2. Agency info (nombre agencia, CUIT, provincia)
     3. Invite teammates (optional)
   Argentina-native: CUIT, provincias argentinas
   ───────────────────────────────────────────────────────── */

const C = {
  bgBase:    '#070D1A',
  bgRaised:  '#0D1526',
  bgOverlay: '#121D33',
  bgSubtle:  '#162035',
  brand:     '#1654d9',
  brandHov:  '#1244b8',
  brandFaint:'rgba(22,84,217,0.12)',
  border:    '#1F2D48',
  borderStrong: '#253350',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#6B809E',
  textDisabled:  '#3A4E6A',
  error:    '#E83B3B',
  errorBg:  '#260C0C',
  errorBorder: '#4A1A1A',
  success:  '#18A659',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

// ─── Argentine provinces ─────────────────────────────────
const PROVINCIAS = [
  'Buenos Aires', 'Ciudad Autónoma de Buenos Aires',
  'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta',
  'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
];

// ─── Logo Mark ───────────────────────────────────────────
function CorredorMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="9" fill={C.brand} />
      <path d="M7 30 L13 14 L20 24 L26 18 L33 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="33" cy="26" r="2.5" fill="white" />
    </svg>
  );
}

// ─── Step indicators ─────────────────────────────────────
interface StepDotsProps {
  current: number; // 0-indexed
  total: number;
  labels: string[];
}

function StepIndicator({ current, total, labels }: StepDotsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 40 }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28, height: 28,
                borderRadius: '50%',
                background: done ? C.brand : active ? C.brandFaint : C.bgSubtle,
                border: `2px solid ${done || active ? C.brand : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 200ms ease',
              }}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2.5 6.5L5 8.5L9.5 4" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: active ? C.brand : C.textDisabled,
                    fontFamily: F.body,
                  }}>
                    {i + 1}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: '0.6875rem',
                color: active ? C.textSecondary : done ? C.textTertiary : C.textDisabled,
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
              }}>
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div style={{
                width: 48, height: 2,
                background: i < current ? C.brand : C.border,
                margin: '-16px 8px 0',
                transition: 'background 300ms ease',
                borderRadius: 1,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Input component (reusable within this file) ─────────
interface FieldProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: React.ReactNode;
  required?: boolean | undefined;
}

function Field({ label, hint, error, children, required }: FieldProps) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block',
        fontSize: '0.8125rem',
        fontWeight: 500,
        color: C.textSecondary,
        marginBottom: 6,
        letterSpacing: '0.01em',
      }}>
        {label}
        {required && <span style={{ color: C.brand, marginLeft: 3 }} aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p style={{ fontSize: '0.75rem', color: C.textTertiary, marginTop: 5 }}>{hint}</p>
      )}
      {error && (
        <p role="alert" style={{ fontSize: '0.75rem', color: C.error, marginTop: 5 }}>{error}</p>
      )}
    </div>
  );
}

function TextInput({
  id, type = 'text', placeholder, value, onChange, disabled, autoComplete, required, error,
}: {
  id: string; type?: string; placeholder?: string; value: string;
  onChange: (v: string) => void; disabled?: boolean; autoComplete?: string;
  required?: boolean; error?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id} type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={disabled} autoComplete={autoComplete} required={required}
      style={{
        width: '100%', padding: '10px 14px',
        background: C.bgRaised,
        border: `1px solid ${error ? C.error : focused ? C.brand : C.border}`,
        borderRadius: 8, color: C.textPrimary,
        fontSize: '0.9375rem', fontFamily: F.body,
        outline: 'none',
        boxShadow: focused ? `0 0 0 3px rgba(22,84,217,0.2)` : 'none',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        caretColor: C.brand,
      }}
    />
  );
}

function SelectInput({
  id, value, onChange, children, disabled, error,
}: {
  id: string; value: string; onChange: (v: string) => void;
  children: React.ReactNode; disabled?: boolean; error?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      id={id} value={value} onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      disabled={disabled}
      style={{
        width: '100%', padding: '10px 14px',
        background: C.bgRaised,
        border: `1px solid ${error ? C.error : focused ? C.brand : C.border}`,
        borderRadius: 8, color: value ? C.textPrimary : C.textTertiary,
        fontSize: '0.9375rem', fontFamily: F.body,
        outline: 'none',
        boxShadow: focused ? `0 0 0 3px rgba(22,84,217,0.2)` : 'none',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23506180' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: 36,
      }}
    >
      {children}
    </select>
  );
}

// ─── Step 1: Account Details ─────────────────────────────
interface Step1Data {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  confirmPassword: string;
}

function Step1({
  data, onChange, onNext,
}: {
  data: Step1Data;
  onChange: (d: Partial<Step1Data>) => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Partial<Step1Data>>({});
  const ids = { nombre: useId(), apellido: useId(), email: useId(), password: useId(), confirmPassword: useId() };

  const validate = () => {
    const e: Partial<Step1Data> = {};
    if (!data.nombre.trim()) e.nombre = 'Requerido';
    if (!data.apellido.trim()) e.apellido = 'Requerido';
    if (!data.email.includes('@')) e.email = 'Email inválido';
    if (data.password.length < 8) e.password = 'Mínimo 8 caracteres';
    if (data.password !== data.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <form onSubmit={e => { e.preventDefault(); if (validate()) onNext(); }} noValidate>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <Field label="Nombre" required error={errors.nombre}>
          <TextInput id={ids.nombre} value={data.nombre} onChange={v => onChange({ nombre: v })}
            placeholder="Martín" autoComplete="given-name" required error={!!errors.nombre}/>
        </Field>
        <Field label="Apellido" required error={errors.apellido}>
          <TextInput id={ids.apellido} value={data.apellido} onChange={v => onChange({ apellido: v })}
            placeholder="García" autoComplete="family-name" required error={!!errors.apellido}/>
        </Field>
      </div>
      <Field label="Email" required error={errors.email}>
        <TextInput id={ids.email} type="email" value={data.email} onChange={v => onChange({ email: v })}
          placeholder="nombre@inmobiliaria.com" autoComplete="email" required error={!!errors.email}/>
      </Field>
      <Field label="Contraseña" hint="Mínimo 8 caracteres" required error={errors.password}>
        <TextInput id={ids.password} type="password" value={data.password} onChange={v => onChange({ password: v })}
          placeholder="••••••••" autoComplete="new-password" required error={!!errors.password}/>
      </Field>
      <Field label="Confirmar contraseña" required error={errors.confirmPassword}>
        <TextInput id={ids.confirmPassword} type="password" value={data.confirmPassword}
          onChange={v => onChange({ confirmPassword: v })}
          placeholder="••••••••" autoComplete="new-password" required error={!!errors.confirmPassword}/>
      </Field>

      <PrimaryButton type="submit">Continuar</PrimaryButton>
    </form>
  );
}

// ─── Step 2: Agency Info ──────────────────────────────────
interface Step2Data {
  agencyName: string;
  cuit: string;
  provincia: string;
  phone: string;
}

function Step2({
  data, onChange, onNext, onBack,
}: {
  data: Step2Data;
  onChange: (d: Partial<Step2Data>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [errors, setErrors] = useState<Partial<Step2Data>>({});
  const ids = { agencyName: useId(), cuit: useId(), provincia: useId(), phone: useId() };

  // Format CUIT as XX-XXXXXXXX-X
  const formatCuit = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  };

  const validate = () => {
    const e: Partial<Step2Data> = {};
    if (!data.agencyName.trim()) e.agencyName = 'Requerido';
    if (!data.cuit.replace(/\D/g, '') || data.cuit.replace(/\D/g, '').length < 11) {
      e.cuit = 'CUIT inválido (11 dígitos)';
    }
    if (!data.provincia) e.provincia = 'Seleccioná una provincia';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <form onSubmit={e => { e.preventDefault(); if (validate()) onNext(); }} noValidate>
      <Field label="Nombre de la inmobiliaria / agencia" required error={errors.agencyName}>
        <TextInput id={ids.agencyName} value={data.agencyName} onChange={v => onChange({ agencyName: v })}
          placeholder="Inmobiliaria San Telmo" error={!!errors.agencyName}/>
      </Field>
      <Field label="CUIT" hint="Formato: XX-XXXXXXXX-X" required error={errors.cuit}>
        <TextInput id={ids.cuit} value={data.cuit}
          onChange={v => onChange({ cuit: formatCuit(v) })}
          placeholder="30-71234567-8" error={!!errors.cuit}/>
      </Field>
      <Field label="Provincia" required error={errors.provincia}>
        <SelectInput id={ids.provincia} value={data.provincia}
          onChange={v => onChange({ provincia: v })} error={!!errors.provincia}>
          <option value="" disabled>Seleccioná una provincia</option>
          {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
        </SelectInput>
      </Field>
      <Field label="Teléfono de contacto" hint="Opcional">
        <TextInput id={ids.phone} type="tel" value={data.phone}
          onChange={v => onChange({ phone: v })} placeholder="+54 11 1234-5678"/>
      </Field>

      <div style={{ display: 'flex', gap: 10 }}>
        <SecondaryButton type="button" onClick={onBack}>Atrás</SecondaryButton>
        <PrimaryButton type="submit" style={{ flex: 1 }}>Continuar</PrimaryButton>
      </div>
    </form>
  );
}

// ─── Step 3: Invite Teammates ─────────────────────────────
interface InviteEmail { id: string; value: string }

function Step3({
  invites, onChange, onSubmit, onBack, loading,
}: {
  invites: InviteEmail[];
  onChange: (invites: InviteEmail[]) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading?: boolean | undefined;
}) {
  const addEmail = () => onChange([...invites, { id: String(Date.now()), value: '' }]);
  const removeEmail = (id: string) => onChange(invites.filter(i => i.id !== id));
  const updateEmail = (id: string, value: string) =>
    onChange(invites.map(i => i.id === id ? { ...i, value } : i));

  return (
    <div>
      <div style={{
        padding: '12px 14px',
        background: C.brandFaint,
        border: `1px solid rgba(22,84,217,0.2)`,
        borderRadius: 8,
        fontSize: '0.875rem',
        color: C.textSecondary,
        marginBottom: 24,
        lineHeight: 1.5,
      }}>
        Invitá a tu equipo ahora o hacelo después desde Configuración. Este paso es opcional.
      </div>

      {invites.map(invite => (
        <div key={invite.id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <TextInput
            id={invite.id}
            type="email"
            value={invite.value}
            onChange={v => updateEmail(invite.id, v)}
            placeholder="colega@inmobiliaria.com"
          />
          <button
            type="button"
            onClick={() => removeEmail(invite.id)}
            aria-label="Eliminar email"
            style={{
              flexShrink: 0, width: 42, height: 42,
              background: 'none',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.textTertiary,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 150ms, color 150ms',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.error;
              (e.currentTarget as HTMLButtonElement).style.color = C.error;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
              (e.currentTarget as HTMLButtonElement).style.color = C.textTertiary;
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addEmail}
        style={{
          width: '100%', padding: '9px 14px',
          background: 'none',
          border: `1px dashed ${C.border}`,
          borderRadius: 8,
          color: C.textTertiary,
          cursor: 'pointer', fontSize: '0.875rem', fontFamily: F.body,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          marginBottom: 24,
          transition: 'border-color 150ms, color 150ms',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = C.brand;
          (e.currentTarget as HTMLButtonElement).style.color = C.textSecondary;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
          (e.currentTarget as HTMLButtonElement).style.color = C.textTertiary;
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Agregar otro email
      </button>

      <div style={{ display: 'flex', gap: 10 }}>
        <SecondaryButton type="button" onClick={onBack} disabled={loading}>Atrás</SecondaryButton>
        <PrimaryButton type="button" onClick={onSubmit} loading={loading} style={{ flex: 1 }}>
          {invites.some(i => i.value.trim()) ? 'Crear cuenta e invitar' : 'Crear cuenta'}
        </PrimaryButton>
      </div>

      {invites.length === 0 && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          style={{
            width: '100%', marginTop: 10,
            padding: '9px 14px',
            background: 'none', border: 'none',
            color: C.textTertiary, cursor: 'pointer',
            fontSize: '0.875rem', fontFamily: F.body,
            textDecoration: 'underline',
          }}
        >
          Omitir este paso
        </button>
      )}
    </div>
  );
}

// ─── Button helpers ───────────────────────────────────────
function PrimaryButton({
  children, type = 'button', onClick, loading, disabled, style,
}: {
  children: React.ReactNode; type?: 'button' | 'submit';
  onClick?: () => void; loading?: boolean | undefined; disabled?: boolean | undefined;
  style?: React.CSSProperties;
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type} onClick={onClick} disabled={isDisabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '11px 20px',
        background: isDisabled ? C.bgSubtle : C.brand,
        border: 'none', borderRadius: 8,
        color: isDisabled ? C.textTertiary : 'white',
        fontSize: '0.9375rem', fontFamily: F.body, fontWeight: 600,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'background 150ms ease',
        width: '100%', minHeight: 44,
        ...style,
      }}
      onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = C.brandHov; }}
      onMouseLeave={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = C.brand; }}
    >
      {loading ? (
        <span style={{ display: 'flex', gap: 4 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'rgba(255,255,255,0.8)',
              animation: 'corredor-register-bounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}
        </span>
      ) : children}
    </button>
  );
}

function SecondaryButton({
  children, type = 'button', onClick, disabled,
}: {
  children: React.ReactNode; type?: 'button' | 'submit';
  onClick?: () => void; disabled?: boolean | undefined;
}) {
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      style={{
        padding: '11px 18px',
        background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
        color: C.textSecondary, fontSize: '0.9375rem', fontFamily: F.body, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
        minHeight: 44, whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = C.bgSubtle;
          (e.currentTarget as HTMLButtonElement).style.borderColor = C.borderStrong;
          (e.currentTarget as HTMLButtonElement).style.color = C.textPrimary;
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = C.bgRaised;
        (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
        (e.currentTarget as HTMLButtonElement).style.color = C.textSecondary;
      }}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────
export interface RegisterFlowProps {
  onComplete?: (data: RegisterFormData) => Promise<void>;
  onLogin?: () => void;
}

export interface RegisterFormData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  agencyName: string;
  cuit: string;
  provincia: string;
  phone: string;
  inviteEmails: string[];
}

export function RegisterFlow({ onComplete, onLogin }: RegisterFlowProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [step1, setStep1] = useState<Step1Data>({
    nombre: '', apellido: '', email: '', password: '', confirmPassword: '',
  });
  const [step2, setStep2] = useState<Step2Data>({
    agencyName: '', cuit: '', provincia: '', phone: '',
  });
  const [invites, setInvites] = useState<InviteEmail[]>([]);

  const STEP_LABELS = ['Tu cuenta', 'Tu agencia', 'Equipo'];

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await onComplete?.({
        ...step1,
        ...step2,
        inviteEmails: invites.map(i => i.value).filter(Boolean),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la cuenta.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes corredor-register-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes corredor-register-fadein {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: C.bgBase,
        fontFamily: F.body,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 460,
          animation: 'corredor-register-fadein 0.4s ease-out both',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, justifyContent: 'center' }}>
            <CorredorMark size={32} />
            <span style={{
              fontFamily: F.display,
              fontSize: '1.25rem', fontWeight: 700,
              color: C.textPrimary, letterSpacing: '-0.02em',
            }}>
              Corredor
            </span>
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{
              fontFamily: F.display,
              fontSize: '1.75rem', fontWeight: 700,
              color: C.textPrimary, letterSpacing: '-0.025em',
              marginBottom: 6,
            }}>
              Crear cuenta
            </h1>
            <p style={{ fontSize: '0.9375rem', color: C.textSecondary }}>
              Gratis por 14 días. Sin tarjeta de crédito.
            </p>
          </div>

          {/* Step indicator */}
          <StepIndicator current={step} total={3} labels={STEP_LABELS} />

          {/* Error */}
          {error && (
            <div role="alert" style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', borderRadius: 8, marginBottom: 20,
              background: C.errorBg, border: `1px solid ${C.errorBorder}`,
              fontSize: '0.875rem', color: '#F87171', lineHeight: 1.5,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="#E83B3B" strokeWidth="1.4"/>
                <path d="M8 5v3.5" stroke="#E83B3B" strokeWidth="1.4" strokeLinecap="round"/>
                <circle cx="8" cy="11.5" r="0.75" fill="#E83B3B"/>
              </svg>
              {error}
            </div>
          )}

          {/* Card */}
          <div style={{
            background: C.bgRaised,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: '28px 28px 24px',
          }}>
            {step === 0 && (
              <Step1
                data={step1}
                onChange={d => setStep1(prev => ({ ...prev, ...d }))}
                onNext={() => setStep(1)}
              />
            )}
            {step === 1 && (
              <Step2
                data={step2}
                onChange={d => setStep2(prev => ({ ...prev, ...d }))}
                onNext={() => setStep(2)}
                onBack={() => setStep(0)}
              />
            )}
            {step === 2 && (
              <Step3
                invites={invites}
                onChange={setInvites}
                onSubmit={handleSubmit}
                onBack={() => setStep(1)}
                loading={loading}
              />
            )}
          </div>

          {/* Login link */}
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: C.textTertiary }}>
            ¿Ya tenés cuenta?{' '}
            <button
              type="button"
              onClick={onLogin}
              style={{
                background: 'none', border: 'none',
                color: '#6b8fff', fontWeight: 500,
                fontFamily: F.body, fontSize: '0.875rem',
                cursor: 'pointer', padding: 0,
              }}
            >
              Iniciá sesión
            </button>
          </p>
        </div>
      </div>
    </>
  );
}
