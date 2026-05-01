import React, { useState, useEffect, useRef } from 'react';

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  bgOverlay:     'rgba(7,13,26,0.85)',
  border:        '#1F2D48',
  borderHover:   '#2A3D5C',
  brand:         '#1654d9',
  brandLight:    '#4669ff',
  brandFaint:    'rgba(22,84,217,0.12)',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  ai:            '#7E3AF2',
  aiLight:       '#9B59FF',
  aiFaint:       'rgba(126,58,242,0.12)',
  success:       '#18A659',
  successFaint:  'rgba(24,166,89,0.12)',
  warning:       '#E88A14',
  error:         '#E83B3B',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

/* ─── Types ─────────────────────────────────────────────────── */
type Tone    = 'formal' | 'casual' | 'lujo';
type Portal  = 'zonaprop' | 'argenprop' | 'mercadolibre' | 'inmuebles24';
type GenStep = 'idle' | 'streaming' | 'done' | 'comparing';

/* ─── Mock content ──────────────────────────────────────────── */
const EXISTING_DESCRIPTION = `Departamento de 3 ambientes en Belgrano. 95 m² totales, piso 4. Cuenta con cochera cubierta. Luminoso. Excelente ubicación.`;

const GENERATED_DESCRIPTIONS: Record<Tone, string> = {
  formal: `Elegante departamento de tres ambientes ubicado en el corazón de Belgrano, sobre Av. Cabildo al 1850. Con una superficie total de 95 m², el inmueble ofrece una distribución ideal en planta alta, con excelente iluminación natural durante todo el día. Incluye cochera cubierta en planta baja. La propiedad se encuentra a metros del acceso al Subte D, supermercados y servicios. Ideal para familia o profesional exigente. Expensas moderadas.`,
  casual:  `¡Hermoso 3 ambientes en pleno Belgrano! 95 m² super cómodos, todo luminoso y bien ubicado sobre Cabildo. Tiene cochera propia cubierta en el mismo edificio, lo que se consigue poco hoy en día. Piso 4, re tranquilo y soleado. A metros del subte y de todo. Las expensas son razonables. Una excelente oportunidad para vivir o invertir.`,
  lujo:    `Destacada unidad de tres ambientes en Av. Cabildo al 1850, Belgrano Premium. Sus 95 m² de superficie distribuida en un cuarto piso contemplan terminaciones de alta calidad, amplios ventanales que garantizan luminosidad plena y un ambiente de serenidad poco habitual en la zona. Cochera cubierta privada incluida. Ubicación estratégica a metros del Subte D, con acceso inmediato al corredor gastronómico y comercial de Belgrano R. Una residencia para quienes valoran el detalle.`,
};

const PORTAL_LABELS: Record<Portal, string> = {
  zonaprop:      'ZonaProp',
  argenprop:     'Argenprop',
  mercadolibre:  'MercadoLibre',
  inmuebles24:   'Inmuebles24',
};

const TONE_CONFIG: Record<Tone, { label: string; desc: string; icon: string }> = {
  formal:  { label: 'Formal',  desc: 'Profesional y preciso',    icon: '🏛️' },
  casual:  { label: 'Casual',  desc: 'Cercano y conversacional',  icon: '😊' },
  lujo:    { label: 'Lujo',    desc: 'Premium y aspiracional',    icon: '✨' },
};

/* ─── Streaming text hook ───────────────────────────────────── */
function useStreamingText(target: string, active: boolean) {
  const [displayed, setDisplayed] = useState('');
  const [done,      setDone]      = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || !target) return;
    setDisplayed('');
    setDone(false);
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx += Math.floor(Math.random() * 4) + 2; // 2-5 chars per tick
      if (idx >= target.length) {
        setDisplayed(target);
        setDone(true);
        clearInterval(intervalRef.current!);
      } else {
        setDisplayed(target.slice(0, idx));
      }
    }, 30);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [target, active]);

  return { displayed, done };
}

