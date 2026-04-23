import { describe, it, expect } from 'vitest';
import { scoreDuplicateFields, trigramSimilarity, type CandidateFields } from './duplicate.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const base: CandidateFields = {
  firstName:  'Juan',
  lastName:   'Pérez',
  emails:     ['juan@example.com'],
  phones:     ['+5491123456789'],
  nationalId: '12345678',
};

// ---------------------------------------------------------------------------
// scoreDuplicateFields
// ---------------------------------------------------------------------------

describe('scoreDuplicateFields', () => {
  it('returns 1.0 (clamped) for identical contacts', () => {
    // identical: email (0.40) + phone (0.30) + national_id (0.35) + name_sim (0.20) > 1.0 → clamped
    expect(scoreDuplicateFields(base, base)).toBe(1.0);
  });

  it('returns high score when email matches even with slightly different name', () => {
    const b: CandidateFields = { ...base, firstName: 'Juan Carlos', lastName: 'Perez', phones: [] };
    expect(scoreDuplicateFields(base, b)).toBeGreaterThan(0.4);
  });

  it('returns high score when national ID matches', () => {
    const b: CandidateFields = {
      firstName: 'J.',
      lastName:  'P.',
      emails:    [],
      phones:    [],
      nationalId: '12345678',
    };
    expect(scoreDuplicateFields(base, b)).toBeGreaterThanOrEqual(0.35);
  });

  it('returns high score when phone matches', () => {
    const b: CandidateFields = {
      firstName:  null,
      lastName:   null,
      emails:     [],
      phones:     ['+5491123456789'],
      nationalId: null,
    };
    expect(scoreDuplicateFields(base, b)).toBeGreaterThanOrEqual(0.30);
  });

  it('normalizes phone digits before comparison', () => {
    const a: CandidateFields = { firstName: null, lastName: null, emails: [], phones: ['+54 9 11 2345-6789'], nationalId: null };
    const b: CandidateFields = { firstName: null, lastName: null, emails: [], phones: ['541123456789'], nationalId: null };
    expect(scoreDuplicateFields(a, b)).toBeGreaterThanOrEqual(0.30);
  });

  it('is case-insensitive on email comparison', () => {
    const a: CandidateFields = { firstName: null, lastName: null, emails: ['JUAN@example.com'], phones: [], nationalId: null };
    const b: CandidateFields = { firstName: null, lastName: null, emails: ['juan@example.com'], phones: [], nationalId: null };
    expect(scoreDuplicateFields(a, b)).toBeCloseTo(0.40);
  });

  it('returns low score for completely different contacts', () => {
    const b: CandidateFields = {
      firstName:  'María',
      lastName:   'González',
      emails:     ['maria@other.com'],
      phones:     ['+5491199999999'],
      nationalId: '99999999',
    };
    expect(scoreDuplicateFields(base, b)).toBeLessThan(0.3);
  });

  it('returns 0 for empty candidates', () => {
    const empty: CandidateFields = { firstName: null, lastName: null, emails: [], phones: [], nationalId: null };
    expect(scoreDuplicateFields(empty, empty)).toBe(0);
  });

  it('clamps to 1.0 even when multiple signals match', () => {
    expect(scoreDuplicateFields(base, base)).toBeLessThanOrEqual(1.0);
  });
});

// ---------------------------------------------------------------------------
// trigramSimilarity
// ---------------------------------------------------------------------------

describe('trigramSimilarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(trigramSimilarity('hello', 'hello')).toBe(1.0);
  });

  it('returns 0 for completely different strings', () => {
    expect(trigramSimilarity('abc', 'xyz')).toBe(0);
  });

  it('returns high score for similar strings', () => {
    expect(trigramSimilarity('juan perez', 'juan pérez')).toBeGreaterThan(0.5);
  });

  it('returns 0 for empty strings', () => {
    expect(trigramSimilarity('', '')).toBe(0);
  });
});
