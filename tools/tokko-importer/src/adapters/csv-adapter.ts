// CSV fallback adapter — parses Tokko admin property/contact exports

import { parse } from 'csv-parse/sync';
import { readFileSync } from 'node:fs';
import { createReadStream, createWriteStream } from 'node:fs';
import { createUnzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TokkoProperty, TokkoContact } from '../types.js';

interface CsvRow {
  [key: string]: string;
}

function parseNum(v: string | undefined): number | null {
  if (!v || v.trim() === '' || v === '-') return null;
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

function mapOperation(op: string): string {
  const lower = op.toLowerCase();
  if (lower.includes('venta')) return 'Venta';
  if (lower.includes('alquiler temporario') || lower.includes('temporario')) return 'Alquiler Temporario';
  if (lower.includes('alquiler')) return 'Alquiler';
  return op;
}

export function parseCsvProperties(csvPath: string): TokkoProperty[] {
  const raw = readFileSync(csvPath, 'utf-8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, bom: true }) as CsvRow[];

  return rows
    .filter((r) => r['ID'] || r['id'])
    .map((r): TokkoProperty => {
      const id = parseInt(r['ID'] ?? r['id'] ?? '0', 10);
      if (!id) return { id: 0 };

      const op = r['Operación'] ?? r['operation'] ?? '';
      const price = parseNum(r['Precio'] ?? r['price']);
      const currency = (r['Moneda'] ?? r['currency'] ?? 'USD').trim();
      const locationName = r['Barrio/Localidad'] ?? r['location_name'];

      const result: TokkoProperty = {
        id,
        type: { name: r['Tipo'] ?? r['type_name'] ?? '' },
        location: { ...(locationName !== undefined && { name: locationName }) },
        operations: op
          ? [{
              operation_type: mapOperation(op),
              prices: price !== null ? [{ price, currency, period: null }] : [],
            }]
          : [],
        surface_total: parseNum(r['Superficie Total'] ?? r['surface_total']) ?? undefined,
        surface_covered: parseNum(r['Superficie Cubierta'] ?? r['surface_covered']) ?? undefined,
        rooms: parseNum(r['Ambientes'] ?? r['rooms']) ?? undefined,
        bedrooms: parseNum(r['Dormitorios'] ?? r['bedrooms']) ?? undefined,
        bathrooms: parseNum(r['Baños'] ?? r['bathrooms']) ?? undefined,
        age: parseNum(r['Antigüedad'] ?? r['age']) ?? undefined,
        description: r['Descripción'] ?? r['description'],
        status: r['Estado'] ?? r['status'],
        deleted: (r['Eliminado'] ?? '').toLowerCase() === 'sí' || (r['Eliminado'] ?? '').toLowerCase() === 'si',
        photos: [],
        videos: [],
        floor_plans: [],
        tags: [],
      };

      // Add optional fields only if they have values
      const ref = r['Código'] ?? r['reference_code'];
      if (ref) result.reference_code = ref;

      const address = r['Dirección'] ?? r['address'];
      if (address) result.address = address;

      const createdAt = r['Fecha de Alta'] ?? r['created_at'];
      if (createdAt) result.created_at = createdAt;

      const updatedAt = r['Última Modificación'] ?? r['updated_at'];
      if (updatedAt) result.updated_at = updatedAt;

      return result;
    })
    .filter((p) => p.id > 0);
}

export function parseCsvContacts(csvPath: string): TokkoContact[] {
  const raw = readFileSync(csvPath, 'utf-8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, bom: true }) as CsvRow[];

  return rows
    .filter((r) => r['ID'] || r['id'])
    .map((r): TokkoContact => {
      const id = parseInt(r['ID'] ?? r['id'] ?? '0', 10);
      if (!id) return { id: 0 };

      const contact: TokkoContact = {
        id,
        first_name: (r['Nombre'] ?? r['first_name']) ?? null,
        last_name: (r['Apellido'] ?? r['last_name']) ?? null,
        email: (r['Email'] ?? r['email']) ?? null,
        phone: (r['Teléfono'] ?? r['phone']) ?? null,
        cellphone: (r['Celular'] ?? r['cellphone']) ?? null,
        contact_type: { name: r['Tipo'] ?? r['contact_type'] ?? 'Propietario' },
        address: (r['Dirección'] ?? r['address']) ?? null,
        notes: (r['Notas'] ?? r['notes']) ?? null,
        birth_date: (r['Fecha de Nacimiento'] ?? r['birth_date']) ?? null,
        country: (r['País'] ?? r['country']) ?? null,
        tags: [],
      };

      const createdAt = r['Fecha de Alta'] ?? r['created_at'];
      if (createdAt) contact.created_at = createdAt;

      return contact;
    })
    .filter((c) => c.id > 0);
}

/** Extract a named file from a ZIP archive to a temp file and return its path. */
export async function extractFromZip(zipPath: string, filename: string): Promise<string | null> {
  const destPath = join(tmpdir(), `tokko-import-${Date.now()}-${filename}`);
  try {
    await pipeline(
      createReadStream(zipPath),
      createUnzip(),
      createWriteStream(destPath),
    );
    return destPath;
  } catch {
    return null;
  }
}
