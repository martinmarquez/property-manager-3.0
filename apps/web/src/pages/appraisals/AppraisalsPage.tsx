import React, { useState, useCallback, useRef } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import {
  Plus, Search, Download, Filter, Calendar,
  TrendingUp, CheckCircle2, AlertTriangle, Clock,
  Eye, Copy, Trash2, MoreHorizontal,
  ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react';
import { C, F } from '../../components/copilot/tokens.js';
import { trpc } from '../../trpc.js';
import { UpsellWall } from '../../components/billing/UpsellWall.js';
import { getUpsellPayload } from '../../lib/upsell.js';

/* ─── i18n messages ─────────────────────────────────────────── */

const m = defineMessages({
  title:           { id: 'pages.appraisals.title' },
  subtitle:        { id: 'pages.appraisals.subtitle' },
  cta:             { id: 'pages.appraisals.cta' },
  empty:           { id: 'pages.appraisals.empty' },
  searchPlaceholder: { id: 'appraisals.list.search.placeholder' },
  filterAll:       { id: 'appraisals.list.filter.allStatuses' },
  filterPeriod:    { id: 'appraisals.list.filter.period' },
  filterExport:    { id: 'appraisals.list.filter.export' },
  statusDraft:     { id: 'appraisals.list.status.draft' },
  statusCompleted: { id: 'appraisals.list.status.completed' },
  statusInProgress:{ id: 'appraisals.list.status.inProgress' },
  colAddress:      { id: 'appraisals.list.col.address' },
  colPurpose:      { id: 'appraisals.list.col.purpose' },
  colDate:         { id: 'appraisals.list.col.date' },
  colStatus:       { id: 'appraisals.list.col.status' },
  colPdf:          { id: 'appraisals.list.col.pdf' },
  colActions:      { id: 'appraisals.list.col.actions' },
  actionOpen:      { id: 'appraisals.list.action.open' },
  actionDuplicate: { id: 'appraisals.list.action.duplicate' },
  actionDelete:    { id: 'appraisals.list.action.delete' },
  actionDownload:  { id: 'appraisals.list.action.download' },
  statsTotal:      { id: 'appraisals.list.stats.total' },
  statsMonth:      { id: 'appraisals.list.stats.month' },
  statsPending:    { id: 'appraisals.list.stats.pending' },
  statsCompleted:  { id: 'appraisals.list.stats.completed' },
  paginationShowing: { id: 'appraisals.list.pagination.showing' },
});

/* ─── Types ─────────────────────────────────────────────────── */

type AppraisalStatus = 'draft' | 'completed' | 'in_progress';
type DbStatus = 'draft' | 'in_progress' | 'in_review' | 'approved' | 'delivered' | 'archived';

interface Appraisal {
  id:          string;
  address:     string;
  purpose:     string;
  status:      AppraisalStatus;
  value:       string;
  date:        string;
  clientName:  string;
  isDeletable: boolean;
}

const PURPOSE_LABEL: Record<string, string> = {
  sale:        'Venta',
  rent:        'Alquiler',
  guarantee:   'Garantía',
  inheritance: 'Sucesión',
  tax:         'Fiscal',
  insurance:   'Seguro',
  judicial:    'Judicial',
  other:       'Otro',
};

function toUiStatus(dbStatus: DbStatus): AppraisalStatus {
  if (dbStatus === 'draft') return 'draft';
  if (dbStatus === 'approved' || dbStatus === 'delivered') return 'completed';
  return 'in_progress';
}

function formatValue(min: string | null, currency: string): string {
  if (!min) return '—';
  const num = parseFloat(min);
  if (isNaN(num)) return '—';
  return `${currency} ${num.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

/* ─── Status config ─────────────────────────────────────────── */

const STATUS_CFG: Record<AppraisalStatus, { msgId: keyof typeof m; bg: string; color: string }> = {
  draft:       { msgId: 'statusDraft',      bg: C.bgElevated,   color: C.warning  },
  in_progress: { msgId: 'statusInProgress', bg: 'rgba(22,84,217,0.12)', color: C.brand },
  completed:   { msgId: 'statusCompleted',  bg: 'rgba(24,166,89,0.12)', color: C.success },
};

/* ─── StatusBadge ───────────────────────────────────────────── */

function StatusBadge({ status }: { status: AppraisalStatus }) {
  const intl = useIntl();
  const cfg = STATUS_CFG[status];
  return (
    <span
      role="status"
      style={{
        display: 'inline-flex', alignItems: 'center',
        background: cfg.bg, color: cfg.color,
        borderRadius: 99, padding: '3px 10px',
        fontSize: 11, fontWeight: 600, fontFamily: F.mono,
        letterSpacing: '0.02em', whiteSpace: 'nowrap',
        border: `1px solid ${cfg.color}30`,
      }}
    >
      {intl.formatMessage(m[cfg.msgId])}
    </span>
  );
}

/* ─── StatCard ──────────────────────────────────────────────── */

function StatCard({ icon, iconBg, value, label, valueColor = C.textPrimary }: {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <div
      role="group"
      aria-label={`${value} ${label}`}
      style={{
        flex: 1, background: C.bgRaised, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: F.mono, fontSize: 22, fontWeight: 700, color: valueColor, lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginTop: 3 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/* ─── RowActions (kebab menu) ───────────────────────────────── */

function RowActions({ appraisal, onClose, onDeleted, onDuplicated }: {
  appraisal: Appraisal;
  onClose: () => void;
  onDeleted?: () => void;
  onDuplicated?: () => void;
}) {
  const intl = useIntl();
  const menuRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const deleteMut = trpc.appraisals.delete.useMutation({
    onSuccess: () => { utils.appraisals.list.invalidate(); onDeleted?.(); onClose(); },
  });
  const duplicateMut = trpc.appraisals.duplicate.useMutation({
    onSuccess: () => { utils.appraisals.list.invalidate(); onDuplicated?.(); onClose(); },
  });

  const items = [
    { label: intl.formatMessage(m.actionOpen), icon: <Eye size={13} />, action: 'open' as const },
    { label: intl.formatMessage(m.actionDuplicate), icon: <Copy size={13} />, action: 'duplicate' as const },
    ...(appraisal.isDeletable
      ? [{ label: intl.formatMessage(m.actionDelete), icon: <Trash2 size={13} />, action: 'delete' as const, danger: true }]
      : []),
  ];

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={intl.formatMessage(m.colActions)}
      onMouseLeave={onClose}
      style={{
        position: 'absolute', right: 0, top: '110%', zIndex: 50,
        background: C.bgElevated, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '4px 0', minWidth: 156,
        boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
      }}
    >
      {items.map((item) => (
        <button
          key={item.action}
          role="menuitem"
          onClick={() => {
            if (item.action === 'delete') deleteMut.mutate({ id: appraisal.id });
            else if (item.action === 'duplicate') duplicateMut.mutate({ id: appraisal.id });
            else onClose();
          }}
          disabled={
            (item.action === 'delete' && deleteMut.isPending) ||
            (item.action === 'duplicate' && duplicateMut.isPending)
          }
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '8px 14px',
            background: 'none', border: 'none', textAlign: 'left',
            cursor: 'pointer', fontFamily: F.body, fontSize: 13,
            color: 'danger' in item && item.danger ? C.error : C.textSecondary,
            borderTop: 'danger' in item && item.danger ? `1px solid ${C.border}` : 'none',
            marginTop: 'danger' in item && item.danger ? 4 : 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = C.bgSubtle ?? C.bgElevated)}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

/* ─── IconButton ────────────────────────────────────────────── */

function IconButton({ children, label, onClick, active = false }: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 6,
        border: `1px solid ${hov || active ? C.border : 'transparent'}`,
        background: hov || active ? (C.bgSubtle ?? C.bgElevated) : 'transparent',
        color: hov || active ? C.textPrimary : C.textSecondary,
        cursor: 'pointer', transition: 'all 0.1s',
      }}
    >
      {children}
    </button>
  );
}

/* ─── AppraisalRow ──────────────────────────────────────────── */

function AppraisalRow({ appraisal, isLast }: { appraisal: Appraisal; isLast: boolean }) {
  const intl = useIntl();
  const [hovered, setHovered] = useState(false);
  const [kebabOpen, setKebabOpen] = useState(false);

  const dateFormatted = new Date(appraisal.date).toLocaleDateString(intl.locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <tr
      style={{
        background: hovered ? C.bgElevated : 'transparent',
        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
        transition: 'background 0.1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setKebabOpen(false); }}
    >
      {/* Address */}
      <td style={{ padding: '13px 16px' }}>
        <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.textPrimary }}>
          {appraisal.address}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, marginTop: 2 }}>
          {appraisal.id} · {appraisal.clientName}
        </div>
      </td>

      {/* Purpose */}
      <td style={{ padding: '13px 16px' }}>
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
          {appraisal.purpose}
        </span>
      </td>

      {/* Date */}
      <td style={{ padding: '13px 16px' }}>
        <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textTertiary }}>
          {dateFormatted}
        </span>
      </td>

      {/* Status */}
      <td style={{ padding: '13px 16px' }}>
        <StatusBadge status={appraisal.status} />
      </td>

      {/* PDF download */}
      <td style={{ padding: '13px 16px' }}>
        {appraisal.status === 'completed' ? (
          <button
            aria-label={intl.formatMessage(m.actionDownload)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'none', border: `1px solid ${C.border}`,
              borderRadius: 6, padding: '4px 10px',
              color: C.brand, fontFamily: F.mono, fontSize: 11,
              cursor: 'pointer',
            }}
          >
            <Download size={12} />
            PDF
          </button>
        ) : (
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary }}>—</span>
        )}
      </td>

      {/* Actions */}
      <td style={{ padding: '13px 16px' }}>
        <div style={{ position: 'relative' }}>
          <IconButton
            label={intl.formatMessage(m.colActions)}
            active={kebabOpen}
            onClick={() => setKebabOpen(v => !v)}
          >
            <MoreHorizontal size={14} />
          </IconButton>
          {kebabOpen && <RowActions appraisal={appraisal} onClose={() => setKebabOpen(false)} />}
        </div>
      </td>
    </tr>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

export default function AppraisalsPage({ onNewAppraisal }: { onNewAppraisal?: () => void }) {
  const intl = useIntl();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppraisalStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const query = trpc.appraisals.list.useQuery({ limit: 100 });
  const { data: rows = [], isLoading } = query;

  const upsell = getUpsellPayload(query.error);
  if (upsell) {
    return (
      <div style={{ padding: '28px 32px', fontFamily: F.body, maxWidth: 1200, margin: '0 auto' }}>
        <UpsellWall
          featureName={upsell.featureName}
          requiredPlan={upsell.requiredPlan}
          onUpgrade={() => window.location.assign('/settings/billing')}
        />
      </div>
    );
  }

  const allItems: Appraisal[] = rows.map(row => ({
    id: row.id,
    address: [row.addressStreet, row.addressNumber, row.locality]
      .filter(Boolean).join(', '),
    purpose: PURPOSE_LABEL[row.purpose] ?? row.purpose,
    status: toUiStatus(row.status as DbStatus),
    value: formatValue(row.estimatedValueMin ?? null, row.valueCurrency),
    date: String(row.createdAt).slice(0, 10),
    clientName: row.clientName,
    isDeletable: row.status === 'draft',
  }));

  const filtered = allItems.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.address.toLowerCase().includes(q) ||
      a.clientName.toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchDateFrom = !dateFrom || a.date >= dateFrom;
    const matchDateTo = !dateTo || a.date <= dateTo;
    return matchSearch && matchStatus && matchDateFrom && matchDateTo;
  });

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const completedCount = allItems.filter(a => a.status === 'completed').length;
  const pendingCount = allItems.filter(a => a.status !== 'completed').length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusFilters: Array<{ key: AppraisalStatus | 'all'; label: string }> = [
    { key: 'all',         label: intl.formatMessage(m.filterAll) },
    { key: 'completed',   label: intl.formatMessage(m.statusCompleted) },
    { key: 'in_progress', label: intl.formatMessage(m.statusInProgress) },
    { key: 'draft',       label: intl.formatMessage(m.statusDraft) },
  ];

  return (
    <div style={{ padding: '28px 32px', fontFamily: F.body }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 28, color: C.textPrimary, margin: 0, lineHeight: 1.1 }}>
              {intl.formatMessage(m.title)}
            </h1>
            <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: '5px 0 0' }}>
              {intl.formatMessage(m.subtitle)}
            </p>
          </div>
          <button
            onClick={onNewAppraisal}
            aria-label={intl.formatMessage(m.cta)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: C.brand, color: '#fff',
              border: 'none', borderRadius: 8, padding: '10px 18px',
              fontFamily: F.body, fontWeight: 600, fontSize: 14,
              cursor: 'pointer', boxShadow: `0 4px 16px ${C.brandFaint}`,
            }}
          >
            <Plus size={15} />
            {intl.formatMessage(m.cta)}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }} role="region" aria-label="Statistics">
          <StatCard
            icon={<TrendingUp size={16} color={C.brand} />}
            iconBg={C.brandFaint}
            value={isLoading ? '…' : String(allItems.length)}
            label={intl.formatMessage(m.statsTotal)}
          />
          <StatCard
            icon={<Clock size={16} color={C.brand} />}
            iconBg={C.brandFaint}
            value={isLoading ? '…' : String(allItems.filter(a => a.date.startsWith(new Date().toISOString().slice(0, 7))).length)}
            label={intl.formatMessage(m.statsMonth)}
          />
          <StatCard
            icon={<AlertTriangle size={16} color={C.warning} />}
            iconBg="rgba(232,138,20,0.12)"
            value={String(pendingCount)}
            label={intl.formatMessage(m.statsPending)}
            valueColor={C.warning}
          />
          <StatCard
            icon={<CheckCircle2 size={16} color={C.success} />}
            iconBg="rgba(24,166,89,0.12)"
            value={String(completedCount)}
            label={intl.formatMessage(m.statsCompleted)}
            valueColor={C.success}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={14} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: C.textTertiary, pointerEvents: 'none',
            }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={intl.formatMessage(m.searchPlaceholder)}
              aria-label={intl.formatMessage(m.searchPlaceholder)}
              style={{
                width: '100%', boxSizing: 'border-box',
                paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.textPrimary, fontFamily: F.body, fontSize: 13, outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = C.brand)}
              onBlur={e => (e.target.style.borderColor = C.border)}
            />
          </div>

          {statusFilters.map(sf => (
            <button
              key={sf.key}
              onClick={() => setStatusFilter(sf.key)}
              aria-pressed={statusFilter === sf.key}
              style={{
                padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${statusFilter === sf.key ? C.brand : C.border}`,
                background: statusFilter === sf.key ? C.brandFaint : C.bgElevated,
                color: statusFilter === sf.key ? C.brand : C.textSecondary,
                fontFamily: F.body, fontSize: 13, fontWeight: 500,
                transition: 'all 0.12s',
              }}
            >
              {sf.label}
            </button>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <Calendar size={13} style={{ color: C.textTertiary, flexShrink: 0 }} aria-hidden="true" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              aria-label={intl.formatMessage(m.filterPeriod) + ' desde'}
              style={{
                padding: '7px 10px', borderRadius: 7, width: 130,
                background: C.bgElevated, border: `1px solid ${C.border}`,
                color: C.textSecondary, fontFamily: F.mono, fontSize: 12, outline: 'none',
                colorScheme: 'dark',
              }}
              onFocus={e => (e.target.style.borderColor = C.brand)}
              onBlur={e => (e.target.style.borderColor = C.border)}
            />
            <span style={{ color: C.textTertiary, fontSize: 11 }}>–</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              aria-label={intl.formatMessage(m.filterPeriod) + ' hasta'}
              style={{
                padding: '7px 10px', borderRadius: 7, width: 130,
                background: C.bgElevated, border: `1px solid ${C.border}`,
                color: C.textSecondary, fontFamily: F.mono, fontSize: 12, outline: 'none',
                colorScheme: 'dark',
              }}
              onFocus={e => (e.target.style.borderColor = C.brand)}
              onBlur={e => (e.target.style.borderColor = C.border)}
            />
          </div>

          <div style={{ flex: 1 }} />

          <button
            aria-label={intl.formatMessage(m.filterExport)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '9px 14px', color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
            }}
          >
            <Download size={13} />
            {intl.formatMessage(m.filterExport)}
          </button>
        </div>

        {/* Table */}
        <div style={{
          background: C.bgRaised, border: `1px solid ${C.border}`,
          borderRadius: 12, overflow: 'hidden',
          opacity: isLoading ? 0.6 : 1, transition: 'opacity 0.15s',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }} role="table">
            <thead>
              <tr style={{ background: C.bgElevated, borderBottom: `1px solid ${C.border}` }}>
                {[m.colAddress, m.colPurpose, m.colDate, m.colStatus, m.colPdf, m.colActions].map((msg) => (
                  <th
                    key={msg.id}
                    scope="col"
                    style={{
                      textAlign: 'left', padding: '11px 16px',
                      fontFamily: F.mono, fontSize: 10, color: C.textTertiary,
                      textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600,
                    }}
                  >
                    {intl.formatMessage(msg)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{
                    textAlign: 'center', padding: '52px 16px',
                    color: C.textTertiary, fontFamily: F.body, fontSize: 14,
                  }}>
                    {isLoading ? '…' : intl.formatMessage(m.empty)}
                  </td>
                </tr>
              ) : (
                paginated.map((a, i) => (
                  <AppraisalRow
                    key={a.id}
                    appraisal={a}
                    isLast={i === paginated.length - 1}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16,
        }}>
          <span style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary }}>
            {intl.formatMessage(m.paginationShowing, {
              start: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
              end: Math.min(page * PAGE_SIZE, total),
              total: allItems.length,
            })}
          </span>

          <nav aria-label="Pagination" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              aria-label="Previous page"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7,
                padding: '7px 12px', color: C.textTertiary,
                fontFamily: F.body, fontSize: 13,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              aria-current="page"
              style={{
                width: 32, height: 32, borderRadius: 7,
                border: `1px solid ${C.brand}`,
                background: C.brandFaint, color: C.brand,
                fontFamily: F.mono, fontSize: 13, cursor: 'default',
              }}
            >
              {page}
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              aria-label="Next page"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7,
                padding: '7px 12px', color: C.textTertiary,
                fontFamily: F.body, fontSize: 13,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.5 : 1,
              }}
            >
              <ChevronRight size={14} />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
