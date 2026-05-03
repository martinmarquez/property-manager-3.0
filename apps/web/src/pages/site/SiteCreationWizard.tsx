import React, { useState } from 'react';
import { Check, Upload, ChevronRight, ChevronLeft, Globe, Rocket, ExternalLink } from 'lucide-react';
import { C, F } from '../../components/copilot/tokens.js';

/* ─── Theme catalogue ──────────────────────────────────────────── */

const THEMES = [
  { id: 'clasico',  label: 'Clásico',  bg: '#131E33', accent: '#1654d9',   text: '#EFF4FF' },
  { id: 'oscuro',   label: 'Oscuro',   bg: '#0A0A0A', accent: '#E0E0E0',   text: '#FFFFFF' },
  { id: 'tierra',   label: 'Tierra',   bg: '#2C1810', accent: '#8B5E3C',   text: '#F5EDE0' },
  { id: 'moderno',  label: 'Moderno',  bg: '#0A1628', accent: '#0ED2A0',   text: '#EFF4FF' },
  { id: 'minimal',  label: 'Minimal',  bg: '#F5F5F5', accent: '#1A1A1A',   text: '#1A1A1A' },
] as const;

type ThemeId = typeof THEMES[number]['id'];

interface BrandSettings {
  name: string;
  tagline: string;
  phone: string;
  email: string;
}

/* ─── Step indicator ───────────────────────────────────────────── */

