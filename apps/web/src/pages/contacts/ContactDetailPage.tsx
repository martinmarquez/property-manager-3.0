import React, { useState } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { useNavigate } from '@tanstack/react-router';
import { trpc } from '../../trpc.js';
import { RelationshipsTab } from './RelationshipsTab.js';

const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  border:        '#1F2D48',
  borderStrong:  '#253350',
  brand:         '#1654d9',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  success:       '#22C55E',
  warning:       '#F59E0B',
  error:         '#EF4444',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

const msgs = defineMessages({
  back:             { id: 'contacts.detail.back' },
  edit:             { id: 'contacts.detail.edit' },
  delete:           { id: 'contacts.detail.delete' },
  deleteConfirm:    { id: 'contacts.detail.deleteConfirm' },
  tabInfo:          { id: 'contacts.detail.tab.info' },
  tabRelationships: { id: 'contacts.detail.tab.relationships' },
  tabActivity:      { id: 'contacts.detail.tab.activity' },
  kindPerson:       { id: 'contacts.list.kind.person' },
  kindCompany:      { id: 'contacts.list.kind.company' },
  fieldEmail:       { id: 'contacts.form.field.email' },
  fieldPhone:       { id: 'contacts.form.field.phone' },
  fieldSource:      { id: 'contacts.form.field.source' },
  fieldNotes:       { id: 'contacts.form.field.notes' },
  fieldNationalId:  { id: 'contacts.form.field.nationalId' },
  fieldLeadScore:   { id: 'contacts.detail.leadScore' },
  noActivity:       { id: 'contacts.detail.noActivity' },
  created:          { id: 'contacts.detail.created' },
  updated:          { id: 'contacts.detail.updated' },
});

type Tab = 'info' | 'relationships' | 'activity';

interface ContactDetailPageProps {
  contactId: string;
}

