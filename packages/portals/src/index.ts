export { PORTAL_IDS, portalIdSchema } from './types.js';
export type { PortalId, NormalizedListing, ListingImage, PublishResult, UpdateResult, UnpublishResult, ListingStatus, PortalLead, CredentialValidation, RateLimitConfig, PortalAdapter } from './types.js';

// Registry
export { registerAdapter, getAdapter, listAdapters, hasAdapter } from './registry.js';

// Credential encryption
export { encryptCredentials, decryptCredentials } from './credentials.js';

// Field mapping
export { toMeliListing, toProppitListing } from './field-mapping.js';

// Adapters
export { mercadolibreAdapter } from './adapters/mercadolibre.js';
export { proppitAdapter } from './adapters/proppit.js';
