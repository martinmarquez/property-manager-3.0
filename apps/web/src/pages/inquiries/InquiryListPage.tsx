import React, { useState } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { useNavigate } from '@tanstack/react-router';

const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgOverlay:     '#121D33',
  border:        '#1F2D48',
  brand:         '#1654d9',
  brandLight:    '#4669ff',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  success:       '#18A659',
  warning:       '#E88A14',
  error:         '#E83B3B',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

const msgs = defineMessages({
  title:         { id: 'pages.inquiries.title' },
  search:        { id: 'inquiries.list.search' },
  filterScore:   { id: 'inquiries.list.filterScore' },
  filterStatus:  { id: 'inquiries.list.filterStatus' },
  colContact:    { id: 'inquiries.list.col.contact' },
  colCriteria:   { id: 'inquiries.list.col.criteria' },
  colMatches:    { id: 'inquiries.list.col.matches' },
  colDate:       { id: 'inquiries.list.col.date' },
  colStatus:     { id: 'inquiries.list.col.status' },
  viewDetail:    { id: 'inquiries.list.viewDetail' },
  emptyTitle:    { id: 'inquiries.list.empty.title' },
  emptyBody:     { id: 'inquiries.list.empty.body' },
  statusNueva:   { id: 'inquiries.status.nueva' },
  statusVista:   { id: 'inquiries.status.vista' },
  statusNotif:   { id: 'inquiries.status.notificada' },
  statusArch:    { id: 'inquiries.status.archivada' },
  scoreLabel:    { id: 'inquiries.list.scoreLabel' },
  matchCount:    { id: 'inquiries.list.matchCount' },
});

export type InquiryStatus = 'nueva' | 'vista' | 'notificada' | 'archivada';

export interface Inquiry {
  id: string;
  contactName: string;
  contactEmail: string;
  contactAvatarInitials: string;
  contactAvatarHue: number;
  criteriaLabel: string;
  matchScore: number;
  matchCount: number;
  status: InquiryStatus;
  receivedAt: string;
}

/* ── Mock data ── */
const MOCK_INQUIRIES: Inquiry[] = [
  { id: 'i1', contactName: 'Lucas Fernández', contactEmail: 'lucas@email.com', contactAvatarInitials: 'LF', contactAvatarHue: 210, criteriaLabel: '3 amb, Palermo, hasta USD 250k', matchScore: 92, matchCount: 7, status: 'nueva', receivedAt: 'Hace 1 hora' },
  { id: 'i2', contactName: 'Valeria Torres', contactEmail: 'valeria@email.com', contactAvatarInitials: 'VT', contactAvatarHue: 290, criteriaLabel: 'PH, Belgrano o Núñez, USD 400–600k', matchScore: 78, matchCount: 3, status: 'vista', receivedAt: 'Hace 3 horas' },
  { id: 'i3', contactName: 'Martín Gutiérrez', contactEmail: 'martin@email.com', contactAvatarInitials: 'MG', contactAvatarHue: 140, criteriaLabel: 'Alquiler, 2 amb, CABA, hasta ARS 800k/mes', matchScore: 85, matchCount: 12, status: 'notificada', receivedAt: 'Ayer' },
  { id: 'i4', contactName: 'Sofía Rodríguez', contactEmail: 'sofia@email.com', contactAvatarInitials: 'SR', contactAvatarHue: 30, criteriaLabel: 'Local comercial, Microcentro, 100–300 m²', matchScore: 41, matchCount: 2, status: 'nueva', receivedAt: 'Ayer' },
  { id: 'i5', contactName: 'Diego Morales', contactEmail: 'diego@email.com', contactAvatarInitials: 'DM', contactAvatarHue: 180, criteriaLabel: 'Casa, Zona norte GBA, USD 200–350k', matchScore: 63, matchCount: 5, status: 'vista', receivedAt: 'Hace 2 días' },
  { id: 'i6', contactName: 'Camila Vega', contactEmail: 'camila@email.com', contactAvatarInitials: 'CV', contactAvatarHue: 60, criteriaLabel: '4 amb c/cochera, Palermo o Recoleta, USD 350k+', matchScore: 88, matchCount: 4, status: 'notificada', receivedAt: 'Hace 3 días' },
  { id: 'i7', contactName: 'Roberto Pérez', contactEmail: 'roberto@email.com', contactAvatarInitials: 'RP', contactAvatarHue: 330, criteriaLabel: 'Terreno, Tigre o Escobar, hasta USD 80k', matchScore: 22, matchCount: 1, status: 'archivada', receivedAt: 'Hace 5 días' },
];

