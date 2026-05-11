import { describe, it, expect } from 'vitest';
import { transformProperty, transformContact, transformLead, transformUser } from './transform.js';
import type { TokkoProperty, TokkoContact, TokkoLead, TokkoUser } from '../types.js';

describe('transformProperty', () => {
  it('maps basic fields', () => {
    const p: TokkoProperty = {
      id: 42,
      type: { name: 'Departamento' },
      operations: [{ operation_type: 'Venta', prices: [{ price: 100000, currency: 'USD', period: null }] }],
      address: 'Av. Corrientes 1234',
      surface_total: 65,
      rooms: 3,
    };
    const result = transformProperty(p);
    expect(result.external_source).toBe('tokko');
    expect(result.external_id).toBe('42');
    expect(result.property_type).toBe('apartment');
    expect(result.operations?.[0]?.type).toBe('sale');
    expect(result.operations?.[0]?.price?.amount).toBe(100000);
    expect(result.operations?.[0]?.price?.currency).toBe('USD');
    expect(result.surface_total).toBe(65);
    expect(result.rooms).toBe(3);
    expect(result.location?.address).toBe('Av. Corrientes 1234');
  });

  it('strips HTML from description', () => {
    const p: TokkoProperty = {
      id: 1,
      type: { name: 'Casa' },
      operations: [{ operation_type: 'Venta' }],
      description: '<b>Nice</b> house<br>Great location',
    };
    const result = transformProperty(p);
    expect(result.description).toBe('Nice house\nGreat location');
  });

  it('omits description when empty after stripping', () => {
    const p: TokkoProperty = {
      id: 1,
      type: { name: 'Casa' },
      operations: [{ operation_type: 'Venta' }],
      description: '',
    };
    expect(transformProperty(p).description).toBeUndefined();
  });

  it('omits zero-price operations', () => {
    const p: TokkoProperty = {
      id: 1,
      type: { name: 'Local' },
      operations: [{ operation_type: 'Alquiler', prices: [{ price: 0, currency: 'ARS', period: null }] }],
    };
    const result = transformProperty(p);
    expect(result.operations?.[0]?.price).toBeUndefined();
  });

  it('maps Alquiler Temporario to temporary_rent', () => {
    const p: TokkoProperty = {
      id: 1,
      type: { name: 'Departamento' },
      operations: [{ operation_type: 'Alquiler Temporario' }],
    };
    expect(transformProperty(p).operations?.[0]?.type).toBe('temporary_rent');
  });

  it('maps geo coordinates to location', () => {
    const p: TokkoProperty = {
      id: 1,
      type: { name: 'Casa' },
      operations: [{ operation_type: 'Venta' }],
      geo_lat: -34.6037,
      geo_long: -58.3816,
    };
    const result = transformProperty(p);
    expect(result.location?.lat).toBe(-34.6037);
    expect(result.location?.lng).toBe(-58.3816);
  });

  it('maps photos with order', () => {
    const p: TokkoProperty = {
      id: 1,
      type: { name: 'Casa' },
      operations: [{ operation_type: 'Venta' }],
      photos: [{ image: 'https://example.com/a.jpg', order: 1 }, { image: 'https://example.com/b.jpg', order: 2 }],
    };
    expect(transformProperty(p).photos?.[0]?.url).toBe('https://example.com/a.jpg');
    expect(transformProperty(p).photos?.[1]?.order).toBe(2);
  });

  it('maps producer and branch external IDs', () => {
    const p: TokkoProperty = {
      id: 1,
      type: { name: 'Terreno' },
      operations: [{ operation_type: 'Venta' }],
      producer: { id: 7 },
      branch: { id: 3 },
    };
    const result = transformProperty(p);
    expect(result.producer_external_id).toBe('7');
    expect(result.branch_external_id).toBe('3');
  });

  it('sets deleted_at when property is deleted', () => {
    const p: TokkoProperty = {
      id: 1,
      type: { name: 'Casa' },
      operations: [{ operation_type: 'Venta' }],
      deleted: true,
      updated_at: '2024-06-01T00:00:00Z',
    };
    expect(transformProperty(p).deleted_at).toBe('2024-06-01T00:00:00Z');
  });
});

