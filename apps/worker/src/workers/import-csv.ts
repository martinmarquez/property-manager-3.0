import { parse } from 'csv-parse/sync';
import type { Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { createNodeDb, setTenantContext, property, importJob, importJobRow } from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type Redis from 'ioredis';

export interface ImportCsvJobData {
  importJobId: string;
  tenantId: string;
  userId: string;
  csvBase64?: string;
  csvStorageKey?: string;
  columnMapping: Record<string, string>;
}

const TOKKO_HEADER_MAP: Record<string, string[]> = {
  reference_code:  ['código', 'codigo', 'ref', 'referencia', 'id'],
  property_type:   ['tipo', 'tipo de propiedad', 'tipologia'],
  operation_kind:  ['operación', 'operacion', 'tipo de operacion'],
  price_amount:    ['precio', 'price', 'monto'],
  price_currency:  ['moneda', 'currency', 'divisa'],
  covered_area_m2: ['superficie cub', 'superficie cubierta', 'sup. cub', 'cubierta m2'],
  total_area_m2:   ['superficie tot', 'superficie total', 'sup. tot', 'total m2'],
  rooms:           ['ambientes', 'rooms'],
  bedrooms:        ['dormitorios', 'habitaciones', 'bedrooms'],
  bathrooms:       ['baños', 'banos', 'bathrooms'],
  province:        ['provincia', 'province'],
  locality:        ['localidad', 'ciudad', 'locality'],
  neighborhood:    ['barrio', 'neighborhood'],
  address_street:  ['dirección', 'direccion', 'calle', 'address'],
  address_number:  ['altura', 'número', 'numero', 'nro'],
  lat:             ['latitud', 'lat', 'latitude'],
  lng:             ['longitud', 'lng', 'lon', 'longitude'],
  description:     ['descripción', 'descripcion', 'obs', 'observaciones', 'description'],
  subtype:         ['subtipo', 'subtype'],
};

const PROPERTY_TYPE_MAP: Record<string, string> = {
  departamento: 'apartment',
  depto:        'apartment',
  apartment:    'apartment',
  ph:           'ph',
  casa:         'house',
  house:        'house',
  quinta:       'quinta',
  terreno:      'land',
  land:         'land',
  lote:         'land',
  oficina:      'office',
  office:       'office',
  local:        'commercial',
  commercial:   'commercial',
  cochera:      'garage',
  garage:       'garage',
  galpón:       'warehouse',
  galpon:       'warehouse',
  warehouse:    'warehouse',
  campo:        'farm',
  farm:         'farm',
  hotel:        'hotel',
  edificio:     'building',
  building:     'building',
  'fondo de comercio': 'business_fund',
  business_fund: 'business_fund',
  desarrollo:   'development',
  development:  'development',
};

function buildAutoMapping(csvHeaders: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const normalised = csvHeaders.map((h) => h.trim().toLowerCase());

  for (const [corrField, variants] of Object.entries(TOKKO_HEADER_MAP)) {
    for (const variant of variants) {
      const idx = normalised.indexOf(variant);
      if (idx !== -1) {
        result[corrField] = csvHeaders[idx]!;
        break;
      }
    }
  }

  return result;
}

export class ImportCsvWorker extends BaseWorker<ImportCsvJobData, void> {
  private readonly databaseUrl: string;

  constructor(redis: Redis, databaseUrl: string) {
    super(QUEUE_NAMES.IMPORT_CSV, { redis, concurrency: 3 });
    this.databaseUrl = databaseUrl;
  }

  protected async process(job: Job<ImportCsvJobData>): Promise<void> {
    const { importJobId, tenantId, userId, csvBase64, columnMapping } = job.data;

    const db = createNodeDb(this.databaseUrl);

    await db.transaction(async (tx) => {
      await setTenantContext(tx as never, tenantId, userId);

      await tx
        .update(importJob)
        .set({ status: 'processing', startedAt: new Date(), updatedAt: new Date() })
        .where(eq(importJob.id, importJobId));
    });

    let csvText: string;
    if (csvBase64) {
      csvText = Buffer.from(csvBase64, 'base64').toString('utf-8');
    } else {
      throw new Error('csvStorageKey fetch not yet implemented — use csvBase64');
    }

    let records: Record<string, string>[];
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as Record<string, string>[];
    } catch (err) {
      await this._markFailed(importJobId, tenantId, userId, `CSV parse error: ${String(err)}`);
      return;
    }

    if (records.length === 0) {
      await this._markDone(importJobId, tenantId, userId, 0, 0, 0, 0);
      return;
    }

    const csvHeaders = Object.keys(records[0]!);
    const autoMapped = buildAutoMapping(csvHeaders);
    const finalMapping = { ...autoMapped, ...columnMapping };

    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < records.length; i++) {
      const rawRow = records[i]!;
      const rowNum = i + 1;

      const referenceCode =
        finalMapping['reference_code']
          ? (rawRow[finalMapping['reference_code']] ?? '').trim()
          : '';

      if (!referenceCode) {
        await this._writeRow(importJobId, tenantId, rowNum, 'failed', null, null, 'Missing reference_code', rawRow);
        failedCount++;
        continue;
      }

      const db2 = createNodeDb(this.databaseUrl);
      const existing = await db2.transaction(async (tx) => {
        await setTenantContext(tx as never, tenantId, userId);
        return tx
          .select({ id: property.id })
          .from(property)
          .where(
            and(
              eq(property.tenantId, tenantId),
              eq(property.referenceCode, referenceCode),
            ),
          )
          .limit(1);
      });

      if (existing.length > 0) {
        await this._writeRow(importJobId, tenantId, rowNum, 'skipped', referenceCode, existing[0]!.id, 'Duplicate reference_code', rawRow);
        skippedCount++;
        continue;
      }

      const rawType = finalMapping['property_type']
        ? (rawRow[finalMapping['property_type']] ?? '').trim().toLowerCase()
        : '';
      const mappedType = PROPERTY_TYPE_MAP[rawType] ?? 'apartment';

      const propertyValues = {
        tenantId,
        referenceCode,
        propertyType: mappedType as typeof property.$inferInsert['propertyType'],
        country: 'AR',
        createdBy: userId,
        updatedBy: userId,
        description: finalMapping['description']
          ? rawRow[finalMapping['description']] ?? null
          : null,
        province: finalMapping['province']
          ? rawRow[finalMapping['province']] ?? null
          : null,
        locality: finalMapping['locality']
          ? rawRow[finalMapping['locality']] ?? null
          : null,
        neighborhood: finalMapping['neighborhood']
          ? rawRow[finalMapping['neighborhood']] ?? null
          : null,
        addressStreet: finalMapping['address_street']
          ? rawRow[finalMapping['address_street']] ?? null
          : null,
        addressNumber: finalMapping['address_number']
          ? rawRow[finalMapping['address_number']] ?? null
          : null,
        subtype: finalMapping['subtype']
          ? rawRow[finalMapping['subtype']] ?? null
          : null,
        rooms: finalMapping['rooms']
          ? parseIntOrNull(rawRow[finalMapping['rooms']])
          : null,
        bedrooms: finalMapping['bedrooms']
          ? parseIntOrNull(rawRow[finalMapping['bedrooms']])
          : null,
        bathrooms: finalMapping['bathrooms']
          ? parseIntOrNull(rawRow[finalMapping['bathrooms']])
          : null,
        coveredAreaM2: finalMapping['covered_area_m2']
          ? parseFloatOrNull(rawRow[finalMapping['covered_area_m2']])
          : null,
        totalAreaM2: finalMapping['total_area_m2']
          ? parseFloatOrNull(rawRow[finalMapping['total_area_m2']])
          : null,
        lat: finalMapping['lat']
          ? parseFloatOrNull(rawRow[finalMapping['lat']])
          : null,
        lng: finalMapping['lng']
          ? parseFloatOrNull(rawRow[finalMapping['lng']])
          : null,
      };

      try {
        const db3 = createNodeDb(this.databaseUrl);
        const [newProp] = await db3.transaction(async (tx) => {
          await setTenantContext(tx as never, tenantId, userId);
          return tx.insert(property).values(propertyValues).returning({ id: property.id });
        });

        await this._writeRow(importJobId, tenantId, rowNum, 'imported', referenceCode, newProp!.id, null, rawRow);
        importedCount++;
      } catch (err) {
        await this._writeRow(importJobId, tenantId, rowNum, 'failed', referenceCode, null, String(err), rawRow);
        failedCount++;
      }
    }

    await this._markDone(importJobId, tenantId, userId, records.length, importedCount, skippedCount, failedCount);
  }

  private async _writeRow(
    importJobId: string,
    tenantId: string,
    rowNumber: number,
    rowStatus: 'imported' | 'skipped' | 'failed',
    referenceCode: string | null,
    propertyId: string | null,
    errorReason: string | null,
    rawData: Record<string, string>,
  ): Promise<void> {
    const db = createNodeDb(this.databaseUrl);
    await db.insert(importJobRow).values({
      importJobId,
      tenantId,
      rowNumber,
      rowStatus,
      referenceCode,
      propertyId,
      errorReason,
      rawData,
    });
  }

  private async _markDone(
    importJobId: string,
    tenantId: string,
    userId: string,
    total: number,
    imported: number,
    skipped: number,
    failed: number,
  ): Promise<void> {
    const db = createNodeDb(this.databaseUrl);
    await db.transaction(async (tx) => {
      await setTenantContext(tx as never, tenantId, userId);
      await tx
        .update(importJob)
        .set({
          status: 'done',
          totalRows: total,
          importedRows: imported,
          skippedRows: skipped,
          failedRows: failed,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(importJob.id, importJobId));
    });
  }

  private async _markFailed(
    importJobId: string,
    tenantId: string,
    userId: string,
    errorMessage: string,
  ): Promise<void> {
    const db = createNodeDb(this.databaseUrl);
    await db.transaction(async (tx) => {
      await setTenantContext(tx as never, tenantId, userId);
      await tx
        .update(importJob)
        .set({ status: 'failed', errorMessage, completedAt: new Date(), updatedAt: new Date() })
        .where(eq(importJob.id, importJobId));
    });
  }
}

function parseIntOrNull(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseInt(val.replace(/[.,]/g, ''), 10);
  return isNaN(n) ? null : n;
}

function parseFloatOrNull(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseFloat(val.replace(',', '.'));
  return isNaN(n) ? null : n;
}
