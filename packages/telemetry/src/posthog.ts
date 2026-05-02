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

// Re-export PostHog React hook for feature flags
export { useFeatureFlagEnabled as useFeatureFlag } from 'posthog-js/react';
