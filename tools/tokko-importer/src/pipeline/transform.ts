// Transforms Tokko API shapes into Corredor import API shapes.

import type {
  TokkoProperty,
  TokkoContact,
  TokkoLead,
  TokkoUser,
  CorredorImportProperty,
  CorredorImportContact,
  CorredorImportLead,
  CorredorImportUser,
} from '../types.js';
import { stripHtml } from '../utils/html.js';
import { normalizePhone } from '../utils/phone.js';

const OP_MAP: Record<string, string> = {
  Venta: 'sale',
  Alquiler: 'rent',
  'Alquiler Temporario': 'temporary_rent',
  '1': 'sale',
  '2': 'rent',
  '3': 'temporary_rent',
};

const PROP_TYPE_MAP: Record<string, string> = {
  Terreno: 'land',
  Departamento: 'apartment',
  Casa: 'house',
  Quinta: 'quinta',
  Oficina: 'office',
  Local: 'commercial',
  Cochera: 'garage',
  PH: 'ph',
  'Galpón': 'warehouse',
  Campo: 'farm',
  Hotel: 'hotel',
  Edificio: 'building',
  'Fondo de comercio': 'business',
  Emprendimiento: 'development',
};

type OpEntry = NonNullable<CorredorImportProperty['operations']>[number];
type LocationEntry = NonNullable<CorredorImportProperty['location']>;

export function transformProperty(p: TokkoProperty): CorredorImportProperty {
  const typeName = p.type?.name ?? '';
  const propertyType = PROP_TYPE_MAP[typeName] ?? typeName.toLowerCase().replace(/\s+/g, '_');

  const operations: OpEntry[] = [];
  for (const op of p.operations ?? []) {
    const mappedType = OP_MAP[op.operation_type];
    if (!mappedType) continue;
    const firstPrice = op.prices?.[0];
    const entry: OpEntry = { type: mappedType };
    if (firstPrice?.price != null && firstPrice.price > 0) {
      entry.price = { amount: firstPrice.price, currency: firstPrice.currency ?? 'USD' };
    }
    if (p.web_price !== undefined) {
      entry.show_price = p.web_price;
    }
    if (firstPrice?.period) {
      entry.rent_period = firstPrice.period;
    }
    operations.push(entry);
  }

  const location: LocationEntry = {};
  if (p.address) location.address = p.address;
  const locationName = p.location?.name;
  if (locationName) location.zona = locationName;
  if (p.geo_lat != null) location.lat = p.geo_lat;
  if (p.geo_long != null) location.lng = p.geo_long;

  const photos = (p.photos ?? []).map((ph, i) => ({
    url: ph.image,
    order: ph.order ?? i,
  }));

  const videos = p.videos ?? [];
  const floorPlans = (p.floor_plans ?? []).map((fp) => ({ url: fp.image }));
  const customTags = (p.tags ?? []).map((t) => t.name);
  const description = stripHtml(p.description);
  const hasLocation = Object.keys(location).length > 0;

  return {
    external_source: 'tokko',
    external_id: String(p.id),
    property_type: propertyType,
    status: p.status ?? 'active',
    ...(hasLocation && { location }),
    ...(operations.length > 0 && { operations }),
    ...(p.surface_total != null && { surface_total: p.surface_total }),
    ...(p.surface_covered != null && { surface_covered: p.surface_covered }),
    ...(p.rooms != null && { rooms: p.rooms }),
    ...(p.bedrooms != null && { bedrooms: p.bedrooms }),
    ...(p.bathrooms != null && { bathrooms: p.bathrooms }),
    ...(p.age != null && { building_age_years: p.age }),
    ...(description && { description }),
    ...(photos.length > 0 && { photos }),
    ...(videos.length > 0 && { videos }),
    ...(floorPlans.length > 0 && { floor_plans: floorPlans }),
    ...(customTags.length > 0 && { custom_tags: customTags }),
    ...(p.sale_status && { sale_status: p.sale_status }),
    ...(p.rental_status && { rental_status: p.rental_status }),
    ...(p.reference_code && { legacy_reference: p.reference_code }),
    ...(p.deleted && { deleted_at: p.updated_at ?? new Date().toISOString() }),
    ...(p.created_at && { created_at: p.created_at }),
    ...(p.updated_at && { updated_at: p.updated_at }),
    ...(p.producer?.id && { producer_external_id: String(p.producer.id) }),
    ...(p.branch?.id && { branch_external_id: String(p.branch.id) }),
  };
}

