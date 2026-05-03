import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Calendar, ChevronDown, Download, Link2, Pin,
  Mail, Check, X,
} from 'lucide-react';
import { C, F } from '../../components/copilot/tokens.js';
import { RefreshIndicator } from './charts.js';
import type { RefreshStatus } from './charts.js';

/* ─── Types ──────────────────────────────────────────────────── */

export type DatePreset = 'today' | '7d' | '30d' | '90d' | 'ytd' | 'custom';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  options: FilterOption[];
  multi?: boolean;
}

export interface ExportableData {
  headers: string[];
  rows: (string | number)[][];
  filename?: string;
}

export interface ReportShellProps {
  slug: string;
  title: string;
  subtitle: string;
  refreshedAt?: string;
  refreshStatus?: RefreshStatus;
  filters?: FilterConfig[];
  children: React.ReactNode;
  onBack?: () => void;
  onExport?: (format: 'csv' | 'xlsx') => void;
  exportData?: ExportableData;
  onShare?: () => void;
  onPin?: () => void;
  onDigestChange?: (frequency: 'daily' | 'weekly' | 'disabled') => void;
  onRefresh?: () => void;
  isAdmin?: boolean;
  datePreset?: DatePreset;
  onDatePresetChange?: (preset: DatePreset) => void;
  filterValues?: Record<string, string[]>;
  onFilterChange?: (filterId: string, values: string[]) => void;
}

/* ─── Quick-select chips ─────────────────────────────────────── */

const DATE_CHIPS: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: '7d',  label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'ytd', label: 'YTD' },
  { id: 'custom', label: 'Personalizado' },
];

/* ─── Dropdown wrapper ───────────────────────────────────────── */

function Dropdown({
  trigger,
  children,
  open,
  onToggle,
  align = 'left',
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  align?: 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onToggle]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={onToggle}>{trigger}</div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'right' ? 'right' : 'left']: 0,
            background: C.bgRaised,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 6,
            minWidth: 180,
            zIndex: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── DropdownItem ───────────────────────────────────────────── */

function DropdownItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 6,
        border: 'none',
        background: active ? C.brandFaint : hovered ? C.bgElevated : 'transparent',
        color: active ? C.textPrimary : C.textSecondary,
        fontFamily: F.body,
        fontSize: 13,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        {label}
      </span>
      {active && <Check size={13} color={C.brand} />}
    </button>
  );
}

/* ─── Pill button (filter bar) ───────────────────────────────── */

function PillButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 12px',
        borderRadius: 8,
        border: `1px solid ${active ? C.brand : hovered ? C.borderHover : C.border}`,
        background: active ? C.brandFaint : hovered ? C.bgElevated : 'transparent',
        color: active ? C.textPrimary : C.textSecondary,
        fontFamily: F.body,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.12s',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

/* ─── Icon button ────────────────────────────────────────────── */

function IconButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 12px',
        borderRadius: 8,
        border: `1px solid ${active ? C.brand : hovered ? C.borderHover : C.border}`,
        background: active ? C.brandFaint : hovered ? C.bgElevated : 'transparent',
        color: active ? C.textPrimary : C.textSecondary,
        fontFamily: F.body,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.12s',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ─── Digest modal ───────────────────────────────────────────── */

