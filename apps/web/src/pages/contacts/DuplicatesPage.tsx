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
  textTertiary:  '#6B809E',
  green:         '#22C55E',
  greenBg:       '#14532D20',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

const msgs = defineMessages({
  title:      { id: 'contacts.duplicates.title' },
  subtitle:   { id: 'contacts.duplicates.subtitle' },
  empty:      { id: 'contacts.duplicates.empty' },
  merge:      { id: 'contacts.duplicates.merge' },
  skip:       { id: 'contacts.duplicates.skip' },
  confidence: { id: 'contacts.duplicates.confidence' },
  keepLeft:   { id: 'contacts.duplicates.keepLeft' },
  keepRight:  { id: 'contacts.duplicates.keepRight' },
  winner:     { id: 'contacts.duplicates.winner' },
  confirm:    { id: 'contacts.duplicates.confirm' },
  back:       { id: 'contacts.detail.back' },
});

interface DuplicatePair {
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  aEmails: string[];
  bEmails: string[];
  score: number;
}

export function DuplicatesPage() {
  const intl = useIntl();
  const navigate = useNavigate();

  const { data, isLoading, refetch } = trpc.contacts.duplicates.list.useQuery({ limit: 50 });
  const mergeMut = trpc.contacts.merge.useMutation();

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);

  const pairs: DuplicatePair[] = (data ?? []) as DuplicatePair[];

  const handleMerge = useCallback(async (pair: DuplicatePair) => {
    if (!winnerId) return;
    const loserId = winnerId === pair.aId ? pair.bId : pair.aId;
    await mergeMut.mutateAsync({ winnerId, loserId });
    setExpandedIdx(null);
    setWinnerId(null);
    void refetch();
  }, [winnerId, mergeMut, refetch]);

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
        <button
          type="button"
          onClick={() => void navigate({ to: '/contacts' as never })}
          style={outlineBtn}
        >
          &larr; {intl.formatMessage(msgs.back)}
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 20 }}>
        {isLoading ? (
          <div style={{ color: C.textTertiary, padding: 40, textAlign: 'center' }}>...</div>
        ) : pairs.length === 0 ? (
          <div style={{ color: C.textTertiary, padding: 40, textAlign: 'center', fontSize: 14 }}>
            {intl.formatMessage(msgs.empty)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pairs.map((pair, idx) => {
              const isExpanded = expandedIdx === idx;
              return (
                <div key={`${pair.aId}-${pair.bId}`} style={{
                  borderRadius: 8, border: `1px solid ${C.border}`,
                  background: C.bgRaised, overflow: 'hidden',
                }}>
                  {/* Summary row */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', cursor: 'pointer',
                    }}
                    onClick={() => { setExpandedIdx(isExpanded ? null : idx); setWinnerId(null); }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ color: C.textPrimary, fontWeight: 600, fontSize: 14 }}>
                        {pair.aName}
                      </span>
                      <span style={{ color: C.textTertiary, fontSize: 12 }}>&harr;</span>
                      <span style={{ color: C.textPrimary, fontWeight: 600, fontSize: 14 }}>
                        {pair.bName}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ConfidenceBadge score={pair.score} label={intl.formatMessage(msgs.confidence)} />
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke={C.textTertiary} strokeWidth="2"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded merge panel */}
                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${C.border}` }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: 16, padding: '16px 0',
                      }}>
                        {/* Left contact */}
                        <div
                          onClick={() => setWinnerId(pair.aId)}
                          style={{
                            padding: 14, borderRadius: 8, cursor: 'pointer',
                            border: `2px solid ${winnerId === pair.aId ? C.green : C.border}`,
                            background: winnerId === pair.aId ? C.greenBg : 'transparent',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 8 }}>
                            {pair.aName}
                            {winnerId === pair.aId && (
                              <span style={{ marginLeft: 8, fontSize: 11, color: C.green }}>
                                {intl.formatMessage(msgs.winner)}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: C.textSecondary }}>
                            {pair.aEmails.join(', ') || '—'}
                          </div>
                        </div>

                        {/* Right contact */}
                        <div
                          onClick={() => setWinnerId(pair.bId)}
                          style={{
                            padding: 14, borderRadius: 8, cursor: 'pointer',
                            border: `2px solid ${winnerId === pair.bId ? C.green : C.border}`,
                            background: winnerId === pair.bId ? C.greenBg : 'transparent',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 8 }}>
                            {pair.bName}
                            {winnerId === pair.bId && (
                              <span style={{ marginLeft: 8, fontSize: 11, color: C.green }}>
                                {intl.formatMessage(msgs.winner)}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: C.textSecondary }}>
                            {pair.bEmails.join(', ') || '—'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => { setExpandedIdx(null); setWinnerId(null); }}
                          style={outlineBtn}
                        >
                          {intl.formatMessage(msgs.skip)}
                        </button>
                        <button
                          type="button"
                          disabled={!winnerId || mergeMut.isPending}
                          onClick={() => void handleMerge(pair)}
                          style={{
                            ...primaryBtn,
                            opacity: !winnerId || mergeMut.isPending ? 0.5 : 1,
                          }}
                        >
                          {intl.formatMessage(msgs.confirm)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfidenceBadge({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? '#EF4444' : pct >= 40 ? '#F59E0B' : '#22C55E';
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 8px',
      borderRadius: 4, color, background: `${color}15`,
    }}>
      {label} {pct}%
    </span>
  );
}

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
