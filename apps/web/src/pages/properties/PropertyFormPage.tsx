import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { useNavigate } from '@tanstack/react-router';
import { GalleryEditor, type MediaItem } from './GalleryEditor.js';
import { usePropertyDraft } from './usePropertyDraft.js';
import AIDescriptionModal from './AIDescriptionModal.js';
import type { OperationKind, PropertyStatus, PropertyTypeName } from '../../routes/properties/-types.js';

/* ─── Design tokens ─── */
const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgOverlay:     '#121D33',
  bgSubtle:      '#162035',
  border:        '#1F2D48',
  borderStrong:  '#253350',
  brand:         '#1654d9',
  brandHover:    '#1244b8',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  error:         '#EF4444',
  success:       '#22C55E',
  warning:       '#F59E0B',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

/* ─── i18n ─── */
const msg = defineMessages({
  titleNew:           { id: 'properties.form.title.new' },
  titleEdit:          { id: 'properties.form.title.edit' },
  save:               { id: 'properties.form.save' },
  cancel:             { id: 'properties.form.cancel' },
  saving:             { id: 'properties.form.saving' },
  draftSaved:         { id: 'properties.form.draft.saved' },
  draftRestore:       { id: 'properties.form.draft.restore' },
  draftRestoreYes:    { id: 'properties.form.draft.restore.yes' },
  draftRestoreNo:     { id: 'properties.form.draft.restore.no' },
  sectionBasic:       { id: 'properties.form.section.basic' },
  sectionDimensions:  { id: 'properties.form.section.dimensions' },
  sectionLocation:    { id: 'properties.form.section.location' },
  sectionOperation:   { id: 'properties.form.section.operation' },
  sectionDescription: { id: 'properties.form.section.description' },
  sectionOwners:      { id: 'properties.form.section.owners' },
  sectionMedia:       { id: 'properties.form.section.media' },
  fieldType:          { id: 'properties.form.field.type' },
  fieldTypePh:        { id: 'properties.form.field.type.placeholder' },
  fieldSubtype:       { id: 'properties.form.field.subtype' },
  fieldRefCode:       { id: 'properties.form.field.refCode' },
  fieldTitle:         { id: 'properties.form.field.title' },
  fieldTitlePh:       { id: 'properties.form.field.title.placeholder' },
  fieldStatus:        { id: 'properties.form.field.status' },
  fieldFeatured:      { id: 'properties.form.field.featured' },
  fieldPublicPrice:   { id: 'properties.form.field.publicPrice' },
  fieldBranch:        { id: 'properties.form.field.branch' },
  fieldBranchPh:      { id: 'properties.form.field.branch.placeholder' },
  fieldCoveredArea:   { id: 'properties.form.field.coveredArea' },
  fieldTotalArea:     { id: 'properties.form.field.totalArea' },
  fieldRooms:         { id: 'properties.form.field.rooms' },
  fieldBedrooms:      { id: 'properties.form.field.bedrooms' },
  fieldBathrooms:     { id: 'properties.form.field.bathrooms' },
  fieldToilets:       { id: 'properties.form.field.toilets' },
  fieldGarages:       { id: 'properties.form.field.garages' },
  fieldAgeYears:      { id: 'properties.form.field.ageYears' },
  fieldCountry:       { id: 'properties.form.field.country' },
  fieldProvince:      { id: 'properties.form.field.province' },
  fieldProvincePh:    { id: 'properties.form.field.province.placeholder' },
  fieldLocality:      { id: 'properties.form.field.locality' },
  fieldLocalityPh:    { id: 'properties.form.field.locality.placeholder' },
  fieldNeighborhood:  { id: 'properties.form.field.neighborhood' },
  fieldNeighborhoodPh:{ id: 'properties.form.field.neighborhood.placeholder' },
  fieldStreet:        { id: 'properties.form.field.street' },
  fieldStreetNumber:  { id: 'properties.form.field.streetNumber' },
  fieldGeoHint:       { id: 'properties.form.field.geocode.hint' },
  fieldDescription:   { id: 'properties.form.field.description' },
  fieldDescriptionPh: { id: 'properties.form.field.description.placeholder' },
  fieldAiGenerate:          { id: 'properties.form.field.aiGenerate' },
  fieldAiGenerateSaveFirst: { id: 'properties.form.field.aiGenerate.saveFirst' },
  fieldAiGenerating:        { id: 'properties.form.field.aiGenerating' },
  fieldTags:          { id: 'properties.form.field.tags' },
  fieldTagsPh:        { id: 'properties.form.field.tags.placeholder' },
  listingAdd:         { id: 'properties.form.listing.add' },
  listingPrice:       { id: 'properties.form.listing.price' },
  listingCurrency:    { id: 'properties.form.listing.currency' },
  listingCommission:  { id: 'properties.form.listing.commission' },
  listingRemove:      { id: 'properties.form.listing.remove' },
  ownerAdd:           { id: 'properties.form.owner.add' },
  ownerName:          { id: 'properties.form.owner.name' },
  ownerShare:         { id: 'properties.form.owner.share' },
  ownerRemove:        { id: 'properties.form.owner.remove' },
  ownerTotal:         { id: 'properties.form.owner.total' },
  valRequired:        { id: 'properties.form.validation.required' },
  valTypeRequired:    { id: 'properties.form.validation.typeRequired' },
  valListingRequired: { id: 'properties.form.validation.listingRequired' },
  // shared
  statusActive:       { id: 'properties.status.active' },
  statusReserved:     { id: 'properties.status.reserved' },
  statusSold:         { id: 'properties.status.sold' },
  statusPaused:       { id: 'properties.status.paused' },
  statusArchived:     { id: 'properties.status.archived' },
  opSale:             { id: 'properties.operation.sale' },
  opRent:             { id: 'properties.operation.rent' },
  opTempRent:         { id: 'properties.operation.temp_rent' },
  opCommercialRent:   { id: 'properties.operation.commercial_rent' },
  opCommercialSale:   { id: 'properties.operation.commercial_sale' },
  typeApartment:      { id: 'properties.type.apartment' },
  typePH:             { id: 'properties.type.ph' },
  typeHouse:          { id: 'properties.type.house' },
  typeQuinta:         { id: 'properties.type.quinta' },
  typeLand:           { id: 'properties.type.land' },
  typeOffice:         { id: 'properties.type.office' },
  typeCommercial:     { id: 'properties.type.commercial' },
  typeGarage:         { id: 'properties.type.garage' },
  typeWarehouse:      { id: 'properties.type.warehouse' },
  typeFarm:           { id: 'properties.type.farm' },
  typeHotel:          { id: 'properties.type.hotel' },
  typeBuilding:       { id: 'properties.type.building' },
  typeBusinessFund:   { id: 'properties.type.business_fund' },
  typeDevelopment:    { id: 'properties.type.development' },
});