const STEPS = [
  { number: 1, label: 'Elegí un tema' },
  { number: 2, label: 'Configurá tu marca' },
  { number: 3, label: 'Publicá tu sitio' },
] as const;

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <nav
      aria-label="Progreso del asistente"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 0, padding: '32px 24px 8px',
      }}
    >
      {STEPS.map((step, i) => {
        const isActive    = step.number === currentStep;
        const isCompleted = step.number < currentStep;
        const isPending   = step.number > currentStep;

        return (
          <React.Fragment key={step.number}>
            {/* Connecting line before (not on first) */}
            {i > 0 && (
              <div
                style={{
                  width: 64, height: 2,
                  background: isCompleted || isActive ? C.success : C.border,
                  transition: 'background 0.3s',
                }}
              />
            )}

            {/* Step circle + label */}
            <div
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 8, minWidth: 100,
              }}
            >
              <div
                role="listitem"
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Paso ${step.number}: ${step.label}${isCompleted ? ' — completado' : ''}`}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: F.body, fontSize: 14, fontWeight: 700,
                  transition: 'all 0.3s',
                  ...(isCompleted
                    ? { background: C.success, color: '#fff', border: `2px solid ${C.success}` }
                    : isActive
                      ? { background: C.brand, color: '#fff', border: `2px solid ${C.brand}`,
                          boxShadow: '0 0 0 4px rgba(22,84,217,0.25)' }
                      : { background: 'transparent', color: C.textTertiary,
                          border: `2px solid ${C.textTertiary}` }
                  ),
                }}
              >
                {isCompleted ? <Check size={16} strokeWidth={3} /> : step.number}
              </div>
              <span
                style={{
                  fontFamily: F.body, fontSize: 12, fontWeight: 500,
                  color: isActive ? C.textPrimary : isCompleted ? C.success : C.textTertiary,
                  transition: 'color 0.3s', whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

/* ─── Step 1 — Elegí un tema ───────────────────────────────────── */

function StepTheme({
  selectedTheme,
  setSelectedTheme,
  onNext,
}: {
  selectedTheme: ThemeId;
  setSelectedTheme: (id: ThemeId) => void;
  onNext: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 24px 32px', gap: 32, flex: 1,
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontFamily: F.display, fontSize: 22, fontWeight: 700,
          color: C.textPrimary, margin: 0,
        }}>
          Elegí un tema para tu sitio
        </h2>
        <p style={{
          fontFamily: F.body, fontSize: 14, color: C.textSecondary,
          margin: '8px 0 0',
        }}>
          Podés cambiarlo en cualquier momento desde el editor.
        </p>
      </div>

      {/* Theme grid */}
      <div
        role="radiogroup"
        aria-label="Temas disponibles"
        style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: 16, maxWidth: 700,
        }}
      >
        {THEMES.map(theme => {
          const isSelected = selectedTheme === theme.id;
          const isHov = hovered === theme.id;

          return (
            <button type="button"
              key={theme.id}
              role="radio"
              aria-checked={isSelected}
              aria-label={`Tema ${theme.label}`}
              onClick={() => setSelectedTheme(theme.id)}
              onMouseEnter={() => setHovered(theme.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: 200, padding: 0, cursor: 'pointer',
                borderRadius: 10, overflow: 'hidden',
                border: `2px solid ${isSelected ? C.brand : isHov ? C.borderHover || '#2A3D5C' : C.border}`,
                background: C.bgRaised,
                transition: 'all 0.2s', outline: 'none',
                boxShadow: isSelected
                  ? '0 0 0 3px rgba(22,84,217,0.2)'
                  : 'none',
              }}
            >
              {/* Color preview block */}
              <div style={{
                height: 60, background: theme.bg, position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 4,
              }}>
                <div style={{
                  width: 48, height: 5, borderRadius: 3, background: theme.accent,
                }} />
                <div style={{
                  width: 64, height: 3, borderRadius: 3,
                  background: theme.text, opacity: 0.4,
                }} />
                <div style={{
                  width: 52, height: 3, borderRadius: 3,
                  background: theme.text, opacity: 0.2,
                }} />

                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 20, height: 20, borderRadius: '50%',
                    background: C.brand, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={11} color="#fff" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Theme name */}
              <div style={{
                padding: '10px 12px', textAlign: 'left',
                background: C.bgElevated,
              }}>
                <span style={{
                  fontFamily: F.body, fontSize: 13, fontWeight: 600,
                  color: isSelected ? C.brand : C.textSecondary,
                  transition: 'color 0.2s',
                }}>
                  {theme.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: 700 }}>
        <button type="button"
          onClick={onNext}
          aria-label="Siguiente paso"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '12px 28px', borderRadius: 8, border: 'none',
            background: C.brand, color: '#fff', cursor: 'pointer',
            fontFamily: F.body, fontSize: 14, fontWeight: 600,
            minHeight: 44,
            boxShadow: '0 2px 8px rgba(22,84,217,0.3)',
            transition: 'background 0.15s',
          }}
        >
          Siguiente
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 2 — Configurá tu marca ──────────────────────────────── */

function FormField({
  label, id, children, optional,
}: {
  label: string; id: string; children: React.ReactNode; optional?: boolean;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block', fontFamily: F.body, fontSize: 13,
          color: C.textSecondary, marginBottom: 6, fontWeight: 500,
        }}
      >
        {label}
        {optional && (
          <span style={{ color: C.textTertiary, fontWeight: 400, marginLeft: 4, fontSize: 12 }}>
            (opcional)
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function StepBrand({
  brand,
  setBrand,
  selectedTheme,
  onBack,
  onNext,
}: {
  brand: BrandSettings;
  setBrand: (b: BrandSettings) => void;
  selectedTheme: ThemeId;
  onBack: () => void;
  onNext: () => void;
}) {
  const [focused, setFocused] = useState<string | null>(null);
  const theme = THEMES.find(t => t.id === selectedTheme) ?? THEMES[0];

  const inputStyle = (fieldId: string): React.CSSProperties => ({
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${focused === fieldId ? C.brand : C.border}`,
    background: C.bgBase, color: C.textPrimary,
    fontFamily: F.body, fontSize: 14, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
    minHeight: 44,
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 24px 32px', gap: 32, flex: 1,
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontFamily: F.display, fontSize: 22, fontWeight: 700,
          color: C.textPrimary, margin: 0,
        }}>
          Configurá tu marca
        </h2>
        <p style={{
          fontFamily: F.body, fontSize: 14, color: C.textSecondary,
          margin: '8px 0 0',
        }}>
          Esta información aparecerá en tu sitio web.
        </p>
      </div>

      {/* Brand form card */}
      <div style={{
        width: '100%', maxWidth: 540,
        background: C.bgRaised, borderRadius: 12,
        border: `1px solid ${C.border}`,
        padding: '28px 28px 20px',
      }}>
        <FormField label="Nombre del sitio" id="site-name">
          <input
            id="site-name"
            type="text"
            value={brand.name}
            onChange={e => setBrand({ ...brand, name: e.target.value })}
            onFocus={() => setFocused('site-name')}
            onBlur={() => setFocused(null)}
            placeholder="Mi Inmobiliaria"
            style={inputStyle('site-name')}
          />
        </FormField>

        <FormField label="Eslogan" id="tagline" optional>
          <input
            id="tagline"
            type="text"
            value={brand.tagline}
            onChange={e => setBrand({ ...brand, tagline: e.target.value })}
            onFocus={() => setFocused('tagline')}
            onBlur={() => setFocused(null)}
            placeholder="Tu inmobiliaria de confianza"
            style={inputStyle('tagline')}
          />
        </FormField>

        <FormField label="Logo" id="logo-upload">
          <div
            role="button"
            tabIndex={0}
            aria-label="Subir logo"
            style={{
              width: 80, height: 80, borderRadius: 10,
              border: `2px dashed ${C.border}`,
              background: C.bgBase, cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              transition: 'border-color 0.15s',
            }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); }}
          >
            <Upload size={18} color={C.textTertiary} />
            <span style={{ fontFamily: F.body, fontSize: 10, color: C.textTertiary }}>
              Subir
            </span>
          </div>
        </FormField>

        <FormField label="Color principal" id="accent-color">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: theme.accent,
              border: `2px solid ${C.border}`,
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: F.mono, fontSize: 13, color: C.textSecondary,
            }}>
              {theme.accent}
            </span>
            <span style={{
              fontFamily: F.body, fontSize: 12, color: C.textTertiary,
              marginLeft: 4,
            }}>
              (del tema {theme.label})
            </span>
          </div>
        </FormField>

        <FormField label="Teléfono de contacto" id="phone">
          <input
            id="phone"
            type="tel"
            value={brand.phone}
            onChange={e => setBrand({ ...brand, phone: e.target.value })}
            onFocus={() => setFocused('phone')}
            onBlur={() => setFocused(null)}
            placeholder="+54 11 1234-5678"
            style={inputStyle('phone')}
          />
        </FormField>

        <FormField label="Email de contacto" id="contact-email">
          <input
            id="contact-email"
            type="email"
            value={brand.email}
            onChange={e => setBrand({ ...brand, email: e.target.value })}
            onFocus={() => setFocused('contact-email')}
            onBlur={() => setFocused(null)}
            placeholder="info@tuinmobiliaria.com"
            style={inputStyle('contact-email')}
          />
        </FormField>
      </div>

      {/* Navigation buttons */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 540,
      }}>
        <button type="button"
          onClick={onBack}
          aria-label="Paso anterior"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '12px 20px', borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: 'transparent', color: C.textSecondary,
            cursor: 'pointer', fontFamily: F.body, fontSize: 14, fontWeight: 500,
            minHeight: 44, transition: 'all 0.15s',
          }}
        >
          <ChevronLeft size={16} />
          Anterior
        </button>

        <button type="button"
          onClick={onNext}
          aria-label="Siguiente paso"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '12px 28px', borderRadius: 8, border: 'none',
            background: C.brand, color: '#fff', cursor: 'pointer',
            fontFamily: F.body, fontSize: 14, fontWeight: 600,
            minHeight: 44,
            boxShadow: '0 2px 8px rgba(22,84,217,0.3)',
            transition: 'background 0.15s',
          }}
        >
          Siguiente
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3 — Publicá tu sitio ────────────────────────────────── */

