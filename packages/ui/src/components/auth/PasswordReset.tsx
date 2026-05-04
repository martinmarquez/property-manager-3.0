import React, { useState, useId } from 'react';

/* ─────────────────────────────────────────────────────────
   Corredor CRM — Password Reset
   Two views:
     1. "request" — enter email to receive reset link
     2. "new-password" — enter + confirm new password
   ───────────────────────────────────────────────────────── */

const C = {
  bgBase:    '#070D1A',
  bgRaised:  '#0D1526',
  bgSubtle:  '#162035',
  brand:     '#1654d9',
  brandHov:  '#1244b8',
  brandFaint:'rgba(22,84,217,0.12)',
  border:    '#1F2D48',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#6B809E',
  error:    '#E83B3B',
  errorBg:  '#260C0C',
  errorBorder: '#4A1A1A',
  success:   '#18A659',
  successBg: '#0A2217',
  successBorder: '#1A4D30',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

function CorredorMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="9" fill={C.brand} />
      <path d="M7 30 L13 14 L20 24 L26 18 L33 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="33" cy="26" r="2.5" fill="white" />
    </svg>
  );
}

// ─── Request form ─────────────────────────────────────────
export interface PasswordResetRequestProps {
  onSubmit?: (email: string) => Promise<void>;
  onBack?: () => void;
  error?: string;
}

