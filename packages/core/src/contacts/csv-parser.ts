/**
 * Contact CSV parser — format auto-detection and column mapping.
 *
 * Supports three source formats:
 *   1. Tokko CRM export (Spanish headers)
 *   2. Google Contacts CSV export
 *   3. Generic (user-supplied column mapping)
 */

export type SourceFormat = 'tokko' | 'google' | 'generic';

export interface ParsedContactRow {
  firstName: string | null;
  lastName: string | null;
  legalName: string | null;
  kind: 'person' | 'company';
  emails: Array<{ value: string; type: 'personal' | 'work' | 'other'; primary: boolean }>;
  phones: Array<{ e164: string; type: 'mobile' | 'whatsapp' | 'landline' | 'office'; primary: boolean }>;
  addresses: Array<{ street?: string; number?: string; city?: string; province?: string; zip?: string }>;
  nationalIdType: 'DNI' | 'CUIT' | 'CUIL' | 'passport' | null;
  nationalId: string | null;
  birthDate: string | null;
  source: string | null;
  notes: string | null;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Tokko CRM header mapping (Spanish/English variants)
// ---------------------------------------------------------------------------

const TOKKO_HEADER_MAP: Record<string, string[]> = {
  first_name:     ['nombre', 'first_name', 'first name', 'nombres'],
  last_name:      ['apellido', 'last_name', 'last name', 'apellidos'],
  legal_name:     ['razón social', 'razon social', 'empresa', 'company'],
  email:          ['email', 'e-mail', 'correo', 'correo electrónico', 'correo electronico', 'mail'],
  email_2:        ['email 2', 'email2', 'correo 2'],
  phone:          ['teléfono', 'telefono', 'phone', 'tel', 'celular', 'móvil', 'movil'],
  phone_2:        ['teléfono 2', 'telefono 2', 'phone 2', 'tel 2'],
  whatsapp:       ['whatsapp', 'wsp'],
  national_id:    ['dni', 'documento', 'national_id', 'nro documento', 'cuit', 'cuil'],
  address:        ['dirección', 'direccion', 'domicilio', 'address'],
  city:           ['localidad', 'ciudad', 'city'],
  province:       ['provincia', 'province', 'estado'],
  zip:            ['código postal', 'codigo postal', 'cp', 'zip'],
  birth_date:     ['fecha de nacimiento', 'fecha nacimiento', 'birth_date', 'birthday'],
  source:         ['origen', 'fuente', 'source', 'canal'],
  notes:          ['observaciones', 'notas', 'notes', 'comentarios'],
  tags:           ['etiquetas', 'tags', 'categorías', 'categorias'],
};

// ---------------------------------------------------------------------------
// Google Contacts CSV header mapping
// ---------------------------------------------------------------------------

const GOOGLE_HEADER_MAP: Record<string, string[]> = {
  first_name:     ['Given Name', 'First Name'],
  last_name:      ['Family Name', 'Last Name'],
  legal_name:     ['Organization 1 - Name', 'Company'],
  email:          ['E-mail 1 - Value', 'Email 1 - Value'],
  email_2:        ['E-mail 2 - Value', 'Email 2 - Value'],
  email_type:     ['E-mail 1 - Type', 'Email 1 - Type'],
  phone:          ['Phone 1 - Value'],
  phone_2:        ['Phone 2 - Value'],
  phone_type:     ['Phone 1 - Type'],
  address:        ['Address 1 - Street'],
  city:           ['Address 1 - City'],
  province:       ['Address 1 - Region'],
  zip:            ['Address 1 - Postal Code'],
  birth_date:     ['Birthday'],
  notes:          ['Notes'],
  group:          ['Group Membership'],
};

const GOOGLE_FINGERPRINT_HEADERS = [
  'Given Name', 'Family Name', 'E-mail 1 - Value', 'Phone 1 - Value',
];

const TOKKO_FINGERPRINT_HEADERS = [
  'nombre', 'apellido', 'teléfono', 'telefono', 'celular',
];

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

export function detectFormat(csvHeaders: string[]): SourceFormat {
  const lower = csvHeaders.map((h) => h.trim().toLowerCase());
  const orig = csvHeaders.map((h) => h.trim());

  const googleScore = GOOGLE_FINGERPRINT_HEADERS.filter((h) => orig.includes(h)).length;
  if (googleScore >= 2) return 'google';

  const tokkoScore = TOKKO_FINGERPRINT_HEADERS.filter((h) => lower.includes(h)).length;
  if (tokkoScore >= 2) return 'tokko';

  return 'generic';
}

// ---------------------------------------------------------------------------
// Auto-mapping: builds a field→csvHeader map for a detected format
// ---------------------------------------------------------------------------

export function buildAutoMapping(
  csvHeaders: string[],
  format: SourceFormat,
): Record<string, string> {
  const map = format === 'google' ? GOOGLE_HEADER_MAP : TOKKO_HEADER_MAP;
  const result: Record<string, string> = {};

  for (const [field, variants] of Object.entries(map)) {
    for (const variant of variants) {
      const found = csvHeaders.find((h) =>
        format === 'google'
          ? h.trim() === variant
          : h.trim().toLowerCase() === variant.toLowerCase()
      );
      if (found) {
        result[field] = found;
        break;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Row parsing: converts a raw CSV record to a normalized ParsedContactRow
// ---------------------------------------------------------------------------

export function parseContactRow(
  rawRow: Record<string, string>,
  mapping: Record<string, string>,
): ParsedContactRow {
  const get = (field: string): string =>
    mapping[field] ? (rawRow[mapping[field]!] ?? '').trim() : '';

  const firstName = get('first_name') || null;
  const lastName = get('last_name') || null;
  const legalName = get('legal_name') || null;

  const kind: 'person' | 'company' =
    !firstName && !lastName && legalName ? 'company' : 'person';

  const emails: ParsedContactRow['emails'] = [];
  const email1 = get('email');
  if (email1 && isPlausibleEmail(email1)) {
    const typeRaw = get('email_type')?.toLowerCase() ?? '';
    const type = typeRaw.includes('work') ? 'work' as const : 'personal' as const;
    emails.push({ value: email1.toLowerCase(), type, primary: true });
  }
  const email2 = get('email_2');
  if (email2 && isPlausibleEmail(email2)) {
    emails.push({ value: email2.toLowerCase(), type: 'other', primary: false });
  }

  const phones: ParsedContactRow['phones'] = [];
  const phone1 = get('phone');
  if (phone1) {
    const normalized = normalizeArgPhone(phone1);
    if (normalized) {
      const typeRaw = get('phone_type')?.toLowerCase() ?? '';
      const type = inferPhoneType(typeRaw, phone1);
      phones.push({ e164: normalized, type, primary: true });
    }
  }
  const phone2 = get('phone_2');
  if (phone2) {
    const normalized = normalizeArgPhone(phone2);
    if (normalized) phones.push({ e164: normalized, type: 'mobile', primary: false });
  }
  const whatsapp = get('whatsapp');
  if (whatsapp) {
    const normalized = normalizeArgPhone(whatsapp);
    if (normalized && !phones.some((p) => p.e164 === normalized)) {
      phones.push({ e164: normalized, type: 'whatsapp', primary: phones.length === 0 });
    }
  }

  const addresses: ParsedContactRow['addresses'] = [];
  const street = get('address');
  const city = get('city');
  const province = get('province');
  const zip = get('zip');
  if (street || city || province) {
    const addr: { street?: string; number?: string; city?: string; province?: string; zip?: string } = {};
    if (street) addr.street = street;
    if (city) addr.city = city;
    if (province) addr.province = province;
    if (zip) addr.zip = zip;
    addresses.push(addr);
  }

  const nationalIdRaw = get('national_id');
  let nationalId: string | null = null;
  let nationalIdType: ParsedContactRow['nationalIdType'] = null;
  if (nationalIdRaw) {
    const digits = nationalIdRaw.replace(/\D/g, '');
    if (digits.length === 11) {
      nationalIdType = nationalIdRaw.toLowerCase().includes('cuil') ? 'CUIL' : 'CUIT';
      nationalId = digits;
    } else if (digits.length >= 7 && digits.length <= 8) {
      nationalIdType = 'DNI';
      nationalId = digits;
    } else if (digits.length > 0) {
      nationalIdType = 'DNI';
      nationalId = digits;
    }
  }

  const birthDate = parseDateLoose(get('birth_date'));
  const source = get('source') || null;
  const notes = get('notes') || null;

  const tagsRaw = get('tags') || get('group') || '';
  const tags = tagsRaw
    ? tagsRaw.split(/[;,]/).map((t) => t.replace(/^.*::: /, '').trim()).filter(Boolean)
    : [];

  return {
    firstName, lastName, legalName, kind,
    emails, phones, addresses,
    nationalIdType, nationalId,
    birthDate, source, notes, tags,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPlausibleEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

export function normalizeArgPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8) return null;

  if (digits.startsWith('54') && digits.length >= 12) {
    return '+' + digits;
  }
  if (digits.startsWith('0')) {
    return '+54' + digits.slice(1);
  }
  if (digits.startsWith('15') && digits.length <= 10) {
    return '+5411' + digits.slice(2);
  }
  if (digits.length === 10 && !digits.startsWith('54')) {
    return '+54' + digits;
  }
  if (digits.length === 8) {
    return '+5411' + digits;
  }
  return '+' + digits;
}

function inferPhoneType(typeHint: string, raw: string): 'mobile' | 'whatsapp' | 'landline' | 'office' {
  if (typeHint.includes('mobile') || typeHint.includes('cell')) return 'mobile';
  if (typeHint.includes('work') || typeHint.includes('office')) return 'office';
  if (typeHint.includes('home') || typeHint.includes('fax')) return 'landline';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('15') || digits.includes('9')) return 'mobile';
  return 'mobile';
}

function parseDateLoose(val: string): string | null {
  if (!val) return null;

  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  // DD/MM/YYYY (Argentine format)
  const dmyMatch = val.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d = new Date(`${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  // MM/DD/YYYY
  const mdyMatch = val.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    const d = new Date(`${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  return null;
}