/* ─── Diff view ─────────────────────────────────────────────── */
function DiffView({ original, generated }: { original: string; generated: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {/* Before */}
      <div>
        <div style={{
          padding:      '6px 12px',
          borderRadius: '8px 8px 0 0',
          background:   C.bgElevated,
          border:       `1px solid ${C.border}`,
          borderBottom: 'none',
          fontFamily:   F.mono,
          fontSize:     11,
          fontWeight:   600,
          color:        C.textTertiary,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Descripción actual
        </div>
        <div style={{
          padding:      14,
          borderRadius: '0 0 8px 8px',
          background:   `${C.error}08`,
          border:       `1px solid ${C.error}25`,
          fontFamily:   F.body,
          fontSize:     13,
          color:        C.textSecondary,
          lineHeight:   1.6,
          minHeight:    120,
        }}>
          {original}
        </div>
      </div>

      {/* After */}
      <div>
        <div style={{
          padding:      '6px 12px',
          borderRadius: '8px 8px 0 0',
          background:   C.aiFaint,
          border:       `1px solid ${C.ai}30`,
          borderBottom: 'none',
          fontFamily:   F.mono,
          fontSize:     11,
          fontWeight:   600,
          color:        C.ai,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          display:      'flex',
          alignItems:   'center',
          gap:          6,
        }}>
          <span>✦</span>
          Descripción generada por IA
        </div>
        <div style={{
          padding:      14,
          borderRadius: '0 0 8px 8px',
          background:   C.aiFaint,
          border:       `1px solid ${C.ai}30`,
          fontFamily:   F.body,
          fontSize:     13,
          color:        C.textPrimary,
          lineHeight:   1.6,
          minHeight:    120,
        }}>
          {generated}
        </div>
      </div>
    </div>
  );
}

/* ─── Props ─────────────────────────────────────────────────── */
interface AIDescriptionModalProps {
  open:      boolean;
  onClose:   () => void;
  onSave?:   (text: string, portal: Portal) => void;
  propertyId?: string;
}

/* ─── Component ─────────────────────────────────────────────── */
export default function AIDescriptionModal({
  open,
  onClose,
  onSave,
  propertyId = 'BEL-00142',
}: AIDescriptionModalProps) {
  const [tone,        setTone]        = useState<Tone>('formal');
  const [portal,      setPortal]      = useState<Portal>('zonaprop');
  const [destacar,    setDestacar]    = useState('');
  const [step,        setStep]        = useState<GenStep>('idle');
  const [targetText,  setTargetText]  = useState('');
  const [showDiff,    setShowDiff]    = useState(false);

  const { displayed: streamText, done: streamDone } = useStreamingText(
    targetText,
    step === 'streaming',
  );

  useEffect(() => {
    if (streamDone && step === 'streaming') {
      setStep('done');
    }
  }, [streamDone, step]);

  useEffect(() => {
    if (!open) {
      // Reset on close
      setStep('idle');
      setTargetText('');
      setShowDiff(false);
    }
  }, [open]);

  if (!open) return null;

  const handleGenerate = () => {
    setStep('streaming');
    setTargetText(GENERATED_DESCRIPTIONS[tone]);
    setShowDiff(false);
  };

  const handleRegenerate = () => {
    setStep('streaming');
    // Slight variation for demo
    setTargetText(GENERATED_DESCRIPTIONS[tone] + ' ');
    setShowDiff(false);
  };

  const handleSave = () => {
    onSave?.(streamText || targetText, portal);
    onClose();
  };

  const displayText = step === 'streaming' ? streamText : (step === 'done' ? targetText : '');

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          background: C.bgOverlay,
          backdropFilter: 'blur(4px)',
          zIndex:     1000,
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-label="Generar descripción con IA"
        style={{
          position:     'fixed',
          top:          '50%',
          left:         '50%',
          transform:    'translate(-50%, -50%)',
          width:        '100%',
          maxWidth:     680,
          maxHeight:    '90vh',
          overflowY:    'auto',
          background:   C.bgRaised,
          border:       `1px solid ${C.border}`,
          borderRadius: 16,
          boxShadow:    `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${C.ai}15`,
          zIndex:       1001,
        }}
      >
        {/* Header */}
        <div style={{
          padding:         '18px 24px',
          borderBottom:    `1px solid ${C.border}`,
          display:         'flex',
          alignItems:      'center',
          gap:             12,
          position:        'sticky',
          top:             0,
          background:      C.bgRaised,
          zIndex:          1,
        }}>
          <div style={{
            width:          36,
            height:         36,
            borderRadius:   10,
            background:     C.aiFaint,
            border:         `1px solid ${C.ai}30`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       17,
            color:          C.ai,
          }}>
            ✦
          </div>
          <div>
            <h2 style={{
              fontFamily: F.display,
              fontWeight: 700,
              fontSize:   16,
              color:      C.textPrimary,
              margin:     0,
            }}>
              Generar descripción con IA
            </h2>
            <p style={{
              fontFamily: F.mono,
              fontSize:   11,
              color:      C.textTertiary,
              margin:     '2px 0 0',
            }}>
              {propertyId}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              marginLeft:   'auto',
              background:   'transparent',
              border:       'none',
              color:        C.textTertiary,
              cursor:       'pointer',
              fontSize:     18,
              padding:      6,
              lineHeight:   1,
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Section 1: Tone */}
          <div style={{ marginBottom: 22 }}>
            <label style={{
              display:       'block',
              fontFamily:    F.mono,
              fontSize:      11,
              fontWeight:    600,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color:         C.textTertiary,
              marginBottom:  10,
            }}>
              Tono
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {(Object.entries(TONE_CONFIG) as [Tone, typeof TONE_CONFIG[Tone]][]).map(([t, cfg]) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  style={{
                    padding:      '12px 14px',
                    borderRadius: 10,
                    background:   tone === t ? C.aiFaint : C.bgElevated,
                    border:       `1px solid ${tone === t ? C.ai : C.border}`,
                    cursor:       'pointer',
                    textAlign:    'left',
                    transition:   'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{cfg.icon}</div>
                  <div style={{
                    fontFamily: F.body,
                    fontWeight: 600,
                    fontSize:   13,
                    color:      tone === t ? C.textPrimary : C.textSecondary,
                  }}>
                    {cfg.label}
                  </div>
                  <div style={{
                    fontFamily: F.body,
                    fontSize:   11,
                    color:      tone === t ? C.aiLight : C.textTertiary,
                    marginTop:  2,
                  }}>
                    {cfg.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Portal */}
          <div style={{ marginBottom: 22 }}>
            <label style={{
              display:       'block',
              fontFamily:    F.mono,
              fontSize:      11,
              fontWeight:    600,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color:         C.textTertiary,
              marginBottom:  10,
            }}>
              Portal de destino
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(Object.entries(PORTAL_LABELS) as [Portal, string][]).map(([p, label]) => (
                <button
                  key={p}
                  onClick={() => setPortal(p)}
                  style={{
                    padding:      '7px 16px',
                    borderRadius: 8,
                    background:   portal === p ? C.brandFaint : C.bgElevated,
                    border:       `1px solid ${portal === p ? `${C.brand}60` : C.border}`,
                    color:        portal === p ? C.brandLight : C.textSecondary,
                    fontFamily:   F.body,
                    fontSize:     13,
                    fontWeight:   portal === p ? 600 : 400,
                    cursor:       'pointer',
                    transition:   'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <p style={{
              fontFamily: F.body,
              fontSize:   12,
              color:      C.textTertiary,
              marginTop:  6,
            }}>
              La descripción se optimizará para el límite de caracteres y el estilo de este portal.
            </p>
          </div>

          {/* Section 3: Destacar */}
          <div style={{ marginBottom: 22 }}>
            <label
              htmlFor="destacar-input"
              style={{
                display:       'block',
                fontFamily:    F.mono,
                fontSize:      11,
                fontWeight:    600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color:         C.textTertiary,
                marginBottom:  8,
              }}
            >
              Destacar (opcional)
            </label>
            <input
              id="destacar-input"
              value={destacar}
              onChange={e => setDestacar(e.target.value)}
              placeholder="Ej: cochera cubierta, luminoso, ideal inversión…"
              style={{
                width:        '100%',
                padding:      '10px 14px',
                borderRadius: 8,
                background:   C.bgElevated,
                border:       `1px solid ${C.border}`,
                color:        C.textPrimary,
                fontFamily:   F.body,
                fontSize:     13,
                outline:      'none',
                boxSizing:    'border-box',
              }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = `${C.ai}60`; }}
              onBlur={e  => { (e.target as HTMLElement).style.borderColor = C.border; }}
            />
          </div>

          {/* Generate button (idle state) */}
          {step === 'idle' && (
            <button
              onClick={handleGenerate}
              style={{
                width:        '100%',
                padding:      '12px 20px',
                borderRadius: 10,
                background:   `linear-gradient(135deg, ${C.ai}, ${C.brand})`,
                border:       'none',
                color:        '#fff',
                fontFamily:   F.display,
                fontWeight:   700,
                fontSize:     15,
                cursor:       'pointer',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                gap:          8,
              }}
            >
              <span>✦</span>
              Generar descripción
            </button>
          )}

          {/* Streaming / done: preview area */}
          {(step === 'streaming' || step === 'done') && !showDiff && (
            <div style={{ marginTop: 0 }}>
              <div style={{
                display:       'flex',
                alignItems:    'center',
                justifyContent: 'space-between',
                marginBottom:  8,
              }}>
                <label style={{
                  fontFamily:    F.mono,
                  fontSize:      11,
                  fontWeight:    600,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color:         step === 'done' ? C.ai : C.textTertiary,
                  display:       'flex',
                  alignItems:    'center',
                  gap:           6,
                }}>
                  {step === 'streaming' && (
                    <span style={{ animation: 'description-pulse 1s ease-in-out infinite' }}>●</span>
                  )}
                  {step === 'streaming' ? 'Generando…' : '✦ Descripción generada'}
                </label>
                {step === 'done' && (
                  <button
                    onClick={() => setShowDiff(true)}
                    style={{
                      background:   'transparent',
                      border:       'none',
                      color:        C.textTertiary,
                      fontFamily:   F.body,
                      fontSize:     12,
                      cursor:       'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Ver comparación
                  </button>
                )}
              </div>

              <div style={{
                padding:      16,
                borderRadius: 10,
                background:   C.aiFaint,
                border:       `1px solid ${C.ai}30`,
                fontFamily:   F.body,
                fontSize:     13,
                color:        C.textPrimary,
                lineHeight:   1.7,
                minHeight:    100,
                position:     'relative',
              }}>
                {displayText}
                {step === 'streaming' && (
                  <span style={{
                    display:          'inline-block',
                    width:            2,
                    height:           14,
                    background:       C.ai,
                    marginLeft:       2,
                    verticalAlign:    'text-bottom',
                    animation:        'description-cursor 0.8s step-end infinite',
                  }} />
                )}
              </div>

              {/* Char count */}
              {step === 'done' && (
                <div style={{
                  marginTop:  4,
                  textAlign:  'right',
                  fontFamily: F.mono,
                  fontSize:   11,
                  color:      C.textTertiary,
                }}>
                  {displayText.length} caracteres
                </div>
              )}
            </div>
          )}

          {/* Diff / comparison view */}
          {showDiff && step === 'done' && (
            <div style={{ marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{
                  fontFamily:    F.mono,
                  fontSize:      11,
                  fontWeight:    600,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color:         C.textTertiary,
                }}>
                  Comparación
                </label>
                <button
                  onClick={() => setShowDiff(false)}
                  style={{
                    background:   'transparent',
                    border:       'none',
                    color:        C.textTertiary,
                    fontFamily:   F.body,
                    fontSize:     12,
                    cursor:       'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Volver a la vista simple
                </button>
              </div>
              <DiffView original={EXISTING_DESCRIPTION} generated={targetText} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding:      '16px 24px',
          borderTop:    `1px solid ${C.border}`,
          display:      'flex',
          gap:          10,
          alignItems:   'center',
          position:     'sticky',
          bottom:       0,
          background:   C.bgRaised,
        }}>
          {step === 'done' && (
            <button
              onClick={handleSave}
              style={{
                padding:      '10px 24px',
                borderRadius: 8,
                background:   C.brand,
                border:       'none',
                color:        '#fff',
                fontFamily:   F.body,
                fontWeight:   700,
                fontSize:     14,
                cursor:       'pointer',
              }}
            >
              Guardar descripción
            </button>
          )}

          {(step === 'streaming' || step === 'done') && (
            <button
              onClick={handleRegenerate}
              disabled={step === 'streaming'}
              style={{
                padding:      '10px 18px',
                borderRadius: 8,
                background:   'transparent',
                border:       `1px solid ${C.border}`,
                color:        step === 'streaming' ? C.textTertiary : C.textSecondary,
                fontFamily:   F.body,
                fontSize:     14,
                cursor:       step === 'streaming' ? 'default' : 'pointer',
                display:      'flex',
                alignItems:   'center',
                gap:          6,
              }}
            >
              <span>↺</span>
              Regenerar
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              marginLeft:   'auto',
              padding:      '10px 18px',
              borderRadius: 8,
              background:   'transparent',
              border:       'none',
              color:        C.textTertiary,
              fontFamily:   F.body,
              fontSize:     14,
              cursor:       'pointer',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes description-pulse {
          0%, 100% { opacity: 1; color: ${C.ai}; }
          50%       { opacity: 0.4; }
        }
        @keyframes description-cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </>
  );
}

/* ─── Demo wrapper ──────────────────────────────────────────── */
export function AIDescriptionDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      minHeight:      '100vh',
      background:     C.bgBase,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontFamily:     F.body,
    }}>
      {/* Wireframe badge */}
      <div style={{
        position:  'fixed',
        top:       0,
        left:      0,
        right:     0,
        background: C.bgRaised,
        borderBottom: `1px solid ${C.border}`,
        padding:   '8px 24px',
        fontSize:  12,
        fontFamily: F.mono,
        color:     C.textTertiary,
        zIndex:    50,
        display:   'flex',
        alignItems: 'center',
      }}>
        <span style={{ color: C.ai, fontWeight: 600 }}>✦ WIREFRAME · RENA-79 · AIDescriptionModal</span>
      </div>

      {/* Simulated property page context */}
      <div style={{
        padding:      32,
        borderRadius: 16,
        background:   C.bgRaised,
        border:       `1px solid ${C.border}`,
        maxWidth:     560,
        width:        '100%',
        marginTop:    48,
      }}>
        <h3 style={{ fontFamily: F.display, color: C.textPrimary, margin: '0 0 4px' }}>
          Av. Cabildo 1850, Belgrano
        </h3>
        <p style={{ fontFamily: F.mono, fontSize: 12, color: C.textTertiary, margin: '0 0 20px' }}>
          BEL-00142 · 3 amb · USD 285.000
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            display:       'block',
            fontFamily:    F.mono,
            fontSize:      11,
            fontWeight:    600,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color:         C.textTertiary,
            marginBottom:  6,
          }}>
            Descripción
          </label>
          <div style={{
            padding:      12,
            borderRadius: 8,
            background:   C.bgElevated,
            border:       `1px solid ${C.border}`,
            fontFamily:   F.body,
            fontSize:     13,
            color:        C.textSecondary,
            lineHeight:   1.6,
          }}>
            {EXISTING_DESCRIPTION}
          </div>
        </div>

        {/* CTA button — this is how the modal gets triggered from the property form */}
        <button
          onClick={() => setOpen(true)}
          style={{
            padding:      '9px 18px',
            borderRadius: 8,
            background:   C.aiFaint,
            border:       `1px solid ${C.ai}40`,
            color:        C.aiLight,
            fontFamily:   F.body,
            fontWeight:   600,
            fontSize:     13,
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            gap:          7,
            transition:   'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background    = `${C.ai}25`;
            (e.currentTarget as HTMLElement).style.borderColor   = `${C.ai}70`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background  = C.aiFaint;
            (e.currentTarget as HTMLElement).style.borderColor = `${C.ai}40`;
          }}
        >
          <span style={{ fontSize: 14 }}>✦</span>
          Generar descripción IA
        </button>
      </div>

      <AIDescriptionModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={(text, portal) => {
          console.log('Saved:', { text, portal });
          setOpen(false);
        }}
      />
    </div>
  );
}
