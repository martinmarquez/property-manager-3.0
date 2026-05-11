import React from 'react';
import { useIntl, defineMessages } from 'react-intl';
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
  textTertiary:  '#6B809E',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

const messages = defineMessages({
  greeting:             { id: 'dashboard.greeting' },
  subtitle:             { id: 'dashboard.subtitle' },
  apiUnavailable:       { id: 'dashboard.api.unavailable' },
  apiStatus:            { id: 'dashboard.api.status' },
  statsProperties:      { id: 'dashboard.stats.properties' },
  statsContacts:        { id: 'dashboard.stats.contacts' },
  statsLeads:           { id: 'dashboard.stats.leads' },
  statsVisits:          { id: 'dashboard.stats.visits' },
  activityTitle:        { id: 'dashboard.activity.title' },
  activityEmpty:        { id: 'dashboard.activity.empty' },
  onboardingProfile:    { id: 'onboarding.profile.label' },
  onboardingProfileDesc:{ id: 'onboarding.profile.description' },
  onboardingOrg:        { id: 'onboarding.organization.label' },
  onboardingOrgDesc:    { id: 'onboarding.organization.description' },
  onboardingProp:       { id: 'onboarding.firstProperty.label' },
  onboardingPropDesc:   { id: 'onboarding.firstProperty.description' },
  onboardingTeam:       { id: 'onboarding.inviteTeam.label' },
  onboardingTeamDesc:   { id: 'onboarding.inviteTeam.description' },
  onboardingContact:    { id: 'onboarding.firstContact.label' },
  onboardingContactDesc:{ id: 'onboarding.firstContact.description' },
});

interface DashboardPageProps {
  userName?: string;
  onChecklistItemClick?: (id: string) => void;
}

export function DashboardPage({ userName = 'Usuario', onChecklistItemClick }: DashboardPageProps) {
  const intl = useIntl();
  const [checklistDismissed, setChecklistDismissed] = React.useState(false);

  const ONBOARDING_ITEMS: ChecklistItem[] = React.useMemo(() => [
    {
      id: 'profile',
      label: intl.formatMessage(messages.onboardingProfile),
      description: intl.formatMessage(messages.onboardingProfileDesc),
      done: false,
      href: '/settings/profile',
    },
    {
      id: 'organization',
      label: intl.formatMessage(messages.onboardingOrg),
      description: intl.formatMessage(messages.onboardingOrgDesc),
      done: false,
      href: '/settings/organization',
    },
    {
      id: 'first-property',
      label: intl.formatMessage(messages.onboardingProp),
      description: intl.formatMessage(messages.onboardingPropDesc),
      done: false,
      href: '/properties/new',
    },
    {
      id: 'invite-team',
      label: intl.formatMessage(messages.onboardingTeam),
      description: intl.formatMessage(messages.onboardingTeamDesc),
      done: false,
      href: '/settings/team',
    },
    {
      id: 'first-contact',
      label: intl.formatMessage(messages.onboardingContact),
      description: intl.formatMessage(messages.onboardingContactDesc),
      done: false,
      href: '/contacts/new',
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [intl.locale]);

  const [items, setItems] = React.useState(ONBOARDING_ITEMS);

  const { data: health, isError: healthError } = trpc.system.health.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const handleItemClick = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, done: true } : item));
    onChecklistItemClick?.(id);
  };

  const allDone = items.every(i => i.done);

  const statsCards = [
    { label: intl.formatMessage(messages.statsProperties), value: '—', icon: '🏠' },
    { label: intl.formatMessage(messages.statsContacts),   value: '—', icon: '👥' },
    { label: intl.formatMessage(messages.statsLeads),      value: '—', icon: '📈' },
    { label: intl.formatMessage(messages.statsVisits),     value: '—', icon: '📅' },
  ];

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
          {intl.formatMessage(messages.greeting, { name: userName.split(' ')[0] })}
        </h1>
        <p style={{ fontSize: '0.9375rem', color: C.textSecondary }}>
          {intl.formatMessage(messages.subtitle)}
        </p>
      </div>

      {/* API health indicator (dev helper) */}
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
            ? intl.formatMessage(messages.apiUnavailable)
            : intl.formatMessage(messages.apiStatus, {
                status: health?.status ?? 'ok',
                version: health?.version ?? '—',
              })}
        </div>
      ) : null}

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 14,
        marginBottom: 32,
      }}>
        {statsCards.map(({ label, value, icon }) => (
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
        {!checklistDismissed && !allDone && (
          <OnboardingChecklist
            items={items}
            onItemClick={handleItemClick}
            onDismiss={() => setChecklistDismissed(true)}
          />
        )}

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
            {intl.formatMessage(messages.activityTitle)}
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
              {intl.formatMessage(messages.activityEmpty)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
