import type { PortalAdapter, NormalizedListing, PublishResult, UpdateResult, UnpublishResult, ListingStatus, PortalLead, CredentialValidation } from '../types.js';
import { toMeliListing } from '../field-mapping.js';
import { decryptCredentials } from '../credentials.js';

const MELI_API_BASE = 'https://api.mercadolibre.com';

interface MeliCredentials {
  user_id: string;
  access_token: string;
  expires_at?: string;
}

function parseCredentials(encrypted: Buffer): MeliCredentials {
  const raw = decryptCredentials(encrypted);
  return raw as unknown as MeliCredentials;
}

async function meliRequest(path: string, accessToken: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${MELI_API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}

export const mercadolibreAdapter: PortalAdapter = {
  id: 'mercadolibre',
  displayName: 'MercadoLibre Inmuebles',
  rateLimits: {
    maxRequestsPerMinute: 40,
    maxRequestsPerHour: 1000,
    maxConcurrent: 5,
  },
  async validateCredentials(encrypted: Buffer): Promise<CredentialValidation> {
    try {
      const creds = parseCredentials(encrypted);
      const res = await meliRequest(`/users/${creds.user_id}`, creds.access_token);
      if (!res.ok) {
        return { valid: false, error: `HTTP ${res.status}: ${await res.text()}` };
      }
      const user = await res.json() as Record<string, unknown>;
      return {
        valid: true,
        ...(user['nickname'] ? { accountName: user['nickname'] as string } : {}),
        ...(creds.expires_at ? { expiresAt: new Date(creds.expires_at) } : {}),
      };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
  async publishListing(listing: NormalizedListing, encrypted: Buffer): Promise<PublishResult> {
    const creds = parseCredentials(encrypted);
    const body = toMeliListing(listing);
    const res = await meliRequest('/items', creds.access_token, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`MeLi publish failed (${res.status}): ${errBody}`);
    }
    const item = await res.json() as Record<string, unknown>;
    return {
      portalId: 'mercadolibre',
      externalId: item['id'] as string,
      url: item['permalink'] as string,
      publishedAt: new Date(item['date_created'] as string),
    };
  },
  async updateListing(externalId: string, listing: NormalizedListing, encrypted: Buffer): Promise<UpdateResult> {
    const creds = parseCredentials(encrypted);
    const body = toMeliListing(listing);
    const res = await meliRequest(`/items/${externalId}`, creds.access_token, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`MeLi update failed (${res.status}): ${errBody}`);
    }
    return {
      portalId: 'mercadolibre',
      externalId,
      updatedAt: new Date(),
    };
  },
  async unpublishListing(externalId: string, encrypted: Buffer): Promise<UnpublishResult> {
    const creds = parseCredentials(encrypted);
    const res = await meliRequest(`/items/${externalId}`, creds.access_token, {
      method: 'PUT',
      body: JSON.stringify({ status: 'closed' }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`MeLi unpublish failed (${res.status}): ${errBody}`);
    }
    return {
      portalId: 'mercadolibre',
      externalId,
      unpublishedAt: new Date(),
    };
  },
  async getListingStatus(externalId: string, encrypted: Buffer): Promise<ListingStatus> {
    const creds = parseCredentials(encrypted);
    const res = await meliRequest(`/items/${externalId}`, creds.access_token);
    if (!res.ok) {
      throw new Error(`MeLi getStatus failed (${res.status}): ${await res.text()}`);
    }
    const item = await res.json() as Record<string, unknown>;
    return {
      externalId: item['id'] as string,
      active: item['status'] === 'active',
      portalUrl: item['permalink'] as string,
      lastModified: new Date(item['last_updated'] as string),
      rawStatus: item['status'] as string,
    };
  },
  async fetchLeads(since: Date, encrypted: Buffer): Promise<PortalLead[]> {
    const creds = parseCredentials(encrypted);
    const res = await meliRequest(
      `/my/received_questions/search?seller_id=${creds.user_id}&sort_fields=date_created&sort_types=DESC&api_version=4`,
      creds.access_token,
    );
    if (!res.ok) {
      throw new Error(`MeLi fetchLeads failed (${res.status}): ${await res.text()}`);
    }
    const data = await res.json() as { questions?: Record<string, unknown>[] };
    return (data.questions ?? [])
      .filter((q) => new Date(q['date_created'] as string) >= since)
      .map((q) => ({
        portalId: 'mercadolibre' as const,
        externalLeadId: String(q['id']),
        externalListingId: q['item_id'] as string,
        message: q['text'] as string,
        receivedAt: new Date(q['date_created'] as string),
        raw: q,
      }));
  },
};
