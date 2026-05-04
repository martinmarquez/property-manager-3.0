// CSV fallback adapter — parses Tokko admin property/contact exports

import { parse } from 'csv-parse/sync';
import { readFileSync } from 'node:fs';
import { createReadStream, createWriteStream } from 'node:fs';
import { createUnzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TokkoProperty, TokkoPropertyPhoto, TokkoContact } from '../types.js';

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

      return {
        id,
        ...(r['Código'] ?? r['reference_code'] ? { reference_code: r['Código'] ?? r['reference_code'] } : {}),
        type: { name: r['Tipo'] ?? r['type_name'] ?? '' },
        ...(r['Dirección'] ?? r['address'] ? { address: r['Dirección'] ?? r['address'] } : {}),
        location: { ...(locationName !== undefined && { name: locationName }) },
        operations: op
          ? [{
              operation_type: mapOperation(op),
              prices: price !== null ? [{ price, currency, period: null }] : [],
            }]
          : [],
        surface_total: parseNum(r['Superficie Total'] ?? r['surface_total']) ?? null,
        surface_covered: parseNum(r['Superficie Cubierta'] ?? r['surface_covered']) ?? null,
        rooms: parseNum(r['Ambientes'] ?? r['rooms']) ?? null,
        bedrooms: parseNum(r['Dormitorios'] ?? r['bedrooms']) ?? null,
        bathrooms: parseNum(r['Baños'] ?? r['bathrooms']) ?? null,
        age: parseNum(r['Antigüedad'] ?? r['age']) ?? null,
        description: r['Descripción'] ?? r['description'],
        status: r['Estado'] ?? r['status'],
        ...(r['Fecha de Alta'] ?? r['created_at'] ? { created_at: r['Fecha de Alta'] ?? r['created_at'] } : {}),
        ...(r['Última Modificación'] ?? r['updated_at'] ? { updated_at: r['Última Modificación'] ?? r['updated_at'] } : {}),
        deleted: (r['Eliminado'] ?? '').toLowerCase() === 'sí' || (r['Eliminado'] ?? '').toLowerCase() === 'si',
        photos: [] as TokkoPropertyPhoto[],
        videos: [] as Array<{ url: string }>,
        floor_plans: [] as Array<{ image: string }>,
        tags: [] as Array<{ name: string }>,
      };
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

      return {
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
        ...(r['Fecha de Alta'] ?? r['created_at'] ? { created_at: r['Fecha de Alta'] ?? r['created_at'] } : {}),
        tags: [] as Array<{ name: string }>,
      };
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