/* ── Score badge ── */
export function ScoreBadge({ score, large = false }: { score: number; large?: boolean }) {
  const color = score >= 80 ? C.success : score >= 50 ? C.warning : C.error;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: large ? 52 : 38, height: large ? 52 : 38,
      borderRadius: large ? 12 : 9,
      background: `${color}18`, border: `1.5px solid ${color}50`,
      color, fontFamily: F.display, fontWeight: 800,
      fontSize: large ? 20 : 15, flexShrink: 0,
    }}>
      {score}
    </div>
  );
}

/* ── Status chip ── */
function StatusChip({ status, intl }: { status: InquiryStatus; intl: ReturnType<typeof useIntl> }) {
  const map: Record<InquiryStatus, { color: string; label: string }> = {
    nueva:      { color: C.brand, label: intl.formatMessage(msgs.statusNueva) },
    vista:      { color: C.textTertiary, label: intl.formatMessage(msgs.statusVista) },
    notificada: { color: C.success, label: intl.formatMessage(msgs.statusNotif) },
    archivada:  { color: C.textTertiary, label: intl.formatMessage(msgs.statusArch) },
  };
  const { color, label } = map[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontFamily: F.mono, fontWeight: 500,
      color, background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: 10, padding: '2px 8px', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}

function avatarStyle(hue: number): React.CSSProperties {
  return {
    backgroundColor: `hsl(${hue} 55% 22%)`,
    color: `hsl(${hue} 80% 75%)`,
    border: `1.5px solid hsl(${hue} 55% 35%)`,
  };
}

/* ── Score range filter ── */
function ScoreFilter({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.body, whiteSpace: 'nowrap' }}>Score:</span>
      <input
        type="number" min={0} max={max} value={min}
        onChange={(e) => onChange(Number(e.target.value), max)}
        style={{ width: 52, padding: '5px 8px', ...inputStyle }}
      />
      <span style={{ fontSize: 11, color: C.textTertiary }}>–</span>
      <input
        type="number" min={min} max={100} value={max}
        onChange={(e) => onChange(min, Number(e.target.value))}
        style={{ width: 52, padding: '5px 8px', ...inputStyle }}
      />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: C.bgRaised, border: `1px solid ${C.border}`,
  borderRadius: 7, color: C.textPrimary, fontSize: 12, fontFamily: F.mono,
  outline: 'none', boxSizing: 'border-box' as const,
};