/* ─── Form types ─── */
interface PropertyListing {
  id: string;
  kind: OperationKind;
  priceAmount: string;
  priceCurrency: 'ARS' | 'USD';
  commissionPct: string;
}

interface PropertyOwner {
  id: string;
  name: string;
  sharePct: string;
}

interface PropertyFormValues {
  propertyType: PropertyTypeName | '';
  subtype: string;
  referenceCode: string;
  title: string;
  status: PropertyStatus;
  featured: boolean;
  hasPricePublic: boolean;
  branchId: string;
  coveredAreaM2: string;
  totalAreaM2: string;
  rooms: string;
  bedrooms: string;
  bathrooms: string;
  toilets: string;
  garages: string;
  ageYears: string;
  country: string;
  province: string;
  locality: string;
  neighborhood: string;
  addressStreet: string;
  addressNumber: string;
  lat: string;
  lng: string;
  listings: PropertyListing[];
  description: string;
  tagIds: string[];
  owners: PropertyOwner[];
}

type FormErrors = Partial<Record<keyof PropertyFormValues | 'listings_root', string>>;

type DraftPayload = PropertyFormValues & { media: MediaItem[] };

const INITIAL_FORM: PropertyFormValues = {
  propertyType: '',
  subtype: '',
  referenceCode: '',
  title: '',
  status: 'active',
  featured: false,
  hasPricePublic: true,
  branchId: '',
  coveredAreaM2: '',
  totalAreaM2: '',
  rooms: '',
  bedrooms: '',
  bathrooms: '',
  toilets: '',
  garages: '',
  ageYears: '',
  country: 'AR',
  province: '',
  locality: '',
  neighborhood: '',
  addressStreet: '',
  addressNumber: '',
  lat: '',
  lng: '',
  listings: [{ id: 'init-1', kind: 'sale', priceAmount: '', priceCurrency: 'USD', commissionPct: '' }],
  description: '',
  tagIds: [],
  owners: [],
};

function genId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ─── Primitive field components ─── */
interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

