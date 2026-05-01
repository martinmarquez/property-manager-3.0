import { parse } from 'csv-parse/sync';
import type { Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { createNodeDb, setTenantContext, contact, contactTag, contactImportJob, contactImportRow } from '@corredor/db';
import {
  BaseWorker,
  QUEUE_NAMES,
  detectFormat,
  buildAutoMapping,
  parseContactRow,
  scoreDuplicateFields,
} from '@corredor/core';
import type { SourceFormat } from '@corredor/core';
import type Redis from 'ioredis';

export interface ImportContactsCsvJobData {
  importJobId: string;
  tenantId: string;
  userId: string;
  csvBase64?: string;
  csvStorageKey?: string;
  columnMapping: Record<string, string>;
  entity: 'contact';
}

const DEDUP_THRESHOLD = 0.70;

export class ImportContactsCsvWorker extends BaseWorker<ImportContactsCsvJobData, void> {
  private readonly databaseUrl: string;

  constructor(redis: Redis, databaseUrl: string) {
    super(QUEUE_NAMES.IMPORT_CSV, { redis, concurrency: 3 });
    this.databaseUrl = databaseUrl;
  }

  protected async process(job: Job<ImportContactsCsvJobData>): Promise<void> {
    if (job.data.entity !== 'contact') return;

    const { importJobId, tenantId, userId, csvBase64, columnMapping } = job.data;
    const db = createNodeDb(this.databaseUrl);

    await db.transaction(async (tx) => {
      await setTenantContext(tx as never, tenantId, userId);
      await tx
        .update(contactImportJob)
        .set({ status: 'processing', startedAt: new Date(), updatedAt: new Date() })
        .where(eq(contactImportJob.id, importJobId));
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
      await this._markDone(importJobId, tenantId, userId, 0, 0, 0, 0, 'generic');
      return;
    }

    const csvHeaders = Object.keys(records[0]!);
    const format = detectFormat(csvHeaders);
    const autoMapped = buildAutoMapping(csvHeaders, format);
    const finalMapping = { ...autoMapped, ...columnMapping };

    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < records.length; i++) {
      const rawRow = records[i]!;
      const rowNum = i + 1;

      let parsed;
      try {
        parsed = parseContactRow(rawRow, finalMapping);
      } catch {
        await this._writeRow(importJobId, tenantId, rowNum, 'failed', null, null, 'Row parse error', rawRow);
        failedCount++;
        continue;
      }

      const displayName = parsed.kind === 'company'
        ? parsed.legalName ?? '(sin nombre)'
        : [parsed.firstName, parsed.lastName].filter(Boolean).join(' ') || '(sin nombre)';

      if (!parsed.firstName && !parsed.lastName && !parsed.legalName) {
        await this._writeRow(importJobId, tenantId, rowNum, 'failed', displayName, null, 'Missing name fields', rawRow);
        failedCount++;
        continue;
      }

      const isDuplicate = await this._checkDuplicate(tenantId, userId, parsed);
      if (isDuplicate) {
        await this._writeRow(importJobId, tenantId, rowNum, 'skipped', displayName, isDuplicate, 'Duplicate contact detected', rawRow);
        skippedCount++;
        continue;
      }

      try {
        const db2 = createNodeDb(this.databaseUrl);
        const contactId = await db2.transaction(async (tx) => {
          await setTenantContext(tx as never, tenantId, userId);

          const [created] = await tx.insert(contact).values({
            tenantId,
            kind: parsed.kind,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            legalName: parsed.legalName,
            nationalIdType: parsed.nationalIdType as typeof contact.$inferInsert['nationalIdType'],
            nationalId: parsed.nationalId,
            birthDate: parsed.birthDate,
            emails: parsed.emails,
            phones: parsed.phones,
            addresses: parsed.addresses,
            source: parsed.source ?? `import:${format}`,
            notes: parsed.notes,
            createdBy: userId,
            updatedBy: userId,
          }).returning({ id: contact.id });

          if (parsed.tags.length && created) {
            await tx.insert(contactTag).values(
              parsed.tags.map((tag) => ({
                tenantId,
                contactId: created.id,
                tag,
                createdBy: userId,
              }))
            ).onConflictDoNothing();
          }

          return created!.id;
        });

        await this._writeRow(importJobId, tenantId, rowNum, 'imported', displayName, contactId, null, rawRow);
        importedCount++;
      } catch (err) {
        await this._writeRow(importJobId, tenantId, rowNum, 'failed', displayName, null, String(err), rawRow);
        failedCount++;
      }

      if (rowNum % 100 === 0) {
        await job.updateProgress(Math.round((rowNum / records.length) * 100));
      }
    }

    await this._markDone(importJobId, tenantId, userId, records.length, importedCount, skippedCount, failedCount, format);
  }

  private async _checkDuplicate(
    tenantId: string,
    userId: string,
    parsed: ReturnType<typeof parseContactRow>,
  ): Promise<string | null> {
    const emails = parsed.emails.map((e) => e.value);
    const phones = parsed.phones.map((p) => p.e164);
    const hasEmail = emails.length > 0;
    const hasPhone = phones.length > 0;
    const hasNationalId = !!parsed.nationalId;

    if (!hasEmail && !hasPhone && !hasNationalId) return null;

    const db = createNodeDb(this.databaseUrl);
    const candidates = await db.transaction(async (tx) => {
      await setTenantContext(tx as never, tenantId, userId);

      return tx
        .select({
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          emails: contact.emails,
          phones: contact.phones,
          nationalId: contact.nationalId,
        })
        .from(contact)
        .where(and(
          eq(contact.tenantId, tenantId),
          eq(contact.deletedAt, null as never),
        ))
        .limit(50);
    });

    for (const cand of candidates) {
      const score = scoreDuplicateFields(
        {
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          emails,
          phones,
          nationalId: parsed.nationalId,
        },
        {
          firstName: cand.firstName,
          lastName: cand.lastName,
          emails: (cand.emails as Array<{ value: string }>).map((e) => e.value),
          phones: (cand.phones as Array<{ e164: string }>).map((p) => p.e164),
          nationalId: cand.nationalId,
        },
      );
      if (score >= DEDUP_THRESHOLD) return cand.id;
    }

    return null;
  }

  private async _writeRow(
    importJobId: string,
    tenantId: string,
    rowNumber: number,
    rowStatus: 'imported' | 'skipped' | 'failed',
    displayName: string | null,
    contactId: string | null,
    errorReason: string | null,
    rawData: Record<string, string>,
  ): Promise<void> {
    const db = createNodeDb(this.databaseUrl);
    await db.insert(contactImportRow).values({
      importJobId,
      tenantId,
      rowNumber,
      rowStatus,
      displayName,
      contactId,
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
    format: SourceFormat,
  ): Promise<void> {
    const db = createNodeDb(this.databaseUrl);
    await db.transaction(async (tx) => {
      await setTenantContext(tx as never, tenantId, userId);
      await tx
        .update(contactImportJob)
        .set({
          status: 'done',
          sourceFormat: format,
          totalRows: total,
          importedRows: imported,
          skippedRows: skipped,
          failedRows: failed,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(contactImportJob.id, importJobId));
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
        .update(contactImportJob)
        .set({ status: 'failed', errorMessage, completedAt: new Date(), updatedAt: new Date() })
        .where(eq(contactImportJob.id, importJobId));
    });
  }
}
