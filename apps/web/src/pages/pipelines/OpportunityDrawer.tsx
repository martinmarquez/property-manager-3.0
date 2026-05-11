import React, { useState } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import type { Opportunity, Stage } from './PipelineKanbanPage.js';

const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgOverlay:     '#121D33',
  border:        '#1F2D48',
  borderStrong:  '#253350',
  brand:         '#1654d9',
  brandLight:    '#5577FF',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#6B809E',
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
  contactInfo:   { id: 'pipelines.drawer.contactInfo' },
  propertyLink:  { id: 'pipelines.drawer.propertyLink' },
  noProperty:    { id: 'pipelines.card.noProperty' },
  timeline:      { id: 'pipelines.drawer.timeline' },
  addNote:       { id: 'pipelines.drawer.addNote' },
  notePlaceholder:{ id: 'pipelines.drawer.notePlaceholder' },
  send:          { id: 'pipelines.drawer.send' },
  moveStage:     { id: 'pipelines.drawer.moveStage' },
  scheduleVisit: { id: 'pipelines.drawer.scheduleVisit' },
  sendWhatsApp:  { id: 'pipelines.drawer.sendWhatsApp' },
  lastContacted: { id: 'pipelines.drawer.lastContacted' },
  value:         { id: 'pipelines.drawer.value' },
  email:         { id: 'pipelines.drawer.email' },
  phone:         { id: 'pipelines.drawer.phone' },
});

/* ── Mock timeline events ── */
const MOCK_TIMELINE = [
  { id: 't1', type: 'stage_change', text: 'Movido a Visita Agendada', time: 'Hace 2 días', actor: 'AG' },
  { id: 't2', type: 'note', text: 'Interesado en dpto de 3 amb con balcón. Presupuesto hasta USD 230k.', time: 'Hace 3 días', actor: 'AG' },
  { id: 't3', type: 'stage_change', text: 'Movido a Calificado', time: 'Hace 4 días', actor: 'CL' },
  { id: 't4', type: 'created', text: 'Oportunidad creada desde consulta web', time: 'Hace 5 días', actor: 'Sistema' },
];

function avatarStyle(hue: number): React.CSSProperties {
  return {
    backgroundColor: `hsl(${hue} 55% 22%)`,
    color: `hsl(${hue} 80% 75%)`,
    border: `1.5px solid hsl(${hue} 55% 35%)`,
  };
}