function Field({ label, error, required, children, hint }: FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 500,
          fontFamily: F.body,
          color: error ? C.error : C.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: 3,
        }}
      >
        {label}
        {required && (
          <span style={{ color: C.error, fontSize: 11 }}>*</span>
        )}
      </label>
      {children}
      {hint && !error && (
        <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.body }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: 11, color: C.error, fontFamily: F.body }}>{error}</span>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.bgOverlay,
  border: `1px solid ${C.border}`,
  borderRadius: 7,
  padding: '7px 10px',
  fontSize: 13,
  fontFamily: F.body,
  color: C.textPrimary,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: C.error,
};

function TextInput({
  value,
  onChange,
  placeholder,
  error,
  type = 'text',
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      style={error ? inputErrorStyle : inputStyle}
      onFocus={(e) => { if (!error) (e.target as HTMLInputElement).style.borderColor = C.brand; }}
      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = error ? C.error : C.border; }}
    />
  );
}

function SelectInput({
  value,
  onChange,
  children,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...(error ? inputErrorStyle : inputStyle),
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238DA0C0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: 28,
        cursor: 'pointer',
      }}
      onFocus={(e) => { if (!error) (e.target as HTMLSelectElement).style.borderColor = C.brand; }}
      onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = error ? C.error : C.border; }}
    >
      {children}
    </select>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: F.body,
        color: C.textSecondary,
        userSelect: 'none',
      }}
    >
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 38,
          height: 22,
          borderRadius: 11,
          background: checked ? C.brand : C.bgOverlay,
          border: `1px solid ${checked ? C.brand : C.border}`,
          position: 'relative',
          transition: 'background 0.2s, border-color 0.2s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: 8,
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </div>
      {label}
    </label>
  );
}