function StepPublish({
  brand,
  selectedTheme,
  onBack,
}: {
  brand: BrandSettings;
  selectedTheme: ThemeId;
  onBack: () => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished]   = useState(false);
  const theme = THEMES.find(t => t.id === selectedTheme) ?? THEMES[0];

  const siteName = brand.name || 'Mi Inmobiliaria';
  const siteTagline = brand.tagline || 'Tu inmobiliaria de confianza';

  const handlePublish = () => {
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      setPublished(true);
    }, 1800);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 24px 32px', gap: 28, flex: 1,
    }}>
      {!published ? (
        <>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontFamily: F.display, fontSize: 22, fontWeight: 700,
              color: C.textPrimary, margin: 0,
            }}>
              Tu sitio está listo
            </h2>
            <p style={{
              fontFamily: F.body, fontSize: 14, color: C.textSecondary,
              margin: '8px 0 0',
            }}>
              Revisá la vista previa y publicalo cuando quieras.
            </p>
          </div>

          {/* Preview card */}
          <div style={{
            width: 400, borderRadius: 12, overflow: 'hidden',
            border: `1px solid ${C.border}`,
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          }}>
            {/* Browser chrome */}
            <div style={{
              background: C.bgRaised, padding: '8px 12px',
              display: 'flex', alignItems: 'center', gap: 6,
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E83B3B', opacity: 0.7 }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.warning, opacity: 0.7 }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.success, opacity: 0.7 }} />
              <div style={{
                flex: 1, marginLeft: 6, height: 18, borderRadius: 4,
                background: C.bgBase, border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', padding: '0 8px',
              }}>
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textTertiary }}>
                  tuinmobiliaria.corredor.io
                </span>
              </div>
            </div>

            {/* Site preview (280px tall) */}
            <div style={{ height: 280, background: theme.bg, position: 'relative' }}>
              {/* Header bar */}
              <div style={{
                height: 40, background: 'rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px',
              }}>
                <span style={{
                  fontFamily: F.display, fontSize: 13, fontWeight: 700,
                  color: theme.text,
                }}>
                  {siteName}
                </span>
                <div style={{ display: 'flex', gap: 12 }}>
                  {['Inicio', 'Propiedades', 'Contacto'].map(link => (
                    <span key={link} style={{
                      fontFamily: F.body, fontSize: 10, color: theme.text, opacity: 0.6,
                    }}>
                      {link}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hero section */}
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                height: 160, gap: 10,
              }}>
                <h3 style={{
                  fontFamily: F.display, fontSize: 20, fontWeight: 700,
                  color: theme.text, margin: 0, textAlign: 'center',
                  padding: '0 20px',
                }}>
                  {siteTagline}
                </h3>
                <div style={{
                  padding: '6px 18px', borderRadius: 6,
                  background: theme.accent, cursor: 'default',
                }}>
                  <span style={{
                    fontFamily: F.body, fontSize: 11, fontWeight: 600,
                    color: theme.id === 'minimal' ? '#fff' : theme.text,
                  }}>
                    Ver propiedades
                  </span>
                </div>
              </div>

              {/* Contact section */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 56, background: 'rgba(0,0,0,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
              }}>
                {brand.phone && (
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: theme.text, opacity: 0.7 }}>
                    {brand.phone}
                  </span>
                )}
                {brand.email && (
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: theme.text, opacity: 0.7 }}>
                    {brand.email}
                  </span>
                )}
                {!brand.phone && !brand.email && (
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: theme.text, opacity: 0.4 }}>
                    contacto@tuinmobiliaria.com
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* URL preview */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 8,
            background: C.bgRaised, border: `1px solid ${C.border}`,
          }}>
            <Globe size={14} color={C.textTertiary} />
            <span style={{
              fontFamily: F.mono, fontSize: 14, color: C.textSecondary,
            }}>
              tuinmobiliaria.corredor.io
            </span>
            <ExternalLink size={12} color={C.textTertiary} />
          </div>

          {/* Publish button */}
          <button type="button"
            onClick={handlePublish}
            disabled={publishing}
            aria-label="Publicar sitio"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '0 32px', borderRadius: 10, border: 'none',
              background: publishing ? C.textTertiary : C.brand,
              color: '#fff', cursor: publishing ? 'wait' : 'pointer',
              fontFamily: F.body, fontSize: 16, fontWeight: 700,
              height: 48, minWidth: 220,
              boxShadow: publishing ? 'none' : '0 4px 16px rgba(22,84,217,0.35)',
              transition: 'all 0.2s',
            }}
          >
            {publishing ? (
              <>
                <span style={{
                  display: 'inline-block', width: 18, height: 18,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'wizard-spin 0.8s linear infinite',
                }} />
                Publicando...
              </>
            ) : (
              <>
                <Rocket size={18} />
                Publicar sitio
              </>
            )}
          </button>

          {/* Back link */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <button type="button"
              onClick={onBack}
              aria-label="Volver al paso anterior"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: F.body, fontSize: 13, color: C.textTertiary,
                textDecoration: 'underline', padding: '8px',
                minHeight: 44, display: 'flex', alignItems: 'center',
              }}
            >
              Seguir editando
            </button>
          </div>
        </>
      ) : (
        /* ─── Published success state ──────────────────────────── */
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 24, paddingTop: 40,
        }}>
          {/* Success icon */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: C.successFaint, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            animation: 'wizard-pop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: C.success, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={28} color="#fff" strokeWidth={3} />
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontFamily: F.display, fontSize: 26, fontWeight: 700,
              color: C.textPrimary, margin: 0,
            }}>
              Tu sitio esta en linea!
            </h2>
            <p style={{
              fontFamily: F.body, fontSize: 15, color: C.textSecondary,
              margin: '10px 0 0',
            }}>
              Ya podés compartirlo con tus clientes.
            </p>
          </div>

          {/* URL */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 8,
            background: C.successFaint, border: `1px solid ${C.success}`,
          }}>
            <Globe size={16} color={C.success} />
            <span style={{
              fontFamily: F.mono, fontSize: 15, color: C.success, fontWeight: 600,
            }}>
              tuinmobiliaria.corredor.io
            </span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button"
              aria-label="Visitar sitio"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '12px 24px', borderRadius: 8, border: 'none',
                background: C.brand, color: '#fff', cursor: 'pointer',
                fontFamily: F.body, fontSize: 14, fontWeight: 600,
                minHeight: 44,
                boxShadow: '0 2px 8px rgba(22,84,217,0.3)',
              }}
            >
              <ExternalLink size={14} />
              Visitar sitio
            </button>
            <button type="button"
              aria-label="Ir al editor"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '12px 24px', borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: 'transparent', color: C.textSecondary,
                cursor: 'pointer', fontFamily: F.body, fontSize: 14, fontWeight: 500,
                minHeight: 44, transition: 'all 0.15s',
              }}
            >
              Seguir editando
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Keyframe styles (injected once) ──────────────────────────── */

const KEYFRAMES = `
@keyframes wizard-spin {
  to { transform: rotate(360deg); }
}
@keyframes wizard-pop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); }
}
`;

/* ─── Main wizard ──────────────────────────────────────────────── */

export default function SiteCreationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('clasico');
  const [brand, setBrand] = useState<BrandSettings>({
    name: '',
    tagline: '',
    phone: '',
    email: '',
  });

  return (
    <div style={{
      minHeight: '100vh', background: C.bgBase,
      fontFamily: F.body, display: 'flex', flexDirection: 'column',
    }}>
      {/* Injected keyframes */}
      <style>{KEYFRAMES}</style>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step content */}
      {currentStep === 1 && (
        <StepTheme
          selectedTheme={selectedTheme}
          setSelectedTheme={setSelectedTheme}
          onNext={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 2 && (
        <StepBrand
          brand={brand}
          setBrand={setBrand}
          selectedTheme={selectedTheme}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 3 && (
        <StepPublish
          brand={brand}
          selectedTheme={selectedTheme}
          onBack={() => setCurrentStep(2)}
        />
      )}
    </div>
  );
}