export function OpportunityDrawer({
  opp,
  stages,
  onClose,
  onMoveStage,
}: {
  opp: Opportunity;
  stages: Stage[];
  onClose: () => void;
  onMoveStage: (oppId: string, toStageId: string) => void;
}) {
  const intl = useIntl();
  const [note, setNote] = useState('');
  const [selectedStage, setSelectedStage] = useState(opp.stageId);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(7,13,26,0.7)',
          backdropFilter: 'blur(2px)', zIndex: 40,
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: C.bgRaised, borderLeft: `1px solid ${C.border}`,
        zIndex: 50, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
        animation: 'slideInRight 0.22s ease-out',
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, fontFamily: F.body, flexShrink: 0,
                ...avatarStyle(opp.contactAvatarHue),
              }}>
                {opp.contactAvatarInitials}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
                  {opp.contactName}
                </h2>
              </div>
            </div>
            {/* Stage badge */}
            {(() => {
              const stage = stages.find((s) => s.id === opp.stageId);
              return stage ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontFamily: F.mono, fontWeight: 500,
                  color: stage.color,
                  background: `${stage.color}18`, border: `1px solid ${stage.color}40`,
                  borderRadius: 10, padding: '2px 9px',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: stage.color }} />
                  {stage.name}
                </span>
              ) : null;
            })()}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
              color: C.textSecondary, fontSize: 14, fontFamily: F.body,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Contact info */}
          <section>
            <SectionLabel label={intl.formatMessage(msgs.contactInfo)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <InfoRow icon="✉" label={intl.formatMessage(msgs.email)} value={`${opp.contactName.toLowerCase().replace(' ', '.')}@gmail.com`} />
              <InfoRow icon="📱" label={intl.formatMessage(msgs.phone)} value="+54 9 11 4567-8901" />
              <InfoRow icon="🕐" label={intl.formatMessage(msgs.lastContacted)} value="Hace 2 días" />
              <InfoRow icon="💵" label={intl.formatMessage(msgs.value)} value={`${opp.currency} ${opp.totalValue.toLocaleString('es-AR')}`} />
            </div>
          </section>

          {/* Property link */}
          <section>
            <SectionLabel label={intl.formatMessage(msgs.propertyLink)} />
            {opp.propertyRef ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: C.bgBase, border: `1px solid ${C.border}`,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: `${C.brand}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>
                  🏢
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: F.body }}>
                    Departamento en Palermo
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: C.brandLight, fontFamily: F.mono }}>
                    #{opp.propertyRef}
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: C.textTertiary, fontFamily: F.body, fontStyle: 'italic' }}>
                {intl.formatMessage(msgs.noProperty)}
              </p>
            )}
          </section>

          {/* Timeline */}
          <section>
            <SectionLabel label={intl.formatMessage(msgs.timeline)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {MOCK_TIMELINE.map((event, i) => (
                <div key={event.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                  {/* Connector line */}
                  {i < MOCK_TIMELINE.length - 1 && (
                    <div style={{
                      position: 'absolute', left: 13, top: 26, bottom: -8,
                      width: 1, background: C.border,
                    }} />
                  )}
                  {/* Dot */}
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: event.type === 'stage_change' ? `${C.brand}20` : C.bgBase,
                    border: `1.5px solid ${event.type === 'stage_change' ? C.brand : C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, zIndex: 1,
                  }}>
                    {event.type === 'stage_change' ? '→' : event.type === 'note' ? '📝' : '✦'}
                  </div>
                  {/* Content */}
                  <div style={{ paddingBottom: 16 }}>
                    <p style={{ margin: '3px 0 2px', fontSize: 13, color: C.textPrimary, fontFamily: F.body }}>
                      {event.text}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: C.textTertiary, fontFamily: F.mono }}>
                      {event.time} · {event.actor}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add note */}
            <div style={{ marginTop: 4 }}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={intl.formatMessage(msgs.notePlaceholder)}
                rows={3}
                style={{
                  width: '100%', resize: 'vertical',
                  background: C.bgBase, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '9px 12px',
                  color: C.textPrimary, fontSize: 13, fontFamily: F.body,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              {note.trim() && (
                <button
                  onClick={() => setNote('')}
                  style={{
                    marginTop: 6, padding: '6px 14px',
                    background: C.brand, border: 'none', borderRadius: 7,
                    color: '#fff', fontSize: 13, fontFamily: F.body, cursor: 'pointer',
                  }}
                >
                  {intl.formatMessage(msgs.send)}
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '14px 20px', borderTop: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Move stage */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.body, flexShrink: 0 }}>
              {intl.formatMessage(msgs.moveStage)}:
            </span>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              style={{
                flex: 1, padding: '6px 10px',
                background: C.bgBase, border: `1px solid ${C.border}`,
                borderRadius: 7, color: C.textPrimary, fontSize: 13, fontFamily: F.body,
                cursor: 'pointer', outline: 'none',
              }}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {selectedStage !== opp.stageId && (
              <button
                onClick={() => onMoveStage(opp.id, selectedStage)}
                style={{
                  padding: '6px 14px', background: C.brand, border: 'none',
                  borderRadius: 7, color: '#fff', fontSize: 13, fontFamily: F.body, cursor: 'pointer', flexShrink: 0,
                }}
              >
                Mover
              </button>
            )}
          </div>
          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...quickActionBtn, flex: 1 }}>
              📅 {intl.formatMessage(msgs.scheduleVisit)}
            </button>
            <button style={{ ...quickActionBtn, flex: 1 }}>
              💬 {intl.formatMessage(msgs.sendWhatsApp)}
            </button>
          </div>
        </div>
      </div>
    </>
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

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{icon}</span>
      <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.body, width: 90, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.textPrimary, fontFamily: F.body }}>{value}</span>
    </div>
  );
}

const quickActionBtn: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
  background: C.bgBase, border: `1px solid ${C.border}`,
  color: C.textSecondary, fontSize: 12, fontFamily: F.body, fontWeight: 500,
  textAlign: 'center',
};
