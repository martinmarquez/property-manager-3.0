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
  id: string;
  propiedad: string;
  cliente: string;
  finalidad: string;
  valorEstimado: string;
  estado: AppraisalStatus;
  fecha: string;
}

/* ─── Mock data ──────────────────────────────────────────────── */

const APPRAISALS: Appraisal[] = [
  { id: 'a1', propiedad: 'Serrano 2450 PB, CABA',           cliente: 'García Hnos. SRL',       finalidad: 'Venta',          valorEstimado: 'USD 285,000',   estado: 'Aprobada',    fecha: '01/05/2026' },
  { id: 'a2', propiedad: 'Av. Corrientes 1280 7°B',         cliente: 'Martínez, Laura',         finalidad: 'Alquiler',       valorEstimado: '$420,000/mes',  estado: 'Entregada',   fecha: '30/04/2026' },
  { id: 'a3', propiedad: 'Calle 45 N°890, La Plata',        cliente: 'Inversiones del Sur SA',  finalidad: 'Garantía',       valorEstimado: 'USD 195,000',   estado: 'Borrador',    fecha: '29/04/2026' },
  { id: 'a4', propiedad: 'Palermo Soho PH 3 amb.',          cliente: 'Rodríguez, Carlos M.',    finalidad: 'Venta',          valorEstimado: 'USD 380,000',   estado: 'En revisión', fecha: '28/04/2026' },
  { id: 'a5', propiedad: 'Belgrano R, Virrey del Pino',     cliente: 'Del Valle, Ana',          finalidad: 'Refinanciación', valorEstimado: 'USD 220,000',   estado: 'Aprobada',    fecha: '25/04/2026' },
  { id: 'a6', propiedad: 'Recoleta, Callao 1560',           cliente: 'Estudio Pérez & Asoc.',   finalidad: 'Herencia',       valorEstimado: 'USD 650,000',   estado: 'En revisión', fecha: '22/04/2026' },
  { id: 'a7', propiedad: 'Palermo Hollywood, Thames',       cliente: 'Ruiz, Marcelo',           finalidad: 'Venta',          valorEstimado: 'USD 175,000',   estado: 'Borrador',    fecha: '18/04/2026' },
  { id: 'a8', propiedad: 'Villa Urquiza, Triunvirato',      cliente: 'Cooperativa ABC',         finalidad: 'Alquiler temp.', valorEstimado: '$180,000/mes',  estado: 'Entregada',   fecha: '15/04/2026' },
];

/* ─── Status badge ───────────────────────────────────────────── */

const STATUS_MAP: Record<AppraisalStatus, { bg: string; color: string }> = {
  'Borrador':    { bg: C.bgElevated,    color: C.textTertiary },
  'En revisión': { bg: C.warningFaint,  color: C.warning      },
  'Aprobada':    { bg: C.successFaint,  color: C.success      },
  'Entregada':   { bg: C.brandFaint,    color: C.brand        },
  'Archivada':   { bg: C.bgSubtle,      color: C.textTertiary },
};

