import React, { useState, useId } from 'react';

/* ─────────────────────────────────────────────────────────
   Corredor CRM — Login Page
   Design: Dark split-panel. Brand left, form right.
   Mobile: Full-screen form with logo at top.
   Palette: deep navy bg · royal blue accent (#1654d9)
   ───────────────────────────────────────────────────────── */

export interface LoginPageProps {
  /** Called when the form is submitted. Throw to show an error. */
  onSubmit?: (email: string, password: string) => Promise<void>;
  onForgotPassword?: () => void;
  onRegister?: () => void;
  /** Server-side error to display */
  error?: string;
  loading?: boolean;
}

// ─── Inline style tokens (mirrors tokens.css) ───────────
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
  textTertiary:  '#506180',
  error:    '#E83B3B',
  errorBg:  '#260C0C',
  errorBorder: '#4A1A1A',
  success:  '#18A659',
  neutral600: '#253350',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

// ─── SVG: Corredor Logo Mark ────────────────────────────
function CorredorMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="9" fill={C.brand} />
      {/* Route line: a path suggesting movement through property */}
      <path
        d="M7 30 L13 14 L20 24 L26 18 L33 26"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Property dot at destination */}
      <circle cx="33" cy="26" r="2.5" fill="white" />
    </svg>
  );
}

