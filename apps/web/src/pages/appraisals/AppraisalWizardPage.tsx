import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import {
  X, CheckCircle2, Search, Home, Clock, Shield, Scale, Landmark, FileText,
  ChevronDown, RefreshCw, Sparkles, Check, Edit3, Download, Plus, HelpCircle,
  Loader2,
} from 'lucide-react';
import { C, F } from '../../components/copilot/tokens.js';
import { trpc } from '../../trpc.js';

/* ─── i18n ──────────────────────────────────────────────────── */

const msg = defineMessages({
  wizardTitle:        { id: 'appraisals.wizard.title' },
  cancel:             { id: 'appraisals.wizard.cancel' },
  next:               { id: 'appraisals.wizard.next' },
  back:               { id: 'appraisals.wizard.back' },
  save:               { id: 'appraisals.wizard.save' },
  stepProperty:       { id: 'appraisals.wizard.step.property' },
  stepPurpose:        { id: 'appraisals.wizard.step.purpose' },
  stepComps:          { id: 'appraisals.wizard.step.comps' },
  stepReport:         { id: 'appraisals.wizard.step.report' },
  // Step 1
  step1Title:         { id: 'appraisals.wizard.step1.title' },
  step1Subtitle:      { id: 'appraisals.wizard.step1.subtitle' },
  step1Search:        { id: 'appraisals.wizard.step1.search' },
  step1Manual:        { id: 'appraisals.wizard.step1.manual' },
  step1CancelManual:  { id: 'appraisals.wizard.step1.cancelManual' },
  // Step 2
  step2Title:         { id: 'appraisals.wizard.step2.title' },
  step2Subtitle:      { id: 'appraisals.wizard.step2.subtitle' },
  step2Notes:         { id: 'appraisals.wizard.step2.notes' },
  step2NotesPlaceholder: { id: 'appraisals.wizard.step2.notesPlaceholder' },
  step2Client:        { id: 'appraisals.wizard.step2.client' },
  step2ClientPlaceholder: { id: 'appraisals.wizard.step2.clientPlaceholder' },
  // Step 3
  compsTitle:         { id: 'appraisals.comps.title' },
  compsSubtitle:      { id: 'appraisals.comps.subtitle' },
  compsHint:          { id: 'appraisals.comps.hint' },
  compsSelected:      { id: 'appraisals.comps.selected' },
  compsAdd:           { id: 'appraisals.comps.add' },
  compsAddManual:     { id: 'appraisals.wizard.step3.addManual' },
  // Step 4
  narrativeTitle:     { id: 'appraisals.narrative.title' },
  narrativeGenerating:{ id: 'appraisals.narrative.generating' },
  narrativeGenerated: { id: 'appraisals.narrative.generated' },
  narrativeEdit:      { id: 'appraisals.narrative.edit' },
  narrativeRegenerate:{ id: 'appraisals.narrative.ai.regenerate' },
  reportValueEstimated: { id: 'appraisals.report.value.estimated' },
  reportValueRange:   { id: 'appraisals.report.value.range' },
  reportValueMin:     { id: 'appraisals.report.value.min' },
  reportValueMax:     { id: 'appraisals.report.value.max' },
  reportDownload:     { id: 'appraisals.report.download' },
  reportMethodology:  { id: 'appraisals.wizard.step4.methodology' },
  reportAgentNotes:   { id: 'appraisals.wizard.step4.agentNotes' },
  reportGeneratePdf:  { id: 'appraisals.wizard.step4.generatePdf' },
  reportFinalize:     { id: 'appraisals.wizard.step4.finalize' },
});

/* ─── Types ─────────────────────────────────────────────────── */

type Step = 1 | 2 | 3 | 4;

type PropertyType = 'apartment' | 'ph' | 'house' | 'quinta' | 'land' | 'office'
  | 'commercial' | 'garage' | 'warehouse' | 'farm' | 'hotel'
  | 'building' | 'business_fund' | 'development';

type OperationKind = 'sale' | 'rent' | 'temp_rent' | 'commercial_rent' | 'commercial_sale';

type Purpose = 'sale' | 'rent' | 'guarantee' | 'inheritance' | 'tax' | 'insurance' | 'judicial' | 'other';

interface WizardData {
  // Step 1
  addressStreet:     string;
  addressNumber:     string;
  locality:          string;
  province:          string;
  propertyType:      PropertyType;
  operationKind:     OperationKind;
  coveredAreaM2:     string;
  totalAreaM2:       string;
  rooms:             string;
  bedrooms:          string;
  bathrooms:         string;
  garages:           string;
  ageYears:          string;
  // Step 2
  purpose:           Purpose | '';
  notes:             string;
  clientName:        string;
  // Step 4
  narrative:         string;
  valueMin:          string;
  valueMax:          string;
  valueCurrency:     'USD' | 'ARS';
  methodology:       string;
  agentNotes:        string;
}

const INITIAL_DATA: WizardData = {
  addressStreet: '', addressNumber: '', locality: '', province: '',
  propertyType: 'apartment', operationKind: 'sale',
  coveredAreaM2: '', totalAreaM2: '', rooms: '', bedrooms: '',
  bathrooms: '', garages: '', ageYears: '',
  purpose: '', notes: '', clientName: '',
  narrative: '', valueMin: '', valueMax: '', valueCurrency: 'USD',
  methodology: '', agentNotes: '',
};

/* ─── Step definitions ──────────────────────────────────────── */

const STEP_KEYS: Array<{ n: Step; msgId: keyof typeof msg }> = [
  { n: 1, msgId: 'stepProperty' },
  { n: 2, msgId: 'stepPurpose' },
  { n: 3, msgId: 'stepComps' },
  { n: 4, msgId: 'stepReport' },
];

/* ─── Purpose display config ────────────────────────────────── */