describe('transformContact', () => {
  it('maps basic contact fields', () => {
    const c: TokkoContact = {
      id: 10,
      first_name: 'Juan',
      last_name: 'Pérez',
      email: 'juan@example.com',
      cellphone: '+54 9 11 1234-5678',
    };
    const result = transformContact(c);
    expect(result.external_id).toBe('10');
    expect(result.first_name).toBe('Juan');
    expect(result.last_name).toBe('Pérez');
    expect(result.emails?.[0]?.value).toBe('juan@example.com');
    expect(result.emails?.[0]?.primary).toBe(true);
    expect(result.phones?.[0]?.e164).toBe('+541112345678');
    expect(result.phones?.[0]?.whatsapp).toBe(true);
  });

  it('marks placeholder owner contacts', () => {
    const c: TokkoContact = {
      id: 20,
      first_name: 'Propietario de Av. Corrientes 123',
      email: 'owner@example.com',
    };
    expect(transformContact(c).owner_is_placeholder).toBe(true);
  });

  it('puts non-normalizable phone in phones_raw', () => {
    const c: TokkoContact = {
      id: 30,
      first_name: 'Test',
      cellphone: '123',
    };
    const result = transformContact(c);
    expect(result.phones).toBeUndefined();
    expect(result.phones_raw?.[0]?.value).toBe('123');
  });

  it('omits first_name when blank', () => {
    const c: TokkoContact = { id: 40, first_name: '  ', email: 'a@b.com' };
    expect(transformContact(c).first_name).toBeUndefined();
  });

  it('maps address to addresses array', () => {
    const c: TokkoContact = { id: 50, first_name: 'Ana', address: 'Florida 100' };
    expect(transformContact(c).addresses?.[0]?.street).toBe('Florida 100');
  });
});

describe('transformLead', () => {
  it('maps basic lead fields', () => {
    const l: TokkoLead = {
      id: 5,
      contact: { id: 10 },
      status: { name: 'En negociación' },
      comments: [{ text: 'Interested', created_at: '2024-01-01T00:00:00Z' }],
    };
    const result = transformLead(l);
    expect(result.external_id).toBe('5');
    expect(result.contact_external_id).toBe('10');
    expect(result.stage_name).toBe('En negociación');
    expect(result.follow_ups?.[0]?.note).toBe('Interested');
    expect(result.follow_ups?.[0]?.created_at).toBe('2024-01-01T00:00:00Z');
  });

  it('maps comment author as author_external_id', () => {
    const l: TokkoLead = {
      id: 6,
      contact: { id: 1 },
      comments: [{ text: 'Note', created_at: '2024-01-01T00:00:00Z', author: { id: 99 } }],
    };
    expect(transformLead(l).follow_ups?.[0]?.author_external_id).toBe('99');
  });

  it('defaults stage_name to Nuevo when status missing', () => {
    const l: TokkoLead = { id: 7, contact: { id: 1 } };
    expect(transformLead(l).stage_name).toBe('Nuevo');
  });

  it('maps property ids', () => {
    const l: TokkoLead = {
      id: 8,
      contact: { id: 1 },
      properties: [{ id: 100 }, { id: 200 }],
    };
    expect(transformLead(l).property_external_ids).toEqual(['100', '200']);
  });

  it('maps budget fields', () => {
    const l: TokkoLead = {
      id: 9,
      contact: { id: 1 },
      budget: 50000,
      budget_currency: 'USD',
    };
    const result = transformLead(l);
    expect(result.budget_amount).toBe(50000);
    expect(result.budget_currency).toBe('USD');
  });
});

describe('transformUser', () => {
  it('maps user with email', () => {
    const u: TokkoUser = { id: 1, first_name: 'Ana', last_name: 'López', email: 'ana@corredor.com', active: true };
    const result = transformUser(u);
    expect(result).not.toBeNull();
    expect(result?.email).toBe('ana@corredor.com');
    expect(result?.first_name).toBe('Ana');
    expect(result?.last_name).toBe('López');
    expect(result?.active).toBe(true);
  });

  it('returns null when email is missing', () => {
    const u: TokkoUser = { id: 2, first_name: 'No email' };
    expect(transformUser(u)).toBeNull();
  });

  it('uses default role agent when role is null', () => {
    const u: TokkoUser = { id: 3, email: 'x@x.com', role: null };
    expect(transformUser(u)?.role).toBe('agent');
  });

  it('maps branch_external_id', () => {
    const u: TokkoUser = { id: 4, email: 'y@y.com', branch: { id: 5 } };
    expect(transformUser(u)?.branch_external_id).toBe('5');
  });
});
