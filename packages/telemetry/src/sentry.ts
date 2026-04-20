import {
  init,
  httpIntegration,
  onUncaughtExceptionIntegration,
  onUnhandledRejectionIntegration,
} from '@sentry/node';

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string | undefined;
  tracesSampleRate?: number | undefined;
  profilesSampleRate?: number | undefined;
}

/**
 * Initialize Sentry for Node.js runtimes (api, worker).
 * Must be called before any other imports to ensure all errors are captured.
 */
export function initSentryNode(config: SentryConfig): void {
  init({
    dsn: config.dsn,
    environment: config.environment,
    ...(config.release !== undefined ? { release: config.release } : {}),
    tracesSampleRate: config.tracesSampleRate ?? 0.1,
    profilesSampleRate: config.profilesSampleRate ?? 0.1,
    integrations: [
      httpIntegration(),
      onUncaughtExceptionIntegration(),
      onUnhandledRejectionIntegration(),
    ],
  });
}
