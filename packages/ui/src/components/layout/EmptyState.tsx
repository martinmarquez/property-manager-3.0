import React from 'react';

/* ─────────────────────────────────────────────────────────
   Corredor CRM — Empty State
   Reusable for: /properties, /contacts, /leads, etc.
   Also includes: OnboardingChecklist widget
   ───────────────────────────────────────────────────────── */

const C = {
  bgBase:    '#070D1A',
  bgRaised:  '#0D1526',
  bgSubtle:  '#162035',
  brand:     '#1654d9',
  brandFaint:'rgba(22,84,217,0.10)',
  border:    '#1F2D48',
  borderStrong: '#253350',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#6B809E',
  success:   '#18A659',
  successBg: '#0A2217',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

// ─── SVG illustrations ───────────────────────────────────

function IllustrationProperties() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" aria-hidden="true">
      {/* Building outline */}
      <rect x="20" y="30" width="50" height="60" rx="3" stroke={C.border} strokeWidth="1.5" fill={C.bgSubtle}/>
      <rect x="25" y="50" width="14" height="14" rx="1.5" stroke={C.brand} strokeWidth="1" fill="none" opacity="0.5"/>
      <rect x="45" y="50" width="14" height="14" rx="1.5" stroke={C.brand} strokeWidth="1" fill="none" opacity="0.5"/>
      <rect x="35" y="72" width="20" height="18" rx="1.5" stroke={C.brand} strokeWidth="1" fill={C.brandFaint}/>
      {/* Roof */}
      <path d="M15 33 L45 10 L75 33" stroke={C.borderStrong} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Small house right */}
      <rect x="75" y="52" width="30" height="38" rx="2" stroke={C.border} strokeWidth="1" fill={C.bgRaised} opacity="0.7"/>
      <path d="M71 55 L90 40 L109 55" stroke={C.borderStrong} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
      {/* Plus icon */}
      <circle cx="95" cy="25" r="12" fill={C.brandFaint} stroke={C.brand} strokeWidth="1"/>
      <line x1="95" y1="20" x2="95" y2="30" stroke={C.brand} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="90" y1="25" x2="100" y2="25" stroke={C.brand} strokeWidth="1.5" strokeLinecap="round"/>
      {/* Ground line */}
      <line x1="10" y1="90" x2="110" y2="90" stroke={C.border} strokeWidth="1" strokeDasharray="4 3"/>
    </svg>
  );
}

