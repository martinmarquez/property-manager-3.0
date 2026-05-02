import React, { useState } from 'react';
import {
  Plus, Search, Download, Filter,
  TrendingUp, CheckCircle2, AlertTriangle,
  Eye, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react';

/* ─── Design tokens ──────────────────────────────────────────── */

const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  bgSubtle:      '#162035',
  brand:         '#1654d9',
  brandHover:    '#1244b8',
  brandFaint:    'rgba(22,84,217,0.12)',
  ai:            '#7E3AF2',
  aiFaint:       'rgba(126,58,242,0.12)',
  aiLight:       '#9B59FF',
  success:       '#18A659',
  successFaint:  'rgba(24,166,89,0.12)',
  warning:       '#E88A14',
  warningFaint:  'rgba(232,138,20,0.12)',
  error:         '#E83B3B',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  border:        '#1F2D48',
};

const F = {
  display: "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
  mono:    "'DM Mono', monospace",
};

/* ─── Types ──────────────────────────────────────────────────── */

type AppraisalStatus = 'Borrador' | 'En revisión' | 'Aprobada' | 'Entregada' | 'Archivada';

interface Appraisal {
  id:            string;
  propiedad:     string;
  cliente:       string;
  finalidad:     string;
  valorEstimado: string;
  estado:        AppraisalStatus;
  fecha:         string;
}

/* ─── Mock data ──────────────────────────────────────────────── */

const APPRAISALS: Appraisal[] = [
  { id: 'a1', propiedad: 'Serrano 2450 PB, CABA',         cliente: 'García Hnos. SRL',      finalidad: 'Venta',          valorEstimado: 'USD 285,000',  estado: 'Aprobada',    fecha: '01/05/2026' },
  { id: 'a2', propiedad: 'Av. Corrientes 1280 7°B',       cliente: 'Martínez, Laura',        finalidad: 'Alquiler',       valorEstimado: '$420,000/mes', estado: 'Entregada',   fecha: '30/04/2026' },
  { id: 'a3', propiedad: 'Calle 45 N°890, La Plata',      cliente: 'Inversiones del Sur SA', finalidad: 'Garantía',       valorEstimado: 'USD 195,000',  estado: 'Borrador',    fecha: '29/04/2026' },
  { id: 'a4', propiedad: 'Palermo Soho PH 3 amb.',        cliente: 'Rodríguez, Carlos M.',   finalidad: 'Venta',          valorEstimado: 'USD 380,000',  estado: 'En revisión', fecha: '28/04/2026' },
  { id: 'a5', propiedad: 'Belgrano R, Virrey del Pino',   cliente: 'Del Valle, Ana',         finalidad: 'Refinanciación', valorEstimado: 'USD 220,000',  estado: 'Aprobada',    fecha: '25/04/2026' },
  { id: 'a6', propiedad: 'Recoleta, Callao 1560',         cliente: 'Estudio Pérez & Asoc.',  finalidad: 'Herencia',       valorEstimado: 'USD 650,000',  estado: 'En revisión', fecha: '22/04/2026' },
  { id: 'a7', propiedad: 'Palermo Hollywood, Thames',     cliente: 'Ruiz, Marcelo',          finalidad: 'Venta',          valorEstimado: 'USD 175,000',  estado: 'Borrador',    fecha: '18/04/2026' },
  { id: 'a8', propiedad: 'Villa Urquiza, Triunvirato',    cliente: 'Cooperativa ABC',        finalidad: 'Alquiler temp.', valorEstimado: '$180,000/mes', estado: 'Entregada',   fecha: '15/04/2026' },
];

/* ─── Status badge ───────────────────────────────────────────── */

const STATUS_CFG: Record<AppraisalStatus, { bg: string; color: string }> = {
  'Borrador':    { bg: C.bgElevated,   color: C.textTertiary },
  'En revisión': { bg: C.warningFaint, color: C.warning      },
  'Aprobada':    { bg: C.successFaint, color: C.success      },
  'Entregada':   { bg: C.brandFaint,   color: C.brand        },
  'Archivada':   { bg: C.bgSubtle,     color: C.textTertiary },
};