export function transformContact(c: TokkoContact): CorredorImportContact {
  const emailVal = c.email?.trim();
  const emails: NonNullable<CorredorImportContact['emails']> = emailVal
    ? [{ value: emailVal, type: 'main', primary: true }]
    : [];

  const phones: NonNullable<CorredorImportContact['phones']> = [];
  const phonesRaw: NonNullable<CorredorImportContact['phones_raw']> = [];

  for (const [raw, type] of [
    [c.cellphone, 'mobile'],
    [c.phone, 'phone'],
  ] as const) {
    if (!raw?.trim()) continue;
    const { e164, normalized } = normalizePhone(raw.trim());
    if (normalized) {
      phones.push({ e164, type, whatsapp: type === 'mobile', primary: phones.length === 0 });
    } else {
      phonesRaw.push({ value: raw });
    }
  }

  const isPlaceholder = (c.first_name ?? '').startsWith('Propietario de');
  const firstName = c.first_name?.trim() || undefined;
  const lastName = c.last_name?.trim() || undefined;
  const address = c.address?.trim() || undefined;
  const notes = c.notes?.trim() || undefined;
  const birthDate = c.birth_date?.trim() || undefined;
  const country = c.country?.trim() || undefined;

  return {
    external_source: 'tokko',
    external_id: String(c.id),
    kind: 'person',
    ...(firstName && { first_name: firstName }),
    ...(lastName && { last_name: lastName }),
    ...(emails.length > 0 && { emails }),
    ...(phones.length > 0 && { phones }),
    ...(phonesRaw.length > 0 && { phones_raw: phonesRaw }),
    ...(address && { addresses: [{ street: address }] }),
    ...(notes && { notes }),
    ...(birthDate && { birth_date: birthDate }),
    ...(country && { country_code: country }),
    ...(isPlaceholder && { owner_is_placeholder: true }),
    ...(c.created_at && { created_at: c.created_at }),
    ...(c.assigned_broker?.id && { owner_external_id: String(c.assigned_broker.id) }),
  };
}

export function transformLead(lead: TokkoLead): CorredorImportLead {
  const contactId = String(lead.contact?.id ?? '');

  const propertyIds = (lead.properties ?? []).map((p) => String(p.id));

  const followUps: NonNullable<CorredorImportLead['follow_ups']> = (lead.comments ?? []).map(
    (cm) => ({
      note: cm.text,
      created_at: cm.created_at,
      ...(cm.author?.id && { author_external_id: String(cm.author.id) }),
    }),
  );

  return {
    external_source: 'tokko',
    external_id: String(lead.id),
    contact_external_id: contactId,
    stage_name: lead.status?.name ?? 'Nuevo',
    ...(propertyIds.length > 0 && { property_external_ids: propertyIds }),
    ...(lead.close_reason?.name && { close_reason: lead.close_reason.name }),
    ...(lead.budget != null && { budget_amount: lead.budget }),
    ...(lead.budget_currency && { budget_currency: lead.budget_currency }),
    ...(followUps.length > 0 && { follow_ups: followUps }),
    ...(lead.assigned_broker?.id && { assigned_external_id: String(lead.assigned_broker.id) }),
    ...(lead.created_at && { created_at: lead.created_at }),
    ...(lead.updated_at && { updated_at: lead.updated_at }),
  };
}

export function transformUser(u: TokkoUser): CorredorImportUser | null {
  if (!u.email?.trim()) return null;

  const firstName = u.first_name?.trim() || undefined;
  const lastName = u.last_name?.trim() || undefined;

  return {
    external_source: 'tokko',
    external_id: String(u.id),
    email: u.email.trim(),
    role: u.role ?? 'agent',
    ...(firstName && { first_name: firstName }),
    ...(lastName && { last_name: lastName }),
    ...(u.branch?.id && { branch_external_id: String(u.branch.id) }),
    ...(u.active !== undefined && { active: u.active }),
  };
}
