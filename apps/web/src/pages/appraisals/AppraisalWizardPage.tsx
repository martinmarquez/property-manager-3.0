import React, { useState, useEffect, useRef } from 'react';
import { C, F } from '../../components/copilot/tokens.js';

/* ─── Types ──────────────────────────────────────────────────────── */

type WizardStep = 1 | 2 | 3 | 4 | 5;
type Purpose = 'cma' | 'valuation' | 'price_update' | 'rental' | 'guarantee';
type AiState = 'idle' | 'generating' | 'done' | 'error';

interface Property {
  id: string;
  address: string;
  neighborhood: string;
  type: string;
  area: number;
  rooms: number;
  price: string;
  thumbnail: string;
}

interface Comp {
  id: string;
  address: string;
  area: number;
  rooms: number;
  pricePerM2: number;
  distance: number;
  adjustment: number;
  selected: boolean;
}

/* ─── Mock data ──────────────────────────────────────────────────── */

const RECENT_PROPERTIES: Property[] = [
  { id: 'p1', address: 'Av. Corrientes 1800, 3° A', neighborhood: 'CABA', type: 'Departamento', area: 85, rooms: 3, price: 'USD 180,000', thumbnail: '🏢' },
  { id: 'p2', address: 'Thames 900, PH', neighborhood: 'Palermo', type: 'PH', area: 200, rooms: 5, price: 'USD 380,000', thumbnail: '🏠' },
  { id: 'p3', address: 'Defensa 450, 2° B', neighborhood: 'San Telmo', type: 'Departamento', area: 72, rooms: 2, price: 'USD 145,000', thumbnail: '🏢' },
];

const MOCK_COMPS: Comp[] = [
  { id: 'c1', address: 'Av. Corrientes 1650, 2° A', area: 82, rooms: 3, pricePerM2: 2100, distance: 150, adjustment: -5, selected: true },
  { id: 'c2', address: 'Callao 400, 4° B', area: 90, rooms: 3, pricePerM2: 2050, distance: 300, adjustment: -2, selected: true },
  { id: 'c3', address: 'Av. Rivadavia 3200, 1° C', area: 75, rooms: 3, pricePerM2: 2200, distance: 420, adjustment: 0, selected: false },
  { id: 'c4', address: 'Corrientes 2100 PB', area: 80, rooms: 3, pricePerM2: 1950, distance: 580, adjustment: 3, selected: false },
  { id: 'c5', address: 'Bartolomé Mitre 1400, 6°', area: 88, rooms: 3, pricePerM2: 2080, distance: 720, adjustment: -1, selected: true },
  { id: 'c6', address: 'Uruguay 800, 3° D', area: 78, rooms: 2, pricePerM2: 1980, distance: 850, adjustment: 2, selected: false },
];

const PURPOSES: { code: Purpose; label: string; desc: string }[] = [
  { code: 'cma', label: 'CMA (Análisis de mercado comparativo)', desc: 'Para establecer precio de publicación' },
  { code: 'valuation', label: 'Valuación formal', desc: 'Para documentación legal, hipotecas, herencias' },
  { code: 'price_update', label: 'Actualización de precio', desc: 'Revisión de precio de una propiedad ya publicada' },
  { code: 'rental', label: 'Tasación de alquiler', desc: 'Estimar valor mensual de renta' },
  { code: 'guarantee', label: 'Garantía', desc: 'Valuación como respaldo crediticio' },
];

const STEP_LABELS = [
  'Seleccioná la propiedad',
  'Definí el propósito',
  'Buscá comparables',
  'Revisá la narrativa IA',
  'Descargá el reporte',
];

/* ─── Step indicator ─────────────────────────────────────────────── */

