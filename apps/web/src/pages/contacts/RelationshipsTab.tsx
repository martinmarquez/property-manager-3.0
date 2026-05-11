import React, { useState, useRef, useEffect } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { trpc } from '../../trpc.js';

const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  border:        '#1F2D48',
  brand:         '#1654d9',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#6B809E',
  error:         '#EF4444',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

const msgs = defineMessages({
  title:       { id: 'contacts.detail.relationships.title' },
  add:         { id: 'contacts.detail.relationships.add' },
  empty:       { id: 'contacts.detail.relationships.empty' },
  selectKind:  { id: 'contacts.detail.relationships.selectKind' },
  contactId:   { id: 'contacts.detail.relationships.contactId' },
  notes:       { id: 'contacts.detail.relationships.notes' },
  save:        { id: 'contacts.detail.relationships.save' },
  cancel:      { id: 'contacts.detail.relationships.cancel' },
  remove:      { id: 'contacts.detail.relationships.remove' },
});

interface RelationshipsTabProps {
  contactId: string;
}

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function RelationshipsTab({ contactId }: RelationshipsTabProps) {
  const intl = useIntl();
  const [showModal, setShowModal] = useState(false);
  const [newKindId, setNewKindId] = useState('');
  const [newTargetId, setNewTargetId] = useState('');
  const [newTargetName, setNewTargetName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounced(searchQuery, 200);

  const { data: relationships, refetch } = trpc.contacts.relationships.list.useQuery({ contactId });
  const { data: kinds } = trpc.contacts.relationships.kinds.useQuery();
  const { data: searchResults } = trpc.contacts.list.useQuery(
    { q: debouncedSearch, limit: 8 },
    { enabled: debouncedSearch.length >= 2 },
  );
  const createMut = trpc.contacts.relationships.create.useMutation({ onSuccess: () => { void refetch(); setShowModal(false); } });
  const deleteMut = trpc.contacts.relationships.delete.useMutation({ onSuccess: () => { void refetch(); } });

  const filteredResults = searchResults?.items.filter((c) => c.id !== contactId) ?? [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreate = () => {
    if (!newKindId || !newTargetId) return;
    createMut.mutate({
      fromContactId: contactId,
      toContactId: newTargetId,
      kindId: newKindId,
      notes: newNotes || undefined,
    });
  };

  const handleDelete = (id: string) => {
    deleteMut.mutate({ id });
  };

  const openModal = () => {
    setNewKindId('');
    setNewTargetId('');
    setNewTargetName('');
    setSearchQuery('');
    setNewNotes('');
    setShowModal(true);
  };

  const selectContact = (id: string, name: string) => {
    setNewTargetId(id);
    setNewTargetName(name);
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontFamily: F.display, fontSize: '1rem', fontWeight: 600, color: C.textPrimary, margin: 0 }}>
          {intl.formatMessage(msgs.title)}
        </h3>
        <button type="button" onClick={openModal} style={primaryBtn}>
          + {intl.formatMessage(msgs.add)}
        </button>
      </div>

      {(!relationships || relationships.length === 0) && (
        <p style={{ color: C.textTertiary, fontSize: 13, margin: 0 }}>
          {intl.formatMessage(msgs.empty)}
        </p>
      )}

      {relationships?.map((rel) => (
        <div key={rel.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px', marginBottom: 6, borderRadius: 7,
          background: C.bgRaised, border: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: 4,
              background: `${C.brand}18`, color: C.brand, fontSize: 11, fontWeight: 600,
            }}>
              {rel.kindLabel}
            </span>
            <span style={{ color: C.textPrimary, fontSize: 13 }}>{rel.contactName}</span>
            <span style={{ color: C.textTertiary, fontSize: 11 }}>
              ({rel.direction === 'from' ? '→' : '←'})
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleDelete(rel.id)}
            style={{ ...outlineBtn, color: C.error, borderColor: `${C.error}40`, fontSize: 11, padding: '3px 8px' }}
          >
            {intl.formatMessage(msgs.remove)}
          </button>
        </div>
      ))}

      {/* Add relationship modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: 24, width: 400, maxWidth: '90vw',
          }}>
            <h4 style={{ fontFamily: F.display, fontSize: '1rem', fontWeight: 600, color: C.textPrimary, margin: '0 0 16px' }}>
              {intl.formatMessage(msgs.add)}
            </h4>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{intl.formatMessage(msgs.selectKind)}</label>
              <select value={newKindId} onChange={(e) => setNewKindId(e.target.value)} style={inputStyle}>
                <option value="">—</option>
                {kinds?.map((k) => (
                  <option key={k.id} value={k.id}>{k.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12, position: 'relative' }} ref={dropdownRef}>
              <label style={labelStyle}>{intl.formatMessage(msgs.contactId)}</label>
              {newTargetId ? (
                <div style={{
                  ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ color: C.textPrimary }}>{newTargetName}</span>
                  <button
                    type="button"
                    onClick={() => { setNewTargetId(''); setNewTargetName(''); }}
                    style={{ background: 'none', border: 'none', color: C.textTertiary, cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                  onFocus={() => { if (searchQuery.length >= 2) setShowDropdown(true); }}
                  placeholder={intl.formatMessage(msgs.contactId)}
                  style={inputStyle}
                />
              )}
              {showDropdown && filteredResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 7,
                  maxHeight: 200, overflowY: 'auto', marginTop: 4,
                }}>
                  {filteredResults.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => selectContact(c.id, c.displayName)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                        background: 'transparent', border: 'none', color: C.textPrimary,
                        fontSize: 13, cursor: 'pointer', fontFamily: F.body,
                        borderBottom: `1px solid ${C.border}`,
                      }}
                      onMouseEnter={(e) => { (e.target as HTMLElement).style.background = `${C.brand}18`; }}
                      onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
                    >
                      <span>{c.displayName}</span>
                      {c.primaryEmail && (
                        <span style={{ color: C.textTertiary, fontSize: 11, marginLeft: 8 }}>{c.primaryEmail}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{intl.formatMessage(msgs.notes)}</label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowModal(false)} style={outlineBtn}>
                {intl.formatMessage(msgs.cancel)}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newKindId || !newTargetId || createMut.isPending}
                style={{ ...primaryBtn, opacity: (!newKindId || !newTargetId) ? 0.5 : 1 }}
              >
                {intl.formatMessage(msgs.save)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500,
  color: '#8DA0C0',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 7, fontSize: 13,
  background: '#070D1A', border: '1px solid #1F2D48',
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