// ─── SVG: Background grid pattern (brand panel) ─────────
function GridPattern() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        opacity: 0.06,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <pattern id="corredor-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#corredor-grid)" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────
export function LoginPage({
  onSubmit,
  onForgotPassword,
  onRegister,
  error: serverError,
  loading: externalLoading,
}: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const isLoading = loading || externalLoading;
  const displayError = serverError || localError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setLocalError('Ingresá tu dirección de email.'); return; }
    if (!password) { setLocalError('Ingresá tu contraseña.'); return; }
    setLocalError('');
    setLoading(true);
    try {
      await onSubmit?.(email.trim(), password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión. Intentá de nuevo.';
      setLocalError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Animated dots for loading button
  const LoadingDots = () => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)',
            animation: 'corredor-bounce 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </span>
  );

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes corredor-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes corredor-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes corredor-glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.08); }
        }
        .corredor-google-btn:not(:disabled):hover {
          background: #162035 !important;
          border-color: #253350 !important;
        }
        .corredor-forgot:hover {
          color: #EFF4FF !important;
        }
        .corredor-register-link:hover {
          color: #6b8fff !important;
        }
        @media (max-width: 767px) {
          .corredor-brand-panel { display: none !important; }
          .corredor-form-panel { flex: 1 !important; }
        }
      `}</style>

      {/* Root */}
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: F.body,
        backgroundColor: C.bgBase,
        overflow: 'hidden',
      }}>
        {/* ── Left: Brand panel ── */}
        <div
          className="corredor-brand-panel"
          style={{
            flex: '0 0 44%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '40px 48px',
            overflow: 'hidden',
            background: `linear-gradient(160deg, #0B1633 0%, #070D1A 40%, #081020 70%, #0A1830 100%)`,
          }}
        >
          <GridPattern />

          {/* Glow orbs */}
          <div style={{
            position: 'absolute',
            top: '30%', left: '20%',
            width: 360, height: 360,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(22,84,217,0.18) 0%, transparent 70%)',
            animation: 'corredor-glow-pulse 6s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '15%', right: '10%',
            width: 220, height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(22,84,217,0.12) 0%, transparent 70%)',
            animation: 'corredor-glow-pulse 8s ease-in-out infinite 2s',
            pointerEvents: 'none',
          }} />

          {/* Logo */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CorredorMark size={40} />
              <span style={{
                fontFamily: F.display,
                fontSize: '1.5rem',
                fontWeight: 700,
                color: C.textPrimary,
                letterSpacing: '-0.02em',
              }}>
                Corredor
              </span>
            </div>
          </div>

          {/* Center content */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontFamily: F.display,
              fontSize: '1.875rem',
              fontWeight: 700,
              color: C.textPrimary,
              lineHeight: 1.25,
              letterSpacing: '-0.025em',
              marginBottom: 32,
              maxWidth: 380,
            }}>
              La plataforma para corredores inmobiliarios que quieren más.
            </p>

            {/* Feature list */}
            {[
              'Gestioná propiedades, contactos y leads en un solo lugar',
              'Diseñado para el mercado argentino — ARS, CUIT, provincias',
              'Accedé desde tu celular en cualquier visita',
            ].map((feat, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: 14,
                animation: `corredor-fadein 0.5s ease-out both`,
                animationDelay: `${0.1 + i * 0.1}s`,
              }}>
                <div style={{
                  marginTop: 3,
                  width: 16, height: 16,
                  borderRadius: '50%',
                  background: C.brand,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                    <path d="M1.5 4L3.5 6L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{
                  fontSize: '0.9375rem',
                  color: C.textSecondary,
                  lineHeight: 1.5,
                }}>
                  {feat}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom stats */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', gap: 32,
          }}>
            {[
              { num: '12.500+', label: 'propiedades' },
              { num: '3.200', label: 'corredores' },
              { num: '24 prov.', label: 'de Argentina' },
            ].map(({ num, label }) => (
              <div key={num}>
                <div style={{
                  fontFamily: F.display,
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  color: C.textPrimary,
                  letterSpacing: '-0.02em',
                }}>
                  {num}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: C.textTertiary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginTop: 2,
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Form panel ── */}
        <div
          className="corredor-form-panel"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            overflowY: 'auto',
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: 400,
            animation: 'corredor-fadein 0.4s ease-out both',
          }}>
            {/* Mobile-only logo */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 40,
            }}
              className="corredor-mobile-logo"
            >
              <CorredorMark size={32} />
              <span style={{
                fontFamily: F.display,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: C.textPrimary,
                letterSpacing: '-0.02em',
              }}>
                Corredor
              </span>
            </div>

            {/* Heading */}
            <h1 style={{
              fontFamily: F.display,
              fontSize: '1.875rem',
              fontWeight: 700,
              color: C.textPrimary,
              letterSpacing: '-0.025em',
              marginBottom: 6,
            }}>
              Iniciá sesión
            </h1>
            <p style={{
              fontSize: '0.9375rem',
              color: C.textSecondary,
              marginBottom: 32,
            }}>
              Bienvenido de vuelta a tu CRM.
            </p>

            {/* Error banner */}
            {displayError && (
              <div
                role="alert"
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 14px',
                  background: C.errorBg,
                  border: `1px solid ${C.errorBorder}`,
                  borderRadius: 8,
                  marginBottom: 24,
                  fontSize: '0.875rem',
                  color: '#F87171',
                  lineHeight: 1.5,
                  animation: 'corredor-fadein 0.25s ease-out',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
                  <circle cx="8" cy="8" r="7" stroke="#E83B3B" strokeWidth="1.4"/>
                  <path d="M8 5v3.5" stroke="#E83B3B" strokeWidth="1.4" strokeLinecap="round"/>
                  <circle cx="8" cy="11.5" r="0.75" fill="#E83B3B"/>
                </svg>
                {displayError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor={emailId}
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: C.textSecondary,
                    marginBottom: 6,
                    letterSpacing: '0.01em',
                  }}
                >
                  Email
                </label>
                <input
                  id={emailId}
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@inmobiliaria.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  disabled={isLoading}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: C.bgRaised,
                    border: `1px solid ${emailFocused ? C.brand : C.border}`,
                    borderRadius: 8,
                    color: C.textPrimary,
                    fontSize: '0.9375rem',
                    fontFamily: F.body,
                    outline: 'none',
                    boxShadow: emailFocused ? `0 0 0 3px rgba(22,84,217,0.2)` : 'none',
                    transition: 'border-color 150ms ease, box-shadow 150ms ease',
                    caretColor: C.brand,
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label
                    htmlFor={passwordId}
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      color: C.textSecondary,
                      letterSpacing: '0.01em',
                    }}
                  >
                    Contraseña
                  </label>
                  <button
                    type="button"
                    className="corredor-forgot"
                    onClick={onForgotPassword}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      color: C.textTertiary,
                      transition: 'color 150ms ease',
                      padding: 0,
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id={passwordId}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    disabled={isLoading}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 44px 10px 14px',
                      background: C.bgRaised,
                      border: `1px solid ${passwordFocused ? C.brand : C.border}`,
                      borderRadius: 8,
                      color: C.textPrimary,
                      fontSize: '0.9375rem',
                      fontFamily: F.body,
                      outline: 'none',
                      boxShadow: passwordFocused ? `0 0 0 3px rgba(22,84,217,0.2)` : 'none',
                      transition: 'border-color 150ms ease, box-shadow 150ms ease',
                      caretColor: C.brand,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    style={{
                      position: 'absolute', right: 12, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none',
                      cursor: 'pointer', padding: 2,
                      color: C.textTertiary, display: 'flex',
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '11px 20px',
                  background: isLoading ? C.bgSubtle : C.brand,
                  border: 'none',
                  borderRadius: 8,
                  color: isLoading ? C.textTertiary : 'white',
                  fontSize: '0.9375rem',
                  fontFamily: F.body,
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'background 150ms ease, transform 100ms ease',
                  letterSpacing: '0.01em',
                  minHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={e => {
                  if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = C.brandHov;
                }}
                onMouseLeave={e => {
                  if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = C.brand;
                }}
              >
                {isLoading ? <LoadingDots /> : 'Ingresar'}
              </button>
            </form>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              margin: '24px 0',
            }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: '0.75rem', color: C.textTertiary, flexShrink: 0 }}>o continuá con</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {/* Google SSO (disabled) */}
            <button
              type="button"
              disabled
              className="corredor-google-btn"
              style={{
                width: '100%',
                padding: '10px 20px',
                background: C.bgRaised,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.textTertiary,
                fontSize: '0.875rem',
                fontFamily: F.body,
                fontWeight: 500,
                cursor: 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'background 150ms ease, border-color 150ms ease',
                position: 'relative',
                minHeight: 44,
                opacity: 0.6,
              }}
            >
              {/* Google logo */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Iniciar con Google
              <span style={{
                position: 'absolute', right: 14,
                fontSize: '0.6875rem',
                color: C.textTertiary,
                background: C.bgSubtle,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                padding: '1px 6px',
                letterSpacing: '0.05em',
              }}>
                PRÓXIMAMENTE
              </span>
            </button>

            {/* Register link */}
            <p style={{
              textAlign: 'center',
              marginTop: 28,
              fontSize: '0.875rem',
              color: C.textTertiary,
            }}>
              ¿No tenés cuenta?{' '}
              <button
                type="button"
                className="corredor-register-link"
                onClick={onRegister}
                style={{
                  background: 'none', border: 'none',
                  cursor: 'pointer',
                  color: '#6b8fff',
                  fontWeight: 500,
                  fontFamily: F.body,
                  fontSize: '0.875rem',
                  transition: 'color 150ms ease',
                  padding: 0,
                }}
              >
                Registrate gratis
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
