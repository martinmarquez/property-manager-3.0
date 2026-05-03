import React, { useState } from 'react';
import { C, F } from '../../components/copilot/tokens.js';

const SUBMISSIONS = [
  { id: 's1', name: 'Carlos Pérez',    email: 'cperez@gmail.com',   msg: 'Quiero más info sobre el departamento de Palermo...',   page: 'Home',        receivedAt: '02/05 14:22', read: false },
  { id: 's2', name: 'Ana Giménez',     email: 'agimenez@yahoo.com', msg: 'Me interesa el local comercial en San Telmo.',          page: 'Propiedades', receivedAt: '02/05 11:03', read: false },
  { id: 's3', name: 'Marcelo Torres',  email: 'mtorres@gmail.com',  msg: 'Busco casa de 3 ambientes cerca de escuelas en Flores.',page: 'Contacto',    receivedAt: '01/05 18:47', read: true  },
  { id: 's4', name: 'Lucía Fernández', email: 'lfernandez@gmail.com',msg: 'Quisiera tasar mi propiedad en Caballito.',             page: 'Home',        receivedAt: '30/04 09:15', read: true  },
  { id: 's5', name: 'Roberto Suárez',  email: 'rsuarez@hotmail.com',msg: '¿Trabajan con alquileres temporarios?',                 page: 'Contacto',    receivedAt: '29/04 22:38', read: true  },
];

export default function SiteFormsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const shown = filter === 'unread'
    ? SUBMISSIONS.filter(s => !s.read)
    : SUBMISSIONS;

  const selectedSub = SUBMISSIONS.find(s => s.id === selected);

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: F.body }}>
      {/* Left: list */}
      <div style={{
        width: 480, borderRight: `1px solid ${C.border}`,
        background: C.bgRaised, display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 14px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              Formularios
            </h2>
            <span style={{
              fontFamily: F.mono, fontSize: 10, padding: '2px 8px', borderRadius: 20,
              background: `${C.brand}20`, color: C.brand,
            }}>
              {SUBMISSIONS.filter(s => !s.read).length} no leídas
            </span>
          </div>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'unread'] as const).map(f => (
              <button type="button" key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 12px', borderRadius: 20, border: `1px solid ${filter === f ? C.brand : C.border}`,
                background: filter === f ? C.brandFaint : 'transparent',
                color: filter === f ? C.brand : C.textSecondary,
                fontFamily: F.body, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>
                {f === 'all' ? 'Todas' : 'No leídas'}
              </button>
            ))}
          </div>
        </div>

        {/* Submissions */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {shown.map(sub => (
            <div
              key={sub.id}
              onClick={() => setSelected(sub.id === selected ? null : sub.id)}
              style={{
                padding: '14px 20px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`,
                background: selected === sub.id ? C.brandFaint : sub.read ? 'transparent' : C.bgElevated,
                transition: 'background 0.1s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!sub.read && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.brand, flexShrink: 0 }} />
                  )}
                  <span style={{
                    fontFamily: F.body, fontSize: 13, fontWeight: sub.read ? 400 : 700,
                    color: C.textPrimary,
                  }}>
                    {sub.name}
                  </span>
                </div>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary }}>
                  {sub.receivedAt}
                </span>
              </div>
              <p style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary, margin: '0 0 4px', paddingLeft: sub.read ? 0 : 15 }}>
                {sub.email}
              </p>
              <p style={{
                fontFamily: F.body, fontSize: 12, color: C.textTertiary, margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                paddingLeft: sub.read ? 0 : 15,
              }}>
                {sub.msg}
              </p>
              <div style={{ paddingLeft: sub.read ? 0 : 15, marginTop: 6 }}>
                <span style={{
                  fontFamily: F.mono, fontSize: 10, padding: '1px 6px', borderRadius: 4,
                  background: C.bgBase, color: C.textTertiary, border: `1px solid ${C.border}`,
                }}>
                  {sub.page}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: detail panel */}
      <div style={{ flex: 1, background: C.bgBase, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selectedSub ? (
          <div style={{
            maxWidth: 540, width: '100%', margin: '0 32px',
            background: C.bgRaised, borderRadius: 14, border: `1px solid ${C.border}`,
            padding: '28px 32px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: C.brandFaint,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.brand,
              }}>
                {selectedSub.name.charAt(0)}
              </div>
              <div>
                <p style={{ fontFamily: F.body, fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
                  {selectedSub.name}
                </p>
                <p style={{ fontFamily: F.mono, fontSize: 12, color: C.brand, margin: '2px 0 0' }}>
                  {selectedSub.email}
                </p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button type="button" style={{
                  padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
                  background: C.bgElevated, color: C.textSecondary, fontFamily: F.body, fontSize: 12, cursor: 'pointer',
                }}>
                  📧 Responder
                </button>
                <button type="button" style={{
                  padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
                  background: C.bgElevated, color: C.textSecondary, fontFamily: F.body, fontSize: 12, cursor: 'pointer',
                }}>
                  👤 + Contacto
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                Mensaje
              </p>
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.textPrimary, lineHeight: 1.6, margin: 0 }}>
                {selectedSub.msg}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Página</p>
                <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: 0 }}>{selectedSub.page}</p>
              </div>
              <div>
                <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Recibido</p>
                <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: 0 }}>{selectedSub.receivedAt}</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>📬</span>
            <p style={{ fontFamily: F.body, fontSize: 14, color: C.textTertiary }}>
              Seleccioná un envío para ver el detalle
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
