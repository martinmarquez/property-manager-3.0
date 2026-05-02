import React, { useState } from 'react';
import { C, F } from '../../components/copilot/tokens.js';

/* ─── Data ──────────────────────────────────────────────────── */

const APPRAISALS = [
  { id: 'ap-001', address: 'Av. Santa Fe 2848, 3°B, Palermo',    type: 'Apartamento', purpose: 'Venta',    status: 'completed', value: 'USD 142,000', date: '28/04/2026', agent: 'Carlos M.' },
  { id: 'ap-002', address: 'Lavalle 1180, 1°A, San Nicolás',     type: 'Oficina',     purpose: 'Alquiler', status: 'draft',     value: '—',           date: '02/05/2026', agent: 'Ana G.'     },
  { id: 'ap-003', address: 'Cabildo 2750, PH, Belgrano',         type: 'PH',          purpose: 'Venta',    status: 'completed', value: 'USD 215,000', date: '25/04/2026', agent: 'Lucía F.'   },
  { id: 'ap-004', address: 'Rivadavia 4821, 2°D, Caballito',     type: 'Apartamento', purpose: 'Venta',    status: 'in_progress',value: '—',          date: '01/05/2026', agent: 'Carlos M.' },
  { id: 'ap-005', address: 'Av. Corrientes 3200, Local 3, CABA', type: 'Local',       purpose: 'Alquiler', status: 'completed', value: 'ARS 320,000', date: '22/04/2026', agent: 'Marcelo T.' },
  { id: 'ap-006', address: 'Thames 1450, 4°A, Palermo Soho',     type: 'Apartamento', purpose: 'Venta',    status: 'completed', value: 'USD 98,000',  date: '18/04/2026', agent: 'Ana G.'     },
];

const STATUS_MAP = {
  completed:   { label: 'Completada',   color: C.success  },
  draft:       { label: 'Borrador',     color: C.warning  },
  in_progress: { label: 'En proceso',   color: C.brand    },
} as const;

/* ─── Main ──────────────────────────────────────────────────── */

export default function AppraisalsPage({ onNewAppraisal }: { onNewAppraisal?: () => void }) {
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = APPRAISALS.filter(a => {
    const matchSearch = search === '' || a.address.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selectedItem = APPRAISALS.find(a => a.id === selected);

  return (
    <div style={{ padding: '28px 32px', fontFamily: F.body }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            Tasaciones
          </h1>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '4px 0 0' }}>
            {APPRAISALS.length} tasaciones · {APPRAISALS.filter(a => a.status === 'completed').length} completadas
          </p>
        </div>
        <button
          onClick={onNewAppraisal}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none', background: C.brand,
            color: '#fff', fontFamily: F.body, fontWeight: 700, fontSize: 14,
            cursor: 'pointer', boxShadow: `0 4px 16px ${C.brandFaint}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          + Nueva tasación
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textTertiary, fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por dirección…"
            style={{
              width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, boxSizing: 'border-box',
              border: `1px solid ${C.border}`, background: C.bgRaised,
              color: C.textPrimary, fontFamily: F.body, fontSize: 13, outline: 'none',
            }}
          />
        </div>
        {(['all', 'completed', 'in_progress', 'draft'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${statusFilter === s ? C.brand : C.border}`,
            background: statusFilter === s ? C.brandFaint : C.bgElevated,
            color: statusFilter === s ? C.brand : C.textSecondary,
            fontFamily: F.body, fontSize: 13, fontWeight: 500,
          }}>
            {s === 'all' ? 'Todas' : STATUS_MAP[s].label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: C.bgRaised, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 120px 100px',
          padding: '10px 20px', borderBottom: `1px solid ${C.border}`, background: C.bgBase,
        }}>
          {['Propiedad', 'Tipo', 'Propósito', 'Valor estimado', 'Estado', 'Fecha'].map(h => (
            <span key={h} style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>🏠</span>
            <p style={{ fontFamily: F.body, fontSize: 14, color: C.textTertiary }}>
              No se encontraron tasaciones
            </p>
          </div>
        ) : (
          filtered.map((ap, idx) => {
            const st = STATUS_MAP[ap.status];
            const isSelected = selected === ap.id;
            return (
              <div
                key={ap.id}
                onClick={() => setSelected(isSelected ? null : ap.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 120px 100px',
                  padding: '14px 20px', cursor: 'pointer', alignItems: 'center',
                  borderBottom: idx < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                  background: isSelected ? C.brandFaint : idx % 2 === 0 ? C.bgRaised : C.bgBase,
                  transition: 'background 0.1s',
                }}
              >
                <div>
                  <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: 0 }}>
                    {ap.address}
                  </p>
                  <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, margin: '2px 0 0' }}>
                    {ap.id} · {ap.agent}
                  </p>
                </div>
                <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>{ap.type}</span>
                <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>{ap.purpose}</span>
                <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 600, color: ap.value !== '—' ? C.textPrimary : C.textTertiary }}>
                  {ap.value}
                </span>
                <span style={{
                  fontFamily: F.mono, fontSize: 10, padding: '3px 10px', borderRadius: 20,
                  background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}40`,
                  width: 'fit-content',
                }}>
                  {st.label}
                </span>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary }}>{ap.date}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Selected detail strip */}
      {selectedItem && (
        <div style={{
          marginTop: 20, padding: '18px 24px', background: C.bgRaised, borderRadius: 12,
          border: `1px solid ${C.brand}40`, display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              {selectedItem.address}
            </p>
            <p style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary, margin: '4px 0 0' }}>
              {selectedItem.type} · {selectedItem.purpose} · {selectedItem.agent}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.bgElevated, color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
            }}>
              👁 Ver
            </button>
            {selectedItem.status === 'completed' && (
              <button style={{
                padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
                background: C.bgElevated, color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
              }}>
                ⬇ PDF
              </button>
            )}
            {selectedItem.status !== 'completed' && (
              <button style={{
                padding: '7px 14px', borderRadius: 8, border: 'none',
                background: C.brand, color: '#fff', fontFamily: F.body, fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>
                Continuar →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
