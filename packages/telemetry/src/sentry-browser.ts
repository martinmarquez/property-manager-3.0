import { init, browserTracingIntegration, replayIntegration } from '@sentry/browser';
import type { SentryConfig } from './sentry.js';

export type { SentryConfig };

/**
 * Initialize Sentry for browser runtimes (web).
 * Call at app root before rendering.
 */
export function initSentryBrowser(config: SentryConfig): void {
  init({
    dsn: config.dsn,
    environment: config.environment,
    ...(config.release !== undefined ? { release: config.release } : {}),
    tracesSampleRate: config.tracesSampleRate ?? 0.1,
    integrations: [
      browserTracingIntegration(),
      replayIntegration({ maskAllInputs: true, blockAllMedia: false }),
    ],
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Re-export React error boundary utilities from @sentry/react
export { ErrorBoundary as SentryErrorBoundary, withErrorBoundary } from '@sentry/react';
