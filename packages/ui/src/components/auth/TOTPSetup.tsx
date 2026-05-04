import React, { useState } from 'react';

/* ─────────────────────────────────────────────────────────
   Corredor CRM — TOTP Setup Screen
   Features:
   - QR code display (placeholder — real QR via qrcode.react)
   - Manual secret key entry fallback
   - 6-digit OTP input with auto-advance
   - Backup codes display + download
   Two views: "setup" → "verify" → "backup-codes"
   ───────────────────────────────────────────────────────── */

const C = {
  bgBase:    '#070D1A',
  bgRaised:  '#0D1526',
  bgSubtle:  '#162035',
  bgOverlay: '#121D33',
  brand:     '#1654d9',
  brandHov:  '#1244b8',
  brandFaint:'rgba(22,84,217,0.12)',
  border:    '#1F2D48',
  borderStrong: '#253350',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#6B809E',
  error:    '#E83B3B',
  errorBg:  '#260C0C',
  errorBorder: '#4A1A1A',
  success:   '#18A659',
  successBg: '#0A2217',
  successBorder: '#1A4D30',
  warning:   '#E88A14',
  warningBg: '#261A07',
  warningBorder: '#4A340E',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
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

// ─── QR Code placeholder (real impl: use qrcode.react) ──
function QRCodePlaceholder({ value }: { value: string }) {
  // Render a visual QR placeholder. Consumer should replace with:
  // import { QRCodeSVG } from 'qrcode.react';
  // <QRCodeSVG value={value} size={180} bgColor="transparent" fgColor="#EFF4FF" />
  void value;
  return (
    <div style={{
      width: 180, height: 180,
      background: C.bgOverlay,
      border: `2px solid ${C.border}`,
      borderRadius: 12,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: 16,
    }}>
      {/* QR placeholder grid */}
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-label="QR code placeholder — integrar qrcode.react">
        {/* Corner squares */}
        {([[4,4],[84,4],[4,84]] as [number,number][]).map(([x,y], i) => (
          <g key={i}>
            <rect x={x} y={y} width={32} height={32} rx="3" fill="none" stroke={C.borderStrong} strokeWidth="2"/>
            <rect x={x+7} y={y+7} width={18} height={18} rx="1.5" fill={C.border}/>
          </g>
        ))}
        {/* Random dots representing data cells */}
        {[
          [42,4],[50,4],[58,4],[42,12],[58,12],[50,12],
          [4,42],[4,50],[4,58],[12,42],[12,58],[12,50],
          [42,42],[50,42],[58,42],[66,42],[74,42],[42,50],
          [58,50],[74,50],[42,58],[50,58],[66,58],[74,58],
          [42,66],[50,66],[58,66],[42,74],[66,74],
          [84,42],[92,42],[100,42],[108,42],[84,50],[100,50],
          [84,58],[92,58],[108,58],[84,66],[92,66],[100,74],
          [42,84],[50,84],[66,84],[74,84],[42,92],[58,92],
          [74,92],[42,100],[50,100],[58,100],[66,100],[74,100],
          [50,108],[66,108],[74,108],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width={6} height={6} rx="1" fill={C.borderStrong} opacity={0.7}/>
        ))}
      </svg>
      <span style={{ fontSize: '0.6875rem', color: C.textTertiary, textAlign: 'center', lineHeight: 1.4 }}>
        Integrar qrcode.react
      </span>
    </div>
  );
}

