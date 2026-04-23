import React, { useState, useEffect, useCallback } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { useNavigate } from '@tanstack/react-router';
import { trpc } from '../../trpc.js';

const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  border:        '#1F2D48',
  brand:         '#1654d9',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  warning:       '#F59E0B',
  warningBg:     '#78350F20',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

const msgs = defineMessages({
  titleNew:         { id: 'contacts.form.title.new' },
  titleEdit:        { id: 'contacts.form.title.edit' },
  kindPerson:       { id: 'contacts.form.kind.person' },
  kindCompany:      { id: 'contacts.form.kind.company' },
  firstName:        { id: 'contacts.form.field.firstName' },
  lastName:         { id: 'contacts.form.field.lastName' },
  nationalIdType:   { id: 'contacts.form.field.nationalIdType' },
  nationalId:       { id: 'contacts.form.field.nationalId' },
  legalName:        { id: 'contacts.form.field.legalName' },
  cuit:             { id: 'contacts.form.field.cuit' },
  industry:         { id: 'contacts.form.field.industry' },
  phone:            { id: 'contacts.form.field.phone' },
  email:            { id: 'contacts.form.field.email' },
  source:           { id: 'contacts.form.field.source' },
  notes:            { id: 'contacts.form.field.notes' },
  save:             { id: 'contacts.form.save' },
  cancel:           { id: 'contacts.form.cancel' },
  duplicateTitle:   { id: 'contacts.form.duplicate.title' },
  duplicateIgnore:  { id: 'contacts.form.duplicate.ignore' },
  duplicateView:    { id: 'contacts.form.duplicate.view' },
});

interface ContactFormPageProps {
  contactId?: string;
}

type Kind = 'person' | 'company';

type PhoneType = 'mobile' | 'whatsapp' | 'landline' | 'office';
type EmailType = 'personal' | 'work' | 'other';

interface FormState {
  kind: Kind;
  firstName: string;
  lastName: string;
  nationalIdType: string;
  nationalId: string;
  legalName: string;
  cuit: string;
  industry: string;
  phones: Array<{ e164: string; type: PhoneType; whatsapp: boolean; primary: boolean }>;
  emails: Array<{ value: string; type: EmailType; primary: boolean }>;
  source: string;
  notes: string;
  tags: string[];
}

const EMPTY_FORM: FormState = {
  kind: 'person',
  firstName: '', lastName: '',
  nationalIdType: '', nationalId: '',
  legalName: '', cuit: '', industry: '',
  phones: [{ e164: '', type: 'mobile', whatsapp: false, primary: true }],
  emails: [{ value: '', type: 'personal', primary: true }],
  source: '', notes: '', tags: [],
};