function DigestModal({
  reportTitle,
  onClose,
  onSave,
}: {
  reportTitle: string;
  onClose: () => void;
  onSave: (frequency: 'daily' | 'weekly' | 'disabled') => void;
}) {
  const [freq, setFreq] = useState<'daily' | 'weekly' | 'disabled'>('weekly');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    onSave(freq);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7,13,26,0.82)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Configurar envío automático"
    >
      <div
        style={{
          background: C.bgRaised,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          width: 420,
          maxWidth: '90vw',
          padding: 28,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: '0 0 4px' }}>
              Envío automático
            </h2>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: 0 }}>
              {reportTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.bgElevated,
              color: C.textSecondary, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {([
            { id: 'daily' as const, label: 'Diario' },
            { id: 'weekly' as const, label: 'Semanal' },
            { id: 'disabled' as const, label: 'Desactivado' },
          ]).map(opt => (
            <button
              key={opt.id}
              onClick={() => setFreq(opt.id)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8,
                border: `1px solid ${freq === opt.id ? C.brand : C.border}`,
                background: freq === opt.id ? C.brandFaint : C.bgBase,
                color: freq === opt.id ? C.textPrimary : C.textSecondary,
                fontFamily: F.body, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1, padding: 10, borderRadius: 8, border: 'none',
              background: saved ? C.success : C.brand,
              color: '#fff', fontFamily: F.body, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {saved ? <><Check size={15} /> Guardado</> : 'Guardar'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.textSecondary, fontFamily: F.body, fontSize: 14, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Share modal ────────────────────────────────────────────── */

function ShareToast({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        background: C.bgRaised,
        border: `1px solid ${C.success}`,
        borderRadius: 10,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 1000,
      }}
    >
      <Check size={16} color={C.success} />
      <span style={{ fontFamily: F.body, fontSize: 13, color: C.textPrimary }}>
        Enlace copiado (válido 7 días)
      </span>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */

function downloadCsv(data: ExportableData) {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [data.headers.map(escape).join(','), ...data.rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.filename ?? 'report'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadXlsx(data: ExportableData) {
  const escape = (v: string | number) => {
    const s = String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return typeof v === 'number' ? `<Cell><Data ss:Type="Number">${s}</Data></Cell>` : `<Cell><Data ss:Type="String">${s}</Data></Cell>`;
  };
  const headerRow = `<Row>${data.headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>`;
  const dataRows = data.rows.map(r => `<Row>${r.map(escape).join('')}</Row>`).join('');
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Report"><Table>${headerRow}${dataRows}</Table></Worksheet></Workbook>`;
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.filename ?? 'report'}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportShell({
  slug,
  title,
  subtitle,
  refreshedAt,
  refreshStatus,
  filters = [],
  children,
  onBack,
  onExport,
  exportData,
  onShare,
  onPin,
  onDigestChange,
  onRefresh,
  isAdmin = false,
  datePreset: controlledPreset,
  onDatePresetChange,
  filterValues = {},
  onFilterChange,
}: ReportShellProps) {
  const [internalPreset, setInternalPreset] = useState<DatePreset>('30d');
  const datePreset = controlledPreset ?? internalPreset;
  const setDatePreset = onDatePresetChange ?? setInternalPreset;

  const [exportOpen, setExportOpen] = useState(false);
  const [digestOpen, setDigestOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const handleExport = useCallback((format: 'csv' | 'xlsx') => {
    if (onExport) {
      onExport(format);
    } else if (exportData) {
      if (format === 'csv') downloadCsv(exportData);
      else downloadXlsx(exportData);
    }
    setExportOpen(false);
  }, [onExport, exportData]);

  const handleShare = useCallback(() => {
    onShare?.();
    setShareToast(true);
  }, [onShare]);

  const handlePin = useCallback(() => {
    setPinned(p => !p);
    onPin?.();
  }, [onPin]);

  return (
    <div style={{ fontFamily: F.body, minHeight: '100%' }}>
      {/* ── Breadcrumb ─────────────────────────────────────────── */}
      <div style={{ padding: '20px 32px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onBack ?? (() => window.history.back())}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none',
            color: C.textSecondary, fontFamily: F.body, fontSize: 13,
            cursor: 'pointer', padding: 0,
          }}
          aria-label="Volver a Reportes"
        >
          <ArrowLeft size={14} />
          Reportes
        </button>
        <span style={{ color: C.textTertiary, fontSize: 12 }}>/</span>
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary }}>{title}</span>
      </div>

      {/* ── Page header ────────────────────────────────────────── */}
      <div style={{ padding: '14px 32px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontFamily: F.display, fontSize: 24, fontWeight: 700,
            color: C.textPrimary, margin: '0 0 4px', letterSpacing: '-0.02em',
          }}>
            {title}
          </h1>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: 0 }}>
            {subtitle}
          </p>
        </div>

        {/* Refresh indicator */}
        {refreshedAt && (
          <RefreshIndicator
            status={refreshStatus ?? 'idle'}
            lastRefreshed={refreshedAt}
            onRefresh={isAdmin ? onRefresh : undefined}
          />
        )}
      </div>

      {/* ── Sticky filter bar ──────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: C.bgRaised,
          borderBottom: `1px solid ${C.border}`,
          padding: '10px 32px',
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {/* Date range chips */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            background: C.bgElevated,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 3,
          }}
          role="radiogroup"
          aria-label="Rango de fechas"
        >
          {DATE_CHIPS.map(chip => {
            const active = datePreset === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setDatePreset(chip.id)}
                role="radio"
                aria-checked={active}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: active ? C.brand : 'transparent',
                  color: active ? '#fff' : C.textTertiary,
                  fontFamily: F.mono,
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  letterSpacing: '0.03em',
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: C.border, margin: '0 4px' }} />

        {/* Contextual filters */}
        {filters.map(filter => {
          const values = filterValues[filter.id] ?? [];
          const isOpen = openFilter === filter.id;
          const hasSelection = values.length > 0;
          return (
            <Dropdown
              key={filter.id}
              open={isOpen}
              onToggle={() => setOpenFilter(isOpen ? null : filter.id)}
              align="left"
              trigger={
                <PillButton active={hasSelection} onClick={() => setOpenFilter(isOpen ? null : filter.id)}>
                  {hasSelection
                    ? `${filter.label}: ${values.length === 1 ? filter.options.find(o => o.value === values[0])?.label : `${values.length} sel.`}`
                    : `${filter.label}`
                  }
                  <ChevronDown size={12} />
                </PillButton>
              }
            >
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                <DropdownItem
                  label={`Todos (${filter.options.length})`}
                  active={values.length === 0}
                  onClick={() => onFilterChange?.(filter.id, [])}
                />
                {filter.options.map(opt => (
                  <DropdownItem
                    key={opt.value}
                    label={opt.label}
                    active={values.includes(opt.value)}
                    onClick={() => {
                      const next = values.includes(opt.value)
                        ? values.filter(v => v !== opt.value)
                        : filter.multi ? [...values, opt.value] : [opt.value];
                      onFilterChange?.(filter.id, next);
                    }}
                  />
                ))}
              </div>
            </Dropdown>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Action buttons */}
        <Dropdown
          open={exportOpen}
          onToggle={() => setExportOpen(p => !p)}
          align="right"
          trigger={
            <PillButton onClick={() => setExportOpen(p => !p)}>
              <Download size={13} />
              Exportar
              <ChevronDown size={12} />
            </PillButton>
          }
        >
          <DropdownItem
            label="CSV"
            icon={<Download size={13} />}
            onClick={() => handleExport('csv')}
          />
          <DropdownItem
            label="Excel (XLSX)"
            icon={<Download size={13} />}
            onClick={() => handleExport('xlsx')}
          />
        </Dropdown>

        <IconButton icon={<Link2 size={13} />} label="Compartir enlace" onClick={handleShare} />
        <IconButton icon={<Pin size={13} />} label={pinned ? 'Desfijar del panel' : 'Fijar al panel'} onClick={handlePin} active={pinned} />
        <IconButton icon={<Mail size={13} />} label="Envío programado" onClick={() => setDigestOpen(true)} />
      </div>

      {/* ── Dashboard content ──────────────────────────────────── */}
      <div style={{ padding: '24px 32px 48px' }}>
        {children}
      </div>

      {/* ── Modals / toasts ────────────────────────────────────── */}
      {digestOpen && (
        <DigestModal
          reportTitle={title}
          onClose={() => setDigestOpen(false)}
          onSave={freq => onDigestChange?.(freq)}
        />
      )}
      {shareToast && <ShareToast onClose={() => setShareToast(false)} />}
    </div>
  );
}

/* ─── Exports for external use ───────────────────────────────── */

export { PillButton, IconButton, Dropdown, DropdownItem };
