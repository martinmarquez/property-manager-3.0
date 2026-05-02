import { z } from 'zod';

// ---------------------------------------------------------------------------
// Portal identifiers
// ---------------------------------------------------------------------------

export const PORTAL_IDS = [
  'mercadolibre',
  'zonaprop',
  'argenprop',
  'proppit',
  'inmuebles24',
  'properati',
  'idealista',
  'remax',
  'generic_xml',
] as const;

export const portalIdSchema = z.enum(PORTAL_IDS);

export type PortalId = (typeof PORTAL_IDS)[number];

// ---------------------------------------------------------------------------
// Listing types
// ---------------------------------------------------------------------------

export interface ListingImage {
  url: string;
  caption?: string;
  sortOrder: number;
}

export interface NormalizedListing {
  propertyId: string;
  referenceCode: string;
  title: string;
  description: string;
  operationType: 'sale' | 'rent' | 'temp_rent';
  propertyType: string;
  subtype?: string;
  priceAmount: number;
  priceCurrency: 'ARS' | 'USD';
  coveredAreaM2?: number;
  totalAreaM2?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  toilets?: number;
  garages?: number;
  ageYears?: number;
  country: string;
  province?: string;
  locality?: string;
  neighborhood?: string;
  addressStreet?: string;
  addressNumber?: string;
  lat?: number;
  lng?: number;
  images: ListingImage[];
  amenities?: string[];
  videoUrl?: string;
  virtualTourUrl?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface PublishResult {
  portalId: PortalId;
  externalId: string;
  url: string;
  publishedAt: Date;
  portalSpecificFields?: Record<string, unknown>;
}

export interface UpdateResult {
  portalId: PortalId;
  externalId: string;
  updatedAt: Date;
}

export interface UnpublishResult {
  portalId: PortalId;
  externalId: string;
  unpublishedAt: Date;
}

export interface ListingStatus {
  externalId: string;
  active: boolean;
  portalUrl?: string;
  views?: number;
  lastModified?: Date;
  rawStatus?: string;
}

export interface PortalLead {
  portalId: PortalId;
  externalLeadId: string;
  externalListingId: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  receivedAt: Date;
  raw: Record<string, unknown>;
}

export interface CredentialValidation {
  valid: boolean;
  accountName?: string;
  error?: string;
  expiresAt?: Date;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxConcurrent: number;
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

export interface PortalAdapter {
  readonly id: PortalId;
  readonly displayName: string;
  readonly rateLimits: RateLimitConfig;
  validateCredentials(credentials: Buffer): Promise<CredentialValidation>;
  publishListing(listing: NormalizedListing, credentials: Buffer): Promise<PublishResult>;
  updateListing(externalId: string, listing: NormalizedListing, credentials: Buffer): Promise<UpdateResult>;
  unpublishListing(externalId: string, credentials: Buffer): Promise<UnpublishResult>;
  getListingStatus(externalId: string, credentials: Buffer): Promise<ListingStatus>;
  fetchLeads(since: Date, credentials: Buffer): Promise<PortalLead[]>;
}