function IllustrationContacts() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" aria-hidden="true">
      {/* People silhouettes */}
      <circle cx="45" cy="32" r="16" fill={C.bgSubtle} stroke={C.border} strokeWidth="1.5"/>
      <circle cx="45" cy="32" r="8" fill={C.bgRaised} stroke={C.borderStrong} strokeWidth="1"/>
      <path d="M25 72 Q25 54 45 54 Q65 54 65 72" fill={C.bgSubtle} stroke={C.border} strokeWidth="1.5"/>
      {/* Second person (offset, translucent) */}
      <circle cx="78" cy="36" r="12" fill={C.bgSubtle} stroke={C.border} strokeWidth="1" opacity="0.6"/>
      <circle cx="78" cy="36" r="6" fill={C.bgRaised} stroke={C.border} strokeWidth="1" opacity="0.6"/>
      <path d="M62 72 Q62 58 78 58 Q94 58 94 72" fill={C.bgSubtle} stroke={C.border} strokeWidth="1" opacity="0.6"/>
      {/* Plus */}
      <circle cx="95" cy="22" r="10" fill={C.brandFaint} stroke={C.brand} strokeWidth="1"/>
      <line x1="95" y1="17.5" x2="95" y2="26.5" stroke={C.brand} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="90.5" y1="22" x2="99.5" y2="22" stroke={C.brand} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IllustrationLeads() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" aria-hidden="true">
      {/* Funnel */}
      <path d="M20 20 L100 20 L72 52 L72 82 L48 82 L48 52 Z" fill={C.bgSubtle} stroke={C.border} strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Level lines */}
      <line x1="30" y1="32" x2="90" y2="32" stroke={C.border} strokeWidth="1"/>
      <line x1="40" y1="44" x2="80" y2="44" stroke={C.border} strokeWidth="1" opacity="0.6"/>
      {/* Dots in funnel (leads) */}
      <circle cx="60" cy="26" r="3" fill={C.brand} opacity="0.8"/>
      <circle cx="50" cy="26" r="3" fill={C.brand} opacity="0.5"/>
      <circle cx="70" cy="26" r="3" fill={C.brand} opacity="0.5"/>
      {/* Arrow down */}
      <path d="M55 82 L55 92 M65 82 L65 92" stroke={C.brand} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      {/* Plus */}
      <circle cx="100" cy="18" r="10" fill={C.brandFaint} stroke={C.brand} strokeWidth="1"/>
      <line x1="100" y1="13.5" x2="100" y2="22.5" stroke={C.brand} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="95.5" y1="18" x2="104.5" y2="18" stroke={C.brand} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IllustrationGeneric() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" aria-hidden="true">
      <rect x="20" y="20" width="80" height="60" rx="8" fill={C.bgSubtle} stroke={C.border} strokeWidth="1.5"/>
      <line x1="35" y1="40" x2="85" y2="40" stroke={C.border} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="35" y1="52" x2="75" y2="52" stroke={C.border} strokeWidth="1" strokeLinecap="round"/>
      <line x1="35" y1="62" x2="65" y2="62" stroke={C.border} strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      <circle cx="90" cy="30" r="10" fill={C.brandFaint} stroke={C.brand} strokeWidth="1"/>
      <line x1="90" y1="25.5" x2="90" y2="34.5" stroke={C.brand} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="85.5" y1="30" x2="94.5" y2="30" stroke={C.brand} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

const ILLUSTRATIONS: Record<string, React.ReactNode> = {
  properties: <IllustrationProperties />,
  contacts:   <IllustrationContacts />,
  leads:      <IllustrationLeads />,
};

// ─── EmptyState ──────────────────────────────────────────
export interface EmptyStateProps {
  variant?: 'properties' | 'contacts' | 'leads' | 'generic';
  title?: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
}

export function EmptyState({
  variant = 'generic',
  title,
  description,
  ctaLabel,
  onCta,
}: EmptyStateProps) {
  const defaults: Record<'properties' | 'contacts' | 'leads' | 'generic', { title: string; description: string; cta: string }> = {
    properties: {
      title: 'Todavía no tenés propiedades',
      description: 'Agregá tu primera propiedad para empezar a gestionar tu cartera.',
      cta: 'Agregar propiedad',
    },
    contacts: {
      title: 'Tu base de contactos está vacía',
      description: 'Importá contactos o creá el primero ahora para empezar a nutrir tus relaciones.',
      cta: 'Crear contacto',
    },
    leads: {
      title: 'No tenés leads todavía',
      description: 'Los leads son oportunidades de negocio. Creá el primero o configurá una fuente de captación.',
      cta: 'Crear lead',
    },
    generic: {
      title: 'Nada por aquí todavía',
      description: 'Este espacio estará lleno pronto.',
      cta: 'Comenzar',
    },
  };

  const d = defaults[variant] ?? defaults.generic;
  const illustration = ILLUSTRATIONS[variant] ?? <IllustrationGeneric />;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 24px',
      textAlign: 'center',
      fontFamily: F.body,
      minHeight: 360,
    }}>
      {/* Illustration container */}
      <div style={{
        marginBottom: 28,
        padding: 24,
        background: C.bgSubtle,
        borderRadius: '50%',
        border: `1px solid ${C.border}`,
      }}>
        {illustration}
      </div>

      <h2 style={{
        fontFamily: F.display,
        fontSize: '1.25rem',
        fontWeight: 700,
        color: C.textPrimary,
        letterSpacing: '-0.02em',
        marginBottom: 10,
        maxWidth: 360,
      }}>
        {title ?? d.title}
      </h2>

      <p style={{
        fontSize: '0.9375rem',
        color: C.textSecondary,
        lineHeight: 1.55,
        maxWidth: 380,
        marginBottom: 28,
      }}>
        {description ?? d.description}
      </p>

      {onCta && (
        <button
          type="button"
          onClick={onCta}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 22px',
            background: C.brand,
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: '0.9375rem',
            fontFamily: F.body,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 150ms ease, transform 100ms ease, box-shadow 150ms ease',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={e => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = '#1244b8';
            btn.style.boxShadow = '0 4px 16px rgba(22,84,217,0.4)';
          }}
          onMouseLeave={e => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = C.brand;
            btn.style.boxShadow = 'none';
          }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <line x1="8" y1="2" x2="8" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="2" y1="8" x2="14" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {ctaLabel ?? d.cta}
        </button>
      )}
    </div>
  );
}

