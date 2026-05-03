import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Check, Palette, Eye, ArrowRight } from 'lucide-react';
import { useIntl, defineMessages } from 'react-intl';
import { C, F } from '../../components/copilot/tokens.js';

const msg = defineMessages({
  title: { id: 'website.themes.title' },
  subtitle: { id: 'website.themes.subtitle' },
  activeTheme: { id: 'website.themes.activeTheme' },
  apply: { id: 'website.themes.apply' },
  applied: { id: 'website.themes.applied' },
});

/* ─────────────────────────────────────────────────────────
   Corredor — Website Builder: SiteThemesPage
   Route: /site/themes
   ───────────────────────────────────────────────────────── */

interface ThemeData {
  id: string;
  name: string;
  bg: string;
  accent: string;
  text: string;
  font: string;
  fontFamily: string;
  description: string;
}

const THEMES: ThemeData[] = [
  {
    id: 'clasico',
    name: 'Clásico',
    bg: '#131E33',
    accent: '#1654d9',
    text: '#EFF4FF',
    font: 'Syne',
    fontFamily: F.display,
    description: 'Elegante y profesional',
  },
  {
    id: 'oscuro',
    name: 'Oscuro',
    bg: '#0A0A0A',
    accent: '#E0E0E0',
    text: '#FFFFFF',
    font: 'DM Sans',
    fontFamily: F.body,
    description: 'Minimalismo oscuro',
  },
  {
    id: 'tierra',
    name: 'Tierra',
    bg: '#2C1810',
    accent: '#8B5E3C',
    text: '#F5EDE0',
    font: 'Syne',
    fontFamily: F.display,
    description: 'Cálido y cercano',
  },
  {
    id: 'moderno',
    name: 'Moderno',
    bg: '#0A1628',
    accent: '#0ED2A0',
    text: '#EFF4FF',
    font: 'DM Sans',
    fontFamily: F.body,
    description: 'Fresco y tecnológico',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    bg: '#F8F9FA',
    accent: '#1A1A1A',
    text: '#1A1A1A',
    font: 'DM Mono',
    fontFamily: F.mono,
    description: 'Limpio y ordenado',
  },
];

/* ─── Mini website mockup preview ──────────────────────── */

