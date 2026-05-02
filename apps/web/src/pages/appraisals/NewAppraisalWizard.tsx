import React, { useState } from 'react';
import { C, F } from '../../components/copilot/tokens.js';

/* ─── Wizard state ──────────────────────────────────────────── */

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { n: 1, label: 'Propiedad'   },
  { n: 2, label: 'Parámetros'  },
  { n: 3, label: 'Comparables' },
  { n: 4, label: 'Narrativa IA'},
  { n: 5, label: 'PDF preview' },
] as const;

/* ─── Shared step indicator ─────────────────────────────────── */

function StepBar({ current }: { current: WizardStep }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
      {STEPS.map((step, idx) => {
        const done   = step.n < current;
        const active = step.n === current;
        const last   = idx === STEPS.length - 1;
        return (
          <React.Fragment key={step.n}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 72 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: F.mono, fontSize: 13, fontWeight: 700,
                border: `2px solid ${done ? C.success : active ? C.brand : C.border}`,
                background: done ? C.success : active ? C.brandFaint : 'transparent',
                color: done ? '#fff' : active ? C.brand : C.textTertiary,
                transition: 'all 0.25s',
              }}>
                {done ? '✓' : step.n}
              </div>
              <span style={{
                fontFamily: F.body, fontSize: 11, textAlign: 'center',
                color: active ? C.textPrimary : done ? C.textSecondary : C.textTertiary,
                fontWeight: active ? 600 : 400,
              }}>
                {step.label}
              </span>
            </div>
            {!last && (
              <div style={{
                flex: 1, height: 2, marginBottom: 22,
                background: done ? C.success : C.border, transition: 'background 0.3s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Step 1: Property ──────────────────────────────────────── */

function Step1Property({ onNext }: { onNext: () => void }) {
  const [address, setAddress] = useState('Av. Santa Fe 2848, 3°B, Palermo');
  const [propType, setPropType] = useState<string>('Apartamento');
  const [surface, setSurface]  = useState('72');
  const [year, setYear]        = useState('1998');
  const [rooms, setRooms]      = useState('3');

  const PROP_TYPES = ['Apartamento', 'PH', 'Casa', 'Local', 'Oficina', 'Terreno'];

  return (
    <div>
      <h2 style={{ fontFamily: F.display, fontSize: 20, color: C.textPrimary, margin: '0 0 6px' }}>
        Datos de la propiedad
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '0 0 28px' }}>
        Completá los datos básicos del inmueble a tasar.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Field label="Dirección completa">
          <input value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Calle Número, Piso/Depto, Barrio" style={inputStyle} />
        </Field>

        <Field label="Tipo de propiedad">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PROP_TYPES.map(t => (
              <button key={t} onClick={() => setPropType(t)} style={{
                padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${propType === t ? C.brand : C.border}`,
                background: propType === t ? C.brandFaint : C.bgElevated,
                color: propType === t ? C.brand : C.textSecondary,
                fontFamily: F.body, fontSize: 13, fontWeight: propType === t ? 600 : 400,
              }}>
                {t}
              </button>
            ))}
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <Field label="Superficie cubierta (m²)">
            <input value={surface} onChange={e => setSurface(e.target.value)} style={inputStyle} type="number" />
          </Field>
          <Field label="Año de construcción">
            <input value={year} onChange={e => setYear(e.target.value)} style={inputStyle} type="number" />
          </Field>
          <Field label="Ambientes">
            <input value={rooms} onChange={e => setRooms(e.target.value)} style={inputStyle} type="number" />
          </Field>
        </div>
      </div>

      <NavButtons onNext={onNext} />
    </div>
  );
}

/* ─── Step 2: Parameters ────────────────────────────────────── */

function Step2Parameters({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [purpose, setPurpose]     = useState<string>('Venta');
  const [urgency, setUrgency]     = useState<string>('Normal');
  const [condition, setCondition] = useState<string>('Bueno');
  const [radius, setRadius]       = useState('500');

  return (
    <div>
      <h2 style={{ fontFamily: F.display, fontSize: 20, color: C.textPrimary, margin: '0 0 6px' }}>
        Propósito y parámetros
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '0 0 28px' }}>
        Definí el contexto de la tasación para mejorar la precisión del análisis.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Field label="Propósito de la tasación">
          <OptionGroup
            options={['Venta', 'Alquiler', 'Garantía bancaria', 'Sucesión', 'Otro']}
            selected={purpose}
            onSelect={setPurpose}
          />
        </Field>

        <Field label="Urgencia">
          <OptionGroup
            options={['Urgente (24h)', 'Normal (72h)', 'Sin prisa']}
            selected={urgency}
            onSelect={setUrgency}
          />
        </Field>

        <Field label="Estado general de la propiedad">
          <OptionGroup
            options={['A estrenar', 'Excelente', 'Bueno', 'Regular', 'Para refaccionar']}
            selected={condition}
            onSelect={setCondition}
          />
        </Field>

        <Field label={`Radio de búsqueda de comparables: ${radius}m`}>
          <input
            type="range" min="200" max="2000" step="100"
            value={radius} onChange={e => setRadius(e.target.value)}
            style={{ width: '100%', accentColor: C.brand }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary }}>200m</span>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary }}>2000m</span>
          </div>
        </Field>
      </div>

      <NavButtons onNext={onNext} onBack={onBack} />
    </div>
  );
}

/* ─── Step 3: Comp selection map ────────────────────────────── */

const COMPS = [
  { id: 'c1', address: 'Av. Santa Fe 3100, 2°A', dist: '148m', surface: 68, price: 138000, priceM2: 2029, selected: true  },
  { id: 'c2', address: 'Av. Santa Fe 2700, 4°C', dist: '280m', surface: 75, price: 155000, priceM2: 2067, selected: true  },
  { id: 'c3', address: 'Salguero 855, PB',        dist: '390m', surface: 70, price: 128000, priceM2: 1829, selected: false },
  { id: 'c4', address: 'Ecuador 850, 1°B',        dist: '450m', surface: 65, price: 132000, priceM2: 2031, selected: true  },
  { id: 'c5', address: 'Charcas 3400, 3°D',       dist: '520m', surface: 80, price: 168000, priceM2: 2100, selected: false },
] as const;

function Step3Comps({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [selectedComps, setSelectedComps] = useState<Set<string>>(
    new Set(COMPS.filter(c => c.selected).map(c => c.id)),
  );

  const toggleComp = (id: string) => {
    const next = new Set(selectedComps);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedComps(next);
  };

  const selCount = selectedComps.size;

  return (
    <div>
      <h2 style={{ fontFamily: F.display, fontSize: 20, color: C.textPrimary, margin: '0 0 6px' }}>
        Selección de comparables
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '0 0 24px' }}>
        Elegí las propiedades comparables a incluir en la tasación. Recomendado: 3–5 comparables.
      </p>

      {/* Map placeholder */}
      <div style={{
        height: 240, borderRadius: 12, border: `1px solid ${C.border}`,
        background: 'linear-gradient(135deg, #0A1628 0%, #0F1E38 100%)',
        position: 'relative', marginBottom: 20, overflow: 'hidden',
      }}>
        {/* Grid overlay simulating a map */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`h${i}`} style={{
            position: 'absolute', left: 0, right: 0, top: `${(i + 1) * 16.6}%`,
            borderTop: `1px solid ${C.border}40`, pointerEvents: 'none',
          }} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`v${i}`} style={{
            position: 'absolute', top: 0, bottom: 0, left: `${(i + 1) * 12.5}%`,
            borderLeft: `1px solid ${C.border}40`, pointerEvents: 'none',
          }} />
        ))}

        {/* Subject property pin */}
        <div style={{
          position: 'absolute', left: '48%', top: '45%', transform: 'translate(-50%, -50%)',
          zIndex: 3,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: C.brand, border: '3px solid #fff', boxShadow: `0 0 0 6px ${C.brandFaint}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>
            🏠
          </div>
        </div>

        {/* Radius circle */}
        <div style={{
          position: 'absolute', left: '48%', top: '45%',
          transform: 'translate(-50%, -50%)',
          width: 180, height: 180, borderRadius: '50%',
          border: `2px dashed ${C.brand}60`,
          background: `${C.brand}08`,
          pointerEvents: 'none',
        }} />

        {/* Comparable pins */}
        {[
          { id: 'c1', x: '53%', y: '38%' },
          { id: 'c2', x: '42%', y: '52%' },
          { id: 'c3', x: '56%', y: '55%' },
          { id: 'c4', x: '44%', y: '35%' },
          { id: 'c5', x: '58%', y: '42%' },
        ].map(pin => (
          <button
            key={pin.id}
            onClick={() => toggleComp(pin.id)}
            style={{
              position: 'absolute', left: pin.x, top: pin.y,
              transform: 'translate(-50%, -50%)',
              width: 28, height: 28, borderRadius: '50%',
              background: selectedComps.has(pin.id) ? C.success : C.bgElevated,
              border: `2px solid ${selectedComps.has(pin.id) ? C.success : C.border}`,
              color: '#fff', fontSize: 12, cursor: 'pointer', zIndex: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            🏘
          </button>
        ))}

        {/* Map attribution */}
        <div style={{
          position: 'absolute', bottom: 8, right: 10,
          fontFamily: F.mono, fontSize: 9, color: C.textTertiary,
        }}>
          Mapa de comparables · 500m radio
        </div>
      </div>

      {/* Comparables table */}
      <div style={{ background: C.bgRaised, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 60px 80px 100px 100px 60px',
          padding: '8px 16px', borderBottom: `1px solid ${C.border}`, background: C.bgBase,
        }}>
          {['Dirección', 'Dist.', 'Sup. m²', 'Precio', 'USD/m²', ''].map(h => (
            <span key={h} style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>
        {COMPS.map((comp, idx) => {
          const isSel = selectedComps.has(comp.id);
          return (
            <div key={comp.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 60px 80px 100px 100px 60px',
              padding: '11px 16px', alignItems: 'center',
              borderBottom: idx < COMPS.length - 1 ? `1px solid ${C.border}` : 'none',
              background: isSel ? C.successFaint : idx % 2 === 0 ? C.bgRaised : C.bgBase,
              opacity: isSel ? 1 : 0.6, transition: 'all 0.15s',
            }}>
              <span style={{ fontFamily: F.body, fontSize: 12, color: C.textPrimary }}>{comp.address}</span>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary }}>{comp.dist}</span>
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{comp.surface} m²</span>
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
                USD {comp.price.toLocaleString('es-AR')}
              </span>
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
                USD {comp.priceM2.toLocaleString('es-AR')}
              </span>
              <button onClick={() => toggleComp(comp.id)} style={{
                padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                border: `1px solid ${isSel ? C.success : C.border}`,
                background: isSel ? C.successFaint : 'transparent',
                color: isSel ? C.success : C.textTertiary, fontFamily: F.body,
              }}>
                {isSel ? '✓' : '+'}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, margin: '0 0 20px' }}>
        {selCount} comparable{selCount !== 1 ? 's' : ''} seleccionado{selCount !== 1 ? 's' : ''}
        {selCount < 3 && <span style={{ color: C.warning }}> · Se recomiendan al menos 3</span>}
      </p>

      <NavButtons onNext={onNext} onBack={onBack} nextLabel="Generar narrativa IA →" />
    </div>
  );
}

/* ─── Step 4: AI Narrative ──────────────────────────────────── */

const SAMPLE_NARRATIVE = `La propiedad ubicada en Av. Santa Fe 2848, 3°B, Palermo corresponde a un departamento de 3 ambientes con 72 m² cubiertos, construido en 1998 y en buen estado de conservación.

**Análisis de mercado:** El análisis comparativo de 3 propiedades similares en un radio de 500 metros arroja un valor de mercado estimado de **USD 138,000 – USD 145,000**, con un precio por m² de USD 1,917 – USD 2,014.

**Justificación:** El rango es consistente con los comparables seleccionados (promedio USD 2,042/m²) con ajuste por antigüedad (-5%), ubicación respecto a av. principal (+3%) y estado de conservación (neutro).

**Recomendación:** Para venta inmediata, precio de publicación de **USD 140,000**. Para optimizar el resultado, considerar un precio de lista de USD 145,000 con margen de negociación del 3%.`;

function Step4Narrative({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [narrative, setNarrative] = useState(SAMPLE_NARRATIVE);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated]   = useState(true);

  const regenerate = () => {
    setGenerating(true);
    setGenerated(false);
    setNarrative('');
    setTimeout(() => {
      setNarrative(SAMPLE_NARRATIVE);
      setGenerating(false);
      setGenerated(true);
    }, 2000);
  };

  return (
    <div>
      <h2 style={{ fontFamily: F.display, fontSize: 20, color: C.textPrimary, margin: '0 0 6px' }}>
        Narrativa IA + revisión
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '0 0 24px' }}>
        El copilot generó un informe narrativo basado en la propiedad y los comparables. Podés editar el texto antes de generar el PDF.
      </p>

      {/* AI header bar */}
      <div style={{
        padding: '10px 16px', borderRadius: '10px 10px 0 0',
        background: C.aiFaint, border: `1px solid ${C.ai}30`,
        borderBottom: 'none', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ color: C.ai, fontSize: 16 }}>✦</span>
        <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.aiLight }}>
          Narrativa generada por Copilot IA
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={regenerate} style={{
            padding: '4px 12px', borderRadius: 6, border: `1px solid ${C.ai}40`,
            background: 'transparent', color: C.aiLight, fontFamily: F.body, fontSize: 12, cursor: 'pointer',
          }}>
            {generating ? '⟳ Regenerando…' : '⟳ Regenerar'}
          </button>
        </span>
      </div>

      <textarea
        value={narrative}
        onChange={e => setNarrative(e.target.value)}
        rows={14}
        style={{
          width: '100%', padding: '16px 18px', boxSizing: 'border-box',
          borderRadius: '0 0 10px 10px',
          border: `1px solid ${C.ai}30`,
          background: C.bgBase, color: C.textPrimary,
          fontFamily: F.body, fontSize: 13, lineHeight: 1.7, outline: 'none',
          resize: 'vertical',
        }}
      />

      {/* Value estimate summary */}
      <div style={{
        marginTop: 20, padding: '16px 20px',
        background: C.bgRaised, borderRadius: 10, border: `1px solid ${C.border}`,
        display: 'flex', gap: 32,
      }}>
        <div>
          <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Valor estimado</p>
          <p style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textPrimary, margin: 0 }}>USD 140,000</p>
        </div>
        <div>
          <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Rango</p>
          <p style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textSecondary, margin: 0 }}>$138K – $145K</p>
        </div>
        <div>
          <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>USD/m²</p>
          <p style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textSecondary, margin: 0 }}>USD 1,944</p>
        </div>
      </div>

      <NavButtons onNext={onNext} onBack={onBack} nextLabel="Ver previsualización PDF →" />
    </div>
  );
}

/* ─── Step 5: PDF Preview ───────────────────────────────────── */

function Step5PDF({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  return (
    <div>
      <h2 style={{ fontFamily: F.display, fontSize: 20, color: C.textPrimary, margin: '0 0 6px' }}>
        Previsualización del informe PDF
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '0 0 24px' }}>
        Revisá el informe final antes de guardarlo.
      </p>

      {/* PDF preview mockup */}
      <div style={{
        background: '#FFFFFF', borderRadius: 12, border: `1px solid ${C.border}`,
        overflow: 'hidden', marginBottom: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* PDF header bar */}
        <div style={{
          background: '#1654d9', padding: '20px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              CORREDOR
            </p>
            <p style={{ fontFamily: F.body, fontSize: 10, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>
              Informe de Tasación
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: F.mono, fontSize: 10, color: 'rgba(255,255,255,0.7)', margin: 0 }}>ap-001 · 02/05/2026</p>
          </div>
        </div>

        {/* PDF body */}
        <div style={{ padding: '24px 28px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, color: '#0F1A2E', margin: '0 0 4px' }}>
            Av. Santa Fe 2848, 3°B
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#4A5568', margin: '0 0 20px' }}>
            Palermo · Buenos Aires · Argentina
          </p>

          {/* Value box */}
          <div style={{
            background: '#EBF4FF', borderLeft: '4px solid #1654d9',
            padding: '16px 20px', borderRadius: '0 8px 8px 0', marginBottom: 20,
          }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#4A5568', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Valor estimado de mercado
            </p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#1654d9', margin: 0 }}>
              USD 140,000
            </p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#4A5568', margin: '4px 0 0' }}>
              Rango: USD 138,000 – USD 145,000 · USD 1,944/m²
            </p>
          </div>

          {/* Property details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Tipo',     val: 'Apartamento' },
              { label: 'Sup.',     val: '72 m²'       },
              { label: 'Ambientes',val: '3'           },
              { label: 'Año',      val: '1998'        },
            ].map(d => (
              <div key={d.label} style={{ background: '#F7F9FC', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontFamily: 'sans-serif', fontSize: 10, color: '#6B7A8D', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.label}</p>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 600, color: '#0F1A2E', margin: 0 }}>{d.val}</p>
              </div>
            ))}
          </div>

          {/* Truncated narrative */}
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#2D3748', lineHeight: 1.7, margin: '0 0 12px' }}>
            La propiedad ubicada en Av. Santa Fe 2848, 3°B, Palermo corresponde a un departamento de 3 ambientes con 72 m² cubiertos, construido en 1998 y en buen estado de conservación…
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#6B7A8D', fontStyle: 'italic', margin: 0 }}>
            [continúa en página 2 — comparables y metodología]
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
        <button onClick={onBack} style={{
          padding: '9px 18px', borderRadius: 8, border: `1px solid ${C.border}`,
          background: 'transparent', color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
        }}>
          ← Revisar
        </button>
        <button style={{
          padding: '9px 18px', borderRadius: 8, border: `1px solid ${C.border}`,
          background: C.bgElevated, color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
        }}>
          ⬇ Descargar PDF
        </button>
        <button onClick={onFinish} style={{
          padding: '9px 20px', borderRadius: 8, border: 'none', background: C.success,
          color: '#fff', fontFamily: F.body, fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          ✓ Guardar tasación
        </button>
      </div>
    </div>
  );
}

/* ─── Shared helpers ────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 14px', borderRadius: 8, boxSizing: 'border-box',
  border: `1px solid ${C.border}`, background: C.bgBase,
  color: C.textPrimary, fontFamily: F.body, fontSize: 13, outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function OptionGroup({ options, selected, onSelect }: {
  options: readonly string[]; selected: string; onSelect: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onSelect(opt)} style={{
          padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
          border: `1px solid ${selected === opt ? C.brand : C.border}`,
          background: selected === opt ? C.brandFaint : C.bgElevated,
          color: selected === opt ? C.brand : C.textSecondary,
          fontFamily: F.body, fontSize: 13, fontWeight: selected === opt ? 600 : 400,
        }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function NavButtons({ onNext, onBack, nextLabel = 'Continuar →' }: {
  onNext: () => void; onBack?: () => void; nextLabel?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
      <div>
        {onBack && (
          <button onClick={onBack} style={{
            padding: '9px 18px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}>
            ← Atrás
          </button>
        )}
      </div>
      <button onClick={onNext} style={{
        padding: '9px 22px', borderRadius: 8, border: 'none', background: C.brand,
        color: '#fff', fontFamily: F.body, fontWeight: 700, fontSize: 14, cursor: 'pointer',
      }}>
        {nextLabel}
      </button>
    </div>
  );
}

/* ─── Main wizard component ─────────────────────────────────── */

export default function NewAppraisalWizard({ onClose, onFinish }: {
  onClose?: () => void;
  onFinish?: () => void;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const next = () => setStep(s => Math.min(s + 1, 5) as WizardStep);
  const back = () => setStep(s => Math.max(s - 1, 1) as WizardStep);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 780, fontFamily: F.body }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            Nueva tasación
          </h1>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '4px 0 0' }}>
            Paso {step} de 5
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: C.textTertiary, cursor: 'pointer', fontSize: 20,
          }}>✕</button>
        )}
      </div>

      <StepBar current={step} />

      <div style={{
        background: C.bgRaised, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: '32px 36px',
      }}>
        {step === 1 && <Step1Property onNext={next} />}
        {step === 2 && <Step2Parameters onNext={next} onBack={back} />}
        {step === 3 && <Step3Comps onNext={next} onBack={back} />}
        {step === 4 && <Step4Narrative onNext={next} onBack={back} />}
        {step === 5 && <Step5PDF onBack={back} onFinish={onFinish ?? (() => {})} />}
      </div>
    </div>
  );
}
