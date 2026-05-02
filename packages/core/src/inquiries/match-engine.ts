/**
 * Match engine — pure scoring function.
 *
 * Computes a 0–100 score between an inquiry's criteria and a property listing.
 * Deterministic: same inputs always produce the same score.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InquiryCriteria {
  operation: string;
  propertyTypes: string[];
  bedroomsMin: number | null;
  roomsMin: number | null;
  priceMin: number | null;
  priceMax: number | null;
  priceCurrency: string;
  areaMinM2: number | null;
  zones: ZoneCriterion[];
  requiredFeatures: string[];
}

export interface ZoneCriterion {
  province?: string;
  locality?: string;
  neighborhood?: string;
}

export interface PropertyData {
  propertyType: string;
  bedrooms: number | null;
  rooms: number | null;
  coveredAreaM2: number | null;
  totalAreaM2: number | null;
  province: string | null;
  locality: string | null;
  neighborhood: string | null;
  features: string[];
}

export interface ListingData {
  kind: string;
  priceAmount: number | null;
  priceCurrency: string;
}

export interface ScoreBreakdown {
  operation: number;
  type: number;
  price: number;
  bedrooms: number;
  zone: number;
  features: number;
  semantic: number;
}

export interface MatchResult {
  score: number;
  breakdown: ScoreBreakdown;
}

// ---------------------------------------------------------------------------
// Weights
// ---------------------------------------------------------------------------

const WEIGHTS = {
  operation: 15,
  type:      10,
  price:     20,
  bedrooms:  15,
  zone:      20,
  features:  10,
  semantic:  10,
} as const;

// ---------------------------------------------------------------------------
// Criterion scorers
// ---------------------------------------------------------------------------

function scoreOperation(inquiry: InquiryCriteria, listing: ListingData): number {
  return listing.kind === inquiry.operation ? WEIGHTS.operation : 0;
}

function scoreType(inquiry: InquiryCriteria, prop: PropertyData): number {
  if (inquiry.propertyTypes.length === 0) return WEIGHTS.type;
  return inquiry.propertyTypes.includes(prop.propertyType) ? WEIGHTS.type : 0;
}

function scorePrice(inquiry: InquiryCriteria, listing: ListingData): number {
  if (inquiry.priceMin === null && inquiry.priceMax === null) return WEIGHTS.price;
  if (listing.priceAmount === null) return 0;
  if (listing.priceCurrency !== inquiry.priceCurrency) return 0;

  const price = listing.priceAmount;
  const min = inquiry.priceMin ?? 0;
  const max = inquiry.priceMax ?? Infinity;

  if (price >= min && price <= max) return WEIGHTS.price;

  // Graduated decay for prices outside range
  const rangeSize = max === Infinity ? min : max - min;
  const reference = rangeSize > 0 ? rangeSize : max !== Infinity ? max : min;

  if (reference <= 0) return 0;

  let deviation: number;
  if (price < min) {
    // Below minimum — not a bad thing for buyers, partial score
    deviation = (min - price) / reference;
  } else {
    // Above maximum
    deviation = (price - max) / reference;
  }

  if (deviation <= 0.1) return 15;
  if (deviation <= 0.2) return 10;
  if (deviation <= 0.3) return 5;
  return 0;
}

function scoreBedrooms(inquiry: InquiryCriteria, prop: PropertyData): number {
  if (inquiry.bedroomsMin === null) return WEIGHTS.bedrooms;
  if (prop.bedrooms === null) return 0;

  const diff = prop.bedrooms - inquiry.bedroomsMin;
  if (diff >= 0) return WEIGHTS.bedrooms;
  if (diff === -1) return 10;
  if (diff === -2) return 5;
  return 0;
}

function scoreZone(inquiry: InquiryCriteria, prop: PropertyData): number {
  if (inquiry.zones.length === 0) return WEIGHTS.zone;

  let bestScore = 0;

  for (const zone of inquiry.zones) {
    let score = 0;

    const matchNeighborhood =
      zone.neighborhood &&
      prop.neighborhood &&
      zone.neighborhood.toLowerCase() === prop.neighborhood.toLowerCase();

    const matchLocality =
      zone.locality &&
      prop.locality &&
      zone.locality.toLowerCase() === prop.locality.toLowerCase();

    const matchProvince =
      zone.province &&
      prop.province &&
      zone.province.toLowerCase() === prop.province.toLowerCase();

    if (matchNeighborhood && matchLocality && matchProvince) {
      score = WEIGHTS.zone; // exact match
    } else if (matchLocality && matchProvince) {
      score = 16; // locality match but different neighborhood
    } else if (matchProvince) {
      score = 12; // province-only match
    }

    if (score > bestScore) bestScore = score;
  }

  return bestScore;
}

function scoreFeatures(inquiry: InquiryCriteria, prop: PropertyData): number {
  if (inquiry.requiredFeatures.length === 0) return WEIGHTS.features;

  const propFeatures = new Set(prop.features.map((f) => f.toLowerCase()));
  let matched = 0;

  for (const required of inquiry.requiredFeatures) {
    if (propFeatures.has(required.toLowerCase())) {
      matched++;
    }
  }

  return Math.round((matched / inquiry.requiredFeatures.length) * WEIGHTS.features);
}

function scoreSemantic(): number {
  // Reserved for AI/embedding similarity — returns 0 for now
  return 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function computeMatchScore(
  inquiry: InquiryCriteria,
  prop: PropertyData,
  listing: ListingData,
): MatchResult {
  const breakdown: ScoreBreakdown = {
    operation: scoreOperation(inquiry, listing),
    type:      scoreType(inquiry, prop),
    price:     scorePrice(inquiry, listing),
    bedrooms:  scoreBedrooms(inquiry, prop),
    zone:      scoreZone(inquiry, prop),
    features:  scoreFeatures(inquiry, prop),
    semantic:  scoreSemantic(),
  };

  const score =
    breakdown.operation +
    breakdown.type +
    breakdown.price +
    breakdown.bedrooms +
    breakdown.zone +
    breakdown.features +
    breakdown.semantic;

  return { score, breakdown };
}

export { WEIGHTS as MATCH_WEIGHTS };
