/**
 * Push notification providers — Phase H (RENA-198)
 *
 * Exports:
 *   APNsProvider   — Apple Push Notification service (iOS)
 *   FCMProvider    — Firebase Cloud Messaging (Android)
 *   createPushProvider — factory that returns the right provider from env config
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PushPayload {
  title: string;
  body: string;
  /** Deep-link path, e.g. "/properties/abc-123" */
  deepLink?: string | undefined;
  /** Badge count to set on the app icon (iOS). */
  badge?: number | undefined;
  data?: Record<string, string> | undefined;
}

export interface PushSendResult {
  success: boolean;
  messageId?: string | undefined;
  error?: string | undefined;
}

export interface PushProvider {
  send(token: string, payload: PushPayload): Promise<PushSendResult>;
  sendBatch(
    tokens: string[],
    payload: PushPayload,
  ): Promise<Map<string, PushSendResult>>;
}

// ---------------------------------------------------------------------------
// APNs provider (HTTP/2 — uses native fetch, no heavy SDK)
// ---------------------------------------------------------------------------

export interface APNsConfig {
  /** p8 private key content (with header/footer). */
  privateKey: string;
  /** 10-char key ID from Apple developer portal. */
  keyId: string;
  /** Apple developer team ID. */
  teamId: string;
  /** APNs bundle ID (topic). */
  bundleId: string;
  /** 'production' | 'sandbox' — defaults to 'production'. */
  environment?: 'production' | 'sandbox';
}

export class APNsProvider implements PushProvider {
  private readonly config: Required<APNsConfig>;
  private readonly host: string;

  constructor(config: APNsConfig) {
    this.config = { environment: 'production', ...config };
    this.host =
      this.config.environment === 'production'
        ? 'https://api.push.apple.com'
        : 'https://api.sandbox.push.apple.com';
  }

  async send(token: string, payload: PushPayload): Promise<PushSendResult> {
    const jwt = await this._buildJwt();
    const body = this._buildBody(payload);

    const res = await fetch(`${this.host}/3/device/${token}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': this.config.bundleId,
        'apns-push-type': 'alert',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 200) {
      return { success: true, messageId: res.headers.get('apns-id') ?? undefined };
    }

    const errBody = (await res.json().catch(() => ({}))) as { reason?: string };
    return { success: false, error: errBody.reason ?? `HTTP ${res.status}` };
  }

  async sendBatch(
    tokens: string[],
    payload: PushPayload,
  ): Promise<Map<string, PushSendResult>> {
    const results = new Map<string, PushSendResult>();
    await Promise.all(
      tokens.map(async (token) => {
        results.set(token, await this.send(token, payload));
      }),
    );
    return results;
  }

  private _buildBody(payload: PushPayload) {
    return {
      aps: {
        alert: { title: payload.title, body: payload.body },
        badge: payload.badge,
        sound: 'default',
      },
      ...(payload.deepLink ? { deepLink: payload.deepLink } : {}),
      ...(payload.data ?? {}),
    };
  }

  /** Builds a short-lived ES256 JWT for APNs provider authentication. */
  private async _buildJwt(): Promise<string> {
    const header = this._base64url(JSON.stringify({ alg: 'ES256', kid: this.config.keyId }));
    const now = Math.floor(Date.now() / 1000);
    const claims = this._base64url(
      JSON.stringify({ iss: this.config.teamId, iat: now }),
    );
    const unsigned = `${header}.${claims}`;

    const keyData = this.config.privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s+/g, '');

    const { subtle } = await import('node:crypto');
    const rawKey = Buffer.from(keyData, 'base64');
    const cryptoKey = await subtle.importKey(
      'pkcs8',
      rawKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );
    const sigBuf = await subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      Buffer.from(unsigned),
    );
    const sig = this._base64url(Buffer.from(sigBuf).toString('base64'));
    return `${unsigned}.${sig}`;
  }

  private _base64url(input: string): string {
    return Buffer.from(input)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

// ---------------------------------------------------------------------------
// FCM provider (HTTP v1 API)
// ---------------------------------------------------------------------------

export interface FCMConfig {
  /** Service account JSON string (stringify of the JSON file). */
  serviceAccountJson: string;
  /** FCM project ID (from service account). */
  projectId: string;
}

export class FCMProvider implements PushProvider {
  private readonly config: FCMConfig;
  private _accessToken: string | null = null;
  private _tokenExpiresAt = 0;

  constructor(config: FCMConfig) {
    this.config = config;
  }

  async send(token: string, payload: PushPayload): Promise<PushSendResult> {
    const accessToken = await this._getAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${this.config.projectId}/messages:send`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          data: {
            ...(payload.deepLink ? { deepLink: payload.deepLink } : {}),
            ...(payload.data ?? {}),
          },
          android: { priority: 'high' },
          apns: {
            payload: { aps: { badge: payload.badge, sound: 'default' } },
          },
        },
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { name?: string };
      return { success: true, messageId: data.name };
    }

    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    return { success: false, error: err.error?.message ?? `HTTP ${res.status}` };
  }

  async sendBatch(
    tokens: string[],
    payload: PushPayload,
  ): Promise<Map<string, PushSendResult>> {
    const results = new Map<string, PushSendResult>();
    await Promise.all(
      tokens.map(async (token) => {
        results.set(token, await this.send(token, payload));
      }),
    );
    return results;
  }

  private async _getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this._accessToken && now < this._tokenExpiresAt - 60_000) {
      return this._accessToken;
    }

    const sa = JSON.parse(this.config.serviceAccountJson) as {
      client_email: string;
      private_key: string;
    };

    const scope = 'https://www.googleapis.com/auth/firebase.messaging';
    const iat = Math.floor(now / 1000);
    const exp = iat + 3600;
    const header = this._base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = this._base64url(
      JSON.stringify({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat, exp }),
    );
    const unsigned = `${header}.${claims}`;

    const { subtle } = await import('node:crypto');
    const rawKey = sa.private_key
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s+/g, '');
    const cryptoKey = await subtle.importKey(
      'pkcs8',
      Buffer.from(rawKey, 'base64'),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sigBuf = await subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, Buffer.from(unsigned));
    const assertion = `${unsigned}.${this._base64url(Buffer.from(sigBuf).toString('base64'))}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token: string; expires_in: number };
    this._accessToken = tokenData.access_token;
    this._tokenExpiresAt = now + tokenData.expires_in * 1000;
    return this._accessToken;
  }

  private _base64url(input: string): string {
    return Buffer.from(input)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface PushProviderConfig {
  apns?: APNsConfig;
  fcm?: FCMConfig;
}

export function createPushProvider(
  platform: 'apns' | 'fcm',
  config: PushProviderConfig,
): PushProvider {
  if (platform === 'apns') {
    if (!config.apns) throw new Error('APNs config required');
    return new APNsProvider(config.apns);
  }
  if (!config.fcm) throw new Error('FCM config required');
  return new FCMProvider(config.fcm);
}
