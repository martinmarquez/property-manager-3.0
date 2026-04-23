// Domain logic — transport-agnostic

// Domain events
export * from "./events/index.js";

// BullMQ queue definitions
export * from "./queues.js";

// BaseWorker
export * from "./workers/index.js";

// Rate limiting
export {
  checkRateLimit,
  rateLimiter,
  aiTokenBudgetMiddleware,
  RateLimitPresets,
  currentMonth,
} from "./rate-limit.js";
export type {
  RateLimitConfig,
  RateLimitResult,
  RedisClient,
  AiBudgetConfig,
} from "./rate-limit.js";

// Tenant context
export {
  setTenantContext,
  getCurrentTenant,
  assertTenantAccess,
  TenantAccessError,
} from "./tenant.js";
export type {
  DbClient,
  TenantIdentity,
  TenantContext,
} from "./tenant.js";

// i18n utilities
export {
  formatMoney,
  formatDate,
  formatNumber,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
} from "./i18n/index.js";
export type { SupportedCurrency, SupportedLocale } from "./i18n/index.js";

// Contact domain helpers
export { scoreDuplicateFields, trigramSimilarity } from './contacts/duplicate.js';
export type { CandidateFields } from './contacts/duplicate.js';

// Inquiry match engine
export {
  computeMatchScore,
  MATCH_WEIGHTS,
} from './inquiries/match-engine.js';
export type {
  InquiryCriteria,
  ZoneCriterion,
  PropertyData,
  ListingData,
  ScoreBreakdown,
  MatchResult,
} from './inquiries/match-engine.js';

// Analytics event taxonomy and KPI helpers
export * from './analytics/index.js';

// Middleware
export {
  securityHeaders,
  apiSecurityHeaders,
  webSecurityHeaders,
  swaggerSecurityHeaders,
  CSP_NONCE_KEY,
} from "./middleware/security-headers.js";
export type { SecurityHeadersOptions } from "./middleware/security-headers.js";
