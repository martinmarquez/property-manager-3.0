import React, { useState, useCallback } from 'react';
import { useIntl, defineMessages } from 'react-intl';

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

/* ── Event types ── */
export const EVENT_TYPES = {
  visita:      { color: '#4669ff', label: 'Visita' },
  llamada:     { color: '#18A659', label: 'Llamada' },
  seguimiento: { color: '#E88A14', label: 'Seguimiento' },
  tasacion:    { color: '#9B59B6', label: 'Tasación' },
  escritura:   { color: '#E83B3B', label: 'Escritura' },
} as const;
type EventType = keyof typeof EVENT_TYPES;

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  date: string;    // YYYY-MM-DD
  startHour: number;
  durationHours: number;
  contactName?: string;
  propertyRef?: string;
  conflict?: boolean;
}

type CalendarView = 'mes' | 'semana' | 'dia' | 'agenda';
type SyncStatus = 'google' | 'm365' | 'none';

const msgs = defineMessages({
  title:        { id: 'pages.calendar.title' },
  viewMes:      { id: 'calendar.view.mes' },
  viewSemana:   { id: 'calendar.view.semana' },
  viewDia:      { id: 'calendar.view.dia' },
  viewAgenda:   { id: 'calendar.view.agenda' },
  newEvent:     { id: 'calendar.newEvent' },
  today:        { id: 'calendar.today' },
  syncGoogle:   { id: 'calendar.sync.google' },
  syncM365:     { id: 'calendar.sync.m365' },
  syncNone:     { id: 'calendar.sync.none' },
  syncConnect:  { id: 'calendar.sync.connect' },
  conflictTip:  { id: 'calendar.conflict.tip' },
  emptyTitle:   { id: 'calendar.empty.title' },
  emptyBody:    { id: 'calendar.empty.body' },
  modalTitle:   { id: 'calendar.modal.title' },
  modalType:    { id: 'calendar.modal.type' },
  modalDate:    { id: 'calendar.modal.date' },
  modalStart:   { id: 'calendar.modal.start' },
  modalEnd:     { id: 'calendar.modal.end' },
  modalContact: { id: 'calendar.modal.contact' },
  modalProp:    { id: 'calendar.modal.property' },
  modalNotes:   { id: 'calendar.modal.notes' },
  modalReminder:{ id: 'calendar.modal.reminder' },
  modalSave:    { id: 'calendar.modal.save' },
  modalCancel:  { id: 'calendar.modal.cancel' },
  modalTitleInput: { id: 'calendar.modal.titleInput' },
});

/* ── Mock events ── */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const MOCK_EVENTS: CalendarEvent[] = [
  { id: 'e1', title: 'Visita Palermo', type: 'visita', date: today(), startHour: 10, durationHours: 1, contactName: 'Lucas Fernández', propertyRef: 'A-001' },
  { id: 'e2', title: 'Llamada de seguimiento', type: 'llamada', date: today(), startHour: 11, durationHours: 0.5, contactName: 'Valeria Torres', conflict: true },
  { id: 'e3', title: 'Tasación Belgrano', type: 'tasacion', date: today(), startHour: 14, durationHours: 1.5, contactName: 'Martín Gutiérrez', propertyRef: 'B-010' },
  { id: 'e4', title: 'Seguimiento Rodríguez', type: 'seguimiento', date: dateOffset(1), startHour: 9, durationHours: 1, contactName: 'Sofía Rodríguez' },
  { id: 'e5', title: 'Firma escritura', type: 'escritura', date: dateOffset(2), startHour: 16, durationHours: 2, contactName: 'Camila Vega', propertyRef: 'D-007' },
  { id: 'e6', title: 'Visita San Telmo', type: 'visita', date: dateOffset(3), startHour: 11, durationHours: 1, contactName: 'Diego Morales', propertyRef: 'C-022' },
  { id: 'e7', title: 'Llamada nuevo lead', type: 'llamada', date: dateOffset(-1), startHour: 10, durationHours: 0.5, contactName: 'Roberto Pérez' },
];