// ─── OTP digit input ──────────────────────────────────────
function OTPInput({
  value, onChange, error, disabled,
}: {
  value: string; onChange: (v: string) => void;
  error?: boolean; disabled?: boolean;
}) {
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const raw = e.target.value.replace(/\D/g, '');
    const newDigits = [...digits];
    if (raw.length > 1) {
      // Paste handling
      const pasted = raw.slice(0, 6);
      onChange(pasted);
      return;
    }
    newDigits[idx] = raw.slice(-1);
    onChange(newDigits.join(''));
    // Auto-advance
    if (raw && idx < 5) {
      const next = document.getElementById(`totp-digit-${idx + 1}`);
      next?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      const prev = document.getElementById(`totp-digit-${idx - 1}`);
      prev?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      document.getElementById(`totp-digit-${idx - 1}`)?.focus();
    }
    if (e.key === 'ArrowRight' && idx < 5) {
      document.getElementById(`totp-digit-${idx + 1}`)?.focus();
    }
  };

  return (
    <div role="group" aria-label="Código de verificación de 6 dígitos" style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {digits.map((digit, idx) => (
        <React.Fragment key={idx}>
          {idx === 3 && (
            <div style={{ width: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 6, height: 2, background: C.border, borderRadius: 1 }} />
            </div>
          )}
          <input
            id={`totp-digit-${idx}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={6}
            value={digit}
            onChange={e => handleChange(e, idx)}
            onKeyDown={e => handleKeyDown(e, idx)}
            onFocus={e => e.target.select()}
            disabled={disabled}
            aria-label={`Dígito ${idx + 1} de 6`}
            style={{
              width: 48, height: 56,
              textAlign: 'center',
              background: C.bgRaised,
              border: `2px solid ${error ? C.error : digit ? C.brand : C.border}`,
              borderRadius: 10,
              color: C.textPrimary,
              fontSize: '1.5rem',
              fontFamily: F.mono,
              fontWeight: 500,
              outline: 'none',
              caretColor: C.brand,
              transition: 'border-color 150ms ease',
              letterSpacing: 0,
            }}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Backup codes display ─────────────────────────────────
interface BackupCode { code: string; used: boolean }

function BackupCodesView({
  codes, onDone,
}: { codes: BackupCode[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  const codeText = codes.map(c => c.code).join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: focus the textarea
    }
  };

  const handleDownload = () => {
    const blob = new Blob([`Corredor CRM — Códigos de respaldo\n\n${codeText}\n\nGuardalos en un lugar seguro. Cada código solo puede usarse una vez.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'corredor-backup-codes.txt';
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{
        padding: '12px 14px', background: C.warningBg,
        border: `1px solid ${C.warningBorder}`, borderRadius: 8,
        fontSize: '0.875rem', color: '#FCD34D',
        lineHeight: 1.55, marginBottom: 20,
        display: 'flex', gap: 10,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#E88A14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="9" x2="12" y2="13" stroke="#E88A14" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="12" cy="17" r="0.75" fill="#E88A14"/>
        </svg>
        <span>
          Guardá estos códigos en un lugar seguro. Son la única forma de recuperar tu cuenta si perdés el acceso a tu app autenticadora.
        </span>
      </div>

      <div style={{
        background: C.bgBase,
        border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 16, marginBottom: 16,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
      }}>
        {codes.map(({ code, used }) => (
          <div key={code} style={{
            fontFamily: F.mono, fontSize: '0.9375rem',
            color: used ? C.textTertiary : C.textPrimary,
            textDecoration: used ? 'line-through' : 'none',
            padding: '6px 10px',
            background: used ? C.bgSubtle : C.bgRaised,
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            letterSpacing: '0.05em',
          }}>
            {code}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button type="button" onClick={handleCopy} style={{
          flex: 1, padding: '9px 14px',
          background: copied ? C.successBg : C.bgRaised,
          border: `1px solid ${copied ? C.successBorder : C.border}`,
          borderRadius: 8,
          color: copied ? C.success : C.textSecondary,
          fontSize: '0.875rem', fontFamily: F.body, fontWeight: 500,
          cursor: 'pointer', transition: 'all 200ms ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Copiado
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copiar
            </>
          )}
        </button>
        <button type="button" onClick={handleDownload} style={{
          flex: 1, padding: '9px 14px',
          background: C.bgRaised, border: `1px solid ${C.border}`,
          borderRadius: 8, color: C.textSecondary,
          fontSize: '0.875rem', fontFamily: F.body, fontWeight: 500,
          cursor: 'pointer', transition: 'all 150ms ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.borderStrong;
            (e.currentTarget as HTMLButtonElement).style.color = C.textPrimary;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
            (e.currentTarget as HTMLButtonElement).style.color = C.textSecondary;
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar
        </button>
      </div>

      <button type="button" onClick={onDone} style={{
        width: '100%', padding: '11px 20px',
        background: C.brand, border: 'none', borderRadius: 8,
        color: 'white', fontSize: '0.9375rem', fontFamily: F.body, fontWeight: 600,
        cursor: 'pointer', minHeight: 44,
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.brandHov; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.brand; }}
      >
        He guardado los códigos
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────
export interface TOTPSetupProps {
  /** TOTP provisioning URI for the QR code (otpauth://...) */
  totpUri?: string;
  /** Plain secret key for manual entry */
  secretKey?: string;
  /** Generated backup codes */
  backupCodes?: string[];
  onVerify?: (otp: string) => Promise<void>;
  onComplete?: () => void;
  error?: string;
}

export function TOTPSetup({
  totpUri = 'otpauth://totp/Corredor%3Aejemplo%40corredor.ar?secret=JBSWY3DPEHPK3PXP&issuer=Corredor',
  secretKey = 'JBSWY3DP EHPK3PXP',
  backupCodes = ['1a2b3c4d', '5e6f7g8h', '9i0j1k2l', '3m4n5o6p', '7q8r9s0t', 'u1v2w3x4', 'y5z6a7b8', 'c9d0e1f2'],
  onVerify,
  onComplete,
  error: serverError,
}: TOTPSetupProps) {
  const [view, setView] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [otp, setOtp] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const displayError = serverError || localError;

  const backupCodeObjs: BackupCode[] = backupCodes.map(c => ({ code: c, used: false }));

  const handleVerify = async () => {
    if (otp.length < 6) { setLocalError('Ingresá los 6 dígitos del código.'); return; }
    setLocalError('');
    setLoading(true);
    try {
      await onVerify?.(otp);
      setView('backup');
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Código inválido. Verificá tu app autenticadora.');
    } finally {
      setLoading(false);
    }
  };

  const STEP_TITLES = {
    setup: 'Configurar autenticación en dos pasos',
    verify: 'Verificar código',
    backup: 'Códigos de respaldo',
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.bgBase,
      fontFamily: F.body, display: 'flex',
      flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
          <CorredorMark size={30} />
          <span style={{ fontFamily: F.display, fontSize: '1.125rem', fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em' }}>
            Corredor
          </span>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
          {(['setup', 'verify', 'backup'] as const).map((v, i) => (
            <div key={v} style={{
              width: view === v ? 24 : 8, height: 8,
              borderRadius: 4,
              background: (['setup','verify','backup'].indexOf(view) >= i) ? C.brand : C.border,
              transition: 'width 250ms ease, background 200ms ease',
            }} />
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: C.bgRaised,
          border: `1px solid ${C.border}`,
          borderRadius: 14, padding: '28px 28px 24px',
        }}>
          <h1 style={{
            fontFamily: F.display,
            fontSize: '1.25rem', fontWeight: 700,
            color: C.textPrimary, letterSpacing: '-0.02em',
            marginBottom: 6,
          }}>
            {STEP_TITLES[view]}
          </h1>

          {view === 'setup' && (
            <>
              <p style={{ fontSize: '0.9rem', color: C.textSecondary, lineHeight: 1.55, marginBottom: 24 }}>
                Escaneá el código QR con tu app autenticadora (Google Authenticator, Authy, etc.).
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <QRCodePlaceholder value={totpUri} />
              </div>

              {/* Manual entry toggle */}
              <button type="button" onClick={() => setShowSecret(v => !v)} style={{
                width: '100%', padding: '8px 14px',
                background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.textTertiary, fontFamily: F.body, fontSize: '0.8125rem',
                cursor: 'pointer', marginBottom: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'border-color 150ms, color 150ms',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.borderStrong;
                  (e.currentTarget as HTMLButtonElement).style.color = C.textSecondary;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                  (e.currentTarget as HTMLButtonElement).style.color = C.textTertiary;
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points={showSecret ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
                </svg>
                {showSecret ? 'Ocultar clave manual' : 'Ingresar clave manualmente'}
              </button>

              {showSecret && (
                <div style={{
                  padding: '12px 14px',
                  background: C.bgBase, border: `1px solid ${C.border}`,
                  borderRadius: 8, marginBottom: 20,
                }}>
                  <p style={{ fontSize: '0.75rem', color: C.textTertiary, marginBottom: 6 }}>Clave secreta</p>
                  <code style={{
                    fontFamily: F.mono, fontSize: '1rem',
                    color: C.textPrimary, letterSpacing: '0.1em',
                    wordBreak: 'break-all',
                  }}>
                    {secretKey}
                  </code>
                </div>
              )}

              <button type="button" onClick={() => setView('verify')} style={{
                width: '100%', padding: '11px 20px',
                background: C.brand, border: 'none', borderRadius: 8,
                color: 'white', fontSize: '0.9375rem', fontFamily: F.body, fontWeight: 600,
                cursor: 'pointer', minHeight: 44,
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.brandHov; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.brand; }}
              >
                Continuar
              </button>
            </>
          )}

          {view === 'verify' && (
            <>
              <p style={{ fontSize: '0.9rem', color: C.textSecondary, lineHeight: 1.55, marginBottom: 28 }}>
                Ingresá el código de 6 dígitos que aparece en tu app autenticadora.
              </p>

              {displayError && (
                <div role="alert" style={{
                  padding: '10px 14px', background: C.errorBg,
                  border: `1px solid ${C.errorBorder}`, borderRadius: 8,
                  fontSize: '0.875rem', color: '#F87171', marginBottom: 20,
                }}>
                  {displayError}
                </div>
              )}

              <div style={{ marginBottom: 28 }}>
                <OTPInput value={otp} onChange={v => { setOtp(v); setLocalError(''); }} error={!!displayError} disabled={loading} />
              </div>

              <button type="button" onClick={handleVerify} disabled={loading || otp.length < 6} style={{
                width: '100%', padding: '11px 20px',
                background: (loading || otp.length < 6) ? C.bgSubtle : C.brand,
                border: 'none', borderRadius: 8,
                color: (loading || otp.length < 6) ? C.textTertiary : 'white',
                fontSize: '0.9375rem', fontFamily: F.body, fontWeight: 600,
                cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer',
                minHeight: 44, marginBottom: 12,
                transition: 'background 150ms',
              }}>
                {loading ? 'Verificando...' : 'Verificar código'}
              </button>

              <button type="button" onClick={() => setView('setup')} style={{
                width: '100%', padding: '9px 14px',
                background: 'none', border: 'none',
                color: C.textTertiary, fontFamily: F.body, fontSize: '0.875rem',
                cursor: 'pointer',
              }}>
                Atrás
              </button>
            </>
          )}

          {view === 'backup' && (
            <BackupCodesView codes={backupCodeObjs} onDone={() => onComplete?.()} />
          )}
        </div>
      </div>
    </div>
  );
}