function StatusBadge({ status }: { status: AppraisalStatus }) {
  const s = STATUS_CFG[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: s.bg, color: s.color,
      borderRadius: 99, padding: '3px 10px',
      fontSize: 11, fontWeight: 600, fontFamily: F.mono,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

/* ─── Kebab menu ─────────────────────────────────────────────── */

function KebabMenu({ onClose }: { onClose: () => void }) {
  const items: { label: string; danger?: boolean }[] = [
    { label: 'Ver detalle' },
    { label: 'Editar' },
    { label: 'Duplicar' },
    { label: 'Archivar' },
    { label: 'Eliminar', danger: true },
  ];
  return (
    <div
      style={{
        position: 'absolute', right: 0, top: '110%', zIndex: 50,
        background: C.bgElevated, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '4px 0', minWidth: 148,
        boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
      }}
      onMouseLeave={onClose}
    >
      {items.map((item, i) => (
        <button
          key={item.label}
          style={{
            display: 'block', width: '100%', padding: '8px 16px',
            background: 'none', border: 'none', textAlign: 'left',
            cursor: 'pointer', fontFamily: F.body, fontSize: 13,
            color: item.danger ? C.error : C.textSecondary,
            borderTop: item.danger ? `1px solid ${C.border}` : 'none',
            marginTop: item.danger ? 4 : 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = C.bgSubtle)}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Table row ──────────────────────────────────────────────── */

function AppraisalRow({
  appraisal, checked, onCheck, isLast,
}: {
  appraisal: Appraisal;
  checked: boolean;
  onCheck: () => void;
  isLast: boolean;
}) {
  const [hovered, setHovered]     = useState(false);
  const [kebabOpen, setKebabOpen] = useState(false);

  return (
    <tr
      style={{
        background:    hovered ? C.bgElevated : 'transparent',
        borderBottom:  isLast ? 'none' : `1px solid ${C.border}`,
        transition:    'background 0.1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setKebabOpen(false); }}
    >
      {/* Checkbox */}
      <td style={{ padding: '13px 16px', width: 40 }}>
        <input
          type="checkbox" checked={checked} onChange={onCheck}
          style={{ accentColor: C.brand, width: 15, height: 15, cursor: 'pointer' }}
        />
      </td>

      {/* Propiedad */}
      <td style={{ padding: '13px 16px', maxWidth: 220 }}>
        <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.textPrimary }}>
          {appraisal.propiedad}
        </div>
      </td>

      {/* Cliente */}
      <td style={{ padding: '13px 16px', maxWidth: 180 }}>
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
          {appraisal.cliente}
        </span>
      </td>

      {/* Finalidad */}
      <td style={{ padding: '13px 16px' }}>
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
          {appraisal.finalidad}
        </span>
      </td>

      {/* Valor estimado */}
      <td style={{ padding: '13px 16px' }}>
        <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>
          {appraisal.valorEstimado}
        </span>
      </td>

      {/* Estado */}
      <td style={{ padding: '13px 16px' }}>
        <StatusBadge status={appraisal.estado} />
      </td>

      {/* Fecha */}
      <td style={{ padding: '13px 16px' }}>
        <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textTertiary }}>
          {appraisal.fecha}
        </span>
      </td>

      {/* Acciones */}
      <td style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Ver */}
          <ActionBtn title="Ver tasación" onClick={() => {}}>
            <Eye size={14} />
          </ActionBtn>
          {/* Descargar PDF */}
          <ActionBtn title="Descargar PDF" onClick={() => {}}>
            <Download size={14} />
          </ActionBtn>
          {/* Kebab */}
          <div style={{ position: 'relative' }}>
            <ActionBtn
              title="Más opciones"
              active={kebabOpen}
              onClick={() => setKebabOpen(v => !v)}
            >
              <MoreHorizontal size={14} />
            </ActionBtn>
            {kebabOpen && <KebabMenu onClose={() => setKebabOpen(false)} />}
          </div>
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({
  children, title, onClick, active = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 6,
        border: `1px solid ${hov || active ? C.border : 'transparent'}`,
        background: hov || active ? C.bgSubtle : 'transparent',
        color: hov || active ? C.textPrimary : C.textSecondary,
        cursor: 'pointer', transition: 'all 0.1s',
      }}
    >
      {children}
    </button>
  );
}

/* ─── Main page component ────────────────────────────────────── */

export default function AppraisalListPage() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos los estados');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const STATUSES = ['Todos los estados', 'Borrador', 'En revisión', 'Aprobada', 'Entregada', 'Archivada'];

  const filtered = APPRAISALS.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.propiedad.toLowerCase().includes(q) || a.cliente.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'Todos los estados' || a.estado === statusFilter;
    return matchSearch && matchStatus;
  });

  const allChecked = filtered.length > 0 && filtered.every(a => selectedRows.has(a.id));

  const toggleAll = () => {
    if (allChecked) setSelectedRows(new Set());
    else setSelectedRows(new Set(filtered.map(a => a.id)));
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedRows(next);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bgBase, padding: '32px 40px', fontFamily: F.body }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Page header ──────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 28, color: C.textPrimary, margin: 0, lineHeight: 1.1 }}>
              Tasaciones
            </h1>
            <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: '5px 0 0' }}>
              Gestión de valuaciones de propiedades
            </p>
          </div>
          <PrimaryBtn icon={<Plus size={15} />} label="Nueva tasación" />
        </div>

        {/* ── Filter bar ───────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={14} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: C.textTertiary, pointerEvents: 'none',
            }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por dirección o cliente…"
              style={{
                width: '100%', boxSizing: 'border-box',
                paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.textPrimary, fontFamily: F.body, fontSize: 13, outline: 'none',
              }}
            />
          </div>

          {/* Status dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                appearance: 'none', WebkitAppearance: 'none',
                background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '9px 36px 9px 14px',
                color: C.textPrimary, fontFamily: F.body, fontSize: 13, cursor: 'pointer', outline: 'none',
              }}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              color: C.textTertiary, pointerEvents: 'none',
            }} />
          </div>

          {/* Período */}
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '9px 14px', color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}>
            <Filter size={13} />
            Período
          </button>

          <div style={{ flex: 1 }} />

          {/* Exportar */}
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '9px 14px', color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}>
            <Download size={13} />
            Exportar
          </button>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <StatCard
            icon={<TrendingUp size={16} color={C.brand} />}
            iconBg={C.brandFaint}
            value="47"
            label="tasaciones totales"
          />
          <StatCard
            icon={<span style={{ fontFamily: F.mono, fontSize: 10, color: C.brand, fontWeight: 700 }}>MAY</span>}
            iconBg={C.brandFaint}
            value="12"
            label="nuevas este mes"
          />
          <StatCard
            icon={<AlertTriangle size={16} color={C.warning} />}
            iconBg={C.warningFaint}
            value="5"
            label="pendientes"
            valueColor={C.warning}
          />
          <StatCard
            icon={<CheckCircle2 size={16} color={C.success} />}
            iconBg={C.successFaint}
            value="38"
            label="entregadas"
            valueColor={C.success}
          />
        </div>

        {/* ── Table ────────────────────────────────────────── */}
        <div style={{
          background: C.bgRaised, border: `1px solid ${C.border}`,
          borderRadius: 12, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bgElevated, borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: '11px 16px', width: 40 }}>
                  <input
                    type="checkbox" checked={allChecked} onChange={toggleAll}
                    style={{ accentColor: C.brand, width: 15, height: 15, cursor: 'pointer' }}
                  />
                </th>
                {['Propiedad', 'Cliente', 'Finalidad', 'Valor estimado', 'Estado', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '11px 16px',
                    fontFamily: F.mono, fontSize: 10, color: C.textTertiary,
                    textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{
                    textAlign: 'center', padding: '52px 16px',
                    color: C.textTertiary, fontFamily: F.body, fontSize: 14,
                  }}>
                    No se encontraron tasaciones con los filtros aplicados.
                  </td>
                </tr>
              )}
              {filtered.map((a, i) => (
                <AppraisalRow
                  key={a.id}
                  appraisal={a}
                  checked={selectedRows.has(a.id)}
                  onCheck={() => toggleRow(a.id)}
                  isLast={i === filtered.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16,
        }}>
          <span style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary }}>
            Mostrando{' '}
            <span style={{ color: C.textSecondary }}>1–8</span>
            {' '}de{' '}
            <span style={{ color: C.textSecondary }}>47</span>
            {' '}tasaciones
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <PageBtn disabled>
              <ChevronLeft size={14} />
              Anterior
            </PageBtn>

            {[1, 2, 3, '…', 6].map((p, i) => (
              <button
                key={i}
                style={{
                  width: 32, height: 32, borderRadius: 7, cursor: p === '…' ? 'default' : 'pointer',
                  border: `1px solid ${p === 1 ? C.brand : C.border}`,
                  background: p === 1 ? C.brandFaint : 'transparent',
                  color: p === 1 ? C.brand : C.textTertiary,
                  fontFamily: F.mono, fontSize: 13,
                }}
              >
                {p}
              </button>
            ))}

            <PageBtn>
              Siguiente página
              <ChevronRight size={14} />
            </PageBtn>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Small shared helpers ───────────────────────────────────── */

function StatCard({ icon, iconBg, value, label, valueColor = C.textPrimary }: {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <div style={{
      flex: 1, background: C.bgRaised, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: valueColor, lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.textTertiary, marginTop: 3 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function PrimaryBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        background: hov ? C.brandHover : C.brand, color: '#fff',
        border: 'none', borderRadius: 8, padding: '10px 18px',
        fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14,
        cursor: 'pointer', transition: 'background 0.15s',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function PageBtn({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'transparent',
        border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 12px',
        color: disabled ? C.textTertiary : hov ? C.textPrimary : C.textSecondary,
        fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, transition: 'color 0.1s',
      }}
    >
      {children}
    </button>
  );
}
