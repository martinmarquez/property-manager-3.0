import { sql } from 'drizzle-orm';
import type { Job } from 'bullmq';
import { createNodeDb } from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type Redis from 'ioredis';

export interface BnaRateJobData {
  date?: string;
}

interface DolarApiResponse {
  compra: number;
  venta: number;
  casa: string;
  nombre: string;
  fechaActualizacion: string;
}

const BNA_API_URL = 'https://dolarapi.com/v1/dolares/oficial';
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

export class BillingBnaRateWorker extends BaseWorker<BnaRateJobData, void> {
  private readonly db: ReturnType<typeof createNodeDb>;

  constructor(redis: Redis, databaseUrl: string) {
    super(QUEUE_NAMES.BILLING_BNA_RATE_FETCH, { redis, concurrency: 1 });
    this.db = createNodeDb(databaseUrl);
  }

  protected async process(job: Job<BnaRateJobData>): Promise<void> {
    const today = job.data.date ?? new Date().toISOString().slice(0, 10);
    job.log(`Fetching BNA official rate for ${today}`);

    const rate = await this.fetchBnaRate();

    if (rate) {
      await this.upsertRate(today, rate.compra, rate.venta);
      job.log(`Upserted BNA rate for ${today}: buy=${rate.compra} sell=${rate.venta}`);
    } else {
      job.log('BNA API fetch failed — checking fallback to previous day rate');
      await this.handleFetchFailure(today, job);
    }

    await this.checkStaleness(job);
  }

  private async fetchBnaRate(): Promise<{ compra: number; venta: number } | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(BNA_API_URL, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as DolarApiResponse;

      if (
        typeof data.compra !== 'number' || data.compra <= 0 ||
        typeof data.venta !== 'number' || data.venta <= 0
      ) {
        return null;
      }

      return { compra: data.compra, venta: data.venta };
    } catch {
      return null;
    }
  }

  private async upsertRate(date: string, buyRate: number, sellRate: number): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO bna_rate (date, buy_rate, sell_rate, fetched_at)
      VALUES (${date}::date, ${buyRate.toFixed(4)}::numeric, ${sellRate.toFixed(4)}::numeric, now())
      ON CONFLICT (date)
      DO UPDATE SET buy_rate = EXCLUDED.buy_rate, sell_rate = EXCLUDED.sell_rate, fetched_at = now()
    `);
  }

  private async handleFetchFailure(today: string, job: Job<BnaRateJobData>): Promise<void> {
    const result = await this.db.execute(sql`
      SELECT date, sell_rate FROM bna_rate
      WHERE date < ${today}::date
      ORDER BY date DESC
      LIMIT 1
    `);

    const rows = result.rows as Array<{ date: string; sell_rate: string }>;
    if (rows.length > 0) {
      job.log(`Fallback: reusing previous rate from ${rows[0]!.date} (sell=${rows[0]!.sell_rate})`);
    } else {
      throw new Error('BNA rate fetch failed and no previous rate available for fallback');
    }
  }

  private async checkStaleness(job: Job<BnaRateJobData>): Promise<void> {
    const result = await this.db.execute(sql`
      SELECT fetched_at FROM bna_rate ORDER BY date DESC LIMIT 1
    `);

    const rows = result.rows as Array<{ fetched_at: string }>;
    if (rows.length === 0) return;

    const lastFetched = new Date(rows[0]!.fetched_at);
    const ageMs = Date.now() - lastFetched.getTime();

    if (ageMs > STALE_THRESHOLD_MS) {
      job.log(`WARNING: BNA rate is stale — last fetched ${Math.round(ageMs / 3_600_000)}h ago (threshold: 48h)`);
    }
  }
}
