import React, { useState } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { useNavigate } from '@tanstack/react-router';
import { ScoreBadge } from './InquiryListPage.js';
import type { Inquiry, InquiryStatus } from './InquiryListPage.js';

const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgOverlay:     '#121D33',
  border:        '#1F2D48',
  borderStrong:  '#253350',
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
  back:          { id: 'inquiries.detail.back' },
  contact:       { id: 'inquiries.detail.contact' },
  criteria:      { id: 'inquiries.detail.criteria' },
  matchedProps:  { id: 'inquiries.detail.matchedProps' },
  howMatch:      { id: 'inquiries.detail.howMatch' },
  howMatchBody:  { id: 'inquiries.detail.howMatchBody' },
  notify:        { id: 'inquiries.detail.notify' },
  notifyBtn:     { id: 'inquiries.detail.notifyBtn' },
  shortlist:     { id: 'inquiries.detail.shortlist' },
  buildList:     { id: 'inquiries.detail.buildList' },
  include:       { id: 'inquiries.detail.include' },
  exclude:       { id: 'inquiries.detail.exclude' },
  email:         { id: 'inquiries.detail.email' },
  phone:         { id: 'inquiries.detail.phone' },
  lastContact:   { id: 'inquiries.detail.lastContact' },
  received:      { id: 'inquiries.detail.received' },
  propScore:     { id: 'inquiries.detail.propScore' },
  criteriaOp:    { id: 'inquiries.detail.criteria.op' },
  criteriaNeigh: { id: 'inquiries.detail.criteria.neigh' },
  criteriaType:  { id: 'inquiries.detail.criteria.type' },
  criteriaPrice: { id: 'inquiries.detail.criteria.price' },
  criteriaSize:  { id: 'inquiries.detail.criteria.size' },
  criteriaRooms: { id: 'inquiries.detail.criteria.rooms' },
});

/* ── Types ── */
interface MatchedProperty {
  id: string;
  title: string;
  ref: string;
  price: string;
  currency: string;
  neighborhood: string;
  bedrooms: number;
  areaM2: number;
  scoreContribution: number;
  included: boolean;
}

/* ── Mock data ── */
const MOCK_INQUIRY: Inquiry = {
  id: 'i1',
  contactName: 'Lucas Fernández',
  contactEmail: 'lucas@email.com',
  contactAvatarInitials: 'LF',
  contactAvatarHue: 210,
  criteriaLabel: '3 amb, Palermo, hasta USD 250k',
  matchScore: 92,
  matchCount: 7,
  status: 'nueva',
  receivedAt: 'Hace 1 hora',
};

const MOCK_CRITERIA = [
  { id: 'c1', label: 'Operación', value: 'Venta', tag: 'operacion', match: true },
  { id: 'c2', label: 'Barrios', value: 'Palermo, Villa Crespo', tag: 'barrio', match: true },
  { id: 'c3', label: 'Tipo', value: 'Departamento', tag: 'tipo', match: true },
  { id: 'c4', label: 'Precio', value: 'Hasta USD 250.000', tag: 'precio', match: true },
  { id: 'c5', label: 'Superficie', value: '60–120 m²', tag: 'superficie', match: true },
  { id: 'c6', label: 'Ambientes', value: '3', tag: 'ambientes', match: true },
  { id: 'c7', label: 'Cochera', value: 'No requerida', tag: 'cochera', match: false },
];

const MOCK_PROPERTIES: MatchedProperty[] = [
  { id: 'p1', title: 'Departamento en Palermo', ref: 'A-001', price: '195.000', currency: 'USD', neighborhood: 'Palermo', bedrooms: 3, areaM2: 78, scoreContribution: 95, included: true },
  { id: 'p2', title: 'Piso en Villa Crespo', ref: 'A-012', price: '215.000', currency: 'USD', neighborhood: 'Villa Crespo', bedrooms: 3, areaM2: 85, scoreContribution: 88, included: true },
  { id: 'p3', title: 'Departamento reciclado', ref: 'B-007', price: '248.000', currency: 'USD', neighborhood: 'Palermo Soho', bedrooms: 3, areaM2: 92, scoreContribution: 82, included: false },
  { id: 'p4', title: 'Semipiso con terraza', ref: 'A-033', price: '220.000', currency: 'USD', neighborhood: 'Palermo', bedrooms: 3, areaM2: 105, scoreContribution: 79, included: false },
  { id: 'p5', title: 'Departamento luminoso', ref: 'C-018', price: '185.000', currency: 'USD', neighborhood: 'Villa Crespo', bedrooms: 3, areaM2: 68, scoreContribution: 76, included: false },
  { id: 'p6', title: 'Piso alto con vistas', ref: 'A-045', price: '240.000', currency: 'USD', neighborhood: 'Palermo', bedrooms: 3, areaM2: 80, scoreContribution: 71, included: false },
  { id: 'p7', title: 'Departamento moderno', ref: 'B-022', price: '199.000', currency: 'USD', neighborhood: 'Palermo Hollywood', bedrooms: 3, areaM2: 72, scoreContribution: 65, included: false },
];

