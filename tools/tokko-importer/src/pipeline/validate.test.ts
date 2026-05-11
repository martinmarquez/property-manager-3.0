import { describe, it, expect } from 'vitest';
import { validateProperty, validateContact, validateLead } from './validate.js';
import type { TokkoProperty, TokkoContact, TokkoLead } from '../types.js';

describe('validateProperty', () => {
  it('passes a valid property', () => {
    const p: TokkoProperty = {
      id: 1,
      type: { name: 'Departamento' },
      operations: [{ operation_type: 'Venta', prices: [{ price: 50000, currency: 'USD', period: null }] }],
      address: 'Corrientes 1234',
    };
    const result = validateProperty(p);
    expect(result.skip).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it('skips unknown property type', () => {
    const p: TokkoProperty = {
      id: 2,
      type: { name: 'Barco' },
      operations: [{ operation_type: 'Venta' }],
    };
    const result = validateProperty(p);
    expect(result.skip).toBe(true);
    expect(result.skipReason).toMatch(/type_unknown/);
  });

  it('skips when no valid operations exist', () => {
    const p: TokkoProperty = {
      id: 3,
      type: { name: 'Casa' },
      operations: [{ operation_type: 'Permuta' }],
    };
    const result = validateProperty(p);
    expect(result.skip).toBe(true);
    expect(result.skipReason).toBe('no_valid_operation');
  });

  it('skips when operations array is empty', () => {
    const p: TokkoProperty = { id: 4, type: { name: 'Casa' }, operations: [] };
    expect(validateProperty(p).skip).toBe(true);
  });

  it('warns when price is zero', () => {
    const p: TokkoProperty = {
      id: 5,
      type: { name: 'Casa' },
      operations: [{ operation_type: 'Venta', prices: [{ price: 0, currency: 'USD', period: null }] }],
    };
    const result = validateProperty(p);
    expect(result.skip).toBe(false);
    expect(result.warnings.some((w) => w.type === 'price_zero')).toBe(true);
  });

  it('warns when surface_total is zero or negative', () => {
    const p: TokkoProperty = {
      id: 6,
      type: { name: 'Departamento' },
      operations: [{ operation_type: 'Alquiler' }],
      surface_total: -10,
    };
    const result = validateProperty(p);
    expect(result.skip).toBe(false);
    expect(result.warnings.some((w) => w.type === 'invalid_surface')).toBe(true);
  });

  it('warns when no location data is present', () => {
    const p: TokkoProperty = {
      id: 7,
      type: { name: 'Oficina' },
      operations: [{ operation_type: 'Venta' }],
    };
    const result = validateProperty(p);
    expect(result.warnings.some((w) => w.type === 'no_location')).toBe(true);
  });

  it('accepts numeric operation type codes', () => {
    const p: TokkoProperty = {
      id: 8,
      type: { name: 'Local' },
      operations: [{ operation_type: '1' }],
    };
    expect(validateProperty(p).skip).toBe(false);
  });
});

describe('validateContact', () => {
  it('passes contact with name and email', () => {
    const c: TokkoContact = { id: 1, first_name: 'Juan', email: 'juan@example.com' };
    expect(validateContact(c).skip).toBe(false);
  });

  it('passes contact with only phone (no name)', () => {
    const c: TokkoContact = { id: 2, phone: '01112345678' };
    expect(validateContact(c).skip).toBe(false);
  });

  it('skips contact with no identifying fields', () => {
    const c: TokkoContact = { id: 3 };
    const result = validateContact(c);
    expect(result.skip).toBe(true);
    expect(result.skipReason).toBe('contact_empty');
  });

  it('warns on invalid email format', () => {
    const c: TokkoContact = { id: 4, first_name: 'Ana', email: 'notanemail' };
    const result = validateContact(c);
    expect(result.skip).toBe(false);
    expect(result.warnings.some((w) => w.type === 'invalid_email')).toBe(true);
  });

  it('warns on placeholder Tokko email', () => {
    const c: TokkoContact = { id: 5, first_name: 'Ana', email: 'ana@tokko.com' };
    const result = validateContact(c);
    expect(result.warnings.some((w) => w.type === 'placeholder_email')).toBe(true);
  });

  it('warns on placeholder owner name', () => {
    const c: TokkoContact = { id: 6, first_name: 'Propietario de Corrientes 123', email: 'x@x.com' };
    const result = validateContact(c);
    expect(result.warnings.some((w) => w.type === 'placeholder_owner')).toBe(true);
  });
});

describe('validateLead', () => {
  it('passes lead whose contact was imported', () => {
    const l: TokkoLead = { id: 1, contact: { id: 10 } };
    expect(validateLead(l, new Set(['10'])).skip).toBe(false);
  });

  it('skips lead with no contact', () => {
    const l: TokkoLead = { id: 2 };
    expect(validateLead(l, new Set()).skip).toBe(true);
    expect(validateLead(l, new Set()).skipReason).toBe('lead_no_contact');
  });

  it('skips lead whose contact was not imported (orphan)', () => {
    const l: TokkoLead = { id: 3, contact: { id: 99 } };
    const result = validateLead(l, new Set(['10', '20']));
    expect(result.skip).toBe(true);
    expect(result.skipReason).toMatch(/lead_orphan_contact/);
  });
});
