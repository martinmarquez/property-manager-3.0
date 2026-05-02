import posthog from 'posthog-js';

export interface PostHogConfig {
  apiKey: string;
  /** PostHog ingestion host. Defaults to https://us.i.posthog.com */
  host?: string;
}

/**
 * Initialize PostHog for browser-side product analytics.
 * Call once at app root before rendering.
 */
export function initPostHog(config: PostHogConfig): void {
  posthog.init(config.apiKey, {
    api_host: config.host ?? 'https://us.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: true,
    },
    bootstrap: {},
  });
}

/**
 * Identify the current user in PostHog.
 * Call after successful login with userId, tenantId, and any profile properties.
 */
export function identify(
  userId: string,
  tenantId: string,
  properties?: Record<string, unknown>,
): void {
  posthog.identify(userId, { tenantId, ...properties });
  posthog.group('tenant', tenantId, { tenantId });
}

/**
 * Track a typed event in PostHog.
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  posthog.capture(event, properties);
}

/**
 * Reset PostHog identity (call on logout).
 */
export function resetPostHog(): void {
  posthog.reset();
}

// ---------------------------------------------------------------------------
// Phase F — typed event helpers (copilot, search, description generation)
// All functions are fire-and-forget; they never throw.
// ---------------------------------------------------------------------------

export function trackCopilotQuery(props: {
  sessionId: string;
  turnIndex: number;
  intent?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}): void {
  track('copilot_query_sent', props);
}

export function trackCopilotAction(props: {
  sessionId: string;
  actionType: string;
  confirmed: boolean;
}): void {
  track('copilot_action_confirmed', props);
}

export function trackCopilotFeedback(props: {
  sessionId: string;
  turnId: string;
  sentiment: 'positive' | 'negative';
}): void {
  track('copilot_feedback_given', props);
}

export function trackCopilotSessionEnd(props: {
  sessionId: string;
  turnCount: number;
  durationMs: number;
}): void {
  track('copilot_session_ended', props);
}

export function trackSearch(props: {
  queryLength: number;
  searchType: 'keyword' | 'semantic' | 'hybrid';
  resultCount: number;
  latencyMs: number;
}): void {
  track('search_performed', props);
}

export function trackSearchClick(props: {
  clickedRank: number;
  searchType: 'keyword' | 'semantic' | 'hybrid';
}): void {
  track('search_result_clicked', props);
}

export function trackDescriptionGenerated(props: {
  tone?: string;
  portal?: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}): void {
  track('description_generated', props);
}

export function trackDescriptionSaved(props: {
  tone?: string;
  portal?: string;
}): void {
  track('description_saved', props);
}

// ---------------------------------------------------------------------------
// Phase G — Website builder (Sitio)
// ---------------------------------------------------------------------------

export function trackSitePagePublished(props: {
  siteId: string;
  pageSlug: string;
  hasCustomDomain: boolean;
}): void {
  track('site_page_published', props);
}

export function trackSiteFormSubmitted(props: {
  siteId: string;
  formType: string;
  pageSlug: string;
}): void {
  track('site_form_submitted', props);
}

export function trackSiteCustomDomainConnected(props: {
  siteId: string;
}): void {
  track('site_custom_domain_connected', props);
}

export function trackSiteThemeChanged(props: {
  siteId: string;
  themeId: string;
}): void {
  track('site_theme_changed', props);
}

export function trackSiteBlockAdded(props: {
  siteId: string;
  blockType: string;
}): void {
  track('site_block_added', props);
}

// ---------------------------------------------------------------------------
// Phase G — Appraisals (Tasaciones)
// ---------------------------------------------------------------------------

export function trackAppraisalCreated(props: {
  appraisalId: string;
  propertyType: string;
  neighborhoodId?: string;
}): void {
  track('appraisal_created', props);
}

export function trackAppraisalCompSearch(props: {
  appraisalId: string;
  radiusMeters: number;
  resultCount: number;
  latencyMs: number;
}): void {
  track('appraisal_comp_searched', props);
}

export function trackAppraisalAiNarrative(props: {
  appraisalId: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  accepted: boolean;
}): void {
  track('appraisal_ai_narrative_generated', props);
}

export function trackAppraisalPdfDownloaded(props: {
  appraisalId: string;
  shared: boolean;
}): void {
  track('appraisal_pdf_downloaded', props);
}

// ---------------------------------------------------------------------------
// Phase G — Report adoption
// ---------------------------------------------------------------------------

export function trackReportViewed(props: {
  reportId: string;
  reportTitle: string;
  defaultDays: number;
}): void {
  track('report_viewed', props);
}

export function trackReportExported(props: {
  reportId: string;
  format: 'csv' | 'xlsx' | 'pdf';
}): void {
  track('report_exported', props);
}

export function trackReportDigestScheduled(props: {
  reportId: string;
  cadence: 'daily' | 'weekly' | 'monthly';
}): void {
  track('report_digest_scheduled', props);
}

// ---------------------------------------------------------------------------
// Phase G — Billing / subscription
// ---------------------------------------------------------------------------

export function trackBillingCheckoutStarted(props: {
  planCode: string;
  billingInterval: 'monthly' | 'annual';
  currency: 'ARS' | 'USD';
}): void {
  track('billing_checkout_started', props);
}

export function trackPlanChanged(props: {
  fromPlan: string;
  toPlan: string;
  direction: 'upgrade' | 'downgrade' | 'cancel';
}): void {
  track('plan_changed', props);
}

export function trackTrialConverted(props: {
  trialDays: number;
  toPlan: string;
}): void {
  track('trial_converted', props);
}

// Re-export PostHog React hook for feature flags
export { useFeatureFlagEnabled as useFeatureFlag } from 'posthog-js/react';
