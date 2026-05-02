import React, { useState, useEffect } from 'react';
import {
  X, CheckCircle2, Search, Home, Clock, BarChart2, FileText, Navigation, Shield,
  ChevronDown, RefreshCw, Sparkles, Check, Edit3, Download,
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

/* ─── Wizard state types ─────────────────────────────────────── */

type Step = 1 | 2 | 3 | 4 | 5;

interface WizardData {
  selectedPropertyIdx: number | null;
  selectedPurpose:     string;
  selectedCondition:   string;
}

/* ─── Step definitions ───────────────────────────────────────── */

const STEPS = [
  { n: 1, label: 'Propiedad'   },
  { n: 2, label: 'Finalidad'   },
  { n: 3, label: 'Comparables' },
  { n: 4, label: 'Narrativa IA'},
  { n: 5, label: 'Vista previa'},
] as const;

/* ──────────────────────────────────────────────────────────────
   STEPPER
   ────────────────────────────────────────────────────────────── */

function Stepper({ current }: { current: Step }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: C.bgRaised, borderBottom: `1px solid ${C.border}`,
      padding: '14px 40px', position: 'sticky', top: 56, zIndex: 10,
    }}>
      {STEPS.map((step, idx) => {
        const done   = step.n < current;
        const active = step.n === current;
        const last   = idx === STEPS.length - 1;
        return (
          <React.Fragment key={step.n}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 80 }}>
              {/* Circle */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${done ? C.success : active ? C.brand : C.border}`,
                background: done ? C.success : active ? C.brand : 'transparent',
                color: done || active ? '#fff' : C.textTertiary,
                fontFamily: F.mono, fontSize: 12, fontWeight: 700,
                transition: 'all 0.25s',
                flexShrink: 0,
              }}>
                {done ? <CheckCircle2 size={14} /> : step.n}
              </div>
              {/* Label */}
              <span style={{
                fontFamily: F.body, fontSize: 11,
                color: active ? C.textPrimary : done ? C.textSecondary : C.textTertiary,
                fontWeight: active ? 600 : 400, whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>

            {!last && (
              <div style={{
                flex: 1, height: 2, marginBottom: 20, minWidth: 24,
                background: done ? C.success : C.bgElevated,
                transition: 'background 0.3s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   STEP 1 — Seleccionar propiedad
   ────────────────────────────────────────────────────────────── */

const PROPERTIES = [
  { id: 'PRO-1234', address: 'Serrano 2450 PB',              type: 'Departamento', rooms: '3 amb.', sqm: '78m²'  },
  { id: 'PRO-0892', address: 'Av. Santa Fe 2180 9°A',        type: 'Departamento', rooms: '2 amb.', sqm: '55m²'  },
  { id: 'PRO-0567', address: 'Palermo SoHo, Thames 1680 PH', type: 'PH',           rooms: '4 amb.', sqm: '120m²' },
  { id: 'PRO-1109', address: "Belgrano R, O'Higgins 2340",   type: 'Casa',         rooms: '5 amb.', sqm: '280m²' },
];

function Step1Property({
  selectedIdx,
  onSelect,
  onNext,
}: {
  selectedIdx: number | null;
  onSelect: (i: number) => void;
  onNext: () => void;
}) {
  const [query, setQuery]           = useState('');
  const [showManual, setShowManual] = useState(false);

  const visible = !query
    ? PROPERTIES
    : PROPERTIES.filter(p =>
        p.address.toLowerCase().includes(query.toLowerCase()) ||
        p.id.includes(query.toUpperCase()),
      );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 0 60px' }}>
      <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, color: C.textPrimary, margin: '0 0 6px' }}>
        ¿A qué propiedad pertenece esta tasación?
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: '0 0 28px' }}>
        Buscá la propiedad en tu cartera o ingresá una dirección manual.
      </p>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: C.textTertiary, pointerEvents: 'none',
        }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por dirección, ID o código interno…"
          style={{
            width: '100%', boxSizing: 'border-box',
            height: 48, paddingLeft: 44, paddingRight: 16,
            background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 10,
            color: C.textPrimary, fontFamily: F.body, fontSize: 14, outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = C.brand)}
          onBlur={e => (e.target.style.borderColor = C.border)}
        />
      </div>

      {/* Property list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {visible.map((prop, i) => {
          const actualIdx = PROPERTIES.indexOf(prop);
          const sel = selectedIdx === actualIdx;
          return (
            <button
              key={prop.id}
              onClick={() => onSelect(actualIdx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: sel ? C.brandFaint : C.bgRaised,
                border: sel ? `1px solid ${C.brand}` : `1px solid ${C.border}`,
                borderLeft: sel ? `3px solid ${C.brand}` : `1px solid ${C.border}`,
                borderRadius: 10, padding: '12px 16px',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                width: '100%',
              }}
              onMouseEnter={e => { if (!sel) e.currentTarget.style.background = C.bgElevated; }}
              onMouseLeave={e => { if (!sel) e.currentTarget.style.background = C.bgRaised; }}
            >
              {/* Thumbnail */}
              <div style={{
                width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                background: C.bgElevated, border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Home size={20} color={sel ? C.brand : C.textTertiary} />
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>
                  {prop.address}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>{prop.type}</span>
                  <span style={{ color: C.border }}>·</span>
                  <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>{prop.rooms}</span>
                  <span style={{ color: C.border }}>·</span>
                  <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>{prop.sqm}</span>
                  <span style={{
                    fontFamily: F.mono, fontSize: 10, color: C.textTertiary,
                    background: C.bgElevated, border: `1px solid ${C.border}`,
                    borderRadius: 4, padding: '1px 6px',
                  }}>
                    {prop.id}
                  </span>
                </div>
              </div>

              {/* Selected check */}
              {sel && <CheckCircle2 size={18} color={C.brand} style={{ flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {/* Manual toggle */}
      <button
        onClick={() => setShowManual(v => !v)}
        style={{
          background: 'none', border: 'none', padding: 0,
          color: C.brand, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          textDecoration: 'underline', marginBottom: showManual ? 16 : 32,
          display: 'block',
        }}
      >
        {showManual ? '↑ Cancelar dirección manual' : 'O ingresá dirección manualmente'}
      </button>

      {showManual && (
        <div style={{
          background: C.bgRaised, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: 20, marginBottom: 32,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
        }}>
          {['Calle y número', 'Piso / Depto', 'Barrio', 'Ciudad'].map(lbl => (
            <FieldInput key={lbl} label={lbl} />
          ))}
        </div>
      )}

      {/* Bottom nav */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PrimaryBtn
          label="Continuar →"
          onClick={onNext}
          disabled={selectedIdx === null && !showManual}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   STEP 2 — Finalidad
   ────────────────────────────────────────────────────────────── */

const PURPOSES = [
  { key: 'Venta',             desc: 'Estimación de precio de venta',       Icon: Home,       iconBg: C.brand         },
  { key: 'Alquiler',          desc: 'Determinación de precio de alquiler',  Icon: Clock,      iconBg: C.warning       },
  { key: 'Garantía',          desc: 'Valuación para garantía bancaria',     Icon: Shield,     iconBg: C.success       },
  { key: 'Refinanciación',    desc: 'Tasación para refinanciamiento',       Icon: BarChart2,  iconBg: C.brand         },
  { key: 'Herencia',          desc: 'Valuación de bienes sucesorios',       Icon: FileText,   iconBg: C.textTertiary  },
  { key: 'Alquiler temporal', desc: 'Estimación de renta por temporada',    Icon: Navigation, iconBg: C.ai            },
] as const;

const CONDITIONS = ['Excelente', 'Bueno', 'Regular', 'A refaccionar'] as const;

function Step2Purpose({
  selectedPurpose,
  selectedCondition,
  onPurpose,
  onCondition,
  onNext,
  onBack,
}: {
  selectedPurpose:   string;
  selectedCondition: string;
  onPurpose:   (v: string) => void;
  onCondition: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 0 60px' }}>
      <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, color: C.textPrimary, margin: '0 0 6px' }}>
        ¿Para qué es esta tasación?
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: '0 0 28px' }}>
        Seleccioná la finalidad para ajustar el análisis de mercado.
      </p>

      {/* Purpose cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 32 }}>
        {PURPOSES.map(({ key, desc, Icon, iconBg }) => {
          const sel = selectedPurpose === key;
          return (
            <button
              key={key}
              onClick={() => onPurpose(key)}
              style={{
                position: 'relative', textAlign: 'left',
                background: sel ? C.brandFaint : C.bgRaised,
                border: `${sel ? 2 : 1}px solid ${sel ? C.brand : C.border}`,
                borderRadius: 12, padding: 16,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!sel) e.currentTarget.style.background = C.bgElevated; }}
              onMouseLeave={e => { if (!sel) e.currentTarget.style.background = C.bgRaised; }}
            >
              {/* Check corner */}
              {sel && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 18, height: 18, borderRadius: '50%',
                  background: C.brand,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={11} color="#fff" />
                </div>
              )}

              {/* Icon box */}
              <div style={{
                width: 32, height: 32, borderRadius: 7, marginBottom: 10,
                background: `${iconBg}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon
                  size={16}
                  color={iconBg === C.textTertiary ? C.textSecondary : iconBg}
                />
              </div>

              <div style={{
                fontFamily: F.body, fontSize: 14, fontWeight: 600,
                color: sel ? C.textPrimary : C.textSecondary, marginBottom: 3,
              }}>
                {key}
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, lineHeight: 1.4 }}>
                {desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Condition segmented control */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, display: 'block', marginBottom: 10 }}>
          Condición del inmueble
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {CONDITIONS.map(c => (
            <button
              key={c}
              onClick={() => onCondition(c)}
              style={{
                flex: 1, padding: '9px 0',
                border: `1px solid ${selectedCondition === c ? C.brand : C.border}`,
                borderRadius: 8,
                background: selectedCondition === c ? C.brandFaint : C.bgRaised,
                color: selectedCondition === c ? C.brand : C.textSecondary,
                fontFamily: F.body, fontSize: 13,
                fontWeight: selectedCondition === c ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Optional notes */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, display: 'block', marginBottom: 8 }}>
          Observaciones adicionales (opcional)
        </label>
        <textarea
          placeholder="Ej: propiedad con amenities, vista al río, reforma reciente…"
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '12px 14px',
            background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.textPrimary, fontFamily: F.body, fontSize: 13,
            resize: 'vertical', outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = C.brand)}
          onBlur={e => (e.target.style.borderColor = C.border)}
        />
      </div>

      {/* Required date */}
      <div style={{ marginBottom: 36 }}>
        <label style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, display: 'block', marginBottom: 8 }}>
          Fecha requerida
        </label>
        <input
          type="date"
          style={{
            padding: '9px 14px', background: C.bgRaised,
            border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.textPrimary, fontFamily: F.body, fontSize: 13,
            outline: 'none', colorScheme: 'dark',
          }}
          onFocus={e => (e.target.style.borderColor = C.brand)}
          onBlur={e => (e.target.style.borderColor = C.border)}
        />
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!selectedPurpose} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   STEP 3 — Comparables
   ────────────────────────────────────────────────────────────── */