const PURPOSE_UI: Array<{ key: Purpose; label: string; Icon: typeof Home; iconBg: string }> = [
  { key: 'sale',      label: 'Venta',    Icon: Home,     iconBg: C.brand },
  { key: 'rent',      label: 'Alquiler', Icon: Clock,    iconBg: C.warning },
  { key: 'insurance', label: 'Seguro',   Icon: Shield,   iconBg: C.success },
  { key: 'judicial',  label: 'Judicial', Icon: Scale,    iconBg: C.textTertiary },
  { key: 'tax',       label: 'Bancario', Icon: Landmark, iconBg: C.brand },
  { key: 'other',     label: 'Otro',     Icon: FileText, iconBg: C.textTertiary },
];

/* ─── Stepper ───────────────────────────────────────────────── */

function Stepper({ current }: { current: Step }) {
  const intl = useIntl();
  return (
    <nav
      aria-label="Wizard progress"
      style={{
        display: 'flex', alignItems: 'center',
        background: C.bgRaised, borderBottom: `1px solid ${C.border}`,
        padding: '14px 40px', position: 'sticky', top: 56, zIndex: 10,
      }}
    >
      {STEP_KEYS.map((step, idx) => {
        const done   = step.n < current;
        const active = step.n === current;
        const last   = idx === STEP_KEYS.length - 1;
        return (
          <React.Fragment key={step.n}>
            <div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 80 }}
              aria-current={active ? 'step' : undefined}
            >
              <div
                role="img"
                aria-label={done ? 'Completed' : `Step ${step.n}`}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${done ? C.success : active ? C.brand : C.border}`,
                  background: done ? C.success : active ? C.brand : 'transparent',
                  color: done || active ? '#fff' : C.textTertiary,
                  fontFamily: F.mono, fontSize: 12, fontWeight: 700,
                  transition: 'all 0.25s',
                }}
              >
                {done ? <CheckCircle2 size={14} /> : step.n}
              </div>
              <span style={{
                fontFamily: F.body, fontSize: 11,
                color: active ? C.textPrimary : done ? C.textSecondary : C.textTertiary,
                fontWeight: active ? 600 : 400, whiteSpace: 'nowrap',
              }}>
                {intl.formatMessage(msg[step.msgId])}
              </span>
            </div>
            {!last && (
              <div
                role="presentation"
                style={{
                  flex: 1, height: 2, marginBottom: 20, minWidth: 24,
                  background: done ? C.success : C.bgElevated,
                  transition: 'background 0.3s',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

/* ─── Step 1 — Property ─────────────────────────────────────── */

function PropertyTypeahead({ onSelect }: {
  onSelect: (result: { entityId: string; label: string; secondaryLabel: string | null }) => void;
}) {
  const intl = useIntl();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);

  const { data: acData } = trpc.search.autocomplete.useQuery(
    { q, entityType: 'property' as const },
    { enabled: q.length >= 2 },
  );
  const results = acData && 'suggestions' in acData ? acData.suggestions : (acData ?? []);

  const showDropdown = focused && q.length >= 2 && Array.isArray(results) && results.length > 0;

  return (
    <div style={{ position: 'relative', marginBottom: 24 }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: C.textTertiary, pointerEvents: 'none',
        }} />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={intl.formatMessage(msg.step1Search)}
          aria-label={intl.formatMessage(msg.step1Search)}
          style={{
            width: '100%', boxSizing: 'border-box',
            paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10,
            background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.textPrimary, fontFamily: F.body, fontSize: 13, outline: 'none',
          }}
        />
      </div>
      {showDropdown && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            marginTop: 4, background: C.bgElevated, border: `1px solid ${C.border}`,
            borderRadius: 10, maxHeight: 220, overflowY: 'auto',
            boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
          }}
        >
          {results.map(r => (
            <button
              key={r.entityId}
              role="option"
              onClick={() => { onSelect(r); setQ(''); setFocused(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px', border: 'none', background: 'transparent',
                cursor: 'pointer', borderBottom: `1px solid ${C.border}`,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = C.bgSubtle ?? C.bgRaised)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                {r.label}
              </div>
              {r.secondaryLabel && (
                <div style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, marginTop: 2 }}>
                  {r.secondaryLabel}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Step1Property({
  data, onUpdate, onNext, onPropertySelect,
}: {
  data: WizardData;
  onUpdate: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
  onNext: () => void;
  onPropertySelect?: (propertyId: string) => void;
}) {
  const intl = useIntl();

  const canProceed = data.addressStreet.trim().length > 0 && data.clientName.trim().length > 0;

  const handlePropertySelect = useCallback((result: { entityId: string; label: string; secondaryLabel: string | null }) => {
    onUpdate('addressStreet', result.label);
    if (result.secondaryLabel) onUpdate('locality', result.secondaryLabel);
    onPropertySelect?.(result.entityId);
  }, [onUpdate, onPropertySelect]);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 0 60px' }}>
      <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, color: C.textPrimary, margin: '0 0 6px' }}>
        {intl.formatMessage(msg.step1Title)}
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: '0 0 28px' }}>
        {intl.formatMessage(msg.step1Subtitle)}
      </p>

      <PropertyTypeahead onSelect={handlePropertySelect} />

      <div style={{
        background: C.bgRaised, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 20, marginBottom: 24,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
      }}>
        <FieldInput label="Calle" value={data.addressStreet} onChange={v => onUpdate('addressStreet', v)} />
        <FieldInput label="Número" value={data.addressNumber} onChange={v => onUpdate('addressNumber', v)} />
        <FieldInput label="Localidad" value={data.locality} onChange={v => onUpdate('locality', v)} />
        <FieldInput label="Provincia" value={data.province} onChange={v => onUpdate('province', v)} />
      </div>

      <div style={{
        background: C.bgRaised, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 20, marginBottom: 24,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
      }}>
        <div>
          <label style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, display: 'block', marginBottom: 5 }}>
            Tipo de propiedad
          </label>
          <select
            value={data.propertyType}
            onChange={e => onUpdate('propertyType', e.target.value as PropertyType)}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '9px 12px',
              background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 7,
              color: C.textPrimary, fontFamily: F.body, fontSize: 13, outline: 'none',
              appearance: 'none',
            }}
          >
            {(['apartment', 'ph', 'house', 'quinta', 'land', 'office', 'commercial', 'garage', 'warehouse'] as const).map(t => (
              <option key={t} value={t}>{t === 'apartment' ? 'Departamento' : t === 'ph' ? 'PH' : t === 'house' ? 'Casa' : t === 'land' ? 'Terreno' : t === 'office' ? 'Oficina' : t === 'commercial' ? 'Comercial' : t === 'garage' ? 'Cochera' : t === 'warehouse' ? 'Depósito' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, display: 'block', marginBottom: 5 }}>
            Operación
          </label>
          <select
            value={data.operationKind}
            onChange={e => onUpdate('operationKind', e.target.value as OperationKind)}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '9px 12px',
              background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 7,
              color: C.textPrimary, fontFamily: F.body, fontSize: 13, outline: 'none',
              appearance: 'none',
            }}
          >
            <option value="sale">Venta</option>
            <option value="rent">Alquiler</option>
            <option value="temp_rent">Alquiler temporal</option>
          </select>
        </div>
        <FieldInput label="Sup. cubierta (m²)" value={data.coveredAreaM2} onChange={v => onUpdate('coveredAreaM2', v)} type="number" />
        <FieldInput label="Sup. total (m²)" value={data.totalAreaM2} onChange={v => onUpdate('totalAreaM2', v)} type="number" />
        <FieldInput label="Ambientes" value={data.rooms} onChange={v => onUpdate('rooms', v)} type="number" />
        <FieldInput label="Dormitorios" value={data.bedrooms} onChange={v => onUpdate('bedrooms', v)} type="number" />
        <FieldInput label="Baños" value={data.bathrooms} onChange={v => onUpdate('bathrooms', v)} type="number" />
        <FieldInput label="Cocheras" value={data.garages} onChange={v => onUpdate('garages', v)} type="number" />
        <FieldInput label="Antigüedad (años)" value={data.ageYears} onChange={v => onUpdate('ageYears', v)} type="number" />
      </div>

      {/* Client name (required for create) */}
      <div style={{
        background: C.bgRaised, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 20, marginBottom: 32,
      }}>
        <FieldInput label="Nombre del cliente *" value={data.clientName} onChange={v => onUpdate('clientName', v)} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PrimaryBtn
          label={intl.formatMessage(msg.next)}
          onClick={onNext}
          disabled={!canProceed}
        />
      </div>
    </div>
  );
}

/* ─── Step 2 — Purpose ──────────────────────────────────────── */

function Step2Purpose({
  data, onUpdate, onNext, onBack, isSaving,
}: {
  data: WizardData;
  onUpdate: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  isSaving: boolean;
}) {
  const intl = useIntl();

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 0 60px' }}>
      <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, color: C.textPrimary, margin: '0 0 6px' }}>
        {intl.formatMessage(msg.step2Title)}
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: '0 0 28px' }}>
        {intl.formatMessage(msg.step2Subtitle)}
      </p>

      {/* Purpose cards */}
      <div role="radiogroup" aria-label={intl.formatMessage(msg.stepPurpose)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
        {PURPOSE_UI.map(({ key, label, Icon, iconBg }) => {
          const sel = data.purpose === key;
          return (
            <button
              key={key}
              role="radio"
              aria-checked={sel}
              onClick={() => onUpdate('purpose', key)}
              style={{
                position: 'relative', textAlign: 'left',
                background: sel ? C.brandFaint : C.bgRaised,
                border: `${sel ? 2 : 1}px solid ${sel ? C.brand : C.border}`,
                borderRadius: 12, padding: 16,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!sel) e.currentTarget.style.background = C.bgElevated; }}
              onMouseLeave={e => { if (!sel) e.currentTarget.style.background = sel ? C.brandFaint : C.bgRaised; }}
            >
              {sel && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 18, height: 18, borderRadius: '50%', background: C.brand,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} aria-hidden="true">
                  <Check size={11} color="#fff" />
                </div>
              )}
              <div style={{
                width: 32, height: 32, borderRadius: 7, marginBottom: 10,
                background: `${iconBg}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} color={iconBg === C.textTertiary ? C.textSecondary : iconBg} />
              </div>
              <div style={{
                fontFamily: F.body, fontSize: 14, fontWeight: 600,
                color: sel ? C.textPrimary : C.textSecondary,
              }}>
                {label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, display: 'block', marginBottom: 8 }}>
          {intl.formatMessage(msg.step2Notes)}
        </label>
        <textarea
          value={data.notes}
          onChange={e => onUpdate('notes', e.target.value)}
          placeholder={intl.formatMessage(msg.step2NotesPlaceholder)}
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

      <StepNav
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!data.purpose || isSaving}
        nextLabel={isSaving ? 'Guardando…' : undefined}
        intl={intl}
      />
    </div>
  );
}