function StepIndicator({ current, total }: { current: WizardStep; total: number }) {
  const pct = Math.round(((current - 1) / (total - 1)) * 100);
  return (
    <div style={{ marginBottom: 28 }}>
      {/* Linear progress bar */}
      <div style={{ height: 4, background: C.bgElevated, borderRadius: 2, marginBottom: 16 }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: C.brand,
          borderRadius: 2, transition: 'width 0.35s ease',
        }} />
      </div>
      {/* Step pills */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as WizardStep;
          const done = stepNum < current;
          const active = stepNum === current;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                background: done ? C.success : active ? C.brand : C.bgElevated,
                color: (done || active) ? '#fff' : C.textTertiary,
                border: `2px solid ${done ? C.success : active ? C.brand : C.border}`,
                flexShrink: 0,
              }}>
                {done ? '✓' : stepNum}
              </div>
              <span style={{
                fontFamily: F.body, fontSize: 12,
                color: active ? C.textPrimary : done ? C.textSecondary : C.textTertiary,
                fontWeight: active ? 600 : 400,
              }}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <div style={{ width: 16, height: 1, background: C.border, marginLeft: 2 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 1: Property Selection ────────────────────────────────── */

function Step1({ selected, onSelect }: { selected: Property | null; onSelect: (p: Property) => void }) {
  const [query, setQuery] = useState('');
  const results = query.length > 1
    ? RECENT_PROPERTIES.filter(p => p.address.toLowerCase().includes(query.toLowerCase()))
    : RECENT_PROPERTIES;

  return (
    <div>
      <h3 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
        Seleccioná la propiedad
      </h3>
      <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>
        Buscá una propiedad del CRM o ingresá una dirección externa.
      </p>

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="🔍 Buscar por dirección, código o cliente..."
        style={{
          width: '100%', background: C.bgElevated, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '11px 16px', color: C.textPrimary,
          fontFamily: F.body, fontSize: 14, outline: 'none',
          boxSizing: 'border-box', marginBottom: 16,
        }}
      />

      <p style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        {query ? `${results.length} resultado${results.length !== 1 ? 's' : ''}` : 'Recientes'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map(p => (
          <div key={p.id} onClick={() => onSelect(p)} style={{
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            background: selected?.id === p.id ? C.brandFaint : C.bgElevated,
            border: `1px solid ${selected?.id === p.id ? C.brand : C.border}`,
            borderRadius: 10, padding: '12px 16px',
            transition: 'border-color 0.12s, background 0.12s',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 8, background: C.bgRaised,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
            }}>
              {p.thumbnail}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.body, fontSize: 14, color: C.textPrimary, fontWeight: 500 }}>
                {p.address}
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                {p.type} · {p.area}m² · {p.rooms} amb. · {p.neighborhood}
              </div>
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 13, color: C.textPrimary, fontWeight: 700 }}>
              {p.price}
            </div>
            {selected?.id === p.id && (
              <span style={{
                background: C.brand, color: '#fff', borderRadius: 99,
                padding: '2px 8px', fontSize: 11, fontFamily: F.body, fontWeight: 600,
              }}>
                ✓ Seleccionada
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 2: Purpose ───────────────────────────────────────────── */

function Step2({ purpose, onSelect }: { purpose: Purpose | null; onSelect: (p: Purpose) => void }) {
  return (
    <div>
      <h3 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
        ¿Para qué es la tasación?
      </h3>
      <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>
        El propósito determina los comparables y el enfoque del informe.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {PURPOSES.map(p => (
          <div key={p.code} onClick={() => onSelect(p.code)} style={{
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            background: purpose === p.code ? C.brandFaint : C.bgElevated,
            border: `1px solid ${purpose === p.code ? C.brand : C.border}`,
            borderRadius: 10, padding: '14px 16px',
            transition: 'all 0.12s',
          }}>
            <input type="radio" checked={purpose === p.code} readOnly aria-hidden="true" />
            <div>
              <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.textPrimary }}>
                {p.label}
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                {p.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      <label style={{ display: 'block', fontFamily: F.body, fontSize: 13, color: C.textSecondary, marginBottom: 6 }}>
        Notas adicionales (opcional)
      </label>
      <textarea placeholder="Ej: el propietario quiere vender en 60 días..." rows={3} style={{
        width: '100%', background: C.bgElevated, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: '10px 12px', color: C.textPrimary,
        fontFamily: F.body, fontSize: 13, resize: 'vertical', outline: 'none',
        boxSizing: 'border-box',
      }} />
    </div>
  );
}

/* ─── Step 3: Comparables ───────────────────────────────────────── */

function Step3({ comps, setComps }: { comps: Comp[]; setComps: (c: Comp[]) => void }) {
  const [radius, setRadius] = useState(1000);
  const selectedCount = comps.filter(c => c.selected).length;

  function toggle(id: string) {
    if (!comps.find(c => c.id === id)?.selected && selectedCount >= 10) return;
    setComps(comps.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  }

  function updateAdjustment(id: string, val: number) {
    setComps(comps.map(c => c.id === id ? { ...c, adjustment: val } : c));
  }

  return (
    <div>
      <h3 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
        Seleccioná los comparables
      </h3>
      <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, marginBottom: 16 }}>
        Encontré {comps.length} comparables en un radio de {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}.
        Seleccioná hasta 10.
      </p>

      {/* Fake map placeholder */}
      <div style={{
        height: 260, background: C.bgElevated, borderRadius: 12,
        border: `1px solid ${C.border}`, marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🗺️</div>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary }}>
            Mapa de comparables (MapLibre)
          </div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginTop: 4 }}>
            📍 Propiedad sujeto · ◎ Radio {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`} · {comps.filter(c => c.selected).length} comp{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
          </div>
        </div>
        {/* Radius selector overlay */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12, right: 12,
          background: 'rgba(13,21,38,0.92)', borderRadius: 8, padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textTertiary }}>Radio:</span>
          {[500, 1000, 2000].map(r => (
            <button key={r} onClick={() => setRadius(r)} style={{
              background: radius === r ? C.brand : C.bgElevated,
              color: radius === r ? '#fff' : C.textSecondary,
              border: `1px solid ${radius === r ? C.brand : C.border}`,
              borderRadius: 6, padding: '4px 10px', fontSize: 12,
              fontFamily: F.body, cursor: 'pointer',
            }}>
              {r >= 1000 ? `${r / 1000} km` : `${r} m`}
            </button>
          ))}
          <input
            type="range" min={200} max={3000} step={100} value={radius}
            onChange={e => setRadius(Number(e.target.value))}
            style={{ flex: 1, accentColor: C.brand }}
            aria-label="Radio de búsqueda en metros"
          />
        </div>
      </div>

      {/* Comparables table */}
      <div style={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: C.bgElevated, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
            {selectedCount}/10 comparables seleccionados
            {selectedCount < 3 && <span style={{ color: C.warning, marginLeft: 8 }}>· Mínimo 3 requeridos</span>}
          </span>
          {selectedCount > 0 && (
            <button onClick={() => setComps(comps.map(c => ({ ...c, selected: false })))} style={{
              background: 'none', border: 'none', color: C.textTertiary,
              fontFamily: F.body, fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
            }}>
              Limpiar selección
            </button>
          )}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: F.body }}>
          <thead>
            <tr>
              {['', 'Dirección', 'm²', 'Amb.', '$/m²', 'Dist.', 'Ajuste %'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '8px 12px',
                  fontFamily: F.mono, fontSize: 11, color: C.textTertiary,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comps.map(comp => (
              <tr key={comp.id} style={{
                borderBottom: `1px solid ${C.border}`,
                background: comp.selected ? C.brandFaint : 'transparent',
                opacity: !comp.selected && selectedCount >= 10 ? 0.4 : 1,
                cursor: 'pointer',
              }}
                onClick={() => toggle(comp.id)}
              >
                <td style={{ padding: '10px 12px' }}>
                  <input
                    type="checkbox"
                    checked={comp.selected}
                    onChange={() => toggle(comp.id)}
                    disabled={!comp.selected && selectedCount >= 10}
                    style={{ accentColor: C.brand }}
                  />
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: C.textPrimary }}>{comp.address}</td>
                <td style={{ padding: '10px 12px', fontFamily: F.mono, fontSize: 13, color: C.textSecondary }}>{comp.area}</td>
                <td style={{ padding: '10px 12px', fontFamily: F.mono, fontSize: 13, color: C.textSecondary }}>{comp.rooms}</td>
                <td style={{ padding: '10px 12px', fontFamily: F.mono, fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>
                  ${comp.pricePerM2.toLocaleString()}
                </td>
                <td style={{ padding: '10px 12px', fontFamily: F.mono, fontSize: 12, color: C.textTertiary }}>
                  {comp.distance < 1000 ? `${comp.distance}m` : `${(comp.distance / 1000).toFixed(1)}km`}
                </td>
                <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="number"
                      value={comp.adjustment}
                      onChange={e => updateAdjustment(comp.id, Number(e.target.value))}
                      style={{
                        width: 52, background: C.bgElevated, border: `1px solid ${C.border}`,
                        borderRadius: 5, padding: '4px 6px', color: C.textPrimary,
                        fontFamily: F.mono, fontSize: 12, textAlign: 'right', outline: 'none',
                      }}
                    />
                    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textTertiary }}>%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Step 4: AI Narrative ──────────────────────────────────────── */

function Step4({
  comps, property,
  narrative, setNarrative,
  aiState, setAiState,
}: {
  comps: Comp[];
  property: Property | null;
  narrative: string;
  setNarrative: (s: string) => void;
  aiState: AiState;
  setAiState: (s: AiState) => void;
}) {
  const selectedComps = comps.filter(c => c.selected);
  const avgPricePerM2 = selectedComps.length > 0
    ? selectedComps.reduce((s, c) => s + c.pricePerM2 * (1 + c.adjustment / 100), 0) / selectedComps.length
    : 0;
  const estValue = property ? Math.round(property.area * avgPricePerM2) : 0;
  const estMin = Math.round(estValue * 0.97);
  const estMax = Math.round(estValue * 1.03);

  const streamRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MOCK_NARRATIVE = `La propiedad ubicada en ${property?.address ?? 'la dirección seleccionada'}, de ${property?.area ?? 0} m² y ${property?.rooms ?? 0} ambientes, fue analizada comparativamente con ${selectedComps.length} operaciones recientes en un radio de 1 km en el barrio de ${property?.neighborhood ?? 'la zona'}.

El análisis de mercado comparativo (CMA) se basó en transacciones del último trimestre, ajustadas por superficie, estado de conservación, piso y orientación. Los comparables seleccionados presentan un valor promedio de USD ${Math.round(avgPricePerM2).toLocaleString()}/m², con una dispersión del ±3% dentro del rango de confianza.

Considerando las características constructivas del inmueble, su ubicación en piso alto con buena iluminación y el contexto de mercado actual, se estima un valor de mercado comprendido entre USD ${estMin.toLocaleString()} y USD ${estMax.toLocaleString()}, con un valor central de USD ${estValue.toLocaleString()}.

Esta valuación tiene validez de 90 días a partir de la fecha de emisión y está sujeta a verificación presencial del estado del inmueble.`;

  function startGeneration() {
    setAiState('generating');
    setNarrative('');
    let i = 0;
    const chars = MOCK_NARRATIVE.split('');
    function tick() {
      if (i >= chars.length) { setAiState('done'); return; }
      setNarrative(MOCK_NARRATIVE.slice(0, i + 1));
      i += Math.floor(Math.random() * 6) + 3;
      streamRef.current = setTimeout(tick, 35);
    }
    tick();
  }

  useEffect(() => () => { if (streamRef.current) clearTimeout(streamRef.current); }, []);

  const [editMode, setEditMode] = useState(false);
  const [userEdited, setUserEdited] = useState(false);

  return (
    <div>
      <h3 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
        Narrativa de valuación
      </h3>
      <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>
        La IA analiza los {selectedComps.length} comparables seleccionados y genera el texto del informe.
      </p>

      {aiState === 'idle' && (
        <div style={{
          background: C.aiFaint, border: `1px dashed ${C.ai}`,
          borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 20,
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✦</div>
          <div style={{ fontFamily: F.body, fontSize: 16, color: C.textPrimary, marginBottom: 8 }}>
            Generá la narrativa con IA
          </div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>
            Claude Sonnet analizará los {selectedComps.length} comparables y generará un texto profesional.
            El proceso tarda menos de 20 segundos.
          </div>
          <button onClick={startGeneration} style={{
            background: C.ai, color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 24px', fontFamily: F.body,
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>
            ✦ Generar narrativa
          </button>
        </div>
      )}

      {(aiState === 'generating' || aiState === 'done') && (
        <>
          <div style={{
            background: aiState === 'generating' ? C.aiFaint : `rgba(126,58,242,0.06)`,
            border: `1px solid ${aiState === 'done' && userEdited ? C.border : C.ai}`,
            borderRadius: 12, padding: 20, marginBottom: 16, position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                background: aiState === 'generating' ? C.aiFaint : (userEdited ? 'rgba(80,97,128,0.2)' : C.aiFaint),
                color: userEdited ? C.textTertiary : C.aiLight,
                borderRadius: 99, padding: '2px 10px', fontSize: 11,
                fontFamily: F.body, fontWeight: 600, border: `1px solid ${userEdited ? C.border : C.ai}`,
              }}>
                {aiState === 'generating' ? '✦ Generando...' : userEdited ? '✏️ Editado manualmente' : '✦ Narrativa IA'}
              </span>
              {aiState === 'done' && !editMode && !userEdited && (
                <button onClick={() => setEditMode(true)} style={{
                  background: 'none', border: 'none', color: C.textTertiary,
                  fontFamily: F.body, fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
                }}>
                  ✏️ Editar
                </button>
              )}
            </div>

            {editMode ? (
              <textarea
                value={narrative}
                onChange={e => { setNarrative(e.target.value); setUserEdited(true); }}
                rows={10}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  color: C.textPrimary, fontFamily: F.body, fontSize: 14,
                  lineHeight: 1.7, resize: 'vertical', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            ) : (
              <p style={{
                fontFamily: F.body, fontSize: 14, color: C.textPrimary,
                lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap',
              }}>
                {narrative}
                {aiState === 'generating' && (
                  <span style={{
                    display: 'inline-block', width: 2, height: '1em',
                    background: C.ai, marginLeft: 1, verticalAlign: 'middle',
                    animation: 'blink 0.8s step-end infinite',
                  }} />
                )}
              </p>
            )}
          </div>

          {aiState === 'done' && (
            <>
              {/* Estimated value card */}
              <div style={{
                background: C.bgRaised, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: 20, marginBottom: 16,
              }}>
                <div style={{ fontFamily: F.mono, fontSize: 12, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Valuación estimada
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary, marginBottom: 2 }}>Rango</div>
                    <div style={{ fontFamily: F.mono, fontSize: 18, fontWeight: 700, color: C.textPrimary }}>
                      USD {estMin.toLocaleString()} — {estMax.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary, marginBottom: 2 }}>Valor central</div>
                    <div style={{ fontFamily: F.mono, fontSize: 24, fontWeight: 800, color: C.brand }}>
                      USD {estValue.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary, marginBottom: 2 }}>Confianza</div>
                    <div style={{ fontFamily: F.body, fontSize: 14, color: C.success, fontWeight: 600 }}>
                      Alta ({selectedComps.length} comparables)
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => {
                  setAiState('idle');
                  setNarrative('');
                  setEditMode(false);
                  setUserEdited(false);
                  startGeneration();
                }} style={{
                  background: C.aiFaint, color: C.aiLight, border: `1px solid ${C.ai}`,
                  borderRadius: 8, padding: '8px 14px', fontFamily: F.body,
                  fontSize: 13, cursor: 'pointer',
                }}>
                  🔄 Regenerar
                </button>
                {!editMode && (
                  <button onClick={() => setEditMode(true)} style={{
                    background: 'none', border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: '8px 14px', fontFamily: F.body,
                    fontSize: 13, color: C.textSecondary, cursor: 'pointer',
                  }}>
                    ✏️ Editar manualmente
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {aiState === 'error' && (
        <div style={{
          background: 'rgba(232,59,59,0.1)', border: '1px solid #E83B3B',
          borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.body, fontSize: 14, color: C.textPrimary, fontWeight: 500 }}>
              Error al generar la narrativa
            </div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
              Verificá tu conexión e intentá nuevamente.
            </div>
          </div>
          <button onClick={startGeneration} style={{
            background: '#E83B3B', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 14px', fontFamily: F.body, cursor: 'pointer',
          }}>
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Step 5: PDF Preview ───────────────────────────────────────── */

function Step5({ property, estValue }: { property: Property | null; estValue: number }) {
  const [page, setPage] = useState(1);
  const totalPages = 4;

  const PAGE_DESCRIPTIONS = [
    { title: 'Portada', desc: `Informe de Tasación · ${property?.address ?? ''} · ${new Date().toLocaleDateString('es-AR')}` },
    { title: 'Narrativa y valuación', desc: `Rango estimado y valor central: USD ${estValue.toLocaleString()}` },
    { title: 'Tabla de comparables', desc: 'Hasta 10 comparables con distancia, precio/m², ajuste y valor ajustado' },
    { title: 'Fotos y firma', desc: 'Fotografías de la propiedad · Bloque de firma del agente' },
  ];

  return (
    <div>
      <h3 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
        Previsualización del reporte
      </h3>
      <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>
        Revisá el informe antes de descargarlo. Todas las páginas se incluyen en el PDF.
      </p>

      {/* PDF Preview Mock */}
      <div style={{
        background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`,
        minHeight: 440, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', marginBottom: 12, position: 'relative', overflow: 'hidden',
      }}>
        {/* A4 mock page */}
        <div style={{
          width: '100%', maxWidth: 540, background: '#fff',
          padding: '40px 48px', boxSizing: 'border-box',
        }}>
          {/* Mock header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 16, borderBottom: '2px solid #1654d9' }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: '#0D1526' }}>Corredor</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#506180', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Informe de Tasación</div>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#506180', textAlign: 'right' }}>
              <div>TAS-0043</div>
              <div>{new Date().toLocaleDateString('es-AR')}</div>
            </div>
          </div>

          {/* Page content */}
          <div style={{ color: '#0D1526', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#506180', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Página {page} / {totalPages}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              {PAGE_DESCRIPTIONS[page - 1].title}
            </div>
            <div style={{ fontSize: 13, color: '#8DA0C0', lineHeight: 1.5 }}>
              {PAGE_DESCRIPTIONS[page - 1].desc}
            </div>
            <div style={{ marginTop: 24, height: 140, background: '#F0F4FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#8DA0C0', fontSize: 13 }}>
                {page === 1 ? '📋 Datos de la propiedad' : page === 2 ? '📊 Gráfico de valuación' : page === 3 ? '📋 Tabla comparables' : '📸 Fotos + firma'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Page navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1) as WizardStep)} disabled={page === 1}
          style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 6,
            padding: '6px 12px', color: page === 1 ? C.textTertiary : C.textPrimary,
            fontFamily: F.body, cursor: page === 1 ? 'not-allowed' : 'pointer',
            opacity: page === 1 ? 0.4 : 1,
          }}>
          ← Anterior
        </button>
        <span style={{ fontFamily: F.mono, fontSize: 13, color: C.textSecondary }}>
          Pág. {page} / {totalPages}
        </span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1) as WizardStep)} disabled={page === totalPages}
          style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 6,
            padding: '6px 12px', color: page === totalPages ? C.textTertiary : C.textPrimary,
            fontFamily: F.body, cursor: page === totalPages ? 'not-allowed' : 'pointer',
            opacity: page === totalPages ? 0.4 : 1,
          }}>
          Siguiente →
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button style={{
          flex: 1, background: 'none', border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '10px 16px', color: C.textSecondary,
          fontFamily: F.body, fontSize: 14, cursor: 'pointer',
        }}>
          📥 Descargar borrador PDF
        </button>
      </div>
    </div>
  );
}