export function ContactDetailPage({ contactId }: ContactDetailPageProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('info');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: contact, isLoading } = trpc.contacts.get.useQuery({ id: contactId });
  const deleteMut = trpc.contacts.delete.useMutation({
    onSuccess: () => void navigate({ to: '/contacts' as never }),
  });

  if (isLoading || !contact) {
    return (
      <div style={{ minHeight: '100%', fontFamily: F.body, background: C.bgBase, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: C.textTertiary, fontSize: 14 }}>…</span>
      </div>
    );
  }

  const displayName = contact.kind === 'company'
    ? (contact.legalName ?? '(sin nombre)')
    : [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '(sin nombre)';

  const phones = (contact.phones as Array<{ e164: string; type: string; whatsapp: boolean }>) ?? [];
  const emails = (contact.emails as Array<{ value: string; type: string }>) ?? [];
  const tags = (contact as Record<string, unknown>).tags as string[] ?? [];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: intl.formatMessage(msgs.tabInfo) },
    { key: 'relationships', label: intl.formatMessage(msgs.tabRelationships) },
    { key: 'activity', label: intl.formatMessage(msgs.tabActivity) },
  ];

  const handleDelete = () => {
    deleteMut.mutate({ id: contactId });
  };

  const leadScoreColor = contact.leadScore >= 70 ? C.success : contact.leadScore >= 40 ? C.warning : C.textTertiary;

  return (
    <div style={{ minHeight: '100%', fontFamily: F.body, background: C.bgBase }}>

      {/* Header */}
      <div style={{
        padding: '18px 20px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" onClick={() => void navigate({ to: '/contacts' as never })} style={outlineBtn}>
            ← {intl.formatMessage(msgs.back)}
          </button>
          <div>
            <h1 style={{
              fontFamily: F.display, fontSize: '1.25rem', fontWeight: 700,
              color: C.textPrimary, margin: 0,
            }}>
              {displayName}
            </h1>
            <span style={{
              display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 4,
              fontSize: 11, fontWeight: 600,
              background: contact.kind === 'person' ? `${C.brand}18` : `${C.success}18`,
              color: contact.kind === 'person' ? C.brand : C.success,
            }}>
              {contact.kind === 'person' ? intl.formatMessage(msgs.kindPerson) : intl.formatMessage(msgs.kindCompany)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => void navigate({ to: `/contacts/${contactId}/edit` as never })}
            style={outlineBtn}
          >
            {intl.formatMessage(msgs.edit)}
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{ ...outlineBtn, color: C.error, borderColor: `${C.error}40` }}
          >
            {intl.formatMessage(msgs.delete)}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`,
        padding: '0 20px',
      }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: 500,
              background: 'none', border: 'none',
              color: tab === t.key ? C.textPrimary : C.textTertiary,
              borderBottom: tab === t.key ? `2px solid ${C.brand}` : '2px solid transparent',
              cursor: 'pointer', fontFamily: F.body,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: 20 }}>
        {tab === 'info' && (
          <InfoTab
            contact={contact}
            phones={phones}
            emails={emails}
            tags={tags}
            leadScoreColor={leadScoreColor}
            intl={intl}
          />
        )}
        {tab === 'relationships' && (
          <RelationshipsTab contactId={contactId} />
        )}
        {tab === 'activity' && (
          <div style={{ color: C.textTertiary, fontSize: 13 }}>
            {intl.formatMessage(msgs.noActivity)}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: 24, width: 380, maxWidth: '90vw',
          }}>
            <h4 style={{ fontFamily: F.display, fontSize: '1rem', fontWeight: 600, color: C.textPrimary, margin: '0 0 12px' }}>
              {intl.formatMessage(msgs.delete)}
            </h4>
            <p style={{ color: C.textSecondary, fontSize: 13, margin: '0 0 20px' }}>
              {intl.formatMessage(msgs.deleteConfirm)}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} style={outlineBtn}>
                ← {intl.formatMessage(msgs.tabInfo)}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMut.isPending}
                style={{ ...primaryBtn, background: C.error }}
              >
                {intl.formatMessage(msgs.delete)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoTab({
  contact,
  phones,
  emails,
  tags,
  leadScoreColor,
  intl,
}: {
  contact: Record<string, unknown>;
  phones: Array<{ e164: string; type: string; whatsapp: boolean }>;
  emails: Array<{ value: string; type: string }>;
  tags: string[];
  leadScoreColor: string;
  intl: ReturnType<typeof useIntl>;
}) {
  return (
    <div style={{ maxWidth: 600 }}>
      {/* Lead score */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        padding: '10px 14px', borderRadius: 8,
        background: C.bgRaised, border: `1px solid ${C.border}`,
      }}>
        <span style={{ color: C.textSecondary, fontSize: 12, fontWeight: 500 }}>
          {intl.formatMessage(msgs.fieldLeadScore)}
        </span>
        <span style={{ fontFamily: F.mono, fontSize: 18, fontWeight: 700, color: leadScoreColor }}>
          {contact.leadScore as number}
        </span>
        <div style={{
          flex: 1, height: 6, borderRadius: 3, background: `${C.border}`,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${contact.leadScore as number}%`, height: '100%',
            background: leadScoreColor, borderRadius: 3,
          }} />
        </div>
      </div>

      {/* Phones */}
      {phones.length > 0 ? (
        <InfoSection label={intl.formatMessage(msgs.fieldPhone)}>
          {phones.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ color: C.textPrimary, fontSize: 13 }}>{p.e164}</span>
              <span style={chipStyle}>{p.type}</span>
              {p.whatsapp && <span style={{ ...chipStyle, background: '#22C55E18', color: '#22C55E' }}>WA</span>}
            </div>
          ))}
        </InfoSection>
      ) : null}

      {/* Emails */}
      {emails.length > 0 ? (
        <InfoSection label={intl.formatMessage(msgs.fieldEmail)}>
          {emails.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ color: C.textPrimary, fontSize: 13 }}>{e.value}</span>
              <span style={chipStyle}>{e.type}</span>
            </div>
          ))}
        </InfoSection>
      ) : null}

      {/* National ID */}
      {contact.nationalId ? (
        <InfoSection label={intl.formatMessage(msgs.fieldNationalId)}>
          <span style={{ color: C.textPrimary, fontSize: 13 }}>
            {contact.nationalIdType ? `${contact.nationalIdType as string}: ` : ''}{contact.nationalId as string}
          </span>
        </InfoSection>
      ) : null}

      {/* Source */}
      {contact.source ? (
        <InfoSection label={intl.formatMessage(msgs.fieldSource)}>
          <span style={{ color: C.textPrimary, fontSize: 13 }}>{contact.source as string}</span>
        </InfoSection>
      ) : null}

      {/* Tags */}
      {tags.length > 0 ? (
        <InfoSection label="Tags">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((tag) => (
              <span key={tag} style={{
                padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 500,
                background: `${C.brand}14`, color: C.brand, border: `1px solid ${C.brand}30`,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </InfoSection>
      ) : null}

      {/* Notes */}
      {contact.notes ? (
        <InfoSection label={intl.formatMessage(msgs.fieldNotes)}>
          <p style={{ color: C.textPrimary, fontSize: 13, margin: 0, whiteSpace: 'pre-wrap' }}>
            {contact.notes as string}
          </p>
        </InfoSection>
      ) : null}

      {/* Timestamps */}
      <div style={{ display: 'flex', gap: 24, marginTop: 24, fontSize: 11, color: C.textTertiary }}>
        <span>{intl.formatMessage(msgs.created)}: {new Date(contact.createdAt as string).toLocaleDateString()}</span>
        <span>{intl.formatMessage(msgs.updated)}: {new Date(contact.updatedAt as string).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function InfoSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#8DA0C0', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const chipStyle: React.CSSProperties = {
  padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 500,
  background: '#1F2D48', color: '#8DA0C0',
};

const outlineBtn: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
  background: '#0D1526', border: '1px solid #1F2D48',
  color: '#8DA0C0', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif",
};

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
  background: '#1654d9', border: 'none', color: '#fff',
  cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif",
};