/* ─── Step 3 — Comparables ──────────────────────────────────── */

interface CompRow {
  id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  distanceM: number | null;
  propertyType: string | null;
  coveredAreaM2: number | null;
  priceAmount: string | null;
  priceCurrency: string | null;
  pricePerM2: string | null;
  photoUrl: string | null;
  listingStatus: string | null;
  isIncluded: boolean;
  rooms: number | null;
}

function MapMockup({ comps, includedIds }: { comps: CompRow[]; includedIds: Set<string> }) {
  const pinPositions = useMemo(() => {
    if (comps.length === 0) return [];
    return comps.slice(0, 20).map((_, i) => ({
      x: 20 + ((i * 17 + 13) % 60),
      y: 15 + ((i * 23 + 7) % 65),
    }));
  }, [comps.length]);

  return (
    <div
      role="img"
      aria-label="Map showing property comparables"
      style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(160deg, #070F20 0%, #0A1628 40%, #091524 100%)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <svg
        viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        aria-hidden="true"
      >
        {[12, 22, 32, 42, 52, 62, 72, 82].map(y => (
          <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="#1F2D48" strokeWidth="0.35" />
        ))}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(x => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="100" stroke="#1F2D48" strokeWidth="0.35" />
        ))}

        <circle cx="50" cy="45" r="15" fill="none" stroke={`${C.brand}30`} strokeWidth="0.4" strokeDasharray="1.5 1" />
        <circle cx="50" cy="45" r="23" fill={`${C.brand}07`} stroke={C.brand} strokeWidth="0.5" strokeDasharray="2 1.5" />

        {pinPositions.map((pin, i) => {
          const comp = comps[i];
          if (!comp) return null;
          const sel = includedIds.has(comp.id);
          return (
            <g key={comp.id}>
              {sel && <circle cx={pin.x} cy={pin.y} r="6" fill={C.success} opacity="0.15" />}
              <circle cx={pin.x} cy={pin.y} r="3.8" fill={sel ? C.success : C.bgElevated} stroke={sel ? C.success : C.border} strokeWidth="0.6" />
              <text x={pin.x} y={pin.y + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize="2.4" fill="#fff" fontFamily="monospace" fontWeight="bold">
                {i + 1}
              </text>
            </g>
          );
        })}

        <circle cx="50" cy="45" r="6.5" fill={C.brand} opacity="0.18" />
        <circle cx="50" cy="45" r="4" fill={C.brand} stroke="#fff" strokeWidth="0.8" />
      </svg>

      <div style={{
        position: 'absolute', top: 16, left: 16,
        background: `${C.bgRaised}cc`, border: `1px solid ${C.border}`,
        borderRadius: 6, padding: '4px 10px',
        fontFamily: F.mono, fontSize: 11, color: C.textTertiary,
        backdropFilter: 'blur(4px)',
      }}>
        Comparables: {comps.length}
      </div>

      <div style={{
        position: 'absolute', bottom: 56, left: 0, right: 0,
        textAlign: 'center', fontFamily: F.mono, fontSize: 10, color: C.textTertiary,
        opacity: 0.6,
      }}>
        1km · 2km
      </div>
    </div>
  );
}