/* ── Main page ── */
export function InquiryListPage() {
  const intl = useIntl();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [scoreMin, setScoreMin] = useState(0);
  const [scoreMax, setScoreMax] = useState(100);
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all');

  const filtered = MOCK_INQUIRIES.filter((i) => {
    if (q && !i.contactName.toLowerCase().includes(q.toLowerCase()) && !i.criteriaLabel.toLowerCase().includes(q.toLowerCase())) return false;
    if (i.matchScore < scoreMin || i.matchScore > scoreMax) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bgBase }}>
      {/* Header */}
      <div style={{
        padding: '20px 28px 16px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
          {intl.formatMessage(msgs.title)}
        </h1>
        {/* Score legend */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {[
            { range: '80–100', color: C.success, label: 'Excelente' },
            { range: '50–79', color: C.warning, label: 'Bueno' },
            { range: '0–49', color: C.error, label: 'Bajo' },
          ].map((l) => (
            <div key={l.range} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
              <span style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.body }}>{l.label} ({l.range})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        padding: '12px 28px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {/* Search */}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={intl.formatMessage(msgs.search)}
          style={{ padding: '7px 12px', borderRadius: 8, width: 240, ...inputStyle }}
        />

        {/* Score range */}
        <ScoreFilter min={scoreMin} max={scoreMax} onChange={(mn, mx) => { setScoreMin(mn); setScoreMax(mx); }} />

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4, background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3 }}>
          {(['all', 'nueva', 'vista', 'notificada', 'archivada'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: 'none',
                background: statusFilter === s ? C.brand : 'transparent',
                color: statusFilter === s ? '#fff' : C.textSecondary,
                fontSize: 11, fontFamily: F.body, fontWeight: 500,
                transition: 'background 0.12s', whiteSpace: 'nowrap',
              }}
            >
              {s === 'all' ? 'Todas'
               : s === 'nueva' ? intl.formatMessage(msgs.statusNueva)
               : s === 'vista' ? intl.formatMessage(msgs.statusVista)
               : s === 'notificada' ? intl.formatMessage(msgs.statusNotif)
               : intl.formatMessage(msgs.statusArch)}
            </button>
          ))}
        </div>

        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.textTertiary, fontFamily: F.mono }}>
          {sorted.length} consultas
        </span>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {sorted.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 64, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: `${C.brand}15`, border: `1.5px solid ${C.brand}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🔍</div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>{intl.formatMessage(msgs.emptyTitle)}</p>
              <p style={{ margin: 0, fontSize: 13, color: C.textSecondary, fontFamily: F.body }}>{intl.formatMessage(msgs.emptyBody)}</p>
            </div>
          </div>
        ) : (
          sorted.map((inquiry, i) => (
            <div
              key={inquiry.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0',
                borderBottom: i < sorted.length - 1 ? `1px solid ${C.border}` : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.background = C.bgRaised}
              onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              {/* Score badge */}
              <ScoreBadge score={inquiry.matchScore} />

              {/* Contact info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 200, flexShrink: 0 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, fontFamily: F.body, flexShrink: 0,
                  ...avatarStyle(inquiry.contactAvatarHue),
                }}>
                  {inquiry.contactAvatarInitials}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: F.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inquiry.contactName}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: C.textTertiary, fontFamily: F.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inquiry.contactEmail}
                  </p>
                </div>
              </div>

              {/* Criteria summary */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ margin: 0, fontSize: 13, color: C.textSecondary, fontFamily: F.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inquiry.criteriaLabel}
                </p>
              </div>

              {/* Match count */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 14,
                background: `${C.brand}15`, border: `1px solid ${C.brand}35`,
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 12, color: C.brandLight, fontFamily: F.mono, fontWeight: 600 }}>
                  {inquiry.matchCount}
                </span>
                <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.body }}>prop.</span>
              </div>

              {/* Date */}
              <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono, flexShrink: 0, width: 90, textAlign: 'right' }}>
                {inquiry.receivedAt}
              </span>

              {/* Status */}
              <div style={{ flexShrink: 0, width: 100, display: 'flex', justifyContent: 'center' }}>
                <StatusChip status={inquiry.status} intl={intl} />
              </div>

              {/* View detail */}
              <button
                onClick={() => navigate({ to: '/inquiries/$inquiryId', params: { inquiryId: inquiry.id } })}
                style={{
                  padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                  background: 'transparent', border: `1px solid ${C.border}`,
                  color: C.textSecondary, fontSize: 12, fontFamily: F.body, fontWeight: 500,
                  flexShrink: 0, whiteSpace: 'nowrap',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.brand;
                  (e.currentTarget as HTMLButtonElement).style.color = C.brandLight;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                  (e.currentTarget as HTMLButtonElement).style.color = C.textSecondary;
                }}
              >
                {intl.formatMessage(msgs.viewDetail)} →
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
