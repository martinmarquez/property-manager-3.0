// TTY progress display for the migration CLI.

export interface ProgressState {
  entity: string;
  processed: number;
  total: number;
  imported: number;
  failed: number;
  eta?: number;
}

export class ProgressDisplay {
  private readonly states = new Map<string, ProgressState>();
  private readonly startTimes = new Map<string, number>();
  private readonly isTTY: boolean;

  constructor() {
    this.isTTY = process.stdout.isTTY ?? false;
  }

  start(entity: string, total: number): void {
    this.states.set(entity, { entity, processed: 0, total, imported: 0, failed: 0 });
    this.startTimes.set(entity, Date.now());
    this.render(entity);
  }

  update(entity: string, delta: { processed?: number; imported?: number; failed?: number }): void {
    const s = this.states.get(entity);
    if (!s) return;
    if (delta.processed !== undefined) s.processed += delta.processed;
    if (delta.imported !== undefined) s.imported += delta.imported;
    if (delta.failed !== undefined) s.failed += delta.failed;

    const elapsed = Date.now() - (this.startTimes.get(entity) ?? Date.now());
    const rate = elapsed > 0 ? s.processed / (elapsed / 1000) : 0;
    if (rate > 0 && s.processed > 0) {
      s.eta = (s.total - s.processed) / rate;
    } else {
      delete s.eta;
    }
    this.render(entity);
  }

  done(entity: string): void {
    const s = this.states.get(entity);
    if (s) {
      s.processed = s.total;
      delete s.eta;
    }
    this.render(entity);
    if (this.isTTY) process.stdout.write('\n');
  }

  private render(entity: string): void {
    if (!this.isTTY) return;
    const s = this.states.get(entity);
    if (!s) return;
    const pct = s.total > 0 ? Math.round((s.processed / s.total) * 100) : 0;
    const eta = s.eta !== undefined ? ` ETA:${Math.round(s.eta)}s` : '';
    process.stdout.write(
      `\r[${s.entity}] ${pct}% (${s.processed}/${s.total}) imported=${s.imported} failed=${s.failed}${eta}   `,
    );
  }

  log(message: string): void {
    if (this.isTTY) process.stdout.write('\n');
    console.info(message);
  }
}
