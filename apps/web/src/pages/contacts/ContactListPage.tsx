import React, { useState, useCallback, useRef } from 'react';
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
  textTertiary:  '#6B809E',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

const msgs = defineMessages({
  title:       { id: 'pages.contacts.title' },
  search:      { id: 'contacts.list.search' },
  addNew:      { id: 'contacts.list.addNew' },
  duplicates:  { id: 'contacts.list.duplicates' },
  segments:    { id: 'contacts.list.segments' },
  filterAll:   { id: 'contacts.list.filter.all' },
  filterPerson:{ id: 'contacts.list.filter.person' },
  filterCompany:{ id: 'contacts.list.filter.company' },
  empty:       { id: 'contacts.list.empty' },
  colName:     { id: 'contacts.list.col.name' },
  colType:     { id: 'contacts.list.col.type' },
  colEmail:    { id: 'contacts.list.col.email' },
  colPhone:    { id: 'contacts.list.col.phone' },
  colUpdated:  { id: 'contacts.list.col.updated' },
  kindPerson:  { id: 'contacts.list.kind.person' },
  kindCompany: { id: 'contacts.list.kind.company' },
});

type KindFilter = 'all' | 'person' | 'company';

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(value), delayMs);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, delayMs]);
  return debounced;
}

export function ContactListPage() {
  const intl = useIntl();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const debouncedQ = useDebounced(q, 200);

  const { data, isLoading } = trpc.contacts.list.useQuery({
    q: debouncedQ || undefined,
    kind: kind === 'all' ? undefined : [kind],
    limit: 100,
  });

  const contacts = data?.items ?? [];

  const handleRowClick = useCallback((id: string) => {
    void navigate({ to: `/contacts/${id}` as never });
  }, [navigate]);

  return (
    <div style={{ minHeight: '100%', fontFamily: F.body, background: C.bgBase }}>

      {/* Header */}
      <div style={{
        padding: '18px 20px 0',
        borderBottom: `1px solid ${C.border}`,
        background: C.bgBase,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h1 style={{
              fontFamily: F.display, fontSize: '1.25rem', fontWeight: 700,
              color: C.textPrimary, letterSpacing: '-0.02em', margin: 0,
            }}>
              {intl.formatMessage(msgs.title)}
            </h1>
            {!isLoading && (
              <span style={{ fontSize: 13, color: C.textTertiary }}>
                {intl.formatNumber(contacts.length)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Secondary nav */}
            <button
              type="button"
              onClick={() => void navigate({ to: '/contacts/duplicates' as never })}
              style={outlineBtn}
            >
              {intl.formatMessage(msgs.duplicates)}
            </button>
            <button
              type="button"
              onClick={() => void navigate({ to: '/contacts/segments' as never })}
              style={outlineBtn}
            >
              {intl.formatMessage(msgs.segments)}
            </button>

            <div style={{ width: 1, height: 24, background: C.border }} />

            <button
              type="button"
              onClick={() => void navigate({ to: '/contacts/new' as never })}
              style={primaryBtn}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1244b8'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.brand; }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <line x1="8" y1="2" x2="8" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="2" y1="8" x2="14" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {intl.formatMessage(msgs.addNew)}
            </button>
          </div>
        </div>

        {/* Search + kind filter */}
        <div style={{ display: 'flex', gap: 8, paddingBottom: 12 }}>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={intl.formatMessage(msgs.search)}
            style={{
              flex: 1, maxWidth: 360,
              padding: '7px 12px', borderRadius: 7, fontSize: 13,
              background: C.bgRaised, border: `1px solid ${C.border}`,
              color: C.textPrimary, outline: 'none',
              fontFamily: F.body,
            }}
          />

          {(['all', 'person', 'company'] as KindFilter[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              style={{
                padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                background: kind === k ? `${C.brand}20` : C.bgRaised,
                border: `1px solid ${kind === k ? C.brand : C.border}`,
                color: kind === k ? '#5577FF' : C.textSecondary,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {k === 'all' ? intl.formatMessage(msgs.filterAll)
                : k === 'person' ? intl.formatMessage(msgs.filterPerson)
                : intl.formatMessage(msgs.filterCompany)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : contacts.length === 0 ? (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: C.textTertiary, fontSize: 14 }}>
          {intl.formatMessage(msgs.empty)}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[msgs.colName, msgs.colType, msgs.colEmail, msgs.colPhone, msgs.colUpdated].map((m, i) => (
                  <th key={i} style={{
                    padding: '10px 16px', textAlign: 'left',
                    color: C.textTertiary, fontWeight: 500, fontSize: 11,
                    whiteSpace: 'nowrap',
                  }}>
                    {intl.formatMessage(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => handleRowClick(c.id)}
                  style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = C.bgRaised; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                >
                  <td style={{ padding: '12px 16px', color: C.textPrimary, fontWeight: 500 }}>
                    {(c as ContactRow).displayName ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: C.textSecondary }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                      background: c.kind === 'person' ? '#1654d920' : '#9333ea20',
                      color: c.kind === 'person' ? '#5577FF' : '#c084fc',
                    }}>
                      {c.kind === 'person' ? intl.formatMessage(msgs.kindPerson) : intl.formatMessage(msgs.kindCompany)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: C.textSecondary }}>
                    {(c as ContactRow).primaryEmail ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: C.textSecondary }}>
                    {(c as ContactRow).primaryPhone ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: C.textTertiary, fontSize: 11 }}>
                    {new Date(c.updatedAt).toLocaleDateString(intl.locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// The API returns the full contact object; these helpers extract display fields
interface ContactRow {
  id: string;
  kind: 'person' | 'company';
  displayName?: string | null;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  updatedAt: string;
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: 16 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{
          height: 44, borderRadius: 6, marginBottom: 8,
          background: `${C.bgRaised}80`,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
    </div>
  );
}

const outlineBtn: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
  background: C.bgRaised, border: `1px solid ${C.border}`,
  color: C.textSecondary, cursor: 'pointer', transition: 'all 0.15s',
  fontFamily: F.body,
};

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
  background: C.brand, border: 'none', color: '#fff',
  cursor: 'pointer', transition: 'background 0.15s', fontFamily: F.body,
};
