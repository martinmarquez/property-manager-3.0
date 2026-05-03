// ARS price calculation: USD × (BNA rate × 1.15), rounded to ARS 500
export const IVA_RATE = 0.21;
export const AFIP_PUNTO_VENTA = 1;
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;
const FALLBACK_RATE = 1100;

export function calculateArsPrice(usdAmount: number, bnaRate: number): number {
  const raw = usdAmount * bnaRate * 1.15;
  return Math.ceil(raw / 500) * 500;
}

export interface LatestBnaRate {
  sellRate: number;
  date: string;
  isStale: boolean;
}

export interface BnaRateRow {
  date: string;
  sell_rate: string;
  fetched_at: string;
}

export function interpretBnaRate(rows: BnaRateRow[]): LatestBnaRate {
  if (rows.length === 0) {
    return { sellRate: FALLBACK_RATE, date: 'fallback', isStale: true };
  }

  const row = rows[0]!;
  const ageMs = Date.now() - new Date(row.fetched_at).getTime();

  return {
    sellRate: Number(row.sell_rate),
    date: String(row.date),
    isStale: ageMs > STALE_THRESHOLD_MS,
  };
}

// Invoice type determination based on buyer tax condition:
//   RI (Responsable Inscripto) → A
//   CF (Consumidor Final) → B
//   MO (Monotributo) → C (also receives B in practice, but spec says C)
//   EX (Export) → E
export function determineInvoiceType(buyerTaxCondition: string): 'A' | 'B' | 'C' | 'E' {
  switch (buyerTaxCondition) {
    case 'RI': return 'A';
    case 'CF': return 'B';
    case 'MO': return 'C';
    case 'EX': return 'E';
    default: return 'B';
  }
}