export function PasswordResetRequest({ onSubmit, onBack, error: serverError }: PasswordResetRequestProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [localError, setLocalError] = useState('');
  const [focused, setFocused] = useState(false);
  const emailId = useId();
  const displayError = serverError || localError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setLocalError('Ingresá un email válido.'); return; }
    setLocalError('');
    setLoading(true);
    try {
      await onSubmit?.(email.trim());
      setSent(true);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Error al enviar el email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes corredor-reset-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{
        minHeight: '100vh', background: C.bgBase,
        fontFamily: F.body, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
      }}>
        <div style={{
          width: '100%', maxWidth: 400,
          animation: 'corredor-reset-fadein 0.4s ease-out both',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
            <CorredorMark size={32} />
            <span style={{ fontFamily: F.display, fontSize: '1.25rem', fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em' }}>
              Corredor
            </span>
          </div>

          {sent ? (
            /* Success state */
            <div style={{ textAlign: 'center', animation: 'corredor-reset-fadein 0.35s ease-out both' }}>
              <div style={{
                width: 64, height: 64,
                borderRadius: '50%',
                background: C.successBg,
                border: `2px solid ${C.successBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 4 L8 16 L4 12" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 style={{ fontFamily: F.display, fontSize: '1.5rem', fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em', marginBottom: 10 }}>
                Email enviado
              </h1>
              <p style={{ fontSize: '0.9375rem', color: C.textSecondary, lineHeight: 1.6, marginBottom: 32 }}>
                Revisá tu bandeja de entrada. Si <strong style={{ color: C.textPrimary }}>{email}</strong> está registrado, vas a recibir el link de recuperación en los próximos minutos.
              </p>
              <button type="button" onClick={onBack} style={{
                background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '10px 20px', color: C.textSecondary, fontFamily: F.body,
                fontSize: '0.9375rem', cursor: 'pointer', width: '100%',
              }}>
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: F.display, fontSize: '1.75rem', fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.025em', marginBottom: 8 }}>
                Recuperar contraseña
              </h1>
              <p style={{ fontSize: '0.9375rem', color: C.textSecondary, marginBottom: 28, lineHeight: 1.5 }}>
                Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
              </p>

              {displayError && (
                <div role="alert" style={{
                  display: 'flex', gap: 10, padding: '12px 14px',
                  background: C.errorBg, border: `1px solid ${C.errorBorder}`,
                  borderRadius: 8, marginBottom: 20,
                  fontSize: '0.875rem', color: '#F87171', lineHeight: 1.5,
                }}>
                  {displayError}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <label htmlFor={emailId} style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>
                  Email
                </label>
                <input
                  id={emailId} type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="nombre@inmobiliaria.com"
                  autoComplete="email" required disabled={loading}
                  style={{
                    width: '100%', padding: '10px 14px', marginBottom: 20,
                    background: C.bgRaised, border: `1px solid ${focused ? C.brand : C.border}`,
                    borderRadius: 8, color: C.textPrimary,
                    fontSize: '0.9375rem', fontFamily: F.body, outline: 'none',
                    boxShadow: focused ? '0 0 0 3px rgba(22,84,217,0.2)' : 'none',
                    transition: 'border-color 150ms, box-shadow 150ms',
                    caretColor: C.brand,
                  }}
                />
                <button
                  type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '11px 20px',
                    background: loading ? C.bgSubtle : C.brand,
                    border: 'none', borderRadius: 8,
                    color: loading ? C.textTertiary : 'white',
                    fontSize: '0.9375rem', fontFamily: F.body, fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    minHeight: 44, marginBottom: 14,
                  }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = C.brandHov; }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = C.brand; }}
                >
                  {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                </button>
                <button type="button" onClick={onBack} style={{
                  width: '100%', padding: '10px 20px',
                  background: 'none', border: 'none',
                  color: C.textTertiary, fontFamily: F.body, fontSize: '0.875rem',
                  cursor: 'pointer',
                }}>
                  Volver al inicio de sesión
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── New password form ────────────────────────────────────
export interface PasswordResetNewProps {
  onSubmit?: (password: string) => Promise<void>;
  onLogin?: () => void;
  error?: string;
}

export function PasswordResetNew({ onSubmit, onLogin, error: serverError }: PasswordResetNewProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [localError, setLocalError] = useState('');
  const [pFocused, setPFocused] = useState(false);
  const [cFocused, setCFocused] = useState(false);
  const pId = useId(); const cId = useId();
  const displayError = serverError || localError;

  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;

  const strengthLabel = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][strength];
  const strengthColor = ['', '#E83B3B', '#E88A14', '#5577FF', C.success][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setLocalError('Mínimo 8 caracteres.'); return; }
    if (password !== confirm) { setLocalError('Las contraseñas no coinciden.'); return; }
    setLocalError('');
    setLoading(true);
    try {
      await onSubmit?.(password);
      setDone(true);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.bgBase,
      fontFamily: F.body, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
          <CorredorMark size={32} />
          <span style={{ fontFamily: F.display, fontSize: '1.25rem', fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em' }}>
            Corredor
          </span>
        </div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: C.successBg, border: `2px solid ${C.successBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 4 L8 16 L4 12" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: F.display, fontSize: '1.5rem', fontWeight: 700, color: C.textPrimary, marginBottom: 10 }}>
              Contraseña actualizada
            </h1>
            <p style={{ color: C.textSecondary, marginBottom: 28, lineHeight: 1.5 }}>
              Tu contraseña fue actualizada con éxito. Ya podés iniciar sesión.
            </p>
            <button type="button" onClick={onLogin} style={{
              width: '100%', padding: '11px 20px',
              background: C.brand, border: 'none', borderRadius: 8,
              color: 'white', fontSize: '0.9375rem', fontFamily: F.body, fontWeight: 600,
              cursor: 'pointer',
            }}>
              Ir al inicio de sesión
            </button>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: F.display, fontSize: '1.75rem', fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.025em', marginBottom: 8 }}>
              Nueva contraseña
            </h1>
            <p style={{ fontSize: '0.9375rem', color: C.textSecondary, marginBottom: 28 }}>
              Elegí una contraseña segura para tu cuenta.
            </p>

            {displayError && (
              <div role="alert" style={{
                padding: '12px 14px', background: C.errorBg,
                border: `1px solid ${C.errorBorder}`, borderRadius: 8,
                fontSize: '0.875rem', color: '#F87171', marginBottom: 20,
              }}>
                {displayError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor={pId} style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>
                Nueva contraseña
              </label>
              <input
                id={pId} type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPFocused(true)} onBlur={() => setPFocused(false)}
                placeholder="••••••••" autoComplete="new-password" required disabled={loading}
                style={{
                  width: '100%', padding: '10px 14px',
                  background: C.bgRaised, border: `1px solid ${pFocused ? C.brand : C.border}`,
                  borderRadius: 8, color: C.textPrimary,
                  fontSize: '0.9375rem', fontFamily: F.body, outline: 'none',
                  boxShadow: pFocused ? '0 0 0 3px rgba(22,84,217,0.2)' : 'none',
                  transition: 'border-color 150ms, box-shadow 150ms',
                  caretColor: C.brand, marginBottom: 8,
                }}
              />

              {/* Strength meter */}
              {password.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                    {[1,2,3,4].map(level => (
                      <div key={level} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: level <= strength ? strengthColor : C.bgSubtle,
                        transition: 'background 200ms ease',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}

              <label htmlFor={cId} style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>
                Confirmar contraseña
              </label>
              <input
                id={cId} type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onFocus={() => setCFocused(true)} onBlur={() => setCFocused(false)}
                placeholder="••••••••" autoComplete="new-password" required disabled={loading}
                style={{
                  width: '100%', padding: '10px 14px', marginBottom: 24,
                  background: C.bgRaised, border: `1px solid ${cFocused ? C.brand : C.border}`,
                  borderRadius: 8, color: C.textPrimary,
                  fontSize: '0.9375rem', fontFamily: F.body, outline: 'none',
                  boxShadow: cFocused ? '0 0 0 3px rgba(22,84,217,0.2)' : 'none',
                  transition: 'border-color 150ms, box-shadow 150ms',
                  caretColor: C.brand,
                }}
              />

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '11px 20px',
                  background: loading ? C.bgSubtle : C.brand,
                  border: 'none', borderRadius: 8,
                  color: loading ? C.textTertiary : 'white',
                  fontSize: '0.9375rem', fontFamily: F.body, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer', minHeight: 44,
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = C.brandHov; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = C.brand; }}
              >
                {loading ? 'Guardando...' : 'Actualizar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