function ThemePreview({ theme }: { theme: ThemeData }) {
  const lineWidths = ['70%', '90%', '55%', '80%'];
  return (
    <div
      style={{
        height: 200,
        background: theme.bg,
        borderRadius: '8px 8px 0 0',
        overflow: 'hidden',
        position: 'relative',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
      aria-hidden="true"
    >
      {/* Mock header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 6,
            borderRadius: 3,
            background: theme.accent,
            opacity: 0.9,
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3].map((dot) => (
            <div
              key={dot}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: theme.text,
                opacity: 0.35,
              }}
            />
          ))}
        </div>
      </div>

      {/* Hero section */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            width: '65%',
            height: 10,
            borderRadius: 5,
            background: theme.accent,
            marginBottom: 6,
          }}
        />
        <div
          style={{
            width: '45%',
            height: 10,
            borderRadius: 5,
            background: theme.accent,
            opacity: 0.6,
          }}
        />
      </div>

      {/* Content lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
        {lineWidths.map((w, i) => (
          <div
            key={i}
            style={{
              width: w,
              height: 5,
              borderRadius: 3,
              background: theme.text,
              opacity: 0.15,
            }}
          />
        ))}
      </div>

      {/* CTA button mockup */}
      <div
        style={{
          width: 72,
          height: 22,
          borderRadius: 6,
          background: theme.accent,
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 32,
            height: 4,
            borderRadius: 2,
            background: theme.bg,
            opacity: 0.8,
          }}
        />
      </div>
    </div>
  );
}

/* ─── Theme card ───────────────────────────────────────── */

function ThemeCard({
  theme,
  isActive,
  onApply,
  confirmingId,
}: {
  theme: ThemeData;
  isActive: boolean;
  onApply: (id: string) => void;
  confirmingId: string | null;
}) {
  const intl = useIntl();
  const isConfirming = confirmingId === theme.id;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="article"
      aria-label={`${intl.formatMessage(msg.title)} ${theme.name}${isActive ? `, ${intl.formatMessage(msg.activeTheme).toLowerCase()}` : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.bgElevated : C.bgRaised,
        borderRadius: 12,
        border: isActive ? `2px solid ${C.brand}` : `1px solid ${C.border}`,
        overflow: 'hidden',
        transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        minWidth: 280,
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Preview mockup */}
      <ThemePreview theme={theme} />

      {/* Card info */}
      <div style={{ padding: '16px 20px 20px' }}>
        {/* Theme name + active badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: F.display,
              fontWeight: 700,
              fontSize: 16,
              color: C.textPrimary,
            }}
          >
            {theme.name}
          </span>
          {isActive && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontFamily: F.body,
                fontWeight: 600,
                color: C.success,
                background: C.successFaint,
                padding: '3px 10px',
                borderRadius: 20,
              }}
            >
              <Check size={12} aria-hidden="true" />
              Activo
            </span>
          )}
        </div>

        {/* Description */}
        <p
          style={{
            fontFamily: F.body,
            fontSize: 13,
            color: C.textSecondary,
            margin: '0 0 8px',
            lineHeight: 1.4,
          }}
        >
          {theme.description}
        </p>

        {/* Font info */}
        <p
          style={{
            fontFamily: theme.fontFamily,
            fontSize: 12,
            color: C.textTertiary,
            margin: '0 0 16px',
            fontStyle: 'italic',
          }}
        >
          Tipografía: {theme.font}
        </p>

        {/* Action button */}
        {!isActive && (
          <button
            type="button"
            onClick={() => onApply(theme.id)}
            disabled={isConfirming}
            aria-label={
              isConfirming
                ? `Tema ${theme.name} aplicado`
                : `Aplicar tema ${theme.name}`
            }
            style={{
              width: '100%',
              minHeight: 44,
              padding: '10px 16px',
              fontFamily: F.body,
              fontWeight: 600,
              fontSize: 14,
              color: isConfirming ? C.success : C.textPrimary,
              background: isConfirming ? C.successFaint : C.brandFaint,
              border: isConfirming
                ? `1px solid ${C.success}`
                : `1px solid ${C.brand}`,
              borderRadius: 8,
              cursor: isConfirming ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = `2px solid ${C.brand}`;
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
              e.currentTarget.style.outlineOffset = '0';
            }}
          >
            {isConfirming ? (
              <>
                <Check size={16} aria-hidden="true" />
                {intl.formatMessage(msg.applied)}
              </>
            ) : (
              <>
                <Palette size={16} aria-hidden="true" />
                {intl.formatMessage(msg.apply)}
                <ArrowRight size={14} aria-hidden="true" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ────────────────────────────────────────── */

export default function SiteThemesPage() {
  const intl = useIntl();
  const [activeTheme, setActiveTheme] = useState('clasico');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Cleanup timeout on unmount */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleApply = useCallback(
    (id: string) => {
      if (confirmingId) return;

      setActiveTheme(id);
      setConfirmingId(id);

      timerRef.current = setTimeout(() => {
        setConfirmingId(null);
        timerRef.current = null;
      }, 2000);
    },
    [confirmingId],
  );

  const activeThemeData = THEMES.find((t) => t.id === activeTheme)!;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bgBase,
        color: C.textPrimary,
        fontFamily: F.body,
      }}
    >
      {/* ── Page content ──────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '48px 24px 64px',
        }}
      >
        {/* Header */}
        <header style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <Palette
              size={28}
              color={C.brand}
              aria-hidden="true"
            />
            <h1
              style={{
                fontFamily: F.display,
                fontSize: 28,
                fontWeight: 700,
                color: C.textPrimary,
                margin: 0,
              }}
            >
              {intl.formatMessage(msg.title)}
            </h1>
          </div>
          <p
            style={{
              fontFamily: F.body,
              fontSize: 15,
              color: C.textSecondary,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {intl.formatMessage(msg.subtitle)}
          </p>
        </header>

        {/* Active theme banner */}
        <div
          role="status"
          aria-live="polite"
          aria-label={`Tema activo: ${activeThemeData.name}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: C.bgRaised,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '16px 24px',
            marginBottom: 40,
          }}
        >
          {/* Mini preview swatch */}
          <div
            aria-hidden="true"
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: activeThemeData.bg,
              border: `2px solid ${activeThemeData.accent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Eye size={20} color={activeThemeData.accent} />
          </div>
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontFamily: F.display,
                fontWeight: 700,
                fontSize: 16,
                color: C.textPrimary,
              }}
            >
              {activeThemeData.name}
            </span>
            <span
              style={{
                marginLeft: 8,
                fontFamily: F.body,
                fontSize: 13,
                color: C.textSecondary,
              }}
            >
              — {activeThemeData.description}
            </span>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontFamily: F.body,
              fontWeight: 600,
              color: C.success,
              background: C.successFaint,
              padding: '6px 14px',
              borderRadius: 20,
              flexShrink: 0,
            }}
          >
            <Check size={14} aria-hidden="true" />
            {intl.formatMessage(msg.activeTheme)}
          </span>
        </div>

        {/* Theme gallery grid */}
        <div
          role="list"
          aria-label="Galería de temas"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          {THEMES.map((theme) => (
            <div role="listitem" key={theme.id}>
              <ThemeCard
                theme={theme}
                isActive={activeTheme === theme.id}
                onApply={handleApply}
                confirmingId={confirmingId}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
