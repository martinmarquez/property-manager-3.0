import type { PortalAdapter, NormalizedListing, PublishResult, UpdateResult, UnpublishResult, ListingStatus, PortalLead, CredentialValidation } from '../types.js';
import { toProppitListing } from '../field-mapping.js';
import { decryptCredentials } from '../credentials.js';

const PROPPIT_API_BASE = 'https://api.proppit.com/v1';

interface ProppitCredentials {
  account_id: string;
  api_key: string;
}

function parseCredentials(encrypted: Buffer): ProppitCredentials {
  const raw = decryptCredentials(encrypted);
  return raw as unknown as ProppitCredentials;
}

async function proppitRequest(path: string, apiKey: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${PROPPIT_API_BASE}${path}`, {
    ...options,
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}

export const proppitAdapter: PortalAdapter = {
  id: 'proppit',
  displayName: 'Proppit (Properati, iCasas, Trovit, Mitula, Nuroa, Nestoria)',
  rateLimits: {
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 2000,
    maxConcurrent: 10,
  },
  async validateCredentials(encrypted: Buffer): Promise<CredentialValidation> {
    try {
      const creds = parseCredentials(encrypted);
      const res = await proppitRequest(`/accounts/${creds.account_id}`, creds.api_key);
      if (!res.ok) {
        return { valid: false, error: `HTTP ${res.status}: ${await res.text()}` };
      }
      const account = await res.json() as Record<string, unknown>;
      return {
        valid: true,
        ...(account['name'] ? { accountName: account['name'] as string } : {}),
      };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
  async publishListing(listing: NormalizedListing, encrypted: Buffer): Promise<PublishResult> {
    const creds = parseCredentials(encrypted);
    const body = toProppitListing(listing);
    const res = await proppitRequest('/properties', creds.api_key, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Proppit publish failed (${res.status}): ${errBody}`);
    }
    const result = await res.json() as Record<string, unknown>;
    return {
      portalId: 'proppit',
      externalId: result['id'] as string,
      url: result['url'] as string,
      publishedAt: new Date(result['createdAt'] as string),
      portalSpecificFields: {
        distributedTo: ['properati', 'icasas', 'trovit', 'mitula', 'nuroa', 'nestoria'],
      },
    };
  },
  async updateListing(externalId: string, listing: NormalizedListing, encrypted: Buffer): Promise<UpdateResult> {
    const creds = parseCredentials(encrypted);
    const body = toProppitListing(listing);
    const res = await proppitRequest(`/properties/${externalId}`, creds.api_key, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Proppit update failed (${res.status}): ${errBody}`);
    }
    return {
      portalId: 'proppit',
      externalId,
      updatedAt: new Date(),
    };
  },
  async unpublishListing(externalId: string, encrypted: Buffer): Promise<UnpublishResult> {
    const creds = parseCredentials(encrypted);
    const res = await proppitRequest(`/properties/${externalId}`, creds.api_key, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Proppit unpublish failed (${res.status}): ${errBody}`);
    }
    return {
      portalId: 'proppit',
      externalId,
      unpublishedAt: new Date(),
    };
  },
  async getListingStatus(externalId: string, encrypted: Buffer): Promise<ListingStatus> {
    const creds = parseCredentials(encrypted);
    const res = await proppitRequest(`/properties/${externalId}`, creds.api_key);
    if (!res.ok) {
      throw new Error(`Proppit getStatus failed (${res.status}): ${await res.text()}`);
    }
    const prop = await res.json() as Record<string, unknown>;
    const stats = prop['stats'] as Record<string, unknown> | undefined;
    return {
      externalId: prop['id'] as string,
      active: prop['status'] === 'active',
      portalUrl: prop['url'] as string,
      ...(stats?.['views'] !== undefined ? { views: stats['views'] as number } : {}),
      lastModified: new Date(prop['updatedAt'] as string),
      rawStatus: prop['status'] as string,
    };
  },
  async fetchLeads(since: Date, encrypted: Buffer): Promise<PortalLead[]> {
    const creds = parseCredentials(encrypted);
    const sinceIso = since.toISOString();
    const res = await proppitRequest(`/leads?since=${encodeURIComponent(sinceIso)}&limit=100`, creds.api_key);
    if (!res.ok) {
      throw new Error(`Proppit fetchLeads failed (${res.status}): ${await res.text()}`);
    }
    const data = await res.json() as { leads?: Record<string, unknown>[] };
    return (data.leads ?? []).map((lead) => ({
      portalId: 'proppit' as const,
      externalLeadId: lead['id'] as string,
      externalListingId: lead['propertyId'] as string,
      ...(lead['name'] ? { name: lead['name'] as string } : {}),
      ...(lead['email'] ? { email: lead['email'] as string } : {}),
      ...(lead['phone'] ? { phone: lead['phone'] as string } : {}),
      ...(lead['message'] ? { message: lead['message'] as string } : {}),
      receivedAt: new Date(lead['createdAt'] as string),
      raw: lead,
    }));
  },
};
