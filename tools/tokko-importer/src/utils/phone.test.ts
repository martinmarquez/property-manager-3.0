import { describe, it, expect } from 'vitest';
import { normalizePhone, phonesMatch } from './phone.js';

describe('normalizePhone', () => {
  it('normalizes +54 9 11 format (mobile with 9 prefix)', () => {
    const { e164, normalized } = normalizePhone('+54 9 11 1234-5678');
    expect(normalized).toBe(true);
    expect(e164).toBe('+541112345678');
  });

  it('normalizes 011 format (Buenos Aires landline)', () => {
    const { e164, normalized } = normalizePhone('011 1234-5678');
    expect(normalized).toBe(true);
    expect(e164).toBe('+541112345678');
  });

  it('normalizes 10-digit local number', () => {
    const { e164, normalized } = normalizePhone('1112345678');
    expect(normalized).toBe(true);
    expect(e164).toBe('+541112345678');
  });

  it('normalizes number that already has 54 prefix without plus', () => {
    const { e164, normalized } = normalizePhone('541112345678');
    expect(normalized).toBe(true);
    expect(e164).toBe('+541112345678');
  });

  it('does not normalize numbers that are too short', () => {
    const { normalized } = normalizePhone('1234');
    expect(normalized).toBe(false);
  });

  it('returns raw for empty string', () => {
    const { e164, normalized } = normalizePhone('');
    expect(normalized).toBe(false);
    expect(e164).toBe('');
  });

  it('returns raw for whitespace-only string', () => {
    const { normalized } = normalizePhone('   ');
    expect(normalized).toBe(false);
  });
});

describe('phonesMatch', () => {
  it('matches same number in different local formats', () => {
    expect(phonesMatch('+5411 1234-5678', '011 1234-5678')).toBe(true);
  });

  it('does not match different numbers', () => {
    expect(phonesMatch('+5411 1234-5678', '+5411 8765-4321')).toBe(false);
  });

  it('matches identical non-normalizable strings by digit equality', () => {
    expect(phonesMatch('abc123', 'abc123')).toBe(true);
  });

  it('does not match non-normalizable strings with different digits', () => {
    expect(phonesMatch('abc123', 'abc456')).toBe(false);
  });
});
