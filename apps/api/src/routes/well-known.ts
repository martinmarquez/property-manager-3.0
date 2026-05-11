/**
 * /.well-known routes for Universal Links (iOS) and App Links (Android)
 * — Phase H RENA-198
 *
 * Mounted at /.well-known/apple-app-site-association
 *          and /.well-known/assetlinks.json
 *
 * iOS path patterns match the same deep-link scheme used by the Capacitor app.
 */

import { Hono } from 'hono';

interface WellKnownConfig {
  /** iOS app ID: "TEAMID.bundleId" */
  iosAppId: string;
  /** Android package name */
  androidPackage: string;
  /** SHA-256 fingerprint of the Android signing cert */
  androidSha256: string;
}

export function createWellKnownRoutes(config: WellKnownConfig): Hono {
  const app = new Hono();

  // iOS Universal Links
  app.get('/apple-app-site-association', (c) => {
    const payload = {
      applinks: {
        apps: [],
        details: [
          {
            appID: config.iosAppId,
            paths: [
              '/properties/*',
              '/contacts/*',
              '/deals/*',
              '/inbox/*',
              '/app/*',
            ],
          },
        ],
      },
      webcredentials: {
        apps: [config.iosAppId],
      },
    };
    return c.json(payload, 200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    });
  });

  // Android App Links
  app.get('/assetlinks.json', (c) => {
    const payload = [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: config.androidPackage,
          sha256_cert_fingerprints: [config.androidSha256],
        },
      },
    ];
    return c.json(payload, 200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    });
  });

  return app;
}