/* ── Property match card ── */
function PropertyMatchCard({
  prop,
  selected,
  onToggleInclude,
  onToggleSelect,
}: {
  prop: MatchedProperty;
  selected: boolean;
  onToggleInclude: (id: string) => void;
  onToggleSelect: (id: string) => void;
}) {
  const intl = useIntl();
  const barColor = prop.scoreContribution >= 80 ? C.success : prop.scoreContribution >= 60 ? C.warning : C.error;

  return (
    <div style={{
      position: 'relative',
      background: C.bgBase, border: `1.5px solid ${selected ? C.brand : C.border}`,
      borderRadius: 12, overflow: 'hidden',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      boxShadow: selected ? `0 0 0 2px ${C.brand}40` : 'none',
    }}>
      {/* Checkbox top-left */}
      <div
        onClick={() => onToggleSelect(prop.id)}
        style={{
          position: 'absolute', top: 10, left: 10, zIndex: 2,
          width: 20, height: 20, borderRadius: 5,
          background: selected ? C.brand : C.bgRaised,
          border: `1.5px solid ${selected ? C.brand : C.border}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.1s',
        }}
      >
        {selected && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
      </div>

      {/* Thumbnail placeholder */}
      <div style={{
        height: 100, background: `linear-gradient(135deg, ${C.bgRaised}, ${C.bgOverlay})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, borderBottom: `1px solid ${C.border}`,
      }}>
        🏢
      </div>

      {/* Content */}
      <div style={{ padding: '10px 12px' }}>
        <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: C.textPrimary, fontFamily: F.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {prop.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: C.brandLight, fontFamily: F.mono }}>#{prop.ref}</span>
          <span style={{ fontSize: 10, color: C.textTertiary }}>·</span>
          <span style={{ fontSize: 10, color: C.textSecondary, fontFamily: F.body }}>{prop.neighborhood}</span>
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: C.textPrimary, fontFamily: F.display }}>
          {prop.currency} {prop.price}
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.body }}>🛏 {prop.bedrooms}</span>
          <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.body }}>📐 {prop.areaM2} m²</span>
        </div>

        {/* Score bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.body }}>
              {intl.formatMessage(msgs.propScore)}
            </span>
            <span style={{ fontSize: 10, color: barColor, fontFamily: F.mono, fontWeight: 600 }}>
              {prop.scoreContribution}%
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: C.bgRaised, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${prop.scoreContribution}%`,
              background: barColor,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Include/Exclude toggle */}
        <button
          onClick={() => onToggleInclude(prop.id)}
          style={{
            width: '100%', padding: '6px',
            borderRadius: 7, cursor: 'pointer',
            background: prop.included ? `${C.success}15` : 'transparent',
            border: `1px solid ${prop.included ? C.success : C.border}`,
            color: prop.included ? C.success : C.textTertiary,
            fontSize: 11, fontFamily: F.body, fontWeight: 500,
            transition: 'all 0.12s',
          }}
        >
          {prop.included ? `✓ ${intl.formatMessage(msgs.include)}` : intl.formatMessage(msgs.exclude)}
        </button>
      </div>
    </div>
  );
}