function StatusBadge({ status }: { status: AppraisalStatus }) {
  const s = STATUS_MAP[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: s.bg, color: s.color,
      borderRadius: 99, padding: '3px 10px',
      fontSize: 11, fontWeight: 600, fontFamily: F.mono,
      letterSpacing: '0.01em', whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

/* ─── Kebab menu ─────────────────────────────────────────────── */

function KebabMenu({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const items = ['Ver detalle', 'Editar', 'Duplicar', 'Archivar', 'Eliminar'];
  return (
    <div style={{
      position: 'absolute', right: 0, top: '110%', zIndex: 50,
      background: C.bgElevated, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '4px 0', minWidth: 140,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    }}>
      {items.map((item, i) => (
        <button key={item} style={{
          display: 'block', width: '100%', padding: '8px 16px',
          background: 'none', border: 'none', textAlign: 'left',
          cursor: 'pointer', fontFamily: F.body, fontSize: 13,
          color: item === 'Eliminar' ? C.error : C.textSecondary,
          borderTop: i === items.length - 1 ? `1px solid ${C.border}` : 'none',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = C.bgSubtle)}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

/* ─── Row component ──────────────────────────────────────────── */

function AppraisalRow({ appraisal, checked, onCheck }: {
  appraisal: Appraisal;
  checked: boolean;
  onCheck: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [kebabOpen, setKebabOpen] = useState(false);

  return (
    <tr
      style={{ background: hovered ? C.bgElevated : 'transparent', transition: 'background 0.12s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setKebabOpen(false); }}
    >
      {/* Checkbox */}
      <td style={{ padding: '12px 16px', width: 40 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onCheck}
          style={{ accentColor: C.brand, width: 15, height: 15, cursor: 'pointer' }}
        />
      </td>

      {/* Propiedad */}
      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 2 }}>
          {appraisal.propiedad}
        </div>
      </td>

      {/* Cliente */}
      <td style={{ padding: '12px 16px' }}>
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
          {appraisal.cliente}
        </span>
      </td>

      {/* Finalidad */}
      <td style={{ padding: '12px 16px' }}>
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
          {appraisal.finalidad}
        </span>
      </td>

      {/* Valor estimado */}
      <td style={{ padding: '12px 16px' }}>
        <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>
          {appraisal.valorEstimado}
        </span>
      </td>

      {/* Estado */}
      <td style={{ padding: '12px 16px' }}>
        <StatusBadge status={appraisal.estado} />
      </td>

      {/* Fecha */}
      <td style={{ padding: '12px 16px' }}>
        <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textTertiary }}>
          {appraisal.fecha}
        </span>
      </td>

      {/* Acciones */}
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
          {/* Ver */}
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`,
            background: hovered ? C.bgSubtle : 'transparent', cursor: 'pointer', color: C.textSecondary,
          }}
            title="Ver tasación"
            onMouseEnter={e => (e.currentTarget.style.color = C.textPrimary)}
            onMouseLeave={e => (e.currentTarget.style.color = C.textSecondary)}
          >
            <Eye size={14} />
          </button>

          {/* Descargar PDF */}
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`,
            background: hovered ? C.bgSubtle : 'transparent', cursor: 'pointer', color: C.textSecondary,
          }}
            title="Descargar PDF"
            onMouseEnter={e => (e.currentTarget.style.color = C.textPrimary)}
            onMouseLeave={e => (e.currentTarget.style.color = C.textSecondary)}
          >
            <Download size={14} />
          </button>

          {/* Kebab */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setKebabOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`,
                background: kebabOpen ? C.bgSubtle : hovered ? C.bgSubtle : 'transparent',
                cursor: 'pointer', color: C.textSecondary,
              }}
              title="Más opciones"
            >
              <MoreHorizontal size={14} />
            </button>
            <KebabMenu visible={kebabOpen} />
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export default function AppraisalListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos los estados');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const statuses = ['Todos los estados', 'Borrador', 'En revisión', 'Aprobada', 'Entregada', 'Archivada'];

  const filtered = APPRAISALS.filter(a => {
    const matchSearch = !search || a.propiedad.toLowerCase().includes(search.toLowerCase())
      || a.cliente.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Todos los estados' || a.estado === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleRow = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedRows(next);
  };

  const allChecked = filtered.length > 0 && filtered.every(a => selectedRows.has(a.id));
  const toggleAll = () => {
    if (allChecked) setSelectedRows(new Set());
    else setSelectedRows(new Set(filtered.map(a => a.id)));
  };

  const TOTAL = 47;

  return (
    <div style={{ minHeight: '100vh', background: C.bgBase, padding: '32px 40px', fontFamily: F.body }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 28, color: C.textPrimary, margin: 0 }}>
              Tasaciones
            </h1>
            <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: '4px 0 0' }}>
              Gestión de valuaciones de propiedades
            </p>
          </div>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: C.brand, color: '#fff',
            border: 'none', borderRadius: 8, padding: '10px 18px',
            fontFamily: F.body, fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = C.brandHover)}
            onMouseLeave={e => (e.currentTarget.style.background = C.brand)}
          >
            <Plus size={16} />
            Nueva tasación
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={14} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: C.textTertiary, pointerEvents: 'none',
            }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por dirección o cliente…"
              style={{
                width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                boxSizing: 'border-box', background: C.bgRaised, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.textPrimary, fontFamily: F.body, fontSize: 13,
                outline: 'none',
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
                background: C.bgRaised, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '9px 36px 9px 14px',
                color: C.textPrimary, fontFamily: F.body, fontSize: 13,
                cursor: 'pointer', outline: 'none',
              }}
            >
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              color: C.textTertiary, pointerEvents: 'none',
            }} />
          </div>

          {/* Period */}
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '9px 14px',
            color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}>
            <Filter size={13} />
            Período
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Exportar */}
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'transparent', border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '9px 14px',
            color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = C.textPrimary)}
            onMouseLeave={e => (e.currentTarget.style.color = C.textSecondary)}
          >
            <Download size={13} />
            Exportar
          </button>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {/* Total */}
          <div style={{
            flex: 1, minWidth: 180,
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: C.brandFaint, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={16} color={C.brand} />
            </div>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 22, fontWeight: 700, color: C.textPrimary, lineHeight: 1 }}>
                47
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginTop: 3 }}>
                tasaciones totales
              </div>
            </div>
          </div>

          {/* Este mes */}
          <div style={{
            flex: 1, minWidth: 180,
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: C.brandFaint, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.brand, fontWeight: 700 }}>MAY</span>
            </div>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 22, fontWeight: 700, color: C.textPrimary, lineHeight: 1 }}>
                12
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginTop: 3 }}>
                nuevas este mes
              </div>
            </div>
          </div>

          {/* Pendientes */}
          <div style={{
            flex: 1, minWidth: 180,
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: C.warningFaint, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={16} color={C.warning} />
            </div>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 22, fontWeight: 700, color: C.warning, lineHeight: 1 }}>
                5
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginTop: 3 }}>
                pendientes de revisión
              </div>
            </div>
          </div>

          {/* Entregadas */}
          <div style={{
            flex: 1, minWidth: 180,
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: C.successFaint, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle2 size={16} color={C.success} />
            </div>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 22, fontWeight: 700, color: C.success, lineHeight: 1 }}>
                38
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginTop: 3 }}>
                entregadas
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{
          background: C.bgRaised, border: `1px solid ${C.border}`,
          borderRadius: 12, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bgElevated }}>
                {/* Checkbox all */}
                <th style={{ padding: '11px 16px', width: 40, borderBottom: `1px solid ${C.border}` }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    style={{ accentColor: C.brand, width: 15, height: 15, cursor: 'pointer' }}
                  />
                </th>
                {['Propiedad', 'Cliente', 'Finalidad', 'Valor estimado', 'Estado', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '11px 16px',
                    fontFamily: F.mono, fontSize: 10, color: C.textTertiary,
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    borderBottom: `1px solid ${C.border}`, fontWeight: 600,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <React.Fragment key={a.id}>
                  <tr style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <td colSpan={8} style={{ padding: 0 }}>
                      {/* Render via inner table trick — just use the row component inline */}
                    </td>
                  </tr>
                  <AppraisalRow
                    key={`row-${a.id}`}
                    appraisal={a}
                    checked={selectedRows.has(a.id)}
                    onCheck={() => toggleRow(a.id)}
                  />
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 16px', color: C.textTertiary, fontFamily: F.body }}>
                    No se encontraron tasaciones con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 16, paddingTop: 12,
        }}>
          <span style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary }}>
            Mostrando <span style={{ color: C.textSecondary }}>1–8</span> de <span style={{ color: C.textSecondary }}>{TOTAL}</span> tasaciones
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 7, padding: '7px 12px',
              color: C.textTertiary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
            }}>
              <ChevronLeft size={14} />
              Anterior
            </button>

            {[1, 2, 3, '...', 6].map((p, i) => (
              <button key={i} style={{
                width: 32, height: 32, borderRadius: 7,
                border: `1px solid ${p === 1 ? C.brand : C.border}`,
                background: p === 1 ? C.brandFaint : 'transparent',
                color: p === 1 ? C.brand : C.textTertiary,
                fontFamily: F.mono, fontSize: 13, cursor: p === '...' ? 'default' : 'pointer',
              }}>
                {p}
              </button>
            ))}

            <button style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 7, padding: '7px 12px',
              color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
            }}>
              Siguiente página
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

