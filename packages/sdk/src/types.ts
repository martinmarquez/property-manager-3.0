export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  total: number;
}

export interface Property {
  id: string;
  title: string;
  type: 'house' | 'apartment' | 'commercial' | 'land' | 'garage' | 'other';
  operation: 'sale' | 'rent' | 'temporary_rent';
  price: { amount: number; currency: 'USD' | 'ARS' };
  status: 'active' | 'paused' | 'reserved' | 'sold' | 'rented' | 'draft';
  address?: { street?: string; city?: string; state?: string; country: string };
  area?: { total?: number; covered?: number; unit: 'sqm' | 'sqft' };
  bedrooms?: number;
  bathrooms?: number;
  createdAt: string;
  updatedAt: string;
}

export type PropertyList = PaginatedResponse<Property>;

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: 'lead' | 'client' | 'owner' | 'other';
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export type ContactList = PaginatedResponse<Contact>;

export interface Lead {
  id: string;
  contactId: string;
  propertyId?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  source?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadList = PaginatedResponse<Lead>;

export interface ApiError {
  code: string;
  message: string;
  status: number;
  requestId?: string | undefined;
}

export class CorredorApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | undefined;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'CorredorApiError';
    this.code = error.code;
    this.status = error.status;
    this.requestId = error.requestId;
  }
}