/* ── Main page ── */
export function InquiryDetailPage({ inquiryId }: { inquiryId: string }) {
  const intl = useIntl();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<MatchedProperty[]>(MOCK_PROPERTIES);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [howMatchOpen, setHowMatchOpen] = useState(false);
  const [notified, setNotified] = useState(false);

  const inquiry = MOCK_INQUIRY;

  const toggleInclude = (id: string) => {
    setProperties((prev) => prev.map((p) => p.id === id ? { ...p, included: !p.included } : p));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleNotify = () => {
    setNotified(true);
    setTimeout(() => setNotified(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bgBase }}>
      {/* Header */}
      <div style={{
        padding: '16px 28px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate({ to: '/inquiries' })} style={ghostBtn}>
            ← {intl.formatMessage(msgs.back)}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ScoreBadge score={inquiry.matchScore} large />
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
                {inquiry.contactName}
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textSecondary, fontFamily: F.body }}>
                {inquiry.criteriaLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Notify button */}
        <button
          onClick={handleNotify}
          style={{
            padding: '9px 20px', borderRadius: 9, cursor: 'pointer',
            background: notified ? C.success : C.brand,
            border: 'none', color: '#fff', fontSize: 14,
            fontFamily: F.body, fontWeight: 600,
            transition: 'background 0.2s',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {notified ? '✓ Notificación enviada' : `📧 ${intl.formatMessage(msgs.notifyBtn)}`}
        </button>
      </div>

      {/* Two-column layout */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 0 }}>

        {/* LEFT PANEL — Contact + Criteria */}
        <div style={{
          width: 320, flexShrink: 0, overflowY: 'auto',
          borderRight: `1px solid ${C.border}`, padding: '20px',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {/* Contact card */}
          <section>
            <SectionLabel label={intl.formatMessage(msgs.contact)} />
            <div style={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, fontFamily: F.body, flexShrink: 0,
                  backgroundColor: `hsl(${inquiry.contactAvatarHue} 55% 22%)`,
                  color: `hsl(${inquiry.contactAvatarHue} 80% 75%)`,
                  border: `1.5px solid hsl(${inquiry.contactAvatarHue} 55% 35%)`,
                }}>
                  {inquiry.contactAvatarInitials}
                </div>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: C.textPrimary, fontFamily: F.display }}>
                    {inquiry.contactName}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: C.textTertiary, fontFamily: F.body }}>
                    {intl.formatMessage(msgs.received)}: {inquiry.receivedAt}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ContactInfoRow icon="✉" label={intl.formatMessage(msgs.email)} value={inquiry.contactEmail} />
                <ContactInfoRow icon="📱" label={intl.formatMessage(msgs.phone)} value="+54 9 11 4567-8901" />
                <ContactInfoRow icon="🕐" label={intl.formatMessage(msgs.lastContact)} value="Primera consulta" />
              </div>
            </div>
          </section>

          {/* Criteria panel */}
          <section>
            <SectionLabel label={intl.formatMessage(msgs.criteria)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MOCK_CRITERIA.map((c) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 9,
                  background: C.bgRaised, border: `1px solid ${C.border}`,
                }}>
                  <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.body }}>{c.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 12, color: C.textPrimary, fontFamily: F.body, fontWeight: 500 }}>
                      {c.value}
                    </span>
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: c.match ? `${C.success}20` : `${C.error}20`,
                      border: `1.5px solid ${c.match ? C.success : C.error}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: c.match ? C.success : C.error, flexShrink: 0,
                    }}>
                      {c.match ? '✓' : '✕'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* How match works accordion */}
            <button
              onClick={() => setHowMatchOpen(!howMatchOpen)}
              style={{
                marginTop: 10, width: '100%', padding: '9px 12px',
                background: `${C.brand}10`, border: `1px solid ${C.brand}30`,
                borderRadius: 9, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: C.brandLight, fontSize: 12, fontFamily: F.body, fontWeight: 500,
              }}
            >
              <span>🤖 {intl.formatMessage(msgs.howMatch)}</span>
              <span style={{ transition: 'transform 0.2s', transform: howMatchOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>
            {howMatchOpen && (
              <div style={{
                marginTop: 4, padding: '12px 14px',
                background: `${C.brand}08`, border: `1px solid ${C.brand}25`,
                borderRadius: 9, fontSize: 12, color: C.textSecondary, fontFamily: F.body, lineHeight: 1.6,
              }}>
                El score de match se calcula cruzando los criterios del comprador con cada propiedad disponible.
                Se consideran: operación, barrio, tipo de propiedad, precio, superficie y cantidad de ambientes.
                Cada criterio tiene un peso diferente según la importancia declarada por el contacto.
              </div>
            )}
          </section>

          {/* Shortlist / selection */}
          {selectedIds.size > 0 && (
            <section>
              <SectionLabel label={intl.formatMessage(msgs.shortlist)} />
              <div style={{
                padding: '12px', background: C.bgRaised,
                border: `1px solid ${C.brand}40`, borderRadius: 10,
              }}>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: C.textSecondary, fontFamily: F.body }}>
                  {selectedIds.size} propiedad{selectedIds.size !== 1 ? 'es' : ''} seleccionada{selectedIds.size !== 1 ? 's' : ''}
                </p>
                <button style={{
                  width: '100%', padding: '8px',
                  background: C.brand, border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 12, fontFamily: F.body, fontWeight: 600, cursor: 'pointer',
                }}>
                  {intl.formatMessage(msgs.buildList)}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT PANEL — Matched properties grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionLabel label={`${intl.formatMessage(msgs.matchedProps)} (${properties.length})`} />
            {selectedIds.size > 0 && (
              <button
                onClick={() => setSelectedIds(new Set())}
                style={{ fontSize: 11, color: C.textTertiary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F.body }}
              >
                Deseleccionar todo
              </button>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 14,
          }}>
            {properties.map((prop) => (
              <PropertyMatchCard
                key={prop.id}
                prop={prop}
                selected={selectedIds.has(prop.id)}
                onToggleInclude={toggleInclude}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p style={{
      margin: '0 0 10px', fontSize: 11, fontWeight: 700,
      color: C.textTertiary, fontFamily: F.body, textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      {label}
    </p>
  );
}

function ContactInfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, width: 18, textAlign: 'center' }}>{icon}</span>
      <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.body, width: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: C.textPrimary, fontFamily: F.body }}>{value}</span>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
  background: 'transparent', border: `1px solid ${C.border}`,
  color: C.textSecondary, fontSize: 13, fontFamily: F.body, fontWeight: 500,
};
