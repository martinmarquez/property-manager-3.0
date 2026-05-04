// Corredor import API client.

import type {
  CorredorImportProperty,
  CorredorImportContact,
  CorredorImportLead,
  CorredorImportUser,
  CorredorBulkResponse,
} from '../types.js';

const RATE_LIMIT_BACKOFF_MS = 60_000;
const MAX_RETRIES = 3;

export class CorredorApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Corredor API ${status}: ${body.slice(0, 200)}`);
    this.name = 'CorredorApiError';
  }
}

export class CorredorClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    let lastError: CorredorApiError | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (res.ok) return res.json() as Promise<T>;

      const text = await res.text();

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, RATE_LIMIT_BACKOFF_MS));
        continue;
      }

      if (res.status >= 500 && attempt < MAX_RETRIES) {
        const backoff = Math.pow(2, attempt) * 2000;
        await new Promise((r) => setTimeout(r, backoff));
        lastError = new CorredorApiError(res.status, text);
        continue;
      }

      throw new CorredorApiError(res.status, text);
    }

    throw lastError ?? new CorredorApiError(500, 'Max retries exceeded');
  }

  async ping(): Promise<boolean> {
    try {
      await this.request('GET', '/api/v1/health');
      return true;
    } catch {
      return false;
    }
  }

  async importProperties(records: CorredorImportProperty[]): Promise<CorredorBulkResponse> {
    return this.request<CorredorBulkResponse>('POST', '/api/v1/import/properties', { records });
  }

  async importContacts(records: CorredorImportContact[]): Promise<CorredorBulkResponse> {
    return this.request<CorredorBulkResponse>('POST', '/api/v1/import/contacts', { records });
  }

  async importLeads(records: CorredorImportLead[]): Promise<CorredorBulkResponse> {
    return this.request<CorredorBulkResponse>('POST', '/api/v1/import/leads', { records });
  }

  async importUsers(records: CorredorImportUser[]): Promise<CorredorBulkResponse> {
    return this.request<CorredorBulkResponse>('POST', '/api/v1/import/users', { records });
  }
}