export function ContactFormPage({ contactId }: ContactFormPageProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const isEdit = !!contactId;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [duplicates, setDuplicates] = useState<Array<{ id: string; displayName: string; score: number }>>([]);
  const [saving, setSaving] = useState(false);

  const { data: existing } = trpc.contacts.get.useQuery(
    { id: contactId! },
    { enabled: isEdit },
  );

  useEffect(() => {
    if (!existing) return;
    setForm({
      kind: existing.kind,
      firstName: existing.firstName ?? '',
      lastName: existing.lastName ?? '',
      nationalIdType: existing.nationalIdType ?? '',
      nationalId: existing.nationalId ?? '',
      legalName: existing.legalName ?? '',
      cuit: existing.cuit ?? '',
      industry: existing.industry ?? '',
      phones: (existing.phones as FormState['phones'] | undefined) ?? EMPTY_FORM.phones,
      emails: (existing.emails as FormState['emails'] | undefined) ?? EMPTY_FORM.emails,
      source: existing.source ?? '',
      notes: existing.notes ?? '',
      tags: ((existing as Record<string, unknown>).tags as string[] | undefined) ?? [],
    });
  }, [existing]);

  const createMut = trpc.contacts.create.useMutation();
  const updateMut = trpc.contacts.update.useMutation();
  const dupCheck = trpc.contacts.checkDuplicates.useMutation();

  const setField = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleSave = useCallback(async (force = false) => {
    setSaving(true);
    try {
      if (!force) {
        const result = await dupCheck.mutateAsync({
          emails: form.emails.filter((e) => e.value).map((e) => e.value),
          phones: form.phones.filter((p) => p.e164).map((p) => p.e164),
          nationalId: form.nationalId || undefined,
          excludeId: contactId,
        });
        if (result.duplicates.length > 0) {
          setDuplicates(result.duplicates.map((d) => ({ id: d.id, displayName: d.name, score: d.score })));
          setSaving(false);
          return;
        }
      }

      if (isEdit) {
        await updateMut.mutateAsync({
          id: contactId!,
          data: buildUpdatePayload(form),
          tags: form.tags,
        });
      } else {
        await createMut.mutateAsync(buildCreatePayload(form));
      }
      void navigate({ to: '/contacts' as never });
    } finally {
      setSaving(false);
    }
  }, [form, isEdit, contactId, createMut, updateMut, dupCheck, navigate]);

  return (
    <div style={{ minHeight: '100%', fontFamily: F.body, background: C.bgBase }}>

      {/* Header */}
      <div style={{
        padding: '18px 20px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h1 style={{
          fontFamily: F.display, fontSize: '1.25rem', fontWeight: 700,
          color: C.textPrimary, margin: 0,
        }}>
          {intl.formatMessage(isEdit ? msgs.titleEdit : msgs.titleNew)}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => void navigate({ to: '/contacts' as never })} style={outlineBtn}>
            {intl.formatMessage(msgs.cancel)}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}
          >
            {intl.formatMessage(msgs.save)}
          </button>
        </div>
      </div>

      {/* Duplicate warning */}
      {duplicates.length > 0 && (
        <div style={{
          margin: '16px 20px', padding: 16, borderRadius: 8,
          background: C.warningBg, border: `1px solid ${C.warning}40`,
        }}>
          <div style={{ fontWeight: 600, color: C.warning, marginBottom: 8, fontSize: 13 }}>
            {intl.formatMessage(msgs.duplicateTitle)}
          </div>
          {duplicates.map((d) => (
            <div key={d.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 0', borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ color: C.textPrimary, fontSize: 13 }}>
                {d.displayName} <span style={{ color: C.textTertiary }}>({Math.round(d.score * 100)}%)</span>
              </span>
              <button
                type="button"
                onClick={() => void navigate({ to: `/contacts/${d.id}/edit` as never })}
                style={{ ...outlineBtn, fontSize: 11, padding: '4px 10px' }}
              >
                {intl.formatMessage(msgs.duplicateView)}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => { setDuplicates([]); void handleSave(true); }}
            style={{ ...primaryBtn, marginTop: 12, fontSize: 12 }}
          >
            {intl.formatMessage(msgs.duplicateIgnore)}
          </button>
        </div>
      )}

      {/* Form */}
      <div style={{ padding: '20px', maxWidth: 640 }}>

        {/* Kind toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['person', 'company'] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setField('kind', k)}
              disabled={isEdit}
              style={{
                padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                background: form.kind === k ? C.brand : C.bgRaised,
                border: `1px solid ${form.kind === k ? C.brand : C.border}`,
                color: form.kind === k ? '#fff' : C.textSecondary,
                cursor: isEdit ? 'not-allowed' : 'pointer',
                opacity: isEdit && form.kind !== k ? 0.4 : 1,
              }}
            >
              {k === 'person' ? intl.formatMessage(msgs.kindPerson) : intl.formatMessage(msgs.kindCompany)}
            </button>
          ))}
        </div>

        {/* Person fields */}
        {form.kind === 'person' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <Field label={intl.formatMessage(msgs.firstName)} value={form.firstName} onChange={(v) => setField('firstName', v)} />
              <Field label={intl.formatMessage(msgs.lastName)} value={form.lastName} onChange={(v) => setField('lastName', v)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>{intl.formatMessage(msgs.nationalIdType)}</label>
                <select
                  value={form.nationalIdType}
                  onChange={(e) => setField('nationalIdType', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">—</option>
                  <option value="DNI">DNI</option>
                  <option value="CUIT">CUIT</option>
                  <option value="CUIL">CUIL</option>
                  <option value="passport">Pasaporte</option>
                </select>
              </div>
              <Field label={intl.formatMessage(msgs.nationalId)} value={form.nationalId} onChange={(v) => setField('nationalId', v)} />
            </div>
          </>
        )}

        {/* Company fields */}
        {form.kind === 'company' && (
          <>
            <Field label={intl.formatMessage(msgs.legalName)} value={form.legalName} onChange={(v) => setField('legalName', v)} />
            <div style={{ height: 12 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <Field label={intl.formatMessage(msgs.cuit)} value={form.cuit} onChange={(v) => setField('cuit', v)} />
              <Field label={intl.formatMessage(msgs.industry)} value={form.industry} onChange={(v) => setField('industry', v)} />
            </div>
          </>
        )}

        {/* Phone */}
        <Field
          label={intl.formatMessage(msgs.phone)}
          value={form.phones[0]?.e164 ?? ''}
          onChange={(v) => setField('phones', [{ ...form.phones[0]!, e164: v }])}
        />
        <div style={{ height: 12 }} />

        {/* Email */}
        <Field
          label={intl.formatMessage(msgs.email)}
          value={form.emails[0]?.value ?? ''}
          onChange={(v) => setField('emails', [{ ...form.emails[0]!, value: v }])}
        />
        <div style={{ height: 12 }} />

        {/* Source */}
        <Field label={intl.formatMessage(msgs.source)} value={form.source} onChange={(v) => setField('source', v)} />
        <div style={{ height: 12 }} />

        {/* Notes */}
        <div>
          <label style={labelStyle}>{intl.formatMessage(msgs.notes)}</label>
          <textarea
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function buildCreatePayload(form: FormState) {
  const phones = form.phones.filter((p) => p.e164);
  const emails = form.emails.filter((e) => e.value);
  const addresses: Array<{ street?: string; number?: string; city?: string; province?: string; zip?: string }> = [];
  const shared = { phones, emails, addresses, source: form.source || undefined, notes: form.notes || undefined, tags: form.tags };

  if (form.kind === 'person') {
    return {
      kind: 'person' as const,
      firstName: form.firstName,
      lastName: form.lastName,
      nationalIdType: (form.nationalIdType || undefined) as 'DNI' | 'CUIT' | 'CUIL' | 'passport' | undefined,
      nationalId: form.nationalId || undefined,
      ...shared,
    };
  }
  return {
    kind: 'company' as const,
    legalName: form.legalName,
    cuit: form.cuit || undefined,
    industry: form.industry || undefined,
    ...shared,
  };
}

function buildUpdatePayload(form: FormState) {
  const phones = form.phones.filter((p) => p.e164);
  const emails = form.emails.filter((e) => e.value);
  return {
    firstName: form.firstName || undefined,
    lastName: form.lastName || undefined,
    nationalIdType: (form.nationalIdType || undefined) as 'DNI' | 'CUIT' | 'CUIL' | 'passport' | undefined,
    nationalId: form.nationalId || undefined,
    legalName: form.legalName || undefined,
    cuit: form.cuit || undefined,
    industry: form.industry || undefined,
    phones,
    emails,
    source: form.source || undefined,
    notes: form.notes || undefined,
  };
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500,
  color: '#8DA0C0',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 7, fontSize: 13,
  background: '#0D1526', border: '1px solid #1F2D48',
  color: '#EFF4FF', outline: 'none', fontFamily: "'DM Sans', system-ui, sans-serif",
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