// ─── Onboarding Checklist Widget ─────────────────────────
export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  done: boolean;
  href?: string;
}

export interface OnboardingChecklistProps {
  items: ChecklistItem[];
  onItemClick?: (id: string) => void;
  onDismiss?: () => void;
}

export function OnboardingChecklist({ items, onItemClick, onDismiss }: OnboardingChecklistProps) {
  const total = items.length;
  const done = items.filter(i => i.done).length;
  const pct = Math.round((done / total) * 100);

  return (
    <div style={{
      background: C.bgRaised,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: '20px 20px 16px',
      fontFamily: F.body,
      maxWidth: 480,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h3 style={{
            fontFamily: F.display,
            fontSize: '1rem',
            fontWeight: 700,
            color: C.textPrimary,
            letterSpacing: '-0.01em',
            marginBottom: 3,
          }}>
            Primeros pasos
          </h3>
          <p style={{ fontSize: '0.8125rem', color: C.textTertiary }}>
            {done} de {total} completados
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Cerrar lista de pasos"
            style={{
              background: 'none', border: 'none',
              cursor: 'pointer', padding: 4,
              color: C.textTertiary,
              borderRadius: 4,
              display: 'flex', alignItems: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4,
        background: C.bgSubtle,
        borderRadius: 999,
        marginBottom: 18,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: pct === 100
            ? C.success
            : `linear-gradient(90deg, ${C.brand}, #5577FF)`,
          borderRadius: 999,
          transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)',
        }} />
      </div>

      {/* Items */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item, idx) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => !item.done && onItemClick?.(item.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                width: '100%',
                padding: '10px 8px',
                background: 'none',
                border: 'none',
                borderRadius: 8,
                cursor: item.done ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => {
                if (!item.done) (e.currentTarget as HTMLButtonElement).style.background = C.bgSubtle;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'none';
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: 20, height: 20,
                borderRadius: '50%',
                border: `2px solid ${item.done ? C.success : C.border}`,
                background: item.done ? C.successBg : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
                transition: 'border-color 200ms ease, background 200ms ease',
              }}>
                {item.done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M2 5.5L4.5 7.5L8 3" stroke={C.success} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: item.done ? C.textTertiary : C.textPrimary,
                  textDecoration: item.done ? 'line-through' : 'none',
                  marginBottom: item.description ? 2 : 0,
                }}>
                  {item.label}
                </div>
                {item.description && !item.done && (
                  <div style={{
                    fontSize: '0.8125rem',
                    color: C.textTertiary,
                    lineHeight: 1.45,
                  }}>
                    {item.description}
                  </div>
                )}
              </div>

              {/* Arrow */}
              {!item.done && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }} aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </button>

            {/* Separator */}
            {idx < items.length - 1 && (
              <div style={{ height: 1, background: C.border, margin: '0 8px' }} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
