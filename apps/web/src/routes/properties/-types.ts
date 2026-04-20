// RENA-28 — Property list view types
// All filter state is serialized into URL search params via TanStack Router.

export type ViewMode = 'table' | 'cards' | 'map';

export type OperationKind =
  | 'sale'
  | 'rent'
  | 'temp_rent'
  | 'commercial_rent'
  | 'commercial_sale';

export type PropertyStatus =
  | 'active'
  | 'reserved'
  | 'sold'
  | 'paused'
  | 'archived';

export type PropertyTypeName =
  | 'apartment'
  | 'ph'
  | 'house'
  | 'quinta'
  | 'land'
  | 'office'
  | 'commercial'
  | 'garage'
  | 'warehouse'
  | 'farm'
  | 'hotel'
  | 'building'
  | 'business_fund'
  | 'development';

export interface PriceRange {
  min?: number;
  max?: number;
  currency: 'ARS' | 'USD';
}

export interface NumericRange {
  min?: number;
  max?: number;
}

/** Full filter state — serialized into URL search params */
export interface PropertyFilter {
  // Multi-selects (empty array = no constraint — no "activate filter" checkbox)
  operations: OperationKind[];
  types: PropertyTypeName[];
  subtypes: string[];
  statuses: PropertyStatus[];
  // Price
  price: PriceRange;
  // Numeric ranges
  coveredArea: NumericRange;
  totalArea: NumericRange;
  rooms: NumericRange;
  bedrooms: NumericRange;
  bathrooms: NumericRange;
  age: NumericRange;
  // Geo hierarchy
  province?: string;
  locality?: string;
  neighborhood?: string;
  /** GeoJSON polygon from map draw tool, serialized as base64 */
  polygon?: string;
  // Other multi-selects
  tagIds: string[];
  agentIds: string[];
  branchIds: string[];
  portalIds: string[];
  // Date range (ISO date strings YYYY-MM-DD)
  createdFrom?: string;
  createdTo?: string;
  // Booleans (undefined = no constraint)
  featured?: boolean;
  hasPricePublic?: boolean;
}

export const EMPTY_FILTER: PropertyFilter = {
  operations: [],
  types: [],
  subtypes: [],
  statuses: [],
  price: { currency: 'USD' },
  coveredArea: {},
  totalArea: {},
  rooms: {},
  bedrooms: {},
  bathrooms: {},
  age: {},
  tagIds: [],
  agentIds: [],
  branchIds: [],
  portalIds: [],
};

export interface SavedView {
  id: string;
  name: string;
  filter: PropertyFilter;
  viewMode: ViewMode;
  savedAt: string; // ISO timestamp
}

/** Shape returned by the list API endpoint */
export interface PropertyRow {
  id: string;
  referenceCode: string;
  title: string | null;
  thumbUrl: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  locality: string | null;
  province: string | null;
  lat: number | null;
  lng: number | null;
  propertyType: PropertyTypeName;
  subtype: string | null;
  status: PropertyStatus;
  featured: boolean;
  hasPricePublic: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  coveredAreaM2: number | null;
  totalAreaM2: number | null;
  // Denormalized from property_listing (first active listing)
  operationKind: OperationKind | null;
  priceAmount: string | null;
  priceCurrency: 'ARS' | 'USD' | null;
  updatedAt: string;
  agentName: string | null;
  agentAvatarUrl: string | null;
}

export interface PropertyListResponse {
  rows: PropertyRow[];
  total: number;
  page: number;
  pageSize: number;
}