function Step3Comparables({
  appraisalId, onNext, onBack,
}: {
  appraisalId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const intl = useIntl();
  const utils = trpc.useUtils();

  const { data: compsData = [], isLoading: compsLoading } = trpc.appraisals.listComps.useQuery(
    { appraisalId },
    { enabled: !!appraisalId },
  );

  const searchMut = trpc.appraisals.searchComps.useMutation({
    onSuccess: () => { utils.appraisals.listComps.invalidate({ appraisalId }); },
  });

  const toggleMut = trpc.appraisals.toggleComp.useMutation({
    onSuccess: () => { utils.appraisals.listComps.invalidate({ appraisalId }); },
  });

  useEffect(() => {
    if (appraisalId && compsData.length === 0 && !compsLoading && !searchMut.isPending) {
      searchMut.mutate({ appraisalId });
    }
  }, [appraisalId]);

  const comps: CompRow[] = compsData.map(c => ({
    id: c.id,
    address: c.address,
    lat: c.lat,
    lng: c.lng,
    distanceM: c.distanceM,
    propertyType: c.propertyType,
    coveredAreaM2: c.coveredAreaM2,
    priceAmount: c.priceAmount,
    priceCurrency: c.priceCurrency,
    pricePerM2: c.pricePerM2,
    photoUrl: c.photoUrl,
    listingStatus: c.listingStatus,
    isIncluded: c.isIncluded,
    rooms: c.rooms,
  }));

  const includedIds = useMemo(
    () => new Set(comps.filter(c => c.isIncluded).map(c => c.id)),
    [comps],
  );

  const includedCount = includedIds.size;
  const minComps = 3;
  const maxComps = 20;
  const canProceed = includedCount >= minComps && includedCount <= maxComps;

  const avgPriceM2 = useMemo(() => {
    const included = comps.filter(c => c.isIncluded && c.pricePerM2);
    if (included.length === 0) return null;
    return Math.round(included.reduce((s, c) => s + parseFloat(c.pricePerM2!), 0) / included.length);
  }, [comps]);

  const isSearching = searchMut.isPending || compsLoading;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 129px)', minHeight: 500 }}>
      {/* Left panel */}
      <div style={{
        width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${C.border}`, background: C.bgBase, overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 18px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              {intl.formatMessage(msg.compsTitle)}
            </h3>
            <span
              aria-label={intl.formatMessage(msg.compsSelected, { count: includedCount })}
              style={{
                fontFamily: F.mono, fontSize: 12, fontWeight: 700,
                background: canProceed ? 'rgba(24,166,89,0.12)' : C.brandFaint,
                color: canProceed ? C.success : C.brand,
                borderRadius: 99, padding: '2px 10px',
              }}
            >
              {includedCount}/{comps.length}
            </span>
          </div>

          <button
            onClick={() => searchMut.mutate({ appraisalId })}
            disabled={searchMut.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 7,
              padding: '7px 12px', color: C.textSecondary,
              fontFamily: F.body, fontSize: 12, cursor: 'pointer',
              opacity: searchMut.isPending ? 0.6 : 1,
            }}
          >
            {searchMut.isPending ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
            Buscar comparables
          </button>
        </div>

        {/* Comp list */}
        <div role="group" aria-label="Comparable properties" style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {isSearching && comps.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Loader2 size={24} color={C.brand} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <div style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary }}>
                Buscando comparables…
              </div>
            </div>
          ) : comps.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: C.textTertiary, fontFamily: F.body, fontSize: 13 }}>
              {searchMut.isError
                ? `Error: ${searchMut.error.message}`
                : 'No se encontraron comparables. Verificá las coordenadas de la propiedad.'}
            </div>
          ) : (
            comps.map((comp) => {
              const sel = comp.isIncluded;
              const distKm = comp.distanceM != null ? (comp.distanceM / 1000).toFixed(1) + 'km' : '—';
              const pm2 = comp.pricePerM2 ? parseFloat(comp.pricePerM2) : null;
              const total = comp.priceAmount ? parseFloat(comp.priceAmount) : null;
              return (
                <button
                  key={comp.id}
                  role="checkbox"
                  aria-checked={sel}
                  aria-label={`${comp.address} — ${pm2 ? `USD ${pm2}/m²` : '—'}`}
                  onClick={() => toggleMut.mutate({ compId: comp.id, isIncluded: !sel })}
                  disabled={toggleMut.isPending}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    width: '100%', textAlign: 'left',
                    background: sel ? 'rgba(24,166,89,0.12)' : C.bgRaised,
                    border: `1px solid ${sel ? C.success : C.border}`,
                    borderRadius: 10, padding: 12, marginBottom: 8,
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = C.bgElevated; }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = sel ? 'rgba(24,166,89,0.12)' : C.bgRaised; }}
                >
                  <div aria-hidden="true" style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
                    border: `2px solid ${sel ? C.success : C.border}`,
                    background: sel ? C.success : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sel && <Check size={10} color="#fff" />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 2 }}>
                      {comp.address}
                    </div>
                    <div style={{ fontFamily: F.body, fontSize: 11, color: C.textSecondary, marginBottom: 6 }}>
                      {comp.propertyType ?? '—'} · {comp.coveredAreaM2 ?? '—'}m²
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {pm2 != null && (
                        <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: C.success }}>
                          ${pm2.toLocaleString('es-AR')}/m²
                        </span>
                      )}
                      {total != null && (
                        <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
                          {comp.priceCurrency ?? 'USD'} {total.toLocaleString('es-AR')}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary }}>{distKm}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Hint */}
        <div style={{ padding: '8px 18px', borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, margin: 0 }}>
            {intl.formatMessage(msg.compsHint)}
          </p>
        </div>

        {/* Summary footer */}
        {avgPriceM2 !== null && (
          <div style={{
            padding: '14px 18px', borderTop: `1px solid ${C.border}`,
            background: C.bgRaised,
          }}>
            <div style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>
              {intl.formatMessage(msg.compsSelected, { count: includedCount })} · $/m²
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 18, fontWeight: 700, color: C.success }}>
              ${avgPriceM2.toLocaleString('es-AR')}/m²
            </div>
          </div>
        )}
      </div>

      {/* Right panel: map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MapMockup comps={comps} includedIds={includedIds} />

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 24px', borderTop: `1px solid ${C.border}`,
          background: `${C.bgBase}f0`, backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <GhostBtn label={intl.formatMessage(msg.back)} onClick={onBack} />
          <PrimaryBtn
            label={intl.formatMessage(msg.next)}
            onClick={onNext}
            disabled={!canProceed}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Step 4 — Report (Narrative + Value + PDF) ─────────────── */

function Step4Report({
  appraisalId, data, onUpdate, onBack, onFinalize,
}: {
  appraisalId: string;
  data: WizardData;
  onUpdate: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
  onBack: () => void;
  onFinalize: () => void;
}) {
  const intl = useIntl();
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);

  const { data: report, isLoading: reportLoading } = trpc.appraisals.getReport.useQuery(
    { appraisalId },
    { enabled: !!appraisalId },
  );

  const narrativeMut = trpc.appraisals.generateNarrative.useMutation({
    onSuccess: (result) => {
      utils.appraisals.getReport.invalidate({ appraisalId });
      if (result.narrativeMd) onUpdate('narrative', result.narrativeMd);
      if (result.estimatedValueMin) onUpdate('valueMin', result.estimatedValueMin);
      if (result.estimatedValueMax) onUpdate('valueMax', result.estimatedValueMax);
      if (result.valueCurrency) onUpdate('valueCurrency', result.valueCurrency as 'USD' | 'ARS');
      if (result.methodologyNote) onUpdate('methodology', result.methodologyNote);
    },
  });

  const updateReportMut = trpc.appraisals.updateReport.useMutation({
    onSuccess: () => { utils.appraisals.getReport.invalidate({ appraisalId }); },
  });

  const pdfMut = trpc.appraisals.generatePdf.useMutation();
  const { data: pdfData } = trpc.appraisals.getPdfUrl.useQuery(
    { appraisalId },
    { enabled: !!appraisalId && !pdfMut.isPending },
  );

  const finalizeMut = trpc.appraisals.updateStatus.useMutation({
    onSuccess: () => onFinalize(),
  });

  // Trigger narrative generation on mount if no report exists
  useEffect(() => {
    if (appraisalId && !report && !reportLoading && !narrativeMut.isPending && !narrativeMut.isSuccess) {
      narrativeMut.mutate({ appraisalId });
    }
  }, [appraisalId, report, reportLoading]);

  // Sync report data into wizard state when loaded
  useEffect(() => {
    if (report) {
      if (report.narrativeMd && !data.narrative) onUpdate('narrative', report.narrativeMd);
      if (report.estimatedValueMin && !data.valueMin) onUpdate('valueMin', report.estimatedValueMin);
      if (report.estimatedValueMax && !data.valueMax) onUpdate('valueMax', report.estimatedValueMax);
      if (report.valueCurrency) onUpdate('valueCurrency', report.valueCurrency as 'USD' | 'ARS');
      if (report.methodologyNote && !data.methodology) onUpdate('methodology', report.methodologyNote);
    }
  }, [report]);

  const aiGenerating = narrativeMut.isPending;
  const aiGenerated = !!data.narrative;
  const pdfReady = !!pdfData?.url;

  const handleSaveReport = useCallback(() => {
    updateReportMut.mutate({
      appraisalId,
      narrativeMd: data.narrative,
      estimatedValueMin: data.valueMin,
      estimatedValueMax: data.valueMax,
      valueCurrency: data.valueCurrency,
      methodologyNote: data.methodology,
    });
  }, [appraisalId, data.narrative, data.valueMin, data.valueMax, data.valueCurrency, data.methodology]);

  const handleFinalize = useCallback(() => {
    handleSaveReport();
    finalizeMut.mutate({ id: appraisalId, status: 'approved' });
  }, [appraisalId, handleSaveReport]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 80px' }}>
      <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, color: C.textPrimary, margin: '0 0 6px' }}>
        {intl.formatMessage(msg.narrativeTitle)}
      </h2>
      <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, margin: '0 0 28px' }}>
        {intl.formatMessage(msg.narrativeGenerated)}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>

        {/* Left: AI narrative */}
        <div>
          {/* Loading state */}
          {aiGenerating && (
            <div style={{
              background: C.bgRaised, border: `1px solid ${C.ai}30`,
              borderRadius: 10, padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Loader2 size={14} color={C.ai} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontFamily: F.body, fontSize: 13, color: C.ai }}>
                  {intl.formatMessage(msg.narrativeGenerating)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[92, 78, 95, 58, 82, 70, 88].map((w, i) => (
                  <div key={i} style={{ height: 9, borderRadius: 4, background: `${C.ai}15`, width: `${w}%` }} />
                ))}
              </div>
            </div>
          )}

          {narrativeMut.isError && !aiGenerating && (
            <div style={{
              background: 'rgba(232,59,59,0.08)', border: `1px solid ${C.error}40`,
              borderRadius: 10, padding: 16, marginBottom: 12,
              fontFamily: F.body, fontSize: 13, color: C.error,
            }}>
              Error: {narrativeMut.error.message}
            </div>
          )}

          {/* Generated narrative */}
          {aiGenerated && !aiGenerating && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                background: 'rgba(126,58,242,0.12)', border: `1px solid ${C.ai}30`,
                borderBottom: 'none', borderRadius: '10px 10px 0 0',
              }}>
                <Sparkles size={13} color={C.ai} aria-hidden="true" />
                <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.aiLight, flex: 1 }}>
                  {intl.formatMessage(msg.narrativeGenerated)}
                </span>
                <button
                  onClick={() => setIsEditing(v => !v)}
                  aria-label={intl.formatMessage(msg.narrativeEdit)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: `1px solid ${C.ai}40`,
                    borderRadius: 6, padding: '4px 10px',
                    color: C.aiLight, fontFamily: F.body, fontSize: 11, cursor: 'pointer',
                  }}
                >
                  <Edit3 size={11} />
                  {intl.formatMessage(msg.narrativeEdit)}
                </button>
              </div>

              {isEditing ? (
                <textarea
                  value={data.narrative}
                  onChange={e => onUpdate('narrative', e.target.value)}
                  rows={9}
                  aria-label={intl.formatMessage(msg.narrativeEdit)}
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
                  background: 'rgba(126,58,242,0.12)', border: `1px solid ${C.ai}30`,
                  borderTop: 'none', borderLeft: `4px solid ${C.ai}`,
                  borderRadius: '0 0 10px 10px', padding: '16px 20px',
                  fontFamily: F.body, fontSize: 13, color: C.textSecondary,
                  lineHeight: 1.75, whiteSpace: 'pre-line',
                }}>
                  {data.narrative}
                </div>
              )}

              <button
                onClick={() => narrativeMut.mutate({ appraisalId })}
                disabled={narrativeMut.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, marginTop: 12,
                  padding: '7px 14px',
                  background: 'transparent', border: `1px solid ${C.ai}50`,
                  borderRadius: 8, color: C.aiLight,
                  fontFamily: F.body, fontSize: 12, cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} />
                {intl.formatMessage(msg.narrativeRegenerate)}
              </button>
            </>
          )}
        </div>

        {/* Right: value + methodology + notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: 20,
          }}>
            <h3 style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: '0 0 16px' }}>
              {intl.formatMessage(msg.reportValueEstimated)}
            </h3>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, display: 'block', marginBottom: 4 }}>
                  {intl.formatMessage(msg.reportValueMin)}
                </label>
                <input
                  type="text"
                  value={data.valueMin}
                  onChange={e => onUpdate('valueMin', e.target.value)}
                  placeholder="280,000"
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                    background: C.bgBase, border: `1px solid ${C.border}`, borderRadius: 7,
                    color: C.textPrimary, fontFamily: F.mono, fontSize: 14, outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = C.brand)}
                  onBlur={e => (e.target.style.borderColor = C.border)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, display: 'block', marginBottom: 4 }}>
                  {intl.formatMessage(msg.reportValueMax)}
                </label>
                <input
                  type="text"
                  value={data.valueMax}
                  onChange={e => onUpdate('valueMax', e.target.value)}
                  placeholder="295,000"
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                    background: C.bgBase, border: `1px solid ${C.border}`, borderRadius: 7,
                    color: C.textPrimary, fontFamily: F.mono, fontSize: 14, outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = C.brand)}
                  onBlur={e => (e.target.style.borderColor = C.border)}
                />
              </div>
              <div style={{ width: 90 }}>
                <label style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, display: 'block', marginBottom: 4 }}>
                  &nbsp;
                </label>
                <select
                  value={data.valueCurrency}
                  onChange={e => onUpdate('valueCurrency', e.target.value as 'USD' | 'ARS')}
                  aria-label="Currency"
                  style={{
                    width: '100%', padding: '8px 8px', borderRadius: 7,
                    background: C.bgBase, border: `1px solid ${C.border}`,
                    color: C.textPrimary, fontFamily: F.mono, fontSize: 13,
                    appearance: 'none', cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>
            </div>

            <div style={{ fontFamily: F.mono, fontSize: 12, color: C.textTertiary }}>
              {intl.formatMessage(msg.reportValueRange)}: {data.valueCurrency} {data.valueMin || '—'} – {data.valueCurrency} {data.valueMax || '—'}
            </div>
          </div>

          <div>
            <label style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, display: 'block', marginBottom: 6 }}>
              {intl.formatMessage(msg.reportMethodology)}
            </label>
            <textarea
              value={data.methodology}
              onChange={e => onUpdate('methodology', e.target.value)}
              rows={3}
              placeholder="Análisis comparativo de mercado (ACM)…"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 14px',
                background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.textPrimary, fontFamily: F.body, fontSize: 13,
                resize: 'vertical', outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = C.brand)}
              onBlur={e => (e.target.style.borderColor = C.border)}
            />
          </div>

          <div>
            <label style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, display: 'block', marginBottom: 6 }}>
              {intl.formatMessage(msg.reportAgentNotes)}
            </label>
            <textarea
              value={data.agentNotes}
              onChange={e => onUpdate('agentNotes', e.target.value)}
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 14px',
                background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.textPrimary, fontFamily: F.body, fontSize: 13,
                resize: 'vertical', outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = C.brand)}
              onBlur={e => (e.target.style.borderColor = C.border)}
            />
          </div>
        </div>
      </div>

      {/* PDF generation + finalize */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px', background: C.bgRaised, borderRadius: 10,
        border: `1px solid ${C.border}`,
      }}>
        <GhostBtn label={intl.formatMessage(msg.back)} onClick={onBack} />
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Save draft */}
          <button
            onClick={handleSaveReport}
            disabled={updateReportMut.isPending || !aiGenerated}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '10px 18px',
              color: C.textSecondary,
              fontFamily: F.body, fontSize: 14, cursor: 'pointer',
              opacity: updateReportMut.isPending ? 0.6 : 1,
            }}
          >
            {updateReportMut.isPending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {intl.formatMessage(msg.save)}
          </button>

          {/* PDF */}
          <button
            onClick={() => {
              if (pdfReady && pdfData?.url) {
                window.open(pdfData.url, '_blank');
              } else {
                pdfMut.mutate({ appraisalId });
              }
            }}
            disabled={pdfMut.isPending || !aiGenerated}
            aria-label={intl.formatMessage(msg.reportGeneratePdf)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: C.bgElevated, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '10px 18px',
              color: pdfMut.isPending ? C.textTertiary : C.textSecondary,
              fontFamily: F.body, fontSize: 14, cursor: pdfMut.isPending ? 'wait' : 'pointer',
            }}
          >
            <Download size={15} />
            {pdfMut.isPending
              ? intl.formatMessage(msg.narrativeGenerating)
              : pdfReady
                ? intl.formatMessage(msg.reportDownload)
                : intl.formatMessage(msg.reportGeneratePdf)
            }
          </button>

          {/* Finalize */}
          <button
            onClick={handleFinalize}
            disabled={!aiGenerated || finalizeMut.isPending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: !aiGenerated ? C.bgElevated : C.success,
              border: 'none', borderRadius: 8, padding: '10px 22px',
              color: !aiGenerated ? C.textTertiary : '#fff',
              fontFamily: F.body, fontWeight: 600, fontSize: 14,
              cursor: !aiGenerated ? 'not-allowed' : 'pointer',
              opacity: !aiGenerated ? 0.6 : 1,
            }}
          >
            {finalizeMut.isPending
              ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              : <CheckCircle2 size={15} />
            }
            {intl.formatMessage(msg.reportFinalize)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared UI helpers ─────────────────────────────────────── */

function FieldInput({ label, value, onChange, type = 'text' }: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        aria-label={label}
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

function PrimaryBtn({ label, onClick, disabled = false }: {
  label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: disabled ? C.bgElevated : C.brand,
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
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: `1px solid ${C.border}`,
        borderRadius: 8, padding: '10px 18px',
        color: C.textSecondary,
        fontFamily: F.body, fontSize: 14, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function StepNav({ onBack, onNext, nextDisabled = false, nextLabel, intl }: {
  onBack: () => void; onNext: () => void; nextDisabled?: boolean;
  nextLabel?: string;
  intl: ReturnType<typeof useIntl>;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <GhostBtn label={intl.formatMessage(msg.back)} onClick={onBack} />
      <PrimaryBtn label={nextLabel ?? intl.formatMessage(msg.next)} onClick={onNext} disabled={nextDisabled} />
    </div>
  );
}

/* ─── Root wizard ───────────────────────────────────────────── */

export default function AppraisalWizardPage({ appraisalId: editId, onClose }: {
  appraisalId?: string;
  onClose?: () => void;
}) {
  const intl = useIntl();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [appraisalId, setAppraisalId] = useState<string | null>(editId ?? null);

  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined);

  // ─── Load existing appraisal for edit mode ─────────────────
  const { data: existing, isLoading: editLoading } = trpc.appraisals.get.useQuery(
    { id: editId! },
    { enabled: !!editId },
  );

  useEffect(() => {
    if (existing) {
      setData({
        addressStreet: existing.addressStreet ?? '',
        addressNumber: existing.addressNumber ?? '',
        locality: existing.locality ?? '',
        province: existing.province ?? '',
        propertyType: existing.propertyType as PropertyType,
        operationKind: existing.operationKind as OperationKind,
        coveredAreaM2: existing.coveredAreaM2 != null ? String(existing.coveredAreaM2) : '',
        totalAreaM2: existing.totalAreaM2 != null ? String(existing.totalAreaM2) : '',
        rooms: existing.rooms != null ? String(existing.rooms) : '',
        bedrooms: existing.bedrooms != null ? String(existing.bedrooms) : '',
        bathrooms: existing.bathrooms != null ? String(existing.bathrooms) : '',
        garages: existing.garages != null ? String(existing.garages) : '',
        ageYears: existing.ageYears != null ? String(existing.ageYears) : '',
        purpose: (existing.purpose as Purpose) || '',
        notes: existing.notes ?? '',
        clientName: existing.clientName ?? '',
        narrative: '',
        valueMin: existing.estimatedValueMin ?? '',
        valueMax: existing.estimatedValueMax ?? '',
        valueCurrency: (existing.valueCurrency as 'USD' | 'ARS') ?? 'USD',
        methodology: '',
        agentNotes: '',
      });
      setAppraisalId(existing.id);
    }
  }, [existing]);

  // ─── Create / update mutations ─────────────────────────────
  const createMut = trpc.appraisals.create.useMutation({
    onSuccess: (row) => {
      setAppraisalId(row.id);
      setCurrentStep(3);
    },
  });

  const updateMut = trpc.appraisals.update.useMutation();

  const update = <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData(d => ({ ...d, [key]: value }));
  };

  const next = () => setCurrentStep(s => Math.min(s + 1, 4) as Step);
  const back = () => setCurrentStep(s => Math.max(s - 1, 1) as Step);

  // Transition Step 2 → Step 3: create or update appraisal
  const handleStep2Next = useCallback(() => {
    const numOrNull = (v: string) => { const n = parseFloat(v); return isNaN(n) ? undefined : n; };
    const intOrNull = (v: string) => { const n = parseInt(v, 10); return isNaN(n) ? undefined : n; };

    if (appraisalId) {
      updateMut.mutate({
        id: appraisalId,
        purpose: data.purpose as Purpose,
        notes: data.notes || undefined,
        addressStreet: data.addressStreet,
        addressNumber: data.addressNumber || undefined,
        locality: data.locality || undefined,
        province: data.province || undefined,
        operationKind: data.operationKind,
        coveredAreaM2: numOrNull(data.coveredAreaM2),
        totalAreaM2: numOrNull(data.totalAreaM2),
        rooms: intOrNull(data.rooms),
        bedrooms: intOrNull(data.bedrooms),
        bathrooms: intOrNull(data.bathrooms),
        garages: intOrNull(data.garages),
        ageYears: intOrNull(data.ageYears),
      }, { onSuccess: () => setCurrentStep(3) });
    } else {
      createMut.mutate({
        propertyId: selectedPropertyId,
        clientName: data.clientName,
        addressStreet: data.addressStreet,
        addressNumber: data.addressNumber || undefined,
        locality: data.locality || undefined,
        province: data.province || undefined,
        propertyType: data.propertyType,
        operationKind: data.operationKind,
        purpose: data.purpose as Purpose,
        notes: data.notes || undefined,
        valueCurrency: data.valueCurrency,
        coveredAreaM2: numOrNull(data.coveredAreaM2),
        totalAreaM2: numOrNull(data.totalAreaM2),
        rooms: intOrNull(data.rooms),
        bedrooms: intOrNull(data.bedrooms),
        bathrooms: intOrNull(data.bathrooms),
        garages: intOrNull(data.garages),
        ageYears: intOrNull(data.ageYears),
      });
    }
  }, [appraisalId, data, createMut, updateMut]);

  if (editId && editLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: C.bgBase,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Loader2 size={32} color={C.brand} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bgBase, display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <header style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', borderBottom: `1px solid ${C.border}`,
        background: C.bgBase, position: 'sticky', top: 0, zIndex: 20, flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          aria-label={intl.formatMessage(msg.cancel)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none',
            color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}
        >
          <X size={14} />
          {intl.formatMessage(msg.cancel)}
        </button>

        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, color: C.textPrimary }}>
          {intl.formatMessage(msg.wizardTitle)}
        </div>

        <div style={{ fontFamily: F.mono, fontSize: 12, color: C.textTertiary }}>
          {currentStep}/4
        </div>
      </header>

      {/* Stepper */}
      <Stepper current={currentStep} />

      {/* Step content */}
      <div style={{
        flex: 1,
        overflowY: currentStep === 3 ? 'hidden' : 'auto',
      }}>
        {currentStep === 1 && (
          <div style={{ padding: '0 40px' }}>
            <Step1Property data={data} onUpdate={update} onNext={next} onPropertySelect={setSelectedPropertyId} />
          </div>
        )}

        {currentStep === 2 && (
          <div style={{ padding: '0 40px' }}>
            <Step2Purpose
              data={data}
              onUpdate={update}
              onNext={handleStep2Next}
              onBack={back}
              isSaving={createMut.isPending || updateMut.isPending}
            />
          </div>
        )}

        {currentStep === 3 && appraisalId && (
          <Step3Comparables
            appraisalId={appraisalId}
            onNext={next}
            onBack={back}
          />
        )}

        {currentStep === 4 && appraisalId && (
          <Step4Report
            appraisalId={appraisalId}
            data={data}
            onUpdate={update}
            onBack={back}
            onFinalize={() => { if (onClose) onClose(); }}
          />
        )}
      </div>

      {/* Spinner keyframes */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
