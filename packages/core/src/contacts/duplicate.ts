/**
 * Contact duplicate scoring — trigram + exact field matching.
 *
 * Used by the contacts.checkDuplicates tRPC procedure to flag potential
 * duplicates before save, and by the contacts.duplicates.list procedure
 * to power the /contacts/duplicates review page.
 *
 * Score interpretation:
 *   >= 0.70  High confidence duplicate
 *   >= 0.40  Possible duplicate — show warning
 *   <  0.40  Unlikely duplicate
 */

export interface CandidateFields {
  firstName:  string | null;
  lastName:   string | null;
  emails:     string[];   // raw email values
  phones:     string[];   // E.164 or raw; digits-only comparison applied
  nationalId: string | null;
}

/**
 * Returns a 0–1 score representing duplicate likelihood between two contacts.
 *
 * Weights (sum may exceed 1.0 before clamping — intentional):
 *   Email match (exact, case-insensitive): 0.40
 *   Phone match (digits-only):             0.30
 *   National ID match (digits-only):       0.35
 *   Name trigram similarity:               0.20 * similarity
 */
export function scoreDuplicateFields(a: CandidateFields, b: CandidateFields): number {
  if (!hasAnyField(a) || !hasAnyField(b)) return 0;

  let score = 0;

  if (emailsMatch(a.emails, b.emails)) score += 0.40;
  if (phonesMatch(a.phones, b.phones)) score += 0.30;
  if (nationalIdsMatch(a.nationalId, b.nationalId)) score += 0.35;

  const aName = composeName(a);
  const bName = composeName(b);
  if (aName && bName) {
    score += trigramSimilarity(aName, bName) * 0.20;
  }

  return Math.min(score, 1.0);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function hasAnyField(c: CandidateFields): boolean {
  return !!(c.firstName || c.lastName || c.emails.length || c.phones.length || c.nationalId);
}

function emailsMatch(a: string[], b: string[]): boolean {
  return a.some((ea) => b.some((eb) => ea.toLowerCase() === eb.toLowerCase()));
}

function phonesMatch(a: string[], b: string[]): boolean {
  const normalize = (p: string) => p.replace(/\D/g, '');
  // Compare last 10 digits to handle Argentine mobile 9 prefix variation
  // (e.g. +54 9 11 XXXX-XXXX vs 541123456789 are the same subscriber)
  const key = (n: string) => n.slice(-10);
  return a.some((pa) => {
    const da = normalize(pa);
    return da.length >= 8 && b.some((pb) => {
      const db = normalize(pb);
      return db.length >= 8 && key(da) === key(db);
    });
  });
}

function nationalIdsMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a.replace(/\D/g, '') === b.replace(/\D/g, '');
}

function composeName(c: CandidateFields): string {
  return `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim().toLowerCase();
}

/**
 * JavaScript approximation of Postgres pg_trgm similarity(a, b).
 * Produces the same 0–1 Jaccard-like score used in the SQL duplicate query.
 */
export function trigramSimilarity(a: string, b: string): number {
  if (!a && !b) return 0;
  const ta = buildTrigrams(a);
  const tb = buildTrigrams(b);
  if (ta.size === 0 && tb.size === 0) return 0;
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }
  return intersection / (ta.size + tb.size - intersection);
}

function buildTrigrams(s: string): Set<string> {
  const padded = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    out.add(padded.slice(i, i + 3));
  }
  return out;
}
