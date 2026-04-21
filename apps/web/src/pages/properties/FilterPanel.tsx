import React, { useMemo } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import type {
  PropertyFilter,
  OperationKind,
  PropertyStatus,
  PropertyTypeName,
} from '../../routes/properties/-types.js';

/* ─────────────────────────────────────────────────────────
   FilterPanel — slide-over drawer with all §1.2 filter
   sections. No "activate filter" checkbox: empty multi-
   select means no constraint.

   Props:
   - open: controlled visibility
   - filter: current filter state
   - onChange: callback with partial update
   - onClear: clear all filters
   - onClose: close the panel
   ───────────────────────────────────────────────────────── */

const C = {
  bgOverlay:    '#121D33',
  bgRaised:     '#0D1526',
  border:       '#1F2D48',
  brand:        '#1654d9',
  brandLight:   '#4669ff',
  textPrimary:  '#EFF4FF',
  textSecondary:'#8DA0C0',
  textTertiary: '#506180',
};

const messages = defineMessages({
  title:     { id: 'filter.title' },
  clearAll:  { id: 'filter.clearAll' },
  apply:     { id: 'filter.apply' },
  sectionOperation:  { id: 'filter.section.operation' },
  sectionStatus:     { id: 'filter.section.status' },
  sectionType:       { id: 'filter.section.type' },
  sectionPrice:      { id: 'filter.section.price' },
  sectionAreaCovered:{ id: 'filter.section.areaCovered' },
  sectionAreaTotal:  { id: 'filter.section.areaTotal' },
  sectionRooms:      { id: 'filter.section.rooms' },
  sectionBedrooms:   { id: 'filter.section.bedrooms' },
  sectionBathrooms:  { id: 'filter.section.bathrooms' },
  sectionAge:        { id: 'filter.section.age' },
  sectionLocation:   { id: 'filter.section.location' },
  sectionDate:       { id: 'filter.section.date' },
  boolAll: { id: 'filter.bool.all' },
  boolYes: { id: 'filter.bool.yes' },
  boolNo:  { id: 'filter.bool.no' },
  min:     { id: 'filter.min' },
  max:     { id: 'filter.max' },
  featured:    { id: 'filter.featured' },
  publicPrice: { id: 'filter.publicPrice' },
  locationProvince:    { id: 'filter.location.province' },
  locationLocality:    { id: 'filter.location.locality' },
  locationNeighborhood:{ id: 'filter.location.neighborhood' },
  opSale:           { id: 'properties.operation.sale' },
  opRent:           { id: 'properties.operation.rent' },
  opTempRent:       { id: 'properties.operation.temp_rent' },
  opCommercialRent: { id: 'properties.operation.commercial_rent' },
  opCommercialSale: { id: 'properties.operation.commercial_sale' },
  statusActive:   { id: 'properties.status.active' },
  statusReserved: { id: 'properties.status.reserved' },
  statusSold:     { id: 'properties.status.sold' },
  statusPaused:   { id: 'properties.status.paused' },
  statusArchived: { id: 'properties.status.archived' },
  typeApartment:    { id: 'properties.type.apartment' },
  typePH:           { id: 'properties.type.ph' },
  typeHouse:        { id: 'properties.type.house' },
  typeQuinta:       { id: 'properties.type.quinta' },
  typeLand:         { id: 'properties.type.land' },
  typeOffice:       { id: 'properties.type.office' },
  typeCommercial:   { id: 'properties.type.commercial' },
  typeGarage:       { id: 'properties.type.garage' },
  typeWarehouse:    { id: 'properties.type.warehouse' },
  typeFarm:         { id: 'properties.type.farm' },
  typeHotel:        { id: 'properties.type.hotel' },
  typeBuilding:     { id: 'properties.type.building' },
  typeBusinessFund: { id: 'properties.type.business_fund' },
  typeDevelopment:  { id: 'properties.type.development' },
  ariaClose:  { id: 'filter.title' },
  ariaDialog: { id: 'filter.title' },
});

interface FilterPanelProps {
  open: boolean;
  filter: PropertyFilter;
  onChange: (partial: Partial<PropertyFilter>) => void;
  onClear: () => void;
  onClose: () => void;
}

/* ── Helpers ── */
function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

