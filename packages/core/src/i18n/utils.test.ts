import { describe, it, expect } from 'vitest';
import type { IntlShape } from 'react-intl';
import { formatMoney, formatDate, formatNumber } from './utils.js';

function makeIntl(locale = 'es-AR'): IntlShape {
  return {
    locale,
    formatMessage: (msg: { id: string }, values?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'savedViews.date.today': 'hoy',
        'savedViews.date.yesterday': 'ayer',
        'savedViews.date.daysAgo': `hace ${values?.days} días`,
        'savedViews.date.monthsAgo': `hace ${values?.months} meses`,
      };
      return map[msg.id] ?? msg.id;
    },
  } as unknown as IntlShape;
}

const intl = makeIntl();

describe('formatMoney', () => {
  it('formats ARS with peso symbol', () => {
    const result = formatMoney(intl, 'ARS', 150000);
    expect(result).toContain('$');
    expect(result).toContain('150');
  });

  it('formats USD with U$S symbol', () => {
    const result = formatMoney(intl, 'USD', 80000);
    expect(result).toMatch(/^U\$S/);
  });

  it('formats UYU with $U symbol', () => {
    const result = formatMoney(intl, 'UYU', 5000);
    expect(result).toMatch(/^\$U/);
  });

  it('formats decimal amounts with up to 2 decimal places', () => {
    const result = formatMoney(intl, 'ARS', 1500.5);
    expect(result).toContain('1');
  });

  it('returns dash for NaN string input', () => {
    expect(formatMoney(intl, 'ARS', 'not-a-number')).toBe('—');
  });

  it('handles numeric string input', () => {
    const result = formatMoney(intl, 'USD', '25000');
    expect(result).toContain('25');
  });

  it('uses currency as symbol for unknown currency codes', () => {
    const result = formatMoney(intl, 'BRL', 1000);
    expect(result).toContain('BRL');
  });
});

describe('formatDate', () => {
  it('returns dash for invalid date', () => {
    expect(formatDate(intl, 'not-a-date')).toBe('—');
    expect(formatDate(intl, new Date('invalid'))).toBe('—');
  });

  it('returns hoy for relative mode on today', () => {
    const result = formatDate(intl, new Date(), 'relative');
    expect(result).toBe('hoy');
  });

  it('returns ayer for relative mode on yesterday', () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    const result = formatDate(intl, yesterday, 'relative');
    expect(result).toBe('ayer');
  });

  it('returns daysAgo for relative mode within a month', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86_400_000);
    const result = formatDate(intl, fiveDaysAgo, 'relative');
    expect(result).toBe('hace 5 días');
  });

  it('returns monthsAgo for relative mode over a month', () => {
    const twoMonthsAgo = new Date(Date.now() - 65 * 86_400_000);
    const result = formatDate(intl, twoMonthsAgo, 'relative');
    expect(result).toContain('meses');
  });

  it('returns absolute date string for absolute mode', () => {
    const date = new Date('2024-06-15T12:00:00Z');
    const result = formatDate(intl, date, 'absolute');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns datetime string for datetime mode', () => {
    const date = new Date('2024-06-15T14:32:00Z');
    const result = formatDate(intl, date, 'datetime');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('defaults to absolute mode', () => {
    const date = new Date('2024-06-15');
    const resultDefault = formatDate(intl, date);
    const resultAbsolute = formatDate(intl, date, 'absolute');
    expect(resultDefault).toBe(resultAbsolute);
  });

  it('accepts numeric timestamp', () => {
    const ts = Date.now();
    const result = formatDate(intl, ts, 'absolute');
    expect(typeof result).toBe('string');
  });
});

describe('formatNumber', () => {
  it('formats a number with locale separators', () => {
    const result = formatNumber(intl, 1234567);
    expect(typeof result).toBe('string');
    expect(result).toContain('1');
  });

  it('respects custom NumberFormatOptions', () => {
    const result = formatNumber(intl, 3.14159, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(result).toContain('3');
    expect(result).toContain('14');
  });
});
