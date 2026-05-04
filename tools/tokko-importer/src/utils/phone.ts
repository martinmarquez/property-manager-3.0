// Argentine phone number normalizer — E.164 format.
// No external deps. Handles common Tokko phone formats.

const DIGITS_RE = /\D/g;
const COUNTRY_CODE = '54';

interface PhoneResult {
  e164: string;
  normalized: boolean;
}

function stripNonDigits(s: string): string {
  return s.replace(DIGITS_RE, '');
}

function formatArgentineLocal(digits: string): string {
  // Remove mobile 9 prefix when present after country code
  // +54 9 11 XXXX-XXXX → +54 11 XXXXXXXX (strip the 9)
  if (digits.startsWith('549') && digits.length >= 12) {
    digits = '54' + digits.slice(3);
  }
  return '+' + digits;
}

export function normalizePhone(raw: string): PhoneResult {
  if (!raw || !raw.trim()) return { e164: raw, normalized: false };

  const stripped = stripNonDigits(raw);
  if (stripped.length < 7) return { e164: raw, normalized: false };

  // Already has +54 country code
  if (raw.trim().startsWith('+54') && stripped.length >= 10) {
    return { e164: formatArgentineLocal(stripped), normalized: true };
  }

  // 011 XXXX-XXXX (Buenos Aires landline: 01112345678 → +54114567890)
  if (stripped.startsWith('0') && stripped.length >= 10) {
    const withoutLeadingZero = stripped.slice(1);
    return { e164: formatArgentineLocal(COUNTRY_CODE + withoutLeadingZero), normalized: true };
  }

  // 10-digit local (area + number, no leading 0)
  if (stripped.length === 10) {
    return { e164: formatArgentineLocal(COUNTRY_CODE + stripped), normalized: true };
  }

  // 11-digit (could be 54 + 9-digit or 0 + 10-digit already stripped)
  if (stripped.length === 11) {
    return { e164: formatArgentineLocal(COUNTRY_CODE + stripped), normalized: true };
  }

  // Already has country code digits (no +)
  if (stripped.startsWith(COUNTRY_CODE) && stripped.length >= 10) {
    return { e164: formatArgentineLocal(stripped), normalized: true };
  }

  return { e164: raw, normalized: false };
}

export function phonesMatch(a: string, b: string): boolean {
  const { e164: ea, normalized: na } = normalizePhone(a);
  const { e164: eb, normalized: nb } = normalizePhone(b);
  if (!na || !nb) return stripNonDigits(a) === stripNonDigits(b);
  return ea === eb;
}