/* ─── Main Wizard ─────────────────────────────────────────────────── */

export default function AppraisalWizardPage() {
  const [step, setStep] = useState<WizardStep>(1);
  const [property, setProperty] = useState<Property | null>(null);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [comps, setComps] = useState<Comp[]>(MOCK_COMPS);
  const [narrative, setNarrative] = useState('');
  const [aiState, setAiState] = useState<AiState>('idle');

  const selectedComps = comps.filter(c => c.selected);
  const avgPricePerM2 = selectedComps.length > 0
    ? selectedComps.reduce((s, c) => s + c.pricePerM2 * (1 + c.adjustment / 100), 0) / selectedComps.length
    : 0;
  const estValue = property ? Math.round(property.area * avgPricePerM2) : 0;

  function canAdvance() {
    if (step === 1) return property !== null;
    if (step === 2) return purpose !== null;
    if (step === 3) return selectedComps.length >= 3;
    if (step === 4) return aiState === 'done' && narrative.length > 0;
    return true;
  }

  function handleSave() {
    alert('Tasación guardada. Redirigiendo a /appraisals/TAS-0043...');
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bgBase, padding: '32px 40px' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* Back link */}
        <a href="/appraisals" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: F.body, fontSize: 13, color: C.textSecondary, textDecoration: 'none',
          marginBottom: 20,
        }}>
          ← Tasaciones
        </a>

        <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 800, color: C.textPrimary, marginBottom: 24 }}>
          Nueva tasación
        </h2>

        <StepIndicator current={step} total={5} />

        {/* Step content */}
        <div style={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
          {step === 1 && <Step1 selected={property} onSelect={p => { setProperty(p); }} />}
          {step === 2 && <Step2 purpose={purpose} onSelect={setPurpose} />}
          {step === 3 && <Step3 comps={comps} setComps={setComps} />}
          {step === 4 && (
            <Step4
              comps={comps}
              property={property}
              narrative={narrative}
              setNarrative={setNarrative}
              aiState={aiState}
              setAiState={setAiState}
            />
          )}
          {step === 5 && <Step5 property={property} estValue={estValue} />}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setStep(s => Math.max(1, s - 1) as WizardStep)}
            disabled={step === 1}
            style={{
              background: 'none', border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '10px 20px', color: C.textSecondary,
              fontFamily: F.body, fontSize: 14, cursor: step === 1 ? 'not-allowed' : 'pointer',
              opacity: step === 1 ? 0.4 : 1,
            }}
          >
            ← Atrás
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            {step < 5 ? (
              <button
                onClick={() => setStep(s => Math.min(5, s + 1) as WizardStep)}
                disabled={!canAdvance()}
                style={{
                  background: canAdvance() ? C.brand : C.bgElevated,
                  color: canAdvance() ? '#fff' : C.textTertiary,
                  border: `1px solid ${canAdvance() ? C.brand : C.border}`,
                  borderRadius: 8, padding: '10px 24px', fontFamily: F.body,
                  fontSize: 14, fontWeight: 600,
                  cursor: canAdvance() ? 'pointer' : 'not-allowed',
                }}
              >
                Siguiente: {STEP_LABELS[step]} →
              </button>
            ) : (
              <>
                <button style={{
                  background: 'none', border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '10px 20px', color: C.textSecondary,
                  fontFamily: F.body, fontSize: 14, cursor: 'pointer',
                }}>
                  📥 Descargar PDF
                </button>
                <button onClick={handleSave} style={{
                  background: C.success, color: '#fff', border: 'none',
                  borderRadius: 8, padding: '10px 24px', fontFamily: F.body,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  ✅ Guardar tasación
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
