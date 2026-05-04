// Shared types for the Tokko → Corredor importer

export type EntityKind = 'agency-config' | 'users' | 'properties' | 'contacts' | 'leads';

export interface EntityStats {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
}

export type RunStatus = 'running' | 'completed' | 'completed_with_errors' | 'failed' | 'aborted';

export interface LogEntry {
  entity: EntityKind;
  external_id: string;
  type: string;
  message: string;
  http_status?: number;
  corredor_error?: string;
}

export interface RunReport {
  run_id: string;
  started_at: string;
  completed_at: string;
  status: RunStatus;
  summary: Partial<Record<EntityKind, EntityStats>>;
  warnings: LogEntry[];
  errors: LogEntry[];
}

export interface CliOptions {
  tokkoApiKey: string;
  tokkoAgencyId: string;
  corredorApiKey: string;
  corredorUrl: string;
  dryRun: boolean;
  resume: boolean;
  runId: string;
  concurrency: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  output: 'terminal' | 'json' | 'csv';
  fromZip?: string;
  noUpdate: boolean;
  entities: EntityKind[];
}

export interface Checkpoint {
  run_id: string;
  started_at: string;
  last_updated: string;
  options: CliOptions;
  completed_entities: EntityKind[];
  entity_progress: Partial<Record<EntityKind, {
    total: number;
    processed: number;
    last_offset: number;
  }>>;
  id_map: {
    users: Record<string, string>;
    properties: Record<string, string>;
    contacts: Record<string, string>;
    branches: Record<string, string>;
  };
}

// -------------------------------------------------------------------------
// Tokko API response types (minimal — only what we map)
// -------------------------------------------------------------------------

export interface TokkoPropertyPhoto {
  image: string;
  is_front_cover?: boolean;
  order?: number;
}

export interface TokkoPropertyOperation {
  operation_type: string;
  prices?: Array<{
    price: number | null;
    currency: string;
    period?: string | null;
  }>;
}

export interface TokkoProperty {
  id: number;
  reference_code?: string;
  type?: { name: string };
  operations?: TokkoPropertyOperation[];
  address?: string;
  location?: { name?: string };
  geo_lat?: number | null;
  geo_long?: number | null;
  surface_total?: number | null;
  surface_covered?: number | null;
  rooms?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  age?: number | null;
  description?: string | null;
  photos?: TokkoPropertyPhoto[];
  videos?: Array<{ url: string }>;
  floor_plans?: Array<{ image: string }>;
  tags?: Array<{ name: string }>;
  status?: string;
  sale_status?: string;
  rental_status?: string;
  web_price?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted?: boolean;
  producer?: { id: number } | null;
  appraiser?: { id: number } | null;
  branch?: { id: number } | null;
}

export interface TokkoContact {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  cellphone?: string | null;
  contact_type?: { name: string };
  tags?: Array<{ name: string }>;
  created_at?: string;
  assigned_broker?: { id: number } | null;
  address?: string | null;
  notes?: string | null;
  birth_date?: string | null;
  country?: string | null;
}

export interface TokkoLead {
  id: number;
  contact?: { id: number };
  properties?: Array<{ id: number }>;
  status?: { name: string };
  close_reason?: { name: string } | null;
  created_at?: string;
  updated_at?: string;
  comments?: Array<{
    text: string;
    created_at: string;
    author?: { id: number } | null;
  }>;
  budget?: number | null;
  budget_currency?: string | null;
  assigned_broker?: { id: number } | null;
}

export interface TokkoUser {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  branch?: { id: number } | null;
  active?: boolean;
  role?: string | null;
}

export interface TokkoBranch {
  id: number;
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

// -------------------------------------------------------------------------
// Corredor import API request types
// -------------------------------------------------------------------------

export interface CorredorImportProperty {
  external_source: 'tokko';
  external_id: string;
  property_type: string;
  status: string;
  location?: {
    address?: string;
    zona?: string;
    lat?: number;
    lng?: number;
  };
  operations?: Array<{
    type: string;
    price?: { amount: number; currency: string };
    show_price?: boolean;
    rent_period?: string;
  }>;
  surface_total?: number;
  surface_covered?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  building_age_years?: number;
  description?: string;
  photos?: Array<{ url: string; order: number }>;
  videos?: Array<{ url: string }>;
  floor_plans?: Array<{ url: string }>;
  custom_tags?: string[];
  sale_status?: string;
  rental_status?: string;
  legacy_reference?: string;
  deleted_at?: string;
  created_at?: string;
  updated_at?: string;
  producer_external_id?: string;
  branch_external_id?: string;
}

export interface CorredorImportContact {
  external_source: 'tokko';
  external_id: string;
  kind: 'person';
  first_name?: string;
  last_name?: string;
  emails?: Array<{ value: string; type: string; primary: boolean }>;
  phones?: Array<{ e164: string; type: string; whatsapp: boolean; primary: boolean }>;
  phones_raw?: Array<{ value: string }>;
  addresses?: Array<{ street: string }>;
  notes?: string;
  birth_date?: string;
  country_code?: string;
  owner_is_placeholder?: boolean;
  created_at?: string;
  owner_external_id?: string;
}

export interface CorredorImportLead {
  external_source: 'tokko';
  external_id: string;
  contact_external_id: string;
  property_external_ids?: string[];
  stage_name: string;
  close_reason?: string;
  budget_amount?: number;
  budget_currency?: string;
  follow_ups?: Array<{
    note: string;
    created_at: string;
    author_external_id?: string;
  }>;
  assigned_external_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CorredorImportUser {
  external_source: 'tokko';
  external_id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  branch_external_id?: string;
  active?: boolean;
  role: string;
}

export interface CorredorBulkResponse {
  imported: number;
  updated: number;
  errors: Array<{
    external_id: string;
    code: string;
    message: string;
  }>;
}
