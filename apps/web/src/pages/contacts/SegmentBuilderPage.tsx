import React, { useState, useCallback } from 'react';
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
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

const msgs = defineMessages({
  title:       { id: 'contacts.segments.title' },
  subtitle:    { id: 'contacts.segments.subtitle' },
  addNew:      { id: 'contacts.segments.addNew' },
  empty:       { id: 'contacts.segments.empty' },
  nameField:   { id: 'contacts.segments.field.name' },
  descField:   { id: 'contacts.segments.field.description' },
  preview:     { id: 'contacts.segments.preview' },
  contacts:    { id: 'contacts.segments.contacts' },
  save:        { id: 'contacts.segments.save' },
  cancel:      { id: 'contacts.segments.cancel' },
  addCriterion:{ id: 'contacts.segments.criterion.add' },
  fieldLabel:  { id: 'contacts.segments.criterion.field' },
  opLabel:     { id: 'contacts.segments.criterion.op' },
  valueLabel:  { id: 'contacts.segments.criterion.value' },
  back:        { id: 'contacts.detail.back' },
});

const FIELD_OPTIONS = [
  { value: 'tag', label: 'Tag' },
  { value: 'lead_score', label: 'Lead score' },
  { value: 'source', label: 'Origen' },
  { value: 'province', label: 'Provincia' },
  { value: 'locality', label: 'Localidad' },
  { value: 'created_at', label: 'Fecha creación' },
];

const OP_OPTIONS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '!=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'in', label: 'in' },
];

interface Criterion {
  field: string;
  op: string;
  value: string;
}

export function SegmentBuilderPage() {
  const intl = useIntl();
  const navigate = useNavigate();

  const { data: segments, isLoading } = trpc.contacts.segments.list.useQuery();
  const createMut = trpc.contacts.segments.create.useMutation();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState<Criterion[]>([{ field: 'tag', op: 'eq', value: '' }]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const previewMut = trpc.contacts.segments.preview.useMutation();

  const addCriterion = useCallback(() => {
    setCriteria((prev) => [...prev, { field: 'tag', op: 'eq', value: '' }]);
  }, []);

  const updateCriterion = useCallback((idx: number, patch: Partial<Criterion>) => {
    setCriteria((prev) => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  }, []);

  const removeCriterion = useCallback((idx: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handlePreview = useCallback(async () => {
    const valid = criteria.filter((c) => c.field && c.op && c.value);
    if (!valid.length) return;
    const result = await previewMut.mutateAsync({
      criteria: valid.map((c) => ({
        field: c.field as 'tag' | 'lead_score' | 'source' | 'province' | 'locality' | 'created_at' | 'last_activity' | 'has_open_leads' | 'operation_interest',
        op: c.op as 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between' | 'is_true' | 'is_false',
        value: c.value,
      })),
    });
    setPreviewCount(result.count);
  }, [criteria, previewMut]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    const valid = criteria.filter((c) => c.field && c.op && c.value);
    await createMut.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      criteria: valid.map((c) => ({
        field: c.field as 'tag' | 'lead_score' | 'source' | 'province' | 'locality' | 'created_at' | 'last_activity' | 'has_open_leads' | 'operation_interest',
        op: c.op as 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between' | 'is_true' | 'is_false',
        value: c.value,
      })),
    });
    setShowForm(false);
    setName('');
    setDescription('');
    setCriteria([{ field: 'tag', op: 'eq', value: '' }]);
    setPreviewCount(null);
  }, [name, description, criteria, createMut]);

  const segmentList = segments ?? [];

  return (
    <div style={{ minHeight: '100%', fontFamily: F.body, background: C.bgBase }}>

      {/* Header */}
      <div style={{
        padding: '18px 20px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{
            fontFamily: F.display, fontSize: '1.25rem', fontWeight: 700,
            color: C.textPrimary, margin: 0,
          }}>
            {intl.formatMessage(msgs.title)}
          </h1>
          <p style={{ fontSize: 13, color: C.textTertiary, margin: '4px 0 0' }}>
            {intl.formatMessage(msgs.subtitle)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => void navigate({ to: '/contacts' as never })}
            style={outlineBtn}
          >
            &larr; {intl.formatMessage(msgs.back)}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            style={primaryBtn}
          >
            {intl.formatMessage(msgs.addNew)}
          </button>
        </div>
      </div>

      <div style={{ padding: 20 }}>

        {/* New segment form */}
        {showForm && (
          <div style={{
            marginBottom: 20, padding: 20, borderRadius: 8,
            background: C.bgRaised, border: `1px solid ${C.border}`,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>{intl.formatMessage(msgs.nameField)}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{intl.formatMessage(msgs.descField)}</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* Criteria rows */}
            {criteria.map((c, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <select
                  value={c.field}
                  onChange={(e) => updateCriterion(idx, { field: e.target.value })}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  {FIELD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <select
                  value={c.op}
                  onChange={(e) => updateCriterion(idx, { op: e.target.value })}
                  style={{ ...inputStyle, width: 80, flex: 'none' }}
                >
                  {OP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  value={c.value}
                  onChange={(e) => updateCriterion(idx, { value: e.target.value })}
                  placeholder={intl.formatMessage(msgs.valueLabel)}
                  style={{ ...inputStyle, flex: 2 }}
                />
                {criteria.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCriterion(idx)}
                    style={{ ...outlineBtn, padding: '6px 8px', color: '#EF4444' }}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}

            <button type="button" onClick={addCriterion} style={{ ...outlineBtn, marginBottom: 16, fontSize: 11 }}>
              + {intl.formatMessage(msgs.addCriterion)}
            </button>

            {/* Preview + save */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <button type="button" onClick={() => void handlePreview()} style={outlineBtn}>
                {intl.formatMessage(msgs.preview)}
              </button>
              {previewCount !== null && (
                <span style={{ fontSize: 13, color: C.textSecondary }}>
                  {intl.formatMessage(msgs.contacts, { count: previewCount })}
                </span>
              )}
              <div style={{ flex: 1 }} />
              <button type="button" onClick={() => setShowForm(false)} style={outlineBtn}>
                {intl.formatMessage(msgs.cancel)}
              </button>
              <button type="button" onClick={() => void handleSave()} style={primaryBtn}>
                {intl.formatMessage(msgs.save)}
              </button>
            </div>
          </div>
        )}

        {/* Segment list */}
        {isLoading ? (
          <div style={{ color: C.textTertiary, padding: 40, textAlign: 'center' }}>...</div>
        ) : segmentList.length === 0 && !showForm ? (
          <div style={{ color: C.textTertiary, padding: 40, textAlign: 'center', fontSize: 14 }}>
            {intl.formatMessage(msgs.empty)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {segmentList.map((seg) => (
              <div key={seg.id} style={{
                padding: '14px 16px', borderRadius: 8,
                background: C.bgRaised, border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ color: C.textPrimary, fontWeight: 600, fontSize: 14 }}>
                    {seg.name}
                  </div>
                  {seg.description && (
                    <div style={{ color: C.textTertiary, fontSize: 12, marginTop: 2 }}>
                      {seg.description}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: C.textSecondary }}>
                  {intl.formatMessage(msgs.contacts, { count: seg.memberCount ?? 0 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#8DA0C0',
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
