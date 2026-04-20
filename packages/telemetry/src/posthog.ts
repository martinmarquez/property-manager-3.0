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

// Re-export PostHog React hook for feature flags
export { useFeatureFlagEnabled as useFeatureFlag } from 'posthog-js/react';
