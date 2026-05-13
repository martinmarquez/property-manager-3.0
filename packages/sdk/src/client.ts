import type { Property, PropertyList, Contact, ContactList, Lead, LeadList } from './types.js';
import { CorredorApiError } from './types.js';

export interface CorredorClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

interface ListOptions {
  limit?: number;
  cursor?: string;
  [key: string]: unknown;
}

export class CorredorClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(options: CorredorClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.corredor.ar/v1').replace(/\/$/, '');
    this.timeout = options.timeout ?? 30_000;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-SDK-Version': '1.0.0',
          ...init.headers,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as Record<string, unknown>;
        const requestId = response.headers.get('X-Request-Id');
        throw new CorredorApiError({
          code: (body['code'] as string) ?? 'UNKNOWN_ERROR',
          message: (body['message'] as string) ?? `HTTP ${response.status}`,
          status: response.status,
          ...(requestId !== null && { requestId }),
        });
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timer);
    }
  }

  readonly properties = {
    list: (options: ListOptions = {}): Promise<PropertyList> => {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', String(options.limit));
      if (options.cursor) params.set('cursor', options.cursor);
      return this.request<PropertyList>(`/properties?${params}`);
    },

    get: (id: string): Promise<Property> =>
      this.request<Property>(`/properties/${id}`),

    create: (data: Partial<Property>): Promise<Property> =>
      this.request<Property>('/properties', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: Partial<Property>): Promise<Property> =>
      this.request<Property>(`/properties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    delete: (id: string): Promise<void> =>
      this.request<void>(`/properties/${id}`, { method: 'DELETE' }),
  };

  readonly contacts = {
    list: (options: ListOptions = {}): Promise<ContactList> => {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', String(options.limit));
      if (options.cursor) params.set('cursor', options.cursor);
      return this.request<ContactList>(`/contacts?${params}`);
    },

    get: (id: string): Promise<Contact> =>
      this.request<Contact>(`/contacts/${id}`),

    create: (data: Partial<Contact>): Promise<Contact> =>
      this.request<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) }),
  };

  readonly leads = {
    list: (options: ListOptions = {}): Promise<LeadList> => {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', String(options.limit));
      if (options.cursor) params.set('cursor', options.cursor);
      return this.request<LeadList>(`/leads?${params}`);
    },

    get: (id: string): Promise<Lead> =>
      this.request<Lead>(`/leads/${id}`),

    create: (data: Partial<Lead>): Promise<Lead> =>
      this.request<Lead>('/leads', { method: 'POST', body: JSON.stringify(data) }),
  };
}
