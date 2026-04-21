import React from 'react';
import { OnboardingChecklist } from '@corredor/ui';
import type { ChecklistItem } from '@corredor/ui';
import { trpc } from '../trpc.js';

/* ─────────────────────────────────────────────────────────
   Dashboard Page — Phase A empty shell
   Shows onboarding checklist until tenant has data.
   ───────────────────────────────────────────────────────── */

const C = {
  bgBase:   '#070D1A',
  bgRaised: '#0D1526',
  border:   '#1F2D48',
  brand:    '#1654d9',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

const ONBOARDING_ITEMS: ChecklistItem[] = [
  {
    id: 'profile',
    label: 'Completá tu perfil',
    description: 'Agregá tu nombre, foto y datos de contacto.',
    done: false,
    href: '/settings/profile',
  },
  {
    id: 'organization',
    label: 'Configurá tu agencia',
    description: 'Nombre, CUIT, logo y datos de tu inmobiliaria.',
    done: false,
    href: '/settings/organization',
  },
  {
    id: 'first-property',
    label: 'Agregá tu primera propiedad',
    description: 'Cargá una propiedad para comenzar a gestionar tu cartera.',
    done: false,
    href: '/properties/new',
  },
  {
    id: 'invite-team',
    label: 'Invitá a tu equipo',
    description: 'Sumá colaboradores a tu agencia.',
    done: false,
    href: '/settings/team',
  },
  {
    id: 'first-contact',
    label: 'Creá tu primer contacto',
    description: 'Importá o cargá manualmente tus primeros contactos.',
    done: false,
    href: '/contacts/new',
  },
];

interface DashboardPageProps {
  userName?: string;
  onChecklistItemClick?: (id: string) => void;
}

export function DashboardPage({ userName = 'Usuario', onChecklistItemClick }: DashboardPageProps) {
  const [items, setItems] = React.useState(ONBOARDING_ITEMS);
  const [checklistDismissed, setChecklistDismissed] = React.useState(false);

  // Verify tRPC connectivity — system.health probe
  const { data: health, isError: healthError } = trpc.system.health.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const handleItemClick = (id: string) => {
    // Mark as done optimistically (real impl: navigate to href)
    setItems(prev => prev.map(item => item.id === id ? { ...item, done: true } : item));
    onChecklistItemClick?.(id);
  };

  const allDone = items.every(i => i.done);

  return (
    <div style={{
      padding: '28px 24px',
      maxWidth: 900,
      fontFamily: F.body,
      minHeight: '100%',
    }}>
      {/* Greeting */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: F.display,
          fontSize: '1.5rem', fontWeight: 700,
          color: C.textPrimary, letterSpacing: '-0.025em',
          marginBottom: 4,
        }}>
          Buenos días, {userName.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: '0.9375rem', color: C.textSecondary }}>
          Aquí está el resumen de tu agencia.
        </p>
      </div>

      {/* API health indicator (dev helper — shows tRPC system.health result) */}
      {(health ?? healthError) ? (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginBottom: 20,
          padding: '4px 10px',
          borderRadius: 6,
          border: `1px solid ${healthError ? C.border : '#1A4D30'}`,
          background: healthError ? C.bgRaised : '#0A2217',
          fontSize: '0.75rem',
          color: healthError ? '#E83B3B' : '#18A659',
          fontFamily: "'DM Mono', monospace",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: healthError ? '#E83B3B' : '#18A659',
            flexShrink: 0,
          }} />
          {healthError
            ? 'API no disponible'
            : `API ${health?.status ?? 'ok'} · v${health?.version ?? '—'}`}
        </div>
      ) : null}

      {/* Stat cards — skeleton/empty state */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 14,
        marginBottom: 32,
      }}>
        {[
          { label: 'Propiedades activas', value: '—', icon: '🏠' },
          { label: 'Contactos', value: '—', icon: '👥' },
          { label: 'Leads activos', value: '—', icon: '📈' },
          { label: 'Visitas este mes', value: '—', icon: '📅' },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            style={{
              background: C.bgRaised,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '18px 20px',
            }}
          >
            <div style={{ fontSize: '1.25rem', marginBottom: 10 }}>{icon}</div>
            <div style={{
              fontFamily: F.display,
              fontSize: '1.75rem', fontWeight: 700,
              color: C.textPrimary, letterSpacing: '-0.02em',
              marginBottom: 4,
            }}>
              {value}
            </div>
            <div style={{ fontSize: '0.8125rem', color: C.textTertiary }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
        alignItems: 'start',
      }}>
        {/* Onboarding checklist */}
        {!checklistDismissed && !allDone && (
          <OnboardingChecklist
            items={items}
            onItemClick={handleItemClick}
            onDismiss={() => setChecklistDismissed(true)}
          />
        )}

        {/* Activity feed placeholder */}
        <div style={{
          background: C.bgRaised,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: '20px',
          gridColumn: (!checklistDismissed && !allDone) ? undefined : '1 / -1',
        }}>
          <h3 style={{
            fontFamily: F.display,
            fontSize: '0.9375rem', fontWeight: 700,
            color: C.textPrimary, marginBottom: 16,
          }}>
            Actividad reciente
          </h3>
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px', textAlign: 'center',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: '#162035',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <p style={{ fontSize: '0.875rem', color: C.textTertiary }}>
              La actividad aparecerá aquí cuando empieces a operar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