/* ── Sub-components ── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
      color: C.textTertiary, textTransform: 'uppercase',
      marginBottom: 8, paddingTop: 4,
    }}>
      {children}
    </div>
  );
}

function ChipGroup<T extends string>({
  options, selected, onToggle, colorFn,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (val: T) => void;
  colorFn?: (val: T) => string;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(({ value, label }) => {
        const active = selected.includes(value);
        const color = colorFn?.(value) ?? C.brand;
        return (
          <button
            key={value}
            onClick={() => onToggle(value)}
            style={{
              padding: '4px 10px', borderRadius: 5, fontSize: 12,
              background: active ? `${color}1a` : 'transparent',
              border: `1px solid ${active ? color : C.border}`,
              color: active ? color : C.textSecondary,
              cursor: 'pointer', transition: 'all 0.12s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {colorFn && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: active ? color : C.textTertiary,
                flexShrink: 0,
              }} />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}

function RangeInputs({
  min, max, onMin, onMax, prefix,
}: {
  min?: number; max?: number;
  onMin: (v: number | undefined) => void;
  onMax: (v: number | undefined) => void;
  prefix?: string;
}) {
  const intl = useIntl();
  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '6px 8px', borderRadius: 5, fontSize: 12,
    background: '#0A1120', border: `1px solid ${C.border}`,
    color: C.textPrimary, outline: 'none',
    fontFamily: "'DM Mono', monospace",
  };

  function parse(v: string): number | undefined {
    const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? undefined : n;
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {prefix && <span style={{ fontSize: 11, color: C.textTertiary, flexShrink: 0 }}>{prefix}</span>}
      <input
        type="text" inputMode="numeric"
        placeholder={intl.formatMessage(messages.min)}
        defaultValue={min ?? ''}
        onChange={(e) => onMin(parse(e.target.value))}
        style={inputStyle}
      />
      <span style={{ color: C.textTertiary, fontSize: 12 }}>–</span>
      <input
        type="text" inputMode="numeric"
        placeholder={intl.formatMessage(messages.max)}
        defaultValue={max ?? ''}
        onChange={(e) => onMax(parse(e.target.value))}
        style={inputStyle}
      />
    </div>
  );
}

function BoolTriple({
  label, value, onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean | undefined) => void;
}) {
  const intl = useIntl();
  const opts: { v: boolean | undefined; l: string }[] = [
    { v: undefined, l: intl.formatMessage(messages.boolAll) },
    { v: true,      l: intl.formatMessage(messages.boolYes) },
    { v: false,     l: intl.formatMessage(messages.boolNo) },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: C.textSecondary, flex: 1 }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {opts.map(({ v, l }) => {
          const active = value === v;
          return (
            <button
              key={l}
              onClick={() => onChange(v)}
              style={{
                padding: '3px 10px', borderRadius: 4, fontSize: 11,
                background: active ? `${C.brand}20` : 'transparent',
                border: `1px solid ${active ? C.brand : C.border}`,
                color: active ? C.brandLight : C.textTertiary,
                cursor: 'pointer',
              }}
            >
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: `1px solid ${C.border}`, margin: '16px 0' }} />;
}

const STATUS_COLORS: Record<PropertyStatus, string> = {
  active: '#18A659', reserved: '#F59E0B',
  sold: '#6B7FD7', paused: '#506180', archived: '#3A4E6A',
};

/* ── Main component ── */
export function FilterPanel({ open, filter, onChange, onClear, onClose }: FilterPanelProps) {
  const intl = useIntl();

  const operations: { value: OperationKind; label: string }[] = useMemo(() => [
    { value: 'sale',            label: intl.formatMessage(messages.opSale) },
    { value: 'rent',            label: intl.formatMessage(messages.opRent) },
    { value: 'temp_rent',       label: intl.formatMessage(messages.opTempRent) },
    { value: 'commercial_rent', label: intl.formatMessage(messages.opCommercialRent) },
    { value: 'commercial_sale', label: intl.formatMessage(messages.opCommercialSale) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [intl.locale]);

  const statuses: { value: PropertyStatus; label: string; color: string }[] = useMemo(() => [
    { value: 'active',   label: intl.formatMessage(messages.statusActive),   color: '#18A659' },
    { value: 'reserved', label: intl.formatMessage(messages.statusReserved), color: '#F59E0B' },
    { value: 'sold',     label: intl.formatMessage(messages.statusSold),     color: '#6B7FD7' },
    { value: 'paused',   label: intl.formatMessage(messages.statusPaused),   color: '#506180' },
    { value: 'archived', label: intl.formatMessage(messages.statusArchived), color: '#3A4E6A' },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [intl.locale]);

  const propertyTypes: { value: PropertyTypeName; label: string }[] = useMemo(() => [
    { value: 'apartment',     label: intl.formatMessage(messages.typeApartment) },
    { value: 'ph',            label: intl.formatMessage(messages.typePH) },
    { value: 'house',         label: intl.formatMessage(messages.typeHouse) },
    { value: 'quinta',        label: intl.formatMessage(messages.typeQuinta) },
    { value: 'land',          label: intl.formatMessage(messages.typeLand) },
    { value: 'office',        label: intl.formatMessage(messages.typeOffice) },
    { value: 'commercial',    label: intl.formatMessage(messages.typeCommercial) },
    { value: 'garage',        label: intl.formatMessage(messages.typeGarage) },
    { value: 'warehouse',     label: intl.formatMessage(messages.typeWarehouse) },
    { value: 'farm',          label: intl.formatMessage(messages.typeFarm) },
    { value: 'hotel',         label: intl.formatMessage(messages.typeHotel) },
    { value: 'building',      label: intl.formatMessage(messages.typeBuilding) },
    { value: 'business_fund', label: intl.formatMessage(messages.typeBusinessFund) },
    { value: 'development',   label: intl.formatMessage(messages.typeDevelopment) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [intl.locale]);

  const locationPlaceholders: Record<'province' | 'locality' | 'neighborhood', string> = useMemo(() => ({
    province:     intl.formatMessage(messages.locationProvince),
    locality:     intl.formatMessage(messages.locationLocality),
    neighborhood: intl.formatMessage(messages.locationNeighborhood),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [intl.locale]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(7,13,26,0.55)', backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
          width: 340, background: C.bgOverlay,
          borderLeft: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
        role="dialog"
        aria-label={intl.formatMessage(messages.title)}
        aria-modal="true"
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary }}>
            {intl.formatMessage(messages.title)}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClear}
              style={{
                fontSize: 12, color: C.textTertiary, background: 'none',
                border: 'none', cursor: 'pointer', padding: '3px 6px',
              }}
            >
              {intl.formatMessage(messages.clearAll)}
            </button>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 6,
                background: 'transparent', border: `1px solid ${C.border}`,
                color: C.textSecondary, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label={intl.formatMessage(messages.clearAll)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>

          <SectionTitle>{intl.formatMessage(messages.sectionOperation)}</SectionTitle>
          <ChipGroup
            options={operations}
            selected={filter.operations}
            onToggle={(v) => onChange({ operations: toggle(filter.operations, v) })}
          />

          <Divider />

          <SectionTitle>{intl.formatMessage(messages.sectionStatus)}</SectionTitle>
          <ChipGroup
            options={statuses}
            selected={filter.statuses}
            onToggle={(v) => onChange({ statuses: toggle(filter.statuses, v) })}
            colorFn={(v) => STATUS_COLORS[v]}
          />

          <Divider />

          <SectionTitle>{intl.formatMessage(messages.sectionType)}</SectionTitle>
          <ChipGroup
            options={propertyTypes}
            selected={filter.types}
            onToggle={(v) => onChange({ types: toggle(filter.types, v) })}
          />

          <Divider />

          <SectionTitle>{intl.formatMessage(messages.sectionPrice)}</SectionTitle>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {(['USD', 'ARS'] as const).map((cur) => {
              const active = filter.price.currency === cur;
              return (
                <button
                  key={cur}
                  onClick={() => onChange({ price: { ...filter.price, currency: cur } })}
                  style={{
                    padding: '4px 12px', borderRadius: 5, fontSize: 12,
                    background: active ? `${C.brand}20` : 'transparent',
                    border: `1px solid ${active ? C.brand : C.border}`,
                    color: active ? C.brandLight : C.textSecondary,
                    cursor: 'pointer',
                  }}
                >
                  {cur}
                </button>
              );
            })}
          </div>
          <RangeInputs
            min={filter.price.min}
            max={filter.price.max}
            prefix={filter.price.currency === 'USD' ? 'USD' : '$'}
            onMin={(v) => onChange({ price: { ...filter.price, min: v } })}
            onMax={(v) => onChange({ price: { ...filter.price, max: v } })}
          />

          <Divider />

          <SectionTitle>{intl.formatMessage(messages.sectionAreaCovered)}</SectionTitle>
          <RangeInputs
            min={filter.coveredArea.min}
            max={filter.coveredArea.max}
            onMin={(v) => onChange({ coveredArea: { ...filter.coveredArea, min: v } })}
            onMax={(v) => onChange({ coveredArea: { ...filter.coveredArea, max: v } })}
          />
          <div style={{ marginTop: 12 }} />
          <SectionTitle>{intl.formatMessage(messages.sectionAreaTotal)}</SectionTitle>
          <RangeInputs
            min={filter.totalArea.min}
            max={filter.totalArea.max}
            onMin={(v) => onChange({ totalArea: { ...filter.totalArea, min: v } })}
            onMax={(v) => onChange({ totalArea: { ...filter.totalArea, max: v } })}
          />

          <Divider />

          <SectionTitle>{intl.formatMessage(messages.sectionRooms)}</SectionTitle>
          <RangeInputs
            min={filter.rooms.min} max={filter.rooms.max}
            onMin={(v) => onChange({ rooms: { ...filter.rooms, min: v } })}
            onMax={(v) => onChange({ rooms: { ...filter.rooms, max: v } })}
          />
          <div style={{ marginTop: 12 }} />
          <SectionTitle>{intl.formatMessage(messages.sectionBedrooms)}</SectionTitle>
          <RangeInputs
            min={filter.bedrooms.min} max={filter.bedrooms.max}
            onMin={(v) => onChange({ bedrooms: { ...filter.bedrooms, min: v } })}
            onMax={(v) => onChange({ bedrooms: { ...filter.bedrooms, max: v } })}
          />
          <div style={{ marginTop: 12 }} />
          <SectionTitle>{intl.formatMessage(messages.sectionBathrooms)}</SectionTitle>
          <RangeInputs
            min={filter.bathrooms.min} max={filter.bathrooms.max}
            onMin={(v) => onChange({ bathrooms: { ...filter.bathrooms, min: v } })}
            onMax={(v) => onChange({ bathrooms: { ...filter.bathrooms, max: v } })}
          />

          <Divider />

          <SectionTitle>{intl.formatMessage(messages.sectionAge)}</SectionTitle>
          <RangeInputs
            min={filter.age.min} max={filter.age.max}
            onMin={(v) => onChange({ age: { ...filter.age, min: v } })}
            onMax={(v) => onChange({ age: { ...filter.age, max: v } })}
          />

          <Divider />

          <SectionTitle>{intl.formatMessage(messages.sectionLocation)}</SectionTitle>
          {(['province', 'locality', 'neighborhood'] as const).map((field) => (
            <input
              key={field}
              type="text"
              placeholder={locationPlaceholders[field]}
              defaultValue={filter[field] ?? ''}
              onChange={(e) => onChange({ [field]: e.target.value || undefined })}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '7px 10px', borderRadius: 5, fontSize: 12,
                background: '#0A1120', border: `1px solid ${C.border}`,
                color: C.textPrimary, outline: 'none', marginBottom: 6,
              }}
            />
          ))}

          <Divider />

          <SectionTitle>{intl.formatMessage(messages.sectionDate)}</SectionTitle>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['createdFrom', 'createdTo'] as const).map((field) => (
              <input
                key={field}
                type="date"
                defaultValue={filter[field] ?? ''}
                onChange={(e) => onChange({ [field]: e.target.value || undefined })}
                style={{
                  flex: 1, padding: '6px 8px', borderRadius: 5, fontSize: 12,
                  background: '#0A1120', border: `1px solid ${C.border}`,
                  color: C.textSecondary, outline: 'none',
                  colorScheme: 'dark',
                }}
              />
            ))}
          </div>

          <Divider />

          <BoolTriple
            label={intl.formatMessage(messages.featured)}
            value={filter.featured}
            onChange={(v) => onChange({ featured: v })}
          />
          <div style={{ marginTop: 10 }} />
          <BoolTriple
            label={intl.formatMessage(messages.publicPrice)}
            value={filter.hasPricePublic}
            onChange={(v) => onChange({ hasPricePublic: v })}
          />

          <div style={{ height: 24 }} />
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: 8,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 7, fontSize: 13, fontWeight: 600,
              background: C.brand, border: 'none', color: '#fff', cursor: 'pointer',
            }}
          >
            {intl.formatMessage(messages.apply)}
          </button>
        </div>
      </div>
    </>
  );
}
