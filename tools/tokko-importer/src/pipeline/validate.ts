// Validation stage — decides skip/warn per entity before transform.
// Rules from PM spec §3.2.

import type { TokkoProperty, TokkoContact, TokkoLead } from '../types.js';

export interface ValidationWarning {
  type: string;
  message: string;
}

export interface ValidationResult {
  skip: boolean;
  skipReason?: string;
  warnings: ValidationWarning[];
}

// -------------------------------------------------------------------------
// Known property types (anything else → skip)
// -------------------------------------------------------------------------

const KNOWN_PROPERTY_TYPES = new Set([
  'Terreno', 'Departamento', 'Casa', 'Quinta', 'Oficina', 'Local',
  'Cochera', 'PH', 'Galpón', 'Campo', 'Hotel', 'Edificio',
  'Fondo de comercio', 'Emprendimiento',
]);

const KNOWN_OPERATION_TYPES = new Set(['Venta', 'Alquiler', 'Alquiler Temporario', '1', '2', '3']);

export function validateProperty(p: TokkoProperty): ValidationResult {
  const warnings: ValidationWarning[] = [];

  // Skip: unknown property type
  const typeName = p.type?.name ?? '';
  if (typeName && !KNOWN_PROPERTY_TYPES.has(typeName)) {
    return { skip: true, skipReason: `type_unknown:${typeName}`, warnings };
  }

  // Skip: no valid operations
  const validOps = (p.operations ?? []).filter(
    (op) => KNOWN_OPERATION_TYPES.has(op.operation_type),
  );
  if (!validOps.length) {
    return { skip: true, skipReason: 'no_valid_operation', warnings };
  }

  // Warn: price is 0
  for (const op of validOps) {
    const price = op.prices?.[0]?.price;
    if (price === 0) {
      warnings.push({ type: 'price_zero', message: `Operation ${op.operation_type} has price 0` });
    }
  }

  // Warn: invalid surface
  if (p.surface_total !== undefined && p.surface_total !== null && p.surface_total <= 0) {
    warnings.push({ type: 'invalid_surface', message: `surface_total=${p.surface_total} is invalid` });
  }

  // Warn: no location data
  if (!p.address && p.geo_lat == null && p.geo_long == null) {
    warnings.push({ type: 'no_location', message: 'No address or coordinates' });
  }

  return { skip: false, warnings };
}

// -------------------------------------------------------------------------
// Contacts
// -------------------------------------------------------------------------

const PLACEHOLDER_EMAIL_DOMAINS = ['tokko.com'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_OWNER_PREFIX = 'Propietario de';

export function validateContact(c: TokkoContact): ValidationResult {
  const warnings: ValidationWarning[] = [];

  // Skip: no identifying fields
  const hasName = !!(c.first_name?.trim() || c.last_name?.trim());
  const hasContact = !!(c.email?.trim() || c.phone?.trim() || c.cellphone?.trim());
  if (!hasName && !hasContact) {
    return { skip: true, skipReason: 'contact_empty', warnings };
  }

  // Warn: invalid email format
  const email = c.email?.trim() ?? '';
  if (email && !EMAIL_RE.test(email)) {
    warnings.push({ type: 'invalid_email', message: `Email "${email}" is not valid` });
  }

  // Warn: placeholder email
  if (email) {
    const domain = email.split('@')[1]?.toLowerCase() ?? '';
    if (PLACEHOLDER_EMAIL_DOMAINS.some((d) => domain === d)) {
      warnings.push({ type: 'placeholder_email', message: `Email "${email}" is a Tokko placeholder` });
    }
  }

  // Warn: placeholder owner name
  if ((c.first_name ?? '').startsWith(PLACEHOLDER_OWNER_PREFIX)) {
    warnings.push({ type: 'placeholder_owner', message: `Name "${c.first_name}" is a placeholder` });
  }

  return { skip: false, warnings };
}

// -------------------------------------------------------------------------
// Leads
// -------------------------------------------------------------------------

export function validateLead(lead: TokkoLead, importedContactIds: Set<string>): ValidationResult {
  const warnings: ValidationWarning[] = [];

  // Skip: no contact
  if (!lead.contact?.id) {
    return { skip: true, skipReason: 'lead_no_contact', warnings };
  }

  // Skip: orphaned contact (not in imported set)
  if (!importedContactIds.has(String(lead.contact.id))) {
    return { skip: true, skipReason: `lead_orphan_contact:${lead.contact.id}`, warnings };
  }

  return { skip: false, warnings };
}
