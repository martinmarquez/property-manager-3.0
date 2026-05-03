// ARS price calculation: USD × (BNA rate × 1.15), rounded to ARS 500
export const IVA_RATE = 0.21;
export const AFIP_PUNTO_VENTA = 1;

export function calculateArsPrice(usdAmount: number, bnaRate: number): number {
  const raw = usdAmount * bnaRate * 1.15;
  return Math.ceil(raw / 500) * 500;
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