const COMPS_DATA = [
  { addr: 'Serrano 2380, CABA',     type: 'Dpto 3am',  sqm: 75, priceM2: 2400, total: 180000, dist: '1.2km', dom: '45 días en mercado' },
  { addr: 'Armenia 1640, CABA',     type: 'Dpto 3am',  sqm: 80, priceM2: 2350, total: 188000, dist: '1.5km', dom: '32 días en mercado' },
  { addr: 'Lavalleja 1240, CABA',   type: 'Dpto 3am',  sqm: 72, priceM2: 2600, total: 187200, dist: '1.8km', dom: '67 días en mercado' },
  { addr: 'Thames 1490, CABA',      type: 'Dpto 3am',  sqm: 78, priceM2: 2480, total: 193440, dist: '2.0km', dom: '18 días en mercado' },
  { addr: 'Niceto Vega 4560, CABA', type: 'Dpto 2am+', sqm: 68, priceM2: 2200, total: 149600, dist: '2.4km', dom: '90 días en mercado' },
];

const MAP_PINS = [
  { x: 53, y: 34 },
  { x: 41, y: 56 },
  { x: 61, y: 59 },
  { x: 44, y: 34 },
  { x: 63, y: 43 },
];

function MapMockup({ selectedComps, radius }: { selectedComps: Set<number>; radius: string }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(160deg, #070F20 0%, #0A1628 40%, #091524 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* SVG layer */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {/* City block grid */}
        {[12, 22, 32, 42, 52, 62, 72, 82].map(y => (
          <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="#1F2D48" strokeWidth="0.35" />
        ))}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(x => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="100" stroke="#1F2D48" strokeWidth="0.35" />
        ))}
        {/* Diagonal avenue */}
        <line x1="0" y1="95" x2="95" y2="0" stroke="#243552" strokeWidth="0.7" opacity="0.6" />

        {/* City blocks */}
        {([
          [10,12,10,10],[20,12,10,10],[30,12,10,10],[50,12,10,10],
          [10,22,10,10],[30,22,20,10],[60,22,10,10],
          [10,32,10,10],[20,32,20,10],[50,32,10,10],[70,32,10,10],
          [10,42,20,10],[40,42,10,10],[60,42,20,10],
          [20,52,10,10],[40,52,20,10],[70,52,10,10],
        ] as [number,number,number,number][]).map(([x,y,w,h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill="#0C1827" rx="0.3" />
        ))}

        {/* Search radius circle */}
        <circle
          cx="50" cy="45" r="23"
          fill={`${C.brand}07`}
          stroke={C.brand}
          strokeWidth="0.5"
          strokeDasharray="2 1.5"
        />

        {/* Comparable markers */}
        {MAP_PINS.map((pin, i) => {
          const sel = selectedComps.has(i);
          return (
            <g key={i}>
              {sel && (
                <circle cx={pin.x} cy={pin.y} r="6" fill={C.success} opacity="0.15" />
              )}
              <circle
                cx={pin.x} cy={pin.y} r="3.8"
                fill={sel ? C.success : C.bgElevated}
                stroke={sel ? C.success : C.border}
                strokeWidth="0.6"
              />
              <text
                x={pin.x} y={pin.y + 0.5}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="2.4" fill="#fff" fontFamily="monospace" fontWeight="bold"
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* Subject property */}
        <circle cx="50" cy="45" r="6.5" fill={C.brand} opacity="0.18" />
        <circle cx="50" cy="45" r="4" fill={C.brand} stroke="#fff" strokeWidth="0.8" />
        <text
          x="50" y="45.5"
          textAnchor="middle" dominantBaseline="middle"
          fontSize="2.5" fill="#fff" fontFamily="monospace" fontWeight="bold"
        >
          ★
        </text>

        {/* Subject label tooltip */}
        <rect x="38.5" y="37" width="23" height="5.5" rx="1.2" fill={C.brand} opacity="0.92" />
        <text
          x="50" y="40"
          textAnchor="middle" dominantBaseline="middle"
          fontSize="2.1" fill="#fff" fontFamily="sans-serif" fontWeight="600"
        >
          Serrano 2450
        </text>
      </svg>

      {/* Map controls top-right */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {['+', '−'].map(ctrl => (
          <button key={ctrl} style={{
            width: 32, height: 32, background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 6, color: C.textSecondary, fontFamily: F.mono, fontSize: 17,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {ctrl}
          </button>
        ))}
      </div>

      {/* Radius tag */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        background: `${C.bgRaised}cc`, border: `1px solid ${C.border}`,
        borderRadius: 6, padding: '4px 10px',
        fontFamily: F.mono, fontSize: 11, color: C.textTertiary,
        backdropFilter: 'blur(4px)',
      }}>
        Radio: {radius}
      </div>

      {/* Scale bar */}
      <div style={{
        position: 'absolute', bottom: 64, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
        <div style={{
          width: 64, height: 3, background: `${C.textTertiary}66`,
          borderRadius: 1, position: 'relative',
        }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 5,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textTertiary }}>0</span>
            <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textTertiary }}>500m</span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        position: 'absolute', bottom: 56, left: 0, right: 0,
        textAlign: 'center', fontFamily: F.body, fontSize: 11, color: C.textTertiary,
      }}>
        Mapa simulado — se integrará con MapLibre GL
      </div>
    </div>
  );
}

function Step3Comparables({
  selectedComps,
  onToggleComp,
  onNext,
  onBack,
}: {
  selectedComps:  Set<number>;
  onToggleComp:   (i: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [radius, setRadius] = useState('2km');
  const RADII = ['500m', '1km', '2km', '5km'];

  const selArr = Array.from(selectedComps);
  const avgPriceM2 = selArr.length > 0
    ? Math.round(selArr.reduce((s, i) => s + (COMPS_DATA[i]?.priceM2 ?? 0), 0) / selArr.length)
    : null;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 129px)', minHeight: 500 }}>
      {/* ── Left panel ── */}
      <div style={{
        width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${C.border}`, background: C.bgBase,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 18px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              Comparables
            </h3>
            <span style={{
              fontFamily: F.mono, fontSize: 12, fontWeight: 700,
              background: C.brandFaint, color: C.brand,
              borderRadius: 99, padding: '2px 10px',
            }}>
              {selectedComps.size}/5
            </span>
          </div>

          {/* Filter row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <select
                value={radius}
                onChange={e => setRadius(e.target.value)}
                style={{
                  appearance: 'none', WebkitAppearance: 'none', width: '100%',
                  background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 7,
                  padding: '7px 28px 7px 10px', color: C.textPrimary,
                  fontFamily: F.body, fontSize: 12, cursor: 'pointer', outline: 'none',
                }}
              >
                {RADII.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown size={11} style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                color: C.textTertiary, pointerEvents: 'none',
              }} />
            </div>
            <button style={{
              padding: '7px 12px', background: C.bgRaised, border: `1px solid ${C.border}`,
              borderRadius: 7, color: C.textSecondary, fontFamily: F.body, fontSize: 12, cursor: 'pointer',
            }}>
              Tipo
            </button>
            <button style={{
              padding: '7px 12px', background: C.bgRaised, border: `1px solid ${C.border}`,
              borderRadius: 7, color: C.textSecondary, fontFamily: F.body, fontSize: 12, cursor: 'pointer',
            }}>
              Filtros
            </button>
          </div>
        </div>

        {/* Comp list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {COMPS_DATA.map((comp, i) => {
            const sel = selectedComps.has(i);
            return (
              <button
                key={i}
                onClick={() => onToggleComp(i)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  width: '100%', textAlign: 'left',
                  background: sel ? C.successFaint : C.bgRaised,
                  border: `1px solid ${sel ? C.success : C.border}`,
                  borderRadius: 10, padding: 12, marginBottom: 8,
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = C.bgElevated; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = C.bgRaised; }}
              >
                {/* Checkbox */}
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
                  border: `2px solid ${sel ? C.success : C.border}`,
                  background: sel ? C.success : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {sel && <Check size={10} color="#fff" />}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 2 }}>
                    {comp.addr}
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: C.textSecondary, marginBottom: 6 }}>
                    {comp.type} · {comp.sqm}m²
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: C.success }}>
                      ${comp.priceM2.toLocaleString('es-AR')}/m²
                    </span>
                    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
                      USD {comp.total.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>{comp.dist}</span>
                    <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>{comp.dom}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Summary footer */}
        {avgPriceM2 !== null && (
          <div style={{
            padding: '14px 18px', borderTop: `1px solid ${C.border}`,
            background: C.bgRaised,
          }}>
            <div style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>
              Promedio $/m² · {selectedComps.size} comparables
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 18, fontWeight: 700, color: C.success }}>
              ${avgPriceM2.toLocaleString('es-AR')}/m²
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel: map ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MapMockup selectedComps={selectedComps} radius={radius} />

        {/* Bottom nav bar over map */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 24px', borderTop: `1px solid ${C.border}`,
          background: `${C.bgBase}f0`, backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <GhostBtn label="← Anterior" onClick={onBack} />
          <PrimaryBtn
            label="Continuar →"
            onClick={onNext}
            disabled={selectedComps.size < 2}
          />
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   STEP 4 — Narrativa IA
   ────────────────────────────────────────────────────────────── */

const AI_NARRATIVE = `La propiedad ubicada en Serrano 2450, Planta Baja, en el barrio de Palermo, Ciudad Autónoma de Buenos Aires, presenta características acordes al segmento residencial medio-alto del sector.

Se analizaron 2 propiedades comparables en un radio de 2km, con superficies entre 72 y 80m² y antigüedades similares. El precio promedio de mercado del segmento es de USD 2,375/m².

En función del análisis de mercado y el estado del inmueble, se estima un valor de mercado de USD 280,000 – 295,000, con un valor central de USD 285,000.`;

function Step4Narrative({
  onNext, onBack,
}: { onNext: () => void; onBack: () => void }) {
  const [aiGenerating, setAiGenerating]    = useState(true);
  const [aiGenerated, setAiGenerated]      = useState(false);
  const [isEditingNarrative, setIsEditing] = useState(false);
  const [narrative, setNarrative]          = useState(AI_NARRATIVE);
  const [progress, setProgress]            = useState(0);
  const [dots, setDots]                    = useState('·');

  // Simulate generation on mount
  useEffect(() => {
    let p = 0;
    const progressInterval = setInterval(() => {
      p += Math.random() * 15 + 3;
      const capped = Math.min(p, 95);
      setProgress(capped);
      if (capped >= 95) {
        clearInterval(progressInterval);
        setTimeout(() => {
          setProgress(100);
          setAiGenerating(false);
          setAiGenerated(true);
        }, 400);
      }
    }, 130);

    const dotsInterval = setInterval(() => {
      setDots(d => d.length >= 3 ? '·' : d + '·');
    }, 500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  const regenerate = () => {
    setAiGenerating(true);
    setAiGenerated(false);
    setIsEditing(false);
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 18 + 3;
      const capped = Math.min(p, 95);
      setProgress(capped);
      if (capped >= 95) {
        clearInterval(interval);
        setTimeout(() => {
          setProgress(100);
          setNarrative(AI_NARRATIVE);
          setAiGenerating(false);
          setAiGenerated(true);
        }, 400);
      }
    }, 110);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 28, alignItems: 'start' }}>

        {/* ── Left: property summary ── */}
        <div>
          <h3 style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: '0 0 14px' }}>
            Resumen de la propiedad
          </h3>

          {/* Summary card */}
          <div style={{
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '4px 16px', marginBottom: 16,
          }}>
            {[
              { label: 'Dirección',  value: 'Serrano 2450 PB, Palermo' },
              { label: 'Tipo',       value: 'Departamento 3 amb.'       },
              { label: 'Superficie', value: '78m² / 65m² cubiertos'     },
              { label: 'Piso',       value: 'PB (Planta baja)'          },
              { label: 'Antigüedad', value: '12 años'                   },
              { label: 'Condición',  value: 'Bueno'                     },
              { label: 'Finalidad',  value: 'Venta'                     },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                  padding: '8px 0',
                }}
              >
                <span style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary }}>{row.label}</span>
                <span style={{ fontFamily: F.body, fontSize: 12, color: C.textPrimary, fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Comparables used */}
          <div style={{
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '4px 16px', marginBottom: 16,
          }}>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              2 comparables seleccionados
            </div>
            {[
              { addr: 'Serrano 2380, CABA', pm2: '$2,400/m²' },
              { addr: 'Armenia 1640, CABA', pm2: '$2,350/m²' },
            ].map((c, i, arr) => (
              <div
                key={c.addr}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                }}
              >
                <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>{c.addr}</span>
                <span style={{ fontFamily: F.mono, fontSize: 12, color: C.success, fontWeight: 700 }}>{c.pm2}</span>
              </div>
            ))}
          </div>

          {/* Notes placeholder */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, display: 'block', marginBottom: 6 }}>
              Observaciones
            </label>
            <textarea
              placeholder="Sin observaciones adicionales"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.textTertiary, fontFamily: F.body, fontSize: 12,
                resize: 'none', outline: 'none',
              }}
            />
          </div>

          {/* Regenerar */}
          <button
            onClick={regenerate}
            disabled={aiGenerating}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              width: '100%', padding: '9px 0',
              background: 'transparent', border: `1px solid ${C.ai}50`,
              borderRadius: 8, color: C.aiLight,
              fontFamily: F.body, fontSize: 13, cursor: aiGenerating ? 'wait' : 'pointer',
              opacity: aiGenerating ? 0.6 : 1, transition: 'opacity 0.15s',
            }}
          >
            <RefreshCw size={13} />
            <Sparkles size={13} />
            Regenerar narrativa
          </button>
        </div>

        {/* ── Right: AI narrative ── */}
        <div>
          <h3 style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: '0 0 14px' }}>
            Narrativa generada por IA
          </h3>

          {/* Loading */}
          {aiGenerating && (
            <div style={{
              background: C.bgRaised, border: `1px solid ${C.ai}30`,
              borderRadius: 10, padding: 20,
            }}>
              <div style={{ height: 3, background: C.bgElevated, borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{
                  height: '100%', background: C.ai, borderRadius: 2,
                  width: `${progress}%`, transition: 'width 0.2s linear',
                }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Sparkles size={14} color={C.ai} />
                <span style={{ fontFamily: F.body, fontSize: 13, color: C.ai }}>
                  Generando narrativa{dots}
                </span>
              </div>
              {/* Skeleton lines */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[92, 78, 95, 58, 82, 70, 88].map((w, i) => (
                  <div key={i} style={{
                    height: 9, borderRadius: 4,
                    background: `${C.ai}15`, width: `${w}%`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Generated content */}
          {aiGenerated && !aiGenerating && (
            <>
              {/* AI header bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                background: C.aiFaint, border: `1px solid ${C.ai}30`,
                borderBottom: 'none', borderRadius: '10px 10px 0 0',
              }}>
                <Sparkles size={13} color={C.ai} />
                <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.aiLight, flex: 1 }}>
                  Generado por IA · Corredor Copilot
                </span>
                <button
                  onClick={() => setIsEditing(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: `1px solid ${C.ai}40`,
                    borderRadius: 6, padding: '4px 10px',
                    color: C.aiLight, fontFamily: F.body, fontSize: 11, cursor: 'pointer',
                  }}
                >
                  <Edit3 size={11} />
                  {isEditingNarrative ? 'Cerrar edición' : 'Editar'}
                </button>
              </div>

              {/* Narrative */}
              {isEditingNarrative ? (
                <textarea
                  value={narrative}
                  onChange={e => setNarrative(e.target.value)}
                  rows={9}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '16px',
                    background: C.bgRaised, border: `1px solid ${C.ai}40`,
                    borderTop: 'none', borderRadius: '0 0 10px 10px',
                    color: C.textPrimary, fontFamily: F.body, fontSize: 13,
                    lineHeight: 1.7, resize: 'vertical', outline: 'none',
                  }}
                />
              ) : (
                <div style={{
                  background: C.aiFaint, border: `1px solid ${C.ai}30`,
                  borderTop: 'none', borderLeft: `4px solid ${C.ai}`,
                  borderRadius: '0 0 10px 10px', padding: '16px 20px',
                  fontFamily: F.body, fontSize: 13, color: C.textSecondary,
                  lineHeight: 1.75, whiteSpace: 'pre-line',
                }}>
                  {narrative}
                </div>
              )}

              {/* Estimated value */}
              <div style={{
                marginTop: 20, padding: '18px 20px',
                background: C.bgRaised, border: `1px solid ${C.border}`,
                borderRadius: 10,
              }}>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginBottom: 5 }}>
                  Valor estimado
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 32, fontWeight: 700, color: C.textPrimary, lineHeight: 1, marginBottom: 7 }}>
                  USD 285,000
                </div>
                <div style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary }}>
                  Rango: USD 280,000 – USD 295,000
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Nav */}
      <div style={{ marginTop: 36, display: 'flex', justifyContent: 'space-between' }}>
        <GhostBtn label="← Anterior" onClick={onBack} />
        <PrimaryBtn label="Continuar →" onClick={onNext} disabled={!aiGenerated} />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   STEP 5 — Vista previa PDF
   ────────────────────────────────────────────────────────────── */

function Step5Preview({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 0 80px' }}>
      <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, color: C.textPrimary, margin: '0 0 6px' }}>
        Vista previa del informe
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: '0 0 24px' }}>
        Revisá el documento antes de guardarlo o descargarlo.
      </p>

      {/* PDF frame — A4 ratio 1:1.414 */}
      <div style={{
        background: '#FFFFFF', maxWidth: 680, margin: '0 auto',
        borderRadius: 4, overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.25), 0 20px 52px rgba(0,0,0,0.6)',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex', flexDirection: 'column',
        color: '#1a1a1a',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 28px 16px', borderBottom: '2px solid #1654d9',
        }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: '#1654d9', letterSpacing: '-0.03em' }}>
              CORREDOR
            </div>
            <div style={{ fontSize: 10, color: '#8096B5', marginTop: 1 }}>
              Tasaciones Inmobiliarias
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2C3E50', letterSpacing: '0.04em' }}>
              TASACIÓN INMOBILIARIA
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#8096B5', marginTop: 3 }}>
              TAS-0049 · 01/05/2026
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 28px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* PROPIEDAD */}
          <section>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#8096B5', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, paddingBottom: 5, borderBottom: '1px solid #E2E8F0' }}>
              PROPIEDAD
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
              {[
                ['Dirección',  'Serrano 2450 PB, Palermo, CABA'],
                ['Tipo',       'Departamento 3 ambientes'],
                ['Superficie', '78m² / 65m² cubiertos'],
                ['Finalidad',  'Venta'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                  <span style={{ color: '#8096B5', minWidth: 68, fontFamily: "'DM Mono', monospace", fontSize: 10, flexShrink: 0 }}>{k}:</span>
                  <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </section>

          {/* VALOR ESTIMADO */}
          <div style={{
            background: '#EEF4FF', borderLeft: '4px solid #1654d9',
            borderRadius: '0 6px 6px 0', padding: '14px 18px',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#8096B5', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
              VALOR ESTIMADO
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 30, fontWeight: 700, color: '#1654d9', lineHeight: 1 }}>
              USD 285,000
            </div>
            <div style={{ fontSize: 12, color: '#4A6490', marginTop: 6 }}>
              Rango: USD 280,000 – USD 295,000
            </div>
          </div>

          {/* COMPARABLES */}
          <section>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#8096B5', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, paddingBottom: 5, borderBottom: '1px solid #E2E8F0' }}>
              COMPARABLES
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#F7F9FC' }}>
                  {['Dirección', 'm²', '$/m²', 'Precio total'].map(h => (
                    <th key={h} style={{
                      padding: '5px 8px', textAlign: 'left',
                      color: '#8096B5', fontWeight: 600, fontSize: 9,
                      letterSpacing: '0.07em', textTransform: 'uppercase',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Serrano 2380, CABA', '75', '2,400', 'USD 180,000'],
                  ['Armenia 1640, CABA', '80', '2,350', 'USD 188,000'],
                ].map(([addr, m2, pm2, price]) => (
                  <tr key={addr} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '6px 8px', color: '#1a1a1a' }}>{addr}</td>
                    <td style={{ padding: '6px 8px', fontFamily: "'DM Mono', monospace", color: '#4A6490' }}>{m2}</td>
                    <td style={{ padding: '6px 8px', fontFamily: "'DM Mono', monospace", color: '#1654d9', fontWeight: 600 }}>{pm2}</td>
                    <td style={{ padding: '6px 8px', fontFamily: "'DM Mono', monospace", color: '#1a1a1a', fontWeight: 600 }}>{price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* NARRATIVA */}
          <section>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#8096B5', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, paddingBottom: 5, borderBottom: '1px solid #E2E8F0' }}>
              NARRATIVA
            </div>
            <p style={{ fontSize: 11, color: '#2D3748', lineHeight: 1.7, margin: 0 }}>
              La propiedad ubicada en Serrano 2450, Planta Baja, en el barrio de Palermo, Ciudad Autónoma de Buenos Aires, presenta características acordes al segmento residencial medio-alto del sector. Se analizaron 2 propiedades comparables en un radio de 2km, con superficies entre 72 y 80m²...
            </p>
          </section>

          {/* Signature block */}
          <div style={{ paddingTop: 14, borderTop: '1px solid #E2E8F0', marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, fontSize: 11, color: '#4A6490' }}>
              <div>
                <div style={{ marginBottom: 28, color: '#1a1a1a', fontWeight: 500 }}>Tasador: _______________________</div>
                <div style={{ borderBottom: '1px solid #C4CFD9', marginBottom: 4 }} />
                <div>Firma</div>
              </div>
              <div>
                <div style={{ marginBottom: 28, color: '#1a1a1a', fontWeight: 500 }}>Matrícula: _____________________</div>
                <div style={{ borderBottom: '1px solid #C4CFD9', marginBottom: 4 }} />
                <div>Sello</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <GhostBtn label="← Anterior" onClick={onBack} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '10px 18px',
            color: C.textSecondary, fontFamily: F.body, fontSize: 14, cursor: 'pointer',
          }}>
            Guardar borrador
          </button>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: C.brand, border: 'none', borderRadius: 8, padding: '10px 20px',
            color: '#fff', fontFamily: F.body, fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>
            <Download size={15} />
            Descargar PDF
          </button>
        </div>
      </div>
      <div style={{ textAlign: 'right', marginTop: 12 }}>
        <button style={{
          background: 'none', border: 'none',
          color: C.textTertiary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          textDecoration: 'underline',
        }}>
          Finalizar y cerrar
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SHARED UI HELPERS
   ────────────────────────────────────────────────────────────── */

function FieldInput({ label }: { label: string }) {
  return (
    <div>
      <label style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      <input
        style={{
          width: '100%', boxSizing: 'border-box', padding: '9px 12px',
          background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 7,
          color: C.textPrimary, fontFamily: F.body, fontSize: 13, outline: 'none',
        }}
        onFocus={e => (e.target.style.borderColor = C.brand)}
        onBlur={e => (e.target.style.borderColor = C.border)}
      />
    </div>
  );
}

function PrimaryBtn({
  label, onClick, disabled = false,
}: { label: string; onClick: () => void; disabled?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: disabled ? C.bgElevated : hov ? C.brandHover : C.brand,
        color: disabled ? C.textTertiary : '#fff',
        border: 'none', borderRadius: 8, padding: '10px 22px',
        fontFamily: F.body, fontWeight: 600, fontSize: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

function GhostBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'transparent', border: `1px solid ${C.border}`,
        borderRadius: 8, padding: '10px 18px',
        color: hov ? C.textPrimary : C.textSecondary,
        fontFamily: F.body, fontSize: 14, cursor: 'pointer',
        transition: 'color 0.12s',
      }}
    >
      {label}
    </button>
  );
}

function StepNav({
  onBack, onNext, nextDisabled = false,
}: { onBack: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <GhostBtn label="← Anterior" onClick={onBack} />
      <PrimaryBtn label="Continuar →" onClick={onNext} disabled={nextDisabled} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   ROOT WIZARD COMPONENT
   ────────────────────────────────────────────────────────────── */

export default function AppraisalWizardPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  const [wizardData, setWizardData] = useState<WizardData>({
    selectedPropertyIdx: 0,   // first property pre-selected
    selectedPurpose:    'Venta',
    selectedCondition:  'Bueno',
  });

  const [selectedComps, setSelectedComps] = useState<Set<number>>(new Set([0, 1]));

  const next = () => setCurrentStep(s => Math.min(s + 1, 5) as Step);
  const back = () => setCurrentStep(s => Math.max(s - 1, 1) as Step);

  const toggleComp = (i: number) => {
    setSelectedComps(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bgBase, display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', borderBottom: `1px solid ${C.border}`,
        background: C.bgBase, position: 'sticky', top: 0, zIndex: 20, flexShrink: 0,
      }}>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none',
            color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = C.textPrimary)}
          onMouseLeave={e => (e.currentTarget.style.color = C.textSecondary)}
        >
          <X size={14} />
          Cancelar
        </button>

        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, color: C.textPrimary }}>
          Nueva tasación
        </div>

        <div style={{ fontFamily: F.mono, fontSize: 12, color: C.textTertiary }}>
          Paso{' '}
          <span style={{ color: C.textSecondary, fontWeight: 700 }}>{currentStep}</span>
          {' '}de 5
        </div>
      </div>

      {/* ── Stepper ── */}
      <Stepper current={currentStep} />

      {/* ── Step content ── */}
      <div style={{
        flex: 1,
        overflowY: currentStep === 3 ? 'hidden' : 'auto',
      }}>
        {currentStep === 1 && (
          <div style={{ padding: '0 40px' }}>
            <Step1Property
              selectedIdx={wizardData.selectedPropertyIdx}
              onSelect={i => setWizardData(d => ({ ...d, selectedPropertyIdx: i }))}
              onNext={next}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div style={{ padding: '0 40px' }}>
            <Step2Purpose
              selectedPurpose={wizardData.selectedPurpose}
              selectedCondition={wizardData.selectedCondition}
              onPurpose={v => setWizardData(d => ({ ...d, selectedPurpose: v }))}
              onCondition={v => setWizardData(d => ({ ...d, selectedCondition: v }))}
              onNext={next}
              onBack={back}
            />
          </div>
        )}

        {currentStep === 3 && (
          <Step3Comparables
            selectedComps={selectedComps}
            onToggleComp={toggleComp}
            onNext={next}
            onBack={back}
          />
        )}

        {currentStep === 4 && (
          <Step4Narrative onNext={next} onBack={back} />
        )}

        {currentStep === 5 && (
          <div style={{ padding: '0 40px' }}>
            <Step5Preview onBack={back} />
          </div>
        )}
      </div>
    </div>
  );
}
