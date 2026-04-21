import React from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { EmptyState } from '@corredor/ui';
import type { EmptyStateProps } from '@corredor/ui';

const messages = defineMessages({
  propertiesTitle:   { id: 'pages.properties.title' },
  propertiesSubtitle:{ id: 'pages.properties.subtitle' },
  propertiesCta:     { id: 'pages.properties.cta' },
  contactsTitle:     { id: 'pages.contacts.title' },
  contactsSubtitle:  { id: 'pages.contacts.subtitle' },
  contactsCta:       { id: 'pages.contacts.cta' },
  leadsTitle:        { id: 'pages.leads.title' },
  leadsSubtitle:     { id: 'pages.leads.subtitle' },
  leadsCta:          { id: 'pages.leads.cta' },
  commonNew:         { id: 'common.new' },
});

/* ─────────────────────────────────────────────────────────
   Stub pages for /properties, /contacts, /leads
   Phase A: empty shell with nav context and EmptyState.
   Phase B: replace children with actual data views.
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

interface StubPageProps {
  title: string;
  subtitle?: string | undefined;
  emptyVariant: NonNullable<EmptyStateProps['variant']>;
  ctaLabel?: string | undefined;
  onCta?: (() => void) | undefined;
  /** Phase B: pass children to replace empty state */
  children?: React.ReactNode;
}

export function StubPage({
  title, subtitle, emptyVariant, ctaLabel, onCta, children,
}: StubPageProps) {
  const intl = useIntl();
  return (
    <div style={{ minHeight: '100%', fontFamily: F.body }}>
      {/* Page header */}
      <div style={{
        padding: '24px 24px 0',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingBottom: 20,
          maxWidth: 900,
        }}>
          <div>
            <h1 style={{
              fontFamily: F.display,
              fontSize: '1.375rem', fontWeight: 700,
              color: C.textPrimary, letterSpacing: '-0.02em',
              marginBottom: subtitle ? 4 : 0,
            }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ fontSize: '0.9rem', color: C.textTertiary }}>
                {subtitle}
              </p>
            )}
          </div>

          {onCta && (
            <button
              type="button"
              onClick={onCta}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 18px',
                background: C.brand, border: 'none', borderRadius: 8,
                color: 'white', fontSize: '0.9rem',
                fontFamily: F.body, fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 150ms ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1244b8'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.brand; }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <line x1="8" y1="2" x2="8" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="2" y1="8" x2="14" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {ctaLabel ?? intl.formatMessage(messages.commonNew)}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, padding: '0 24px' }}>
        {children ?? (
          <EmptyState
            variant={emptyVariant}
            {...(onCta && { onCta })}
            {...(ctaLabel && { ctaLabel })}
          />
        )}
      </div>
    </div>
  );
}

// ─── Concrete page exports ────────────────────────────────

export function PropertiesPage({ onNew }: { onNew?: () => void }) {
  const intl = useIntl();
  return (
    <StubPage
      title={intl.formatMessage(messages.propertiesTitle)}
      subtitle={intl.formatMessage(messages.propertiesSubtitle)}
      emptyVariant="properties"
      ctaLabel={intl.formatMessage(messages.propertiesCta)}
      {...(onNew && { onCta: onNew })}
    />
  );
}

export function ContactsPage({ onNew }: { onNew?: () => void }) {
  const intl = useIntl();
  return (
    <StubPage
      title={intl.formatMessage(messages.contactsTitle)}
      subtitle={intl.formatMessage(messages.contactsSubtitle)}
      emptyVariant="contacts"
      ctaLabel={intl.formatMessage(messages.contactsCta)}
      {...(onNew && { onCta: onNew })}
    />
  );
}

export function LeadsPage({ onNew }: { onNew?: () => void }) {
  const intl = useIntl();
  return (
    <StubPage
      title={intl.formatMessage(messages.leadsTitle)}
      subtitle={intl.formatMessage(messages.leadsSubtitle)}
      emptyVariant="leads"
      ctaLabel={intl.formatMessage(messages.leadsCta)}
      {...(onNew && { onCta: onNew })}
    />
  );
}

export function SettingsPage({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100%', fontFamily: F.body }}>
      {children}
    </div>
  );
}