/* ── Helpers ── */
function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  // Pad to start on Monday
  const startDow = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, -startDow + i + 1);
    days.push(d);
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  // Pad to 42 cells
  while (days.length < 42) {
    const last = days[days.length - 1]!;
    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  return days;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getWeekDays(anchor: Date): Date[] {
  const dow = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/* ── Event pill ── */
function EventPill({ event, small = false }: { event: CalendarEvent; small?: boolean }) {
  const { color } = EVENT_TYPES[event.type];
  return (
    <div
      title={event.conflict ? 'Conflicto de horarios' : event.title}
      style={{
        padding: small ? '1px 6px' : '3px 8px',
        borderRadius: 5,
        background: event.conflict ? `repeating-linear-gradient(45deg, ${color}30, ${color}30 3px, ${color}55 3px, ${color}55 6px)` : `${color}25`,
        border: `1px solid ${color}${event.conflict ? 'BB' : '50'}`,
        color: color,
        fontSize: small ? 10 : 11,
        fontFamily: F.body,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
      }}
    >
      {event.conflict && <span style={{ marginRight: 3 }}>⚠</span>}
      {event.title}
    </div>
  );
}

/* ── Month view ── */
function MonthView({
  year, month, events, todayStr,
  onPrev, onNext,
}: {
  year: number; month: number; events: CalendarEvent[]; todayStr: string;
  onPrev: () => void; onNext: () => void;
}) {
  const days = getMonthDays(year, month);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 0 16px' }}>
        <button onClick={onPrev} style={navBtn}>‹</button>
        <span style={{ fontSize: 17, fontWeight: 700, fontFamily: F.display, color: C.textPrimary, minWidth: 180, textAlign: 'center' }}>
          {MONTHS_ES[month]} {year}
        </span>
        <button onClick={onNext} style={navBtn}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS_SHORT.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.textTertiary, fontFamily: F.body, padding: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: 2 }}>
        {days.map((day, idx) => {
          const ds = formatDate(day);
          const dayEvents = events.filter((e) => e.date === ds);
          const isCurrentMonth = day.getMonth() === month;
          const isToday = ds === todayStr;

          return (
            <div
              key={idx}
              style={{
                padding: '6px 8px', minHeight: 80,
                background: isToday ? `${C.brand}15` : C.bgRaised,
                border: `1px solid ${isToday ? C.brand : C.border}`,
                borderRadius: 8, overflow: 'hidden',
                opacity: isCurrentMonth ? 1 : 0.4,
              }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: '50%',
                background: isToday ? C.brand : 'transparent',
                fontSize: 12, fontWeight: isToday ? 700 : 400,
                color: isToday ? '#fff' : C.textSecondary,
                fontFamily: F.mono, marginBottom: 4,
              }}>
                {day.getDate()}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayEvents.slice(0, 3).map((e) => (
                  <EventPill key={e.id} event={e} small />
                ))}
                {dayEvents.length > 3 && (
                  <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.body }}>
                    +{dayEvents.length - 3} más
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Week view ── */
function WeekView({ anchor, events, todayStr, onPrev, onNext }: {
  anchor: Date; events: CalendarEvent[]; todayStr: string;
  onPrev: () => void; onNext: () => void;
}) {
  const weekDays = getWeekDays(anchor);
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Week nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 0 12px' }}>
        <button onClick={onPrev} style={navBtn}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
          {weekDays[0]!.getDate()} {MONTHS_ES[weekDays[0]!.getMonth()]} — {weekDays[6]!.getDate()} {MONTHS_ES[weekDays[6]!.getMonth()]} {weekDays[6]!.getFullYear()}
        </span>
        <button onClick={onNext} style={navBtn}>›</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
          <div />
          {weekDays.map((day) => {
            const ds = formatDate(day);
            const isToday = ds === todayStr;
            return (
              <div key={ds} style={{ textAlign: 'center', padding: '6px 0' }}>
                <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.body, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {DAYS_SHORT[(day.getDay() + 6) % 7]}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: '50%',
                  background: isToday ? C.brand : 'transparent',
                  fontSize: 14, fontWeight: isToday ? 700 : 500,
                  color: isToday ? '#fff' : C.textPrimary, fontFamily: F.display,
                }}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        {hours.map((hour) => (
          <div key={hour} style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', gap: 2, minHeight: 52 }}>
            <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.mono, paddingTop: 2, textAlign: 'right', paddingRight: 8 }}>
              {hour}:00
            </div>
            {weekDays.map((day) => {
              const ds = formatDate(day);
              const cellEvents = events.filter((e) => e.date === ds && Math.floor(e.startHour) === hour);
              return (
                <div key={ds} style={{
                  borderTop: `1px solid ${C.border}`,
                  padding: '3px 3px',
                  minHeight: 52,
                  background: formatDate(day) === todayStr ? `${C.brand}08` : 'transparent',
                }}>
                  {cellEvents.map((e) => (
                    <div
                      key={e.id}
                      style={{
                        padding: '4px 7px', borderRadius: 6, marginBottom: 2,
                        background: `${EVENT_TYPES[e.type].color}25`,
                        border: `1px solid ${EVENT_TYPES[e.type].color}50`,
                        borderLeft: `3px solid ${EVENT_TYPES[e.type].color}`,
                        position: e.conflict ? 'relative' : 'static',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: EVENT_TYPES[e.type].color, fontFamily: F.body }}>
                        {e.conflict && <span style={{ marginRight: 3 }}>⚠</span>}
                        {e.title}
                      </div>
                      {e.contactName && (
                        <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.body }}>{e.contactName}</div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Day view ── */
function DayView({ anchor, events, todayStr, onPrev, onNext }: {
  anchor: Date; events: CalendarEvent[]; todayStr: string;
  onPrev: () => void; onNext: () => void;
}) {
  const ds = formatDate(anchor);
  const dayEvents = events.filter((e) => e.date === ds);
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 0 16px' }}>
        <button onClick={onPrev} style={navBtn}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 17, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
            {DAYS_SHORT[(anchor.getDay() + 6) % 7]}, {anchor.getDate()} de {MONTHS_ES[anchor.getMonth()]} {anchor.getFullYear()}
          </span>
          {ds === todayStr && (
            <span style={{ marginLeft: 10, fontSize: 11, color: C.brandLight, fontFamily: F.mono, background: `${C.brand}20`, padding: '2px 8px', borderRadius: 10 }}>Hoy</span>
          )}
        </div>
        <button onClick={onNext} style={navBtn}>›</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {hours.map((hour) => {
          const cellEvents = dayEvents.filter((e) => Math.floor(e.startHour) === hour);
          return (
            <div key={hour} style={{ display: 'flex', gap: 12, borderTop: `1px solid ${C.border}`, minHeight: 60, padding: '6px 0' }}>
              <span style={{ width: 44, flexShrink: 0, fontSize: 11, color: C.textTertiary, fontFamily: F.mono, textAlign: 'right', paddingTop: 2 }}>
                {hour}:00
              </span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cellEvents.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      padding: '8px 14px', borderRadius: 8,
                      background: `${EVENT_TYPES[e.type].color}20`,
                      border: `1px solid ${EVENT_TYPES[e.type].color}50`,
                      borderLeft: `4px solid ${EVENT_TYPES[e.type].color}`,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: EVENT_TYPES[e.type].color, fontFamily: F.body, marginBottom: 2 }}>
                      {e.conflict && <span style={{ marginRight: 4 }}>⚠</span>}
                      {e.title}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: C.textSecondary, fontFamily: F.body }}>
                      <span>{e.startHour}:00 – {e.startHour + e.durationHours}:00</span>
                      {e.contactName && <span>· {e.contactName}</span>}
                      {e.propertyRef && <span>· #{e.propertyRef}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Agenda view ── */
function AgendaView({ events, todayStr }: { events: CalendarEvent[]; todayStr: string }) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour);
  const grouped = sorted.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    (acc[e.date] ??= []).push(e);
    return acc;
  }, {});

  if (sorted.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 48, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: `${C.brand}15`, border: `1.5px solid ${C.brand}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📅</div>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
            Sin eventos programados
          </p>
          <p style={{ margin: 0, fontSize: 13, color: C.textSecondary, fontFamily: F.body }}>
            Agendá visitas, llamadas y seguimientos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(grouped).map(([date, dayEvents]) => {
        const d = new Date(date + 'T12:00:00');
        const isToday = date === todayStr;
        return (
          <div key={date}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                minWidth: 44,
                background: isToday ? C.brand : C.bgRaised,
                border: `1px solid ${isToday ? C.brand : C.border}`,
                borderRadius: 10, padding: '6px 10px',
              }}>
                <span style={{ fontSize: 10, fontFamily: F.body, color: isToday ? 'rgba(255,255,255,0.7)' : C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {DAYS_SHORT[(d.getDay() + 6) % 7]}
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, fontFamily: F.display, color: isToday ? '#fff' : C.textPrimary }}>
                  {d.getDate()}
                </span>
              </div>
              <span style={{ fontSize: 13, color: C.textSecondary, fontFamily: F.body }}>
                {MONTHS_ES[d.getMonth()]} {d.getFullYear()}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dayEvents.map((e) => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '11px 14px', borderRadius: 10,
                  background: C.bgRaised, border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${EVENT_TYPES[e.type].color}`,
                }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `${EVENT_TYPES[e.type].color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13,
                    }}>
                      {e.type === 'visita' ? '🏠' : e.type === 'llamada' ? '📞' : e.type === 'seguimiento' ? '🔄' : e.type === 'tasacion' ? '📊' : '✍'}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: F.body }}>
                        {e.conflict && <span style={{ marginRight: 4, color: C.error }}>⚠</span>}
                        {e.title}
                      </span>
                      <span style={{
                        fontSize: 10, fontFamily: F.mono, fontWeight: 500,
                        color: EVENT_TYPES[e.type].color,
                        background: `${EVENT_TYPES[e.type].color}18`,
                        border: `1px solid ${EVENT_TYPES[e.type].color}40`,
                        borderRadius: 8, padding: '1px 7px',
                      }}>
                        {EVENT_TYPES[e.type].label}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.body }}>
                      {e.startHour}:00 – {e.startHour + e.durationHours}:00
                      {e.contactName && ` · ${e.contactName}`}
                      {e.propertyRef && ` · #${e.propertyRef}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Event creation modal ── */
interface EventFormData extends Partial<CalendarEvent> {
  endHour?: number;
  notes?: string;
  reminder?: string;
}

function EventModal({ onClose, onSave }: { onClose: () => void; onSave: (e: EventFormData) => void }) {
  const intl = useIntl();
  const [form, setForm] = useState({
    title: '', type: 'visita' as EventType, date: today(),
    startHour: 10, endHour: 11, contactName: '', propertyRef: '', notes: '', reminder: '30min',
  });

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(7,13,26,0.75)', backdropFilter: 'blur(2px)', zIndex: 50 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, maxHeight: '90vh', overflowY: 'auto',
        background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 14,
        zIndex: 60, boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        animation: 'fadeScale 0.18s ease-out',
      }}>
        <style>{`@keyframes fadeScale { from { opacity: 0; transform: translate(-50%,-50%) scale(0.96); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }`}</style>

        {/* Modal header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
            {intl.formatMessage(msgs.modalTitle)}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, padding: '4px 10px', cursor: 'pointer', color: C.textSecondary, fontSize: 14 }}>✕</button>
        </div>

        {/* Form body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ModalField label={intl.formatMessage(msgs.modalTitleInput)}>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} style={inputStyle} placeholder="Ej: Visita departamento Palermo" />
          </ModalField>

          <ModalField label={intl.formatMessage(msgs.modalType)}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(Object.entries(EVENT_TYPES) as [EventType, { color: string; label: string }][]).map(([type, meta]) => (
                <button
                  key={type}
                  onClick={() => set('type', type)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                    background: form.type === type ? `${meta.color}25` : 'transparent',
                    border: `1.5px solid ${form.type === type ? meta.color : C.border}`,
                    color: form.type === type ? meta.color : C.textSecondary,
                    fontSize: 12, fontFamily: F.body, fontWeight: 500,
                    transition: 'all 0.1s',
                  }}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </ModalField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <ModalField label={intl.formatMessage(msgs.modalDate)}>
              <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} style={inputStyle} />
            </ModalField>
            <ModalField label={intl.formatMessage(msgs.modalStart)}>
              <input type="number" min={7} max={20} value={form.startHour} onChange={(e) => set('startHour', Number(e.target.value))} style={inputStyle} />
            </ModalField>
            <ModalField label={intl.formatMessage(msgs.modalEnd)}>
              <input type="number" min={form.startHour + 1} max={21} value={form.endHour} onChange={(e) => set('endHour', Number(e.target.value))} style={inputStyle} />
            </ModalField>
          </div>

          <ModalField label={intl.formatMessage(msgs.modalContact)}>
            <input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} style={inputStyle} placeholder="Buscar contacto..." />
          </ModalField>

          <ModalField label={intl.formatMessage(msgs.modalProp)}>
            <input value={form.propertyRef} onChange={(e) => set('propertyRef', e.target.value)} style={inputStyle} placeholder="Ej: A-001" />
          </ModalField>

          <ModalField label={intl.formatMessage(msgs.modalReminder)}>
            <select value={form.reminder} onChange={(e) => set('reminder', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="15min">15 minutos antes</option>
              <option value="30min">30 minutos antes</option>
              <option value="1h">1 hora antes</option>
              <option value="1d">1 día antes</option>
            </select>
          </ModalField>

          <ModalField label={intl.formatMessage(msgs.modalNotes)}>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Notas adicionales..." />
          </ModalField>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={ghostBtnSm}>{intl.formatMessage(msgs.modalCancel)}</button>
          <button
            onClick={() => { onSave(form); onClose(); }}
            disabled={!form.title.trim()}
            style={{ ...primaryBtnSm, opacity: form.title.trim() ? 1 : 0.5, cursor: form.title.trim() ? 'pointer' : 'not-allowed' }}
          >
            {intl.formatMessage(msgs.modalSave)}
          </button>
        </div>
      </div>
    </>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textTertiary, fontFamily: F.body, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── Sync status badge ── */
function SyncBadge({ status }: { status: SyncStatus }) {
  const intl = useIntl();
  if (status === 'google') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: `${C.success}15`, border: `1px solid ${C.success}40`, fontSize: 12, color: C.success, fontFamily: F.body }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.success }} />
        {intl.formatMessage(msgs.syncGoogle)}
      </div>
    );
  }
  if (status === 'm365') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: `${C.brand}15`, border: `1px solid ${C.brand}40`, fontSize: 12, color: C.brandLight, fontFamily: F.body }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.brandLight }} />
        {intl.formatMessage(msgs.syncM365)}
      </div>
    );
  }
  return (
    <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: C.bgRaised, border: `1px solid ${C.border}`, fontSize: 12, color: C.textTertiary, fontFamily: F.body, cursor: 'pointer' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.textTertiary }} />
      {intl.formatMessage(msgs.syncConnect)}
    </button>
  );
}

/* ── Main page ── */
export function CalendarPage() {
  const intl = useIntl();
  const [view, setView] = useState<CalendarView>('semana');
  const [anchor, setAnchor] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);
  const [showModal, setShowModal] = useState(false);
  const syncStatus: SyncStatus = 'google';

  const todayStr = today();

  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  const goPrev = useCallback(() => {
    setAnchor((a) => {
      const d = new Date(a);
      if (view === 'mes') { d.setMonth(d.getMonth() - 1); }
      else if (view === 'semana') { d.setDate(d.getDate() - 7); }
      else { d.setDate(d.getDate() - 1); }
      return d;
    });
  }, [view]);

  const goNext = useCallback(() => {
    setAnchor((a) => {
      const d = new Date(a);
      if (view === 'mes') { d.setMonth(d.getMonth() + 1); }
      else if (view === 'semana') { d.setDate(d.getDate() + 7); }
      else { d.setDate(d.getDate() + 1); }
      return d;
    });
  }, [view]);

  const handleSaveEvent = useCallback((form: EventFormData) => {
    setEvents((prev) => [
      ...prev,
      {
        id: `e${Date.now()}`,
        title: form.title ?? '',
        type: form.type ?? 'visita',
        date: form.date ?? todayStr,
        startHour: form.startHour ?? 10,
        durationHours: (form.endHour ?? 11) - (form.startHour ?? 10),
        contactName: form.contactName,
        propertyRef: form.propertyRef,
      },
    ]);
  }, [todayStr]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bgBase }}>
      {/* Page header */}
      <div style={{
        padding: '14px 28px 12px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
            {intl.formatMessage(msgs.title)}
          </h1>
          {/* View tabs */}
          <div style={{ display: 'flex', gap: 2, background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3 }}>
            {(['mes', 'semana', 'dia', 'agenda'] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '5px 12px', borderRadius: 6, cursor: 'pointer', border: 'none',
                  background: view === v ? C.brand : 'transparent',
                  color: view === v ? '#fff' : C.textSecondary,
                  fontSize: 12, fontFamily: F.body, fontWeight: 500,
                  transition: 'background 0.12s',
                  textTransform: 'capitalize',
                }}
              >
                {v === 'mes' ? intl.formatMessage(msgs.viewMes)
                 : v === 'semana' ? intl.formatMessage(msgs.viewSemana)
                 : v === 'dia' ? intl.formatMessage(msgs.viewDia)
                 : intl.formatMessage(msgs.viewAgenda)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SyncBadge status={syncStatus} />
          <button
            onClick={() => setAnchor(new Date())}
            style={ghostBtnSm}
          >
            {intl.formatMessage(msgs.today)}
          </button>
          <button onClick={() => setShowModal(true)} style={primaryBtnSm}>
            + {intl.formatMessage(msgs.newEvent)}
          </button>
        </div>
      </div>

      {/* Calendar content */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 28px', display: 'flex', flexDirection: 'column' }}>
        {view === 'mes' && (
          <MonthView year={year} month={month} events={events} todayStr={todayStr} onPrev={goPrev} onNext={goNext} />
        )}
        {view === 'semana' && (
          <WeekView anchor={anchor} events={events} todayStr={todayStr} onPrev={goPrev} onNext={goNext} />
        )}
        {view === 'dia' && (
          <DayView anchor={anchor} events={events} todayStr={todayStr} onPrev={goPrev} onNext={goNext} />
        )}
        {view === 'agenda' && (
          <AgendaView events={events} todayStr={todayStr} />
        )}
      </div>

      {/* Event type legend */}
      <div style={{
        padding: '10px 28px', borderTop: `1px solid ${C.border}`,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.body, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Tipos:
        </span>
        {(Object.entries(EVENT_TYPES) as [EventType, { color: string; label: string }][]).map(([, meta]) => (
          <div key={meta.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
            <span style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.body }}>{meta.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 8 }}>
          <span style={{ fontSize: 11 }}>⚠</span>
          <span style={{ fontSize: 11, color: C.error, fontFamily: F.body }}>Conflicto</span>
        </div>
      </div>

      {/* Event creation modal */}
      {showModal && (
        <EventModal onClose={() => setShowModal(false)} onSave={handleSaveEvent} />
      )}
    </div>
  );
}

/* ── Shared styles ── */
const navBtn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
  background: C.bgRaised, border: `1px solid ${C.border}`,
  color: C.textSecondary, fontSize: 18, fontFamily: F.body, lineHeight: 1,
};

const ghostBtnSm: React.CSSProperties = {
  padding: '6px 13px', borderRadius: 7, cursor: 'pointer',
  background: 'transparent', border: `1px solid ${C.border}`,
  color: C.textSecondary, fontSize: 12, fontFamily: F.body, fontWeight: 500,
};

const primaryBtnSm: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 7, cursor: 'pointer',
  background: C.brand, border: 'none',
  color: '#fff', fontSize: 12, fontFamily: F.body, fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px',
  background: C.bgBase, border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.textPrimary, fontSize: 13, fontFamily: F.body,
  outline: 'none', boxSizing: 'border-box',
};
