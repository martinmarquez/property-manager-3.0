/**
 * DSR (Data Subject Request) processing — Ley 25.326 compliance.
 *
 * Provides three operations:
 *   1. Access bundle: gathers all personal data into a JSON document
 *   2. Delete/anonymize: nulls PII fields, retains shell for legal audit
 *   3. Portability: generates JSON-LD + CSV of all personal data
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DsrContactData {
  id: string;
  kind: string;
  firstName: string | null;
  lastName: string | null;
  legalName: string | null;
  nationalIdType: string | null;
  nationalId: string | null;
  birthDate: string | null;
  gender: string | null;
  cuit: string | null;
  industry: string | null;
  emails: unknown;
  phones: unknown;
  addresses: unknown;
  leadScore: number;
  source: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DsrRelatedData {
  tags: string[];
  relationships: Array<{ kindLabel: string; contactName: string }>;
  leads: Array<{ id: string; title: string; stage: string; createdAt: Date }>;
  inquiries: Array<{ id: string; message: string | null; createdAt: Date }>;
}

export interface AccessBundle {
  generatedAt: string;
  dataSubject: DsrContactData;
  tags: string[];
  relationships: DsrRelatedData['relationships'];
  leads: DsrRelatedData['leads'];
  inquiries: DsrRelatedData['inquiries'];
}

// ---------------------------------------------------------------------------
// Access: build bundle
// ---------------------------------------------------------------------------

export function buildAccessBundle(
  contactData: DsrContactData,
  relatedData: DsrRelatedData,
): AccessBundle {
  return {
    generatedAt: new Date().toISOString(),
    dataSubject: contactData,
    tags: relatedData.tags,
    relationships: relatedData.relationships,
    leads: relatedData.leads,
    inquiries: relatedData.inquiries,
  };
}

// ---------------------------------------------------------------------------
// Portability: JSON-LD + CSV
// ---------------------------------------------------------------------------

export interface PortabilityBundle {
  jsonLd: Record<string, unknown>;
  csv: string;
}

export function buildPortabilityBundle(
  contactData: DsrContactData,
  relatedData: DsrRelatedData,
): PortabilityBundle {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': contactData.kind === 'company' ? 'Organization' : 'Person',
    identifier: contactData.id,
    ...(contactData.kind === 'person' ? {
      givenName: contactData.firstName,
      familyName: contactData.lastName,
      birthDate: contactData.birthDate,
      gender: contactData.gender,
      nationalIdentifier: contactData.nationalId,
    } : {
      legalName: contactData.legalName,
      taxID: contactData.cuit,
      industry: contactData.industry,
    }),
    email: (contactData.emails as Array<{ value: string }>).map((e) => e.value),
    telephone: (contactData.phones as Array<{ e164: string }>).map((p) => p.e164),
    address: (contactData.addresses as Array<{ street?: string; city?: string; province?: string; zip?: string }>).map((a) => ({
      '@type': 'PostalAddress',
      streetAddress: a.street,
      addressLocality: a.city,
      addressRegion: a.province,
      postalCode: a.zip,
    })),
    additionalData: {
      tags: relatedData.tags,
      relationships: relatedData.relationships,
      leads: relatedData.leads.map((l) => ({ id: l.id, title: l.title, stage: l.stage })),
      inquiries: relatedData.inquiries.map((i) => ({ id: i.id, message: i.message })),
    },
  };

  const csvRows: string[] = [];
  csvRows.push('field,value');
  csvRows.push(`id,${esc(contactData.id)}`);
  csvRows.push(`kind,${esc(contactData.kind)}`);
  csvRows.push(`first_name,${esc(contactData.firstName)}`);
  csvRows.push(`last_name,${esc(contactData.lastName)}`);
  csvRows.push(`legal_name,${esc(contactData.legalName)}`);
  csvRows.push(`national_id_type,${esc(contactData.nationalIdType)}`);
  csvRows.push(`national_id,${esc(contactData.nationalId)}`);
  csvRows.push(`birth_date,${esc(contactData.birthDate)}`);
  csvRows.push(`gender,${esc(contactData.gender)}`);
  csvRows.push(`cuit,${esc(contactData.cuit)}`);
  csvRows.push(`emails,${esc(JSON.stringify(contactData.emails))}`);
  csvRows.push(`phones,${esc(JSON.stringify(contactData.phones))}`);
  csvRows.push(`addresses,${esc(JSON.stringify(contactData.addresses))}`);
  csvRows.push(`source,${esc(contactData.source)}`);
  csvRows.push(`notes,${esc(contactData.notes)}`);
  csvRows.push(`tags,${esc(relatedData.tags.join('; '))}`);

  return { jsonLd, csv: csvRows.join('\n') };
}

function esc(val: unknown): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// ---------------------------------------------------------------------------
// Delete: PII fields to null
// ---------------------------------------------------------------------------

export const PII_FIELDS_TO_NULL = [
  'firstName', 'lastName', 'nationalIdType', 'nationalId',
  'birthDate', 'gender', 'legalName', 'cuit',
  'notes',
] as const;

export interface DeleteAnonymizeResult {
  nulledFields: string[];
  emptyArrayFields: string[];
}

export function buildDeletePatch(): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const field of PII_FIELDS_TO_NULL) {
    patch[field] = null;
  }
  patch['emails'] = [];
  patch['phones'] = [];
  patch['addresses'] = [];
  patch['deletionReason'] = 'dsr_delete';
  patch['deletedAt'] = new Date();
  return patch;
}