/* ─── Section divider ─── */
function SectionBlock({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      style={{
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        background: C.bgRaised,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 20px 12px',
          borderBottom: `1px solid ${C.border}`,
          background: C.bgSubtle,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: F.display,
            fontSize: '0.875rem',
            fontWeight: 700,
            color: C.textPrimary,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

/* ─── Property type options ─── */
const PROPERTY_TYPES: Array<{ value: PropertyTypeName; msgKey: keyof typeof msg }> = [
  { value: 'apartment',    msgKey: 'typeApartment' },
  { value: 'ph',           msgKey: 'typePH' },
  { value: 'house',        msgKey: 'typeHouse' },
  { value: 'quinta',       msgKey: 'typeQuinta' },
  { value: 'land',         msgKey: 'typeLand' },
  { value: 'office',       msgKey: 'typeOffice' },
  { value: 'commercial',   msgKey: 'typeCommercial' },
  { value: 'garage',       msgKey: 'typeGarage' },
  { value: 'warehouse',    msgKey: 'typeWarehouse' },
  { value: 'farm',         msgKey: 'typeFarm' },
  { value: 'hotel',        msgKey: 'typeHotel' },
  { value: 'building',     msgKey: 'typeBuilding' },
  { value: 'business_fund',msgKey: 'typeBusinessFund' },
  { value: 'development',  msgKey: 'typeDevelopment' },
];

const OPERATION_KINDS: Array<{ value: OperationKind; msgKey: keyof typeof msg }> = [
  { value: 'sale',            msgKey: 'opSale' },
  { value: 'rent',            msgKey: 'opRent' },
  { value: 'temp_rent',       msgKey: 'opTempRent' },
  { value: 'commercial_rent', msgKey: 'opCommercialRent' },
  { value: 'commercial_sale', msgKey: 'opCommercialSale' },
];

const STATUSES: Array<{ value: PropertyStatus; msgKey: keyof typeof msg }> = [
  { value: 'active',   msgKey: 'statusActive' },
  { value: 'reserved', msgKey: 'statusReserved' },
  { value: 'sold',     msgKey: 'statusSold' },
  { value: 'paused',   msgKey: 'statusPaused' },
  { value: 'archived', msgKey: 'statusArchived' },
];

/* ─── Sidebar nav sections ─── */
const SECTIONS = [
  { id: 'sec-basic',       msgKey: 'sectionBasic' as const },
  { id: 'sec-dimensions',  msgKey: 'sectionDimensions' as const },
  { id: 'sec-location',    msgKey: 'sectionLocation' as const },
  { id: 'sec-operation',   msgKey: 'sectionOperation' as const },
  { id: 'sec-description', msgKey: 'sectionDescription' as const },
  { id: 'sec-owners',      msgKey: 'sectionOwners' as const },
  { id: 'sec-media',       msgKey: 'sectionMedia' as const },
];

/* ─── PropertyFormPage ─── */
interface PropertyFormPageProps {
  propertyId?: string; // undefined = create, defined = edit
}

export function PropertyFormPage({ propertyId }: PropertyFormPageProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const isEdit = Boolean(propertyId);
  const draftKey = propertyId ?? 'new';

  const [form, setForm] = useState<PropertyFormValues>(INITIAL_FORM);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(SECTIONS[0]!.id);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const { saveDraft, loadDraft, clearDraft, hasDraft } = usePropertyDraft<DraftPayload>(draftKey);

  /* Draft restore on mount */
  useEffect(() => {
    if (hasDraft()) setShowDraftBanner(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const restoreDraft = () => {
    const draft = loadDraft();
    if (draft) {
      const { media: draftMedia, ...formValues } = draft;
      setForm(formValues);
      setMedia(draftMedia ?? []);
    }
    setShowDraftBanner(false);
  };

  const discardDraft = () => {
    clearDraft();
    setShowDraftBanner(false);
  };

  /* Auto-save every 30s */
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft({ ...form, media });
      setDraftSavedAt(new Date());
    }, 30_000);
    return () => clearInterval(interval);
  }, [form, media, saveDraft]);

  /* Intersection observer for active section tracking */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );
    for (const sec of SECTIONS) {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  /* Field helpers */
  const setField = <K extends keyof PropertyFormValues>(key: K, value: PropertyFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  /* Listing CRUD */
  const addListing = () => {
    setField('listings', [
      ...form.listings,
      { id: genId(), kind: 'rent', priceAmount: '', priceCurrency: 'USD', commissionPct: '' },
    ]);
  };

  const updateListing = (id: string, patch: Partial<PropertyListing>) => {
    setField(
      'listings',
      form.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  };

  const removeListing = (id: string) => {
    setField('listings', form.listings.filter((l) => l.id !== id));
  };

  /* Owner CRUD */
  const addOwner = () => {
    setField('owners', [
      ...form.owners,
      { id: genId(), name: '', sharePct: '' },
    ]);
  };

  const updateOwner = (id: string, patch: Partial<PropertyOwner>) => {
    setField('owners', form.owners.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const removeOwner = (id: string) => {
    setField('owners', form.owners.filter((o) => o.id !== id));
  };

  const ownerTotal = form.owners.reduce((sum, o) => sum + (parseFloat(o.sharePct) || 0), 0);

  /* Tag input */
  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !form.tagIds.includes(trimmed)) {
      setField('tagIds', [...form.tagIds, trimmed]);
    }
    setTagInput('');
  };

  const handleAiGenerate = () => {
    setShowAiModal(true);
  };

  const handleAiSave = (text: string) => {
    setField('description', text);
  };

  /* Validation */
  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.propertyType) errs.propertyType = intl.formatMessage(msg.valTypeRequired);
    if (!form.referenceCode.trim()) errs.referenceCode = intl.formatMessage(msg.valRequired);
    if (form.listings.length === 0) errs.listings_root = intl.formatMessage(msg.valListingRequired);
    return errs;
  };

  /* Submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error section
      if (errs.propertyType || errs.referenceCode) {
        document.getElementById('sec-basic')?.scrollIntoView({ behavior: 'smooth' });
      } else if (errs.listings_root) {
        document.getElementById('sec-operation')?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    setSaving(true);
    try {
      // Stub API call — replace with trpc.properties.create/update when API is ready
      await new Promise((res) => setTimeout(res, 400));
      clearDraft();
      void (navigate as (opts: { to: string }) => Promise<void>)({ to: '/properties' });
    } finally {
      setSaving(false);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      style={{
        minHeight: '100%',
        fontFamily: F.body,
        background: C.bgBase,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Page header ── */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: `1px solid ${C.border}`,
          background: C.bgBase,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Back breadcrumb */}
          <button
            type="button"
            onClick={() => navigate({ to: '/properties' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.textTertiary,
              fontSize: 12,
              fontFamily: F.body,
              padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Propiedades
          </button>
          <span style={{ color: C.border }}>/</span>
          <h1
            style={{
              fontFamily: F.display,
              fontSize: '1rem',
              fontWeight: 700,
              color: C.textPrimary,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            {isEdit ? intl.formatMessage(msg.titleEdit) : intl.formatMessage(msg.titleNew)}
          </h1>
        </div>

        {/* Draft saved indicator */}
        {draftSavedAt && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              color: C.textTertiary,
              fontFamily: F.body,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: C.success,
              }}
            />
            {intl.formatMessage(msg.draftSaved)}
          </div>
        )}
      </div>

      {/* ── Draft restore banner ── */}
      {showDraftBanner && (
        <div
          style={{
            background: `${C.brand}15`,
            border: `1px solid ${C.brand}40`,
            borderRadius: 0,
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 13, color: C.textSecondary, fontFamily: F.body }}>
            {intl.formatMessage(msg.draftRestore)}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={restoreDraft}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                background: C.brand,
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontFamily: F.body,
              }}
            >
              {intl.formatMessage(msg.draftRestoreYes)}
            </button>
            <button
              type="button"
              onClick={discardDraft}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 12,
                background: 'none',
                border: `1px solid ${C.border}`,
                color: C.textSecondary,
                cursor: 'pointer',
                fontFamily: F.body,
              }}
            >
              {intl.formatMessage(msg.draftRestoreNo)}
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout: sidebar + content ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          gap: 0,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ── Sidebar ── */}
        <aside
          style={{
            position: 'sticky',
            top: 57,
            height: 'calc(100vh - 57px)',
            overflowY: 'auto',
            borderRight: `1px solid ${C.border}`,
            padding: '20px 0',
            background: C.bgBase,
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
            {SECTIONS.map((sec) => {
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => scrollTo(sec.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 10px',
                    borderRadius: 7,
                    border: 'none',
                    background: isActive ? `${C.brand}18` : 'transparent',
                    color: isActive ? C.brand : C.textTertiary,
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    fontFamily: F.body,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: isActive ? C.brand : C.border,
                      flexShrink: 0,
                      transition: 'background 0.15s',
                    }}
                  />
                  {intl.formatMessage(msg[sec.msgKey])}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Form content ── */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '20px 24px 100px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
            maxWidth: 820,
          }}
        >
          {/* ── Section 1: Datos básicos ── */}
          <SectionBlock id="sec-basic" title={intl.formatMessage(msg.sectionBasic)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field
                label={intl.formatMessage(msg.fieldType)}
                required
                error={errors.propertyType}
              >
                <SelectInput
                  value={form.propertyType}
                  onChange={(v) => setField('propertyType', v as PropertyTypeName)}
                  error={Boolean(errors.propertyType)}
                >
                  <option value="" style={{ background: C.bgOverlay }}>
                    {intl.formatMessage(msg.fieldTypePh)}
                  </option>
                  {PROPERTY_TYPES.map(({ value, msgKey }) => (
                    <option key={value} value={value} style={{ background: C.bgOverlay }}>
                      {intl.formatMessage(msg[msgKey])}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field label={intl.formatMessage(msg.fieldSubtype)}>
                <TextInput
                  value={form.subtype}
                  onChange={(v) => setField('subtype', v)}
                  placeholder="Ej: Duplex, Chalet…"
                />
              </Field>

              <Field
                label={intl.formatMessage(msg.fieldRefCode)}
                required
                error={errors.referenceCode}
              >
                <TextInput
                  value={form.referenceCode}
                  onChange={(v) => setField('referenceCode', v)}
                  error={Boolean(errors.referenceCode)}
                  placeholder="Ej: A-001"
                />
              </Field>

              <Field label={intl.formatMessage(msg.fieldStatus)}>
                <SelectInput
                  value={form.status}
                  onChange={(v) => setField('status', v as PropertyStatus)}
                >
                  {STATUSES.map(({ value, msgKey }) => (
                    <option key={value} value={value} style={{ background: C.bgOverlay }}>
                      {intl.formatMessage(msg[msgKey])}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <div style={{ gridColumn: '1 / -1' }}>
                <Field label={intl.formatMessage(msg.fieldTitle)}>
                  <TextInput
                    value={form.title}
                    onChange={(v) => setField('title', v)}
                    placeholder={intl.formatMessage(msg.fieldTitlePh)}
                  />
                </Field>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <Field label={intl.formatMessage(msg.fieldBranch)}>
                  <SelectInput
                    value={form.branchId}
                    onChange={(v) => setField('branchId', v)}
                  >
                    <option value="" style={{ background: C.bgOverlay }}>
                      {intl.formatMessage(msg.fieldBranchPh)}
                    </option>
                    {/* Branches loaded from API in Phase B */}
                  </SelectInput>
                </Field>
              </div>

              <Toggle
                checked={form.featured}
                onChange={(v) => setField('featured', v)}
                label={intl.formatMessage(msg.fieldFeatured)}
              />

              <Toggle
                checked={form.hasPricePublic}
                onChange={(v) => setField('hasPricePublic', v)}
                label={intl.formatMessage(msg.fieldPublicPrice)}
              />
            </div>
          </SectionBlock>

          {/* ── Section 2: Dimensiones ── */}
          <SectionBlock id="sec-dimensions" title={intl.formatMessage(msg.sectionDimensions)}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {(
                [
                  { key: 'coveredAreaM2', msgKey: 'fieldCoveredArea' },
                  { key: 'totalAreaM2',   msgKey: 'fieldTotalArea' },
                  { key: 'rooms',         msgKey: 'fieldRooms' },
                  { key: 'bedrooms',      msgKey: 'fieldBedrooms' },
                  { key: 'bathrooms',     msgKey: 'fieldBathrooms' },
                  { key: 'toilets',       msgKey: 'fieldToilets' },
                  { key: 'garages',       msgKey: 'fieldGarages' },
                  { key: 'ageYears',      msgKey: 'fieldAgeYears' },
                ] as const
              ).map(({ key, msgKey }) => (
                <Field key={key} label={intl.formatMessage(msg[msgKey])}>
                  <TextInput
                    value={form[key]}
                    onChange={(v) => setField(key, v)}
                    type="number"
                    placeholder="—"
                  />
                </Field>
              ))}
            </div>
          </SectionBlock>

          {/* ── Section 3: Ubicación ── */}
          <SectionBlock id="sec-location" title={intl.formatMessage(msg.sectionLocation)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Google Places hint */}
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: C.textTertiary,
                  fontFamily: F.body,
                  background: C.bgOverlay,
                  border: `1px dashed ${C.border}`,
                  borderRadius: 7,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary} strokeWidth="1.5" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                {intl.formatMessage(msg.fieldGeoHint)}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <Field label={intl.formatMessage(msg.fieldProvince)}>
                  <TextInput
                    value={form.province}
                    onChange={(v) => setField('province', v)}
                    placeholder={intl.formatMessage(msg.fieldProvincePh)}
                  />
                </Field>
                <Field label={intl.formatMessage(msg.fieldLocality)}>
                  <TextInput
                    value={form.locality}
                    onChange={(v) => setField('locality', v)}
                    placeholder={intl.formatMessage(msg.fieldLocalityPh)}
                  />
                </Field>
                <Field label={intl.formatMessage(msg.fieldNeighborhood)}>
                  <TextInput
                    value={form.neighborhood}
                    onChange={(v) => setField('neighborhood', v)}
                    placeholder={intl.formatMessage(msg.fieldNeighborhoodPh)}
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                <Field label={intl.formatMessage(msg.fieldStreet)}>
                  <TextInput
                    value={form.addressStreet}
                    onChange={(v) => setField('addressStreet', v)}
                    placeholder="Av. Santa Fe"
                  />
                </Field>
                <Field label={intl.formatMessage(msg.fieldStreetNumber)}>
                  <TextInput
                    value={form.addressNumber}
                    onChange={(v) => setField('addressNumber', v)}
                    placeholder="3500"
                  />
                </Field>
              </div>

              {/* Map pin placeholder */}
              <div
                style={{
                  height: 200,
                  borderRadius: 10,
                  border: `1px dashed ${C.border}`,
                  background: C.bgOverlay,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary} strokeWidth="1.5" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.body }}>
                  Mapa interactivo — Google Places (Phase B API)
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Field label="Lat">
                    <TextInput
                      value={form.lat}
                      onChange={(v) => setField('lat', v)}
                      type="number"
                      placeholder="-34.5840"
                    />
                  </Field>
                  <Field label="Lng">
                    <TextInput
                      value={form.lng}
                      onChange={(v) => setField('lng', v)}
                      type="number"
                      placeholder="-58.4269"
                    />
                  </Field>
                </div>
              </div>
            </div>
          </SectionBlock>

          {/* ── Section 4: Operación ── */}
          <SectionBlock id="sec-operation" title={intl.formatMessage(msg.sectionOperation)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {errors.listings_root && (
                <p style={{ margin: 0, fontSize: 12, color: C.error, fontFamily: F.body }}>
                  {errors.listings_root}
                </p>
              )}

              {form.listings.map((listing, idx) => (
                <div
                  key={listing.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1.5fr 1fr 80px auto',
                    gap: 12,
                    alignItems: 'end',
                    padding: '14px 16px',
                    borderRadius: 9,
                    background: C.bgOverlay,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <Field label="Operación">
                    <SelectInput
                      value={listing.kind}
                      onChange={(v) => updateListing(listing.id, { kind: v as OperationKind })}
                    >
                      {OPERATION_KINDS.map(({ value, msgKey }) => (
                        <option key={value} value={value} style={{ background: C.bgOverlay }}>
                          {intl.formatMessage(msg[msgKey])}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>

                  <Field label={intl.formatMessage(msg.listingPrice)}>
                    <TextInput
                      value={listing.priceAmount}
                      onChange={(v) => updateListing(listing.id, { priceAmount: v })}
                      type="number"
                      placeholder="0"
                    />
                  </Field>

                  <Field label={intl.formatMessage(msg.listingCurrency)}>
                    <SelectInput
                      value={listing.priceCurrency}
                      onChange={(v) => updateListing(listing.id, { priceCurrency: v as 'ARS' | 'USD' })}
                    >
                      <option value="USD" style={{ background: C.bgOverlay }}>USD</option>
                      <option value="ARS" style={{ background: C.bgOverlay }}>ARS</option>
                    </SelectInput>
                  </Field>

                  <Field label={intl.formatMessage(msg.listingCommission)}>
                    <TextInput
                      value={listing.commissionPct}
                      onChange={(v) => updateListing(listing.id, { commissionPct: v })}
                      type="number"
                      placeholder="3"
                    />
                  </Field>

                  <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 1 }}>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => removeListing(listing.id)}
                        style={{
                          background: 'none',
                          border: `1px solid ${C.border}`,
                          borderRadius: 6,
                          padding: '6px 10px',
                          fontSize: 12,
                          color: C.error,
                          cursor: 'pointer',
                          fontFamily: F.body,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {intl.formatMessage(msg.listingRemove)}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {form.listings.length < 5 && (
                <button
                  type="button"
                  onClick={addListing}
                  style={{
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 7,
                    border: `1px dashed ${C.border}`,
                    background: 'transparent',
                    color: C.textTertiary,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: F.body,
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = C.brand;
                    (e.currentTarget as HTMLButtonElement).style.color = C.brand;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                    (e.currentTarget as HTMLButtonElement).style.color = C.textTertiary;
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {intl.formatMessage(msg.listingAdd)}
                </button>
              )}
            </div>
          </SectionBlock>

          {/* ── Section 5: Descripción ── */}
          <SectionBlock id="sec-description" title={intl.formatMessage(msg.sectionDescription)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: F.body,
                      color: C.textSecondary,
                    }}
                  >
                    {intl.formatMessage(msg.fieldDescription)}
                  </label>
                  <button
                    type="button"
                    onClick={propertyId ? handleAiGenerate : undefined}
                    disabled={!propertyId}
                    title={!propertyId ? intl.formatMessage(msg.fieldAiGenerateSaveFirst) : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: `1px solid ${propertyId ? 'rgba(126,58,242,0.4)' : 'rgba(126,58,242,0.15)'}`,
                      background: `rgba(126,58,242,${propertyId ? '0.12' : '0.05'})`,
                      color: propertyId ? '#9B59FF' : 'rgba(155,89,255,0.4)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: propertyId ? 'pointer' : 'default',
                      fontFamily: F.body,
                      transition: 'background 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 10 }}>✦</span>
                    {intl.formatMessage(msg.fieldAiGenerate)}
                  </button>
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder={intl.formatMessage(msg.fieldDescriptionPh)}
                  rows={6}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    lineHeight: 1.6,
                  }}
                  onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = C.brand; }}
                  onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = C.border; }}
                />
              </div>

              {/* Tags */}
              <Field label={intl.formatMessage(msg.fieldTags)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {form.tagIds.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 8px',
                          borderRadius: 5,
                          background: `${C.brand}20`,
                          border: `1px solid ${C.brand}40`,
                          color: C.brand,
                          fontSize: 11,
                          fontFamily: F.body,
                          fontWeight: 500,
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setField('tagIds', form.tagIds.filter((t) => t !== tag))}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            color: C.brand,
                            lineHeight: 1,
                            display: 'flex',
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder={intl.formatMessage(msg.fieldTagsPh)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addTag(tagInput);
                        }
                      }}
                      style={{ ...inputStyle, flex: 1 }}
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = C.brand; }}
                      onBlur={(e) => {
                        (e.target as HTMLInputElement).style.borderColor = C.border;
                        if (tagInput.trim()) addTag(tagInput);
                      }}
                    />
                  </div>
                </div>
              </Field>
            </div>
          </SectionBlock>

          {/* ── Section 6: Propietarios ── */}
          <SectionBlock id="sec-owners" title={intl.formatMessage(msg.sectionOwners)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {form.owners.map((owner) => (
                <div
                  key={owner.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px auto',
                    gap: 12,
                    alignItems: 'end',
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: C.bgOverlay,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <Field label={intl.formatMessage(msg.ownerName)}>
                    <TextInput
                      value={owner.name}
                      onChange={(v) => updateOwner(owner.id, { name: v })}
                      placeholder="Nombre y apellido"
                    />
                  </Field>
                  <Field label={intl.formatMessage(msg.ownerShare)}>
                    <TextInput
                      value={owner.sharePct}
                      onChange={(v) => updateOwner(owner.id, { sharePct: v })}
                      type="number"
                      placeholder="50"
                    />
                  </Field>
                  <div style={{ paddingBottom: 1 }}>
                    <button
                      type="button"
                      onClick={() => removeOwner(owner.id)}
                      style={{
                        background: 'none',
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: 12,
                        color: C.error,
                        cursor: 'pointer',
                        fontFamily: F.body,
                      }}
                    >
                      {intl.formatMessage(msg.ownerRemove)}
                    </button>
                  </div>
                </div>
              ))}

              {/* Total share indicator */}
              {form.owners.length > 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: Math.abs(ownerTotal - 100) < 0.01 ? C.success : C.warning,
                    fontFamily: F.mono,
                  }}
                >
                  {intl.formatMessage(msg.ownerTotal, { pct: ownerTotal.toFixed(1) })}
                </div>
              )}

              <button
                type="button"
                onClick={addOwner}
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 7,
                  border: `1px dashed ${C.border}`,
                  background: 'transparent',
                  color: C.textTertiary,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: F.body,
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.brand;
                  (e.currentTarget as HTMLButtonElement).style.color = C.brand;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                  (e.currentTarget as HTMLButtonElement).style.color = C.textTertiary;
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {intl.formatMessage(msg.ownerAdd)}
              </button>
            </div>
          </SectionBlock>

          {/* ── Section 7: Multimedia ── */}
          <SectionBlock id="sec-media" title={intl.formatMessage(msg.sectionMedia)}>
            <GalleryEditor items={media} onChange={setMedia} />
          </SectionBlock>
        </form>
      </div>

      {/* ── Sticky action footer ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 220, // sidebar width
          right: 0,
          padding: '12px 24px',
          background: C.bgBase,
          borderTop: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          zIndex: 15,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: '/properties' })}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            background: 'none',
            border: `1px solid ${C.border}`,
            color: C.textSecondary,
            cursor: 'pointer',
            fontFamily: F.body,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.borderStrong; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; }}
        >
          {intl.formatMessage(msg.cancel)}
        </button>

        <button
          type="submit"
          form=""
          onClick={handleSubmit}
          disabled={saving}
          style={{
            padding: '8px 24px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            background: saving ? C.bgOverlay : C.brand,
            border: 'none',
            color: saving ? C.textTertiary : '#fff',
            cursor: saving ? 'default' : 'pointer',
            fontFamily: F.body,
            transition: 'background 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onMouseEnter={(e) => {
            if (!saving) (e.currentTarget as HTMLButtonElement).style.background = C.brandHover;
          }}
          onMouseLeave={(e) => {
            if (!saving) (e.currentTarget as HTMLButtonElement).style.background = C.brand;
          }}
        >
          {saving && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ animation: 'spin 1s linear infinite' }}
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          )}
          {saving ? intl.formatMessage(msg.saving) : intl.formatMessage(msg.save)}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { opacity: 0.3; }
        select option { background: #0D1526; color: #EFF4FF; }
      `}</style>

      {propertyId && (
        <AIDescriptionModal
          open={showAiModal}
          onClose={() => setShowAiModal(false)}
          onSave={handleAiSave}
          propertyId={propertyId}
          propertyRef={form.referenceCode || undefined}
          existingDescription={form.description || undefined}
        />
      )}
    </div>
  );
}
