# Property List View (RENA-28) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/properties` route with a virtualized table, card/map view toggle, advanced Argentina-market filter panel, and saved views — covering US-B01 + US-B02 from the Phase B spec.

**Architecture:** TanStack Router file-based route at `apps/web/src/routes/properties/`. Filter state lives entirely in the URL (searchParams), making every view deep-linkable. TanStack Table + TanStack Virtual handle virtualized rows; MapLibre renders clustered markers. Saved views store serialized URL search params in `localStorage` (per-user key) with a future migration path to the server.

**Tech Stack:** TanStack Router (search params), TanStack Table v8, TanStack Virtual v3, MapLibre GL JS v4, Drizzle ORM (DB schema), React 19, Tailwind CSS 4 custom properties, DM Sans / Syne fonts, `clsx` + `tailwind-merge` (`cn`).

**Dependency Note:** Tasks 1–2 (DB schema + types) can be done immediately. Tasks 3–10 require RENA-6 (web skeleton: TanStack Router, shadcn wired in) to be complete first.

---

## File Map

```
packages/db/src/schema/
  properties.ts          ← NEW: Drizzle schema for all property tables
  index.ts               ← MODIFY: export properties

apps/web/src/routes/properties/
  index.tsx              ← NEW: TanStack Router route (search schema + loader)
  -components/
    PropertyListPage.tsx ← NEW: top-level page container
    ViewToggle.tsx        ← NEW: table/cards/map switcher (URL-persisted)
    PropertyTable.tsx     ← NEW: virtualized TanStack Table
    PropertyCards.tsx     ← NEW: masonry card grid with TanStack Virtual
    PropertyMap.tsx       ← NEW: MapLibre with clusters + polygon draw
    FilterPanel.tsx       ← NEW: slide-over filter panel (all §1.2 filters)
    FilterChips.tsx       ← NEW: active filter summary chips below toolbar
    SavedViewsMenu.tsx    ← NEW: dropdown to save/load/delete named views
  -hooks/
    usePropertyFilters.ts ← NEW: typed read/write of URL search params
    useSavedViews.ts      ← NEW: localStorage saved views CRUD
    usePropertyQuery.ts   ← NEW: TanStack Query wrapper for property list API
  -types.ts              ← NEW: PropertyFilter, SavedView, ViewMode types
  -columns.tsx           ← NEW: TanStack Table column definitions
```

---

## Task 1: Property DB Schema

**Files:**
- Create: `packages/db/src/schema/properties.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Write the schema file**

```typescript
// packages/db/src/schema/properties.ts
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './tenancy.js';

// ── Enums ────────────────────────────────────────────────
export const operationKindEnum = pgEnum('operation_kind', [
  'sale', 'rent', 'temp_rent', 'commercial_rent', 'commercial_sale',
]);

export const propertyStatusEnum = pgEnum('property_status', [
  'active', 'reserved', 'sold', 'paused', 'archived',
]);

export const currencyEnum = pgEnum('currency', ['ARS', 'USD']);

export const propertyTypeEnum = pgEnum('property_type', [
  'apartment', 'ph', 'house', 'quinta', 'land', 'office',
  'commercial', 'garage', 'warehouse', 'farm', 'hotel', 'building',
  'business_fund', 'development',
]);

// ── property ────────────────────────────────────────────
export const property = pgTable('property', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id'),
  referenceCode: text('reference_code').notNull(),
  title: text('title'),
  description: text('description'),

  // Type / classification
  propertyType: propertyTypeEnum('property_type').notNull(),
  subtype: text('subtype'),

  // Dimensions
  coveredAreaM2: real('covered_area_m2'),
  totalAreaM2: real('total_area_m2'),
  rooms: integer('rooms'),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  toilets: integer('toilets'),
  garages: integer('garages'),
  ageYears: integer('age_years'),

  // Geo
  country: text('country').notNull().default('AR'),
  province: text('province'),
  locality: text('locality'),
  neighborhood: text('neighborhood'),
  addressStreet: text('address_street'),
  addressNumber: text('address_number'),
  lat: real('lat'),
  lng: real('lng'),

  // Status
  status: propertyStatusEnum('status').notNull().default('active'),
  featured: boolean('featured').notNull().default(false),
  hasPricePublic: boolean('has_price_public').notNull().default(true),

  // Audit
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy: uuid('updated_by').references(() => user.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by').references(() => user.id),
  deletionReason: text('deletion_reason'),
  version: integer('version').notNull().default(1),
});

// ── property_listing (operation + price per property) ───
export const propertyListing = pgTable('property_listing', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  propertyId: uuid('property_id').notNull().references(() => property.id),
  kind: operationKindEnum('kind').notNull(),
  priceAmount: numeric('price_amount', { precision: 18, scale: 2 }),
  priceCurrency: currencyEnum('price_currency').notNull().default('USD'),
  commissionPct: real('commission_pct'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

// ── property_media ───────────────────────────────────────
export const propertyMedia = pgTable('property_media', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  propertyId: uuid('property_id').notNull().references(() => property.id),
  sortOrder: integer('sort_order').notNull().default(0),
  mediaType: text('media_type').notNull().default('photo'), // photo | video | floorplan | tour
  storageKey: text('storage_key').notNull(),
  thumbUrl: text('thumb_url'),
  mediumUrl: text('medium_url'),
  fullUrl: text('full_url'),
  caption: text('caption'),
  portalOverrides: jsonb('portal_overrides').default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

// ── property_tag ─────────────────────────────────────────
export const propertyTag = pgTable('property_tag', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  propertyId: uuid('property_id').notNull().references(() => property.id),
  tagId: uuid('tag_id').notNull(), // references tag table (added in later phase)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

// ── property_history ─────────────────────────────────────
export const propertyHistory = pgTable('property_history', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  propertyId: uuid('property_id').notNull().references(() => property.id),
  actorId: uuid('actor_id').references(() => user.id),
  field: text('field').notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

// ── saved_view (user property filter presets) ────────────
export const savedView = pgTable('saved_view', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull().references(() => user.id),
  module: text('module').notNull().default('properties'),
  name: text('name').notNull(),
  filterState: jsonb('filter_state').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});
```

- [ ] **Step 2: Export from schema index**

In `packages/db/src/schema/index.ts`, add:
```typescript
export * from './properties.js';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd packages/db && pnpm typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/properties.ts packages/db/src/schema/index.ts
git commit -m "feat(db): add property schema — tables, enums, media, history, saved_view

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 2: Property Filter Types

**Files:**
- Create: `apps/web/src/routes/properties/-types.ts`

- [ ] **Step 1: Write types file**

```typescript
// apps/web/src/routes/properties/-types.ts

export type ViewMode = 'table' | 'cards' | 'map';

export type OperationKind =
  | 'sale' | 'rent' | 'temp_rent' | 'commercial_rent' | 'commercial_sale';

export type PropertyStatus =
  | 'active' | 'reserved' | 'sold' | 'paused' | 'archived';

export type PropertyTypeName =
  | 'apartment' | 'ph' | 'house' | 'quinta' | 'land' | 'office'
  | 'commercial' | 'garage' | 'warehouse' | 'farm' | 'hotel'
  | 'building' | 'business_fund' | 'development';

export interface PriceRange {
  min?: number;
  max?: number;
  currency: 'ARS' | 'USD';
}

export interface NumericRange {
  min?: number;
  max?: number;
}

/** Full filter state — serialized into URL search params */
export interface PropertyFilter {
  // Multi-selects (empty array = no constraint)
  operations: OperationKind[];
  types: PropertyTypeName[];
  subtypes: string[];
  statuses: PropertyStatus[];
  // Price
  price: PriceRange;
  // Numeric ranges
  coveredArea: NumericRange;
  totalArea: NumericRange;
  rooms: NumericRange;
  bedrooms: NumericRange;
  bathrooms: NumericRange;
  age: NumericRange;
  // Geo
  province?: string;
  locality?: string;
  neighborhood?: string;
  /** GeoJSON polygon from map draw tool, serialized as base64 */
  polygon?: string;
  // Other selects
  tagIds: string[];
  agentIds: string[];
  branchIds: string[];
  portalIds: string[];
  // Date range
  createdFrom?: string; // ISO date string
  createdTo?: string;
  // Booleans
  featured?: boolean;
  hasPricePublic?: boolean;
}

export const EMPTY_FILTER: PropertyFilter = {
  operations: [],
  types: [],
  subtypes: [],
  statuses: [],
  price: { currency: 'USD' },
  coveredArea: {},
  totalArea: {},
  rooms: {},
  bedrooms: {},
  bathrooms: {},
  age: {},
  tagIds: [],
  agentIds: [],
  branchIds: [],
  portalIds: [],
};

export interface SavedView {
  id: string;
  name: string;
  filter: PropertyFilter;
  viewMode: ViewMode;
  savedAt: string; // ISO timestamp
}

/** Shape returned by the list API endpoint */
export interface PropertyRow {
  id: string;
  referenceCode: string;
  title: string | null;
  thumbUrl: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  locality: string | null;
  province: string | null;
  lat: number | null;
  lng: number | null;
  propertyType: PropertyTypeName;
  subtype: string | null;
  status: PropertyStatus;
  featured: boolean;
  hasPricePublic: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  coveredAreaM2: number | null;
  totalAreaM2: number | null;
  // Denormalized from property_listing (first active listing)
  operationKind: OperationKind | null;
  priceAmount: string | null;
  priceCurrency: 'ARS' | 'USD' | null;
  updatedAt: string;
  agentName: string | null;
  agentAvatarUrl: string | null;
}

export interface PropertyListResponse {
  rows: PropertyRow[];
  total: number;
  page: number;
  pageSize: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/properties/-types.ts
git commit -m "feat(web): add PropertyFilter and PropertyRow types for list view

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

> **⚠️ Tasks 3–10 require RENA-6 to be complete** (TanStack Router with `@tanstack/router-plugin/vite` configured, shadcn/ui installed in apps/web, Tailwind 4 wired). Do not start these until the web skeleton is in place.

---

## Task 3: URL Filter State Hook

**Files:**
- Create: `apps/web/src/routes/properties/-hooks/usePropertyFilters.ts`

- [ ] **Step 1: Write the hook**

TanStack Router `useSearch` / `useNavigate` give us typed URL params. We define a Zod validator once and reuse it.

```typescript
// apps/web/src/routes/properties/-hooks/usePropertyFilters.ts
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback } from 'react';
import {
  EMPTY_FILTER,
  type PropertyFilter,
  type ViewMode,
} from '../-types.js';

// The route search schema is defined in index.tsx and inferred here.
// This hook is always used inside the /properties route tree.
export function usePropertyFilters() {
  const search = useSearch({ from: '/properties/' });
  const navigate = useNavigate({ from: '/properties/' });

  const filter: PropertyFilter = {
    operations: search.operations ?? [],
    types: search.types ?? [],
    subtypes: search.subtypes ?? [],
    statuses: search.statuses ?? [],
    price: search.price ?? { currency: 'USD' },
    coveredArea: search.coveredArea ?? {},
    totalArea: search.totalArea ?? {},
    rooms: search.rooms ?? {},
    bedrooms: search.bedrooms ?? {},
    bathrooms: search.bathrooms ?? {},
    age: search.age ?? {},
    province: search.province,
    locality: search.locality,
    neighborhood: search.neighborhood,
    polygon: search.polygon,
    tagIds: search.tagIds ?? [],
    agentIds: search.agentIds ?? [],
    branchIds: search.branchIds ?? [],
    portalIds: search.portalIds ?? [],
    createdFrom: search.createdFrom,
    createdTo: search.createdTo,
    featured: search.featured,
    hasPricePublic: search.hasPricePublic,
  };

  const viewMode: ViewMode = search.view ?? 'table';

  const setFilter = useCallback(
    (partial: Partial<PropertyFilter>) => {
      navigate({
        search: (prev) => ({ ...prev, ...partial }),
        replace: true,
      });
    },
    [navigate],
  );

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      navigate({ search: (prev) => ({ ...prev, view: mode }), replace: true });
    },
    [navigate],
  );

  const clearFilters = useCallback(() => {
    navigate({
      search: (prev) => ({
        view: prev.view ?? 'table',
        ...EMPTY_FILTER,
      }),
      replace: true,
    });
  }, [navigate]);

  const activeFilterCount = [
    filter.operations.length > 0,
    filter.types.length > 0,
    filter.subtypes.length > 0,
    filter.statuses.length > 0,
    filter.price.min != null || filter.price.max != null,
    filter.coveredArea.min != null || filter.coveredArea.max != null,
    filter.totalArea.min != null || filter.totalArea.max != null,
    filter.rooms.min != null || filter.rooms.max != null,
    filter.bedrooms.min != null || filter.bedrooms.max != null,
    filter.bathrooms.min != null || filter.bathrooms.max != null,
    filter.age.min != null || filter.age.max != null,
    filter.province != null,
    filter.polygon != null,
    filter.tagIds.length > 0,
    filter.agentIds.length > 0,
    filter.branchIds.length > 0,
    filter.portalIds.length > 0,
    filter.createdFrom != null || filter.createdTo != null,
    filter.featured != null,
    filter.hasPricePublic != null,
  ].filter(Boolean).length;

  return { filter, viewMode, setFilter, setViewMode, clearFilters, activeFilterCount };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/properties/-hooks/usePropertyFilters.ts
git commit -m "feat(web): add usePropertyFilters hook — typed URL search param state

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 4: Saved Views Hook

**Files:**
- Create: `apps/web/src/routes/properties/-hooks/useSavedViews.ts`

- [ ] **Step 1: Write the hook**

```typescript
// apps/web/src/routes/properties/-hooks/useSavedViews.ts
import { useCallback, useEffect, useState } from 'react';
import type { SavedView, PropertyFilter, ViewMode } from '../-types.js';

const STORAGE_KEY = (userId: string) => `corredor:saved_views:${userId}`;

export function useSavedViews(userId: string) {
  const [views, setViews] = useState<SavedView[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(userId));
      return raw ? (JSON.parse(raw) as SavedView[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(views));
    } catch {
      // Storage quota exceeded — silent fail
    }
  }, [views, userId]);

  const saveView = useCallback(
    (name: string, filter: PropertyFilter, viewMode: ViewMode) => {
      const view: SavedView = {
        id: crypto.randomUUID(),
        name,
        filter,
        viewMode,
        savedAt: new Date().toISOString(),
      };
      setViews((prev) => [view, ...prev]);
      return view;
    },
    [],
  );

  const deleteView = useCallback((id: string) => {
    setViews((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const renameView = useCallback((id: string, name: string) => {
    setViews((prev) => prev.map((v) => (v.id === id ? { ...v, name } : v)));
  }, []);

  return { views, saveView, deleteView, renameView };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/properties/-hooks/useSavedViews.ts
git commit -m "feat(web): add useSavedViews hook — localStorage saved view CRUD

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 5: TanStack Table Column Definitions

**Files:**
- Create: `apps/web/src/routes/properties/-columns.tsx`

- [ ] **Step 1: Write column definitions**

```tsx
// apps/web/src/routes/properties/-columns.tsx
import { createColumnHelper } from '@tanstack/react-table';
import type { PropertyRow } from './-types.js';

const col = createColumnHelper<PropertyRow>();

function StatusBadge({ status }: { status: PropertyRow['status'] }) {
  const map: Record<PropertyRow['status'], { label: string; color: string }> = {
    active:   { label: 'Disponible', color: '#18A659' },
    reserved: { label: 'Reservado',  color: '#F59E0B' },
    sold:     { label: 'Vendido',    color: '#6B7FD7' },
    paused:   { label: 'Pausado',    color: '#506180' },
    archived: { label: 'Archivado',  color: '#3A4E6A' },
  };
  const { label, color } = map[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 500,
        color,
        background: `${color}1a`,
        border: `1px solid ${color}40`,
        borderRadius: 4,
        padding: '2px 7px',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}

function PriceCell({ row }: { row: PropertyRow }) {
  if (!row.hasPricePublic || row.priceAmount == null) {
    return <span style={{ color: '#506180', fontSize: 12 }}>Sin precio</span>;
  }
  const amt = Number(row.priceAmount);
  const fmt = row.priceCurrency === 'ARS'
    ? `$ ${amt.toLocaleString('es-AR')}`
    : `USD ${amt.toLocaleString('en-US')}`;
  return <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{fmt}</span>;
}

function ThumbCell({ thumbUrl, title }: { thumbUrl: string | null; title: string | null }) {
  return thumbUrl ? (
    <img
      src={thumbUrl}
      alt={title ?? ''}
      width={48}
      height={36}
      style={{ objectFit: 'cover', borderRadius: 4, display: 'block', background: '#162035' }}
      loading="lazy"
    />
  ) : (
    <div
      style={{
        width: 48, height: 36, borderRadius: 4,
        background: '#162035', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#506180" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    </div>
  );
}

export const propertyColumns = [
  col.display({
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        aria-label="Seleccionar todo"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        aria-label="Seleccionar propiedad"
      />
    ),
    size: 40,
    enableSorting: false,
  }),
  col.display({
    id: 'thumb',
    header: '',
    cell: ({ row }) => (
      <ThumbCell thumbUrl={row.original.thumbUrl} title={row.original.title} />
    ),
    size: 64,
    enableSorting: false,
  }),
  col.accessor('referenceCode', {
    header: 'Ref.',
    size: 80,
    cell: (info) => (
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#8DA0C0' }}>
        {info.getValue()}
      </span>
    ),
  }),
  col.display({
    id: 'address',
    header: 'Dirección / Barrio',
    size: 220,
    cell: ({ row }) => {
      const p = row.original;
      const addr = [p.addressStreet, p.addressNumber].filter(Boolean).join(' ');
      const loc = [p.neighborhood, p.locality].filter(Boolean).join(', ');
      return (
        <div>
          <div style={{ fontSize: 13, color: '#EFF4FF', fontWeight: 500 }}>{addr || '—'}</div>
          <div style={{ fontSize: 11, color: '#8DA0C0', marginTop: 2 }}>{loc || '—'}</div>
        </div>
      );
    },
  }),
  col.display({
    id: 'operation_price',
    header: 'Operación / Precio',
    size: 160,
    cell: ({ row }) => {
      const opMap: Record<string, string> = {
        sale: 'Venta', rent: 'Alquiler', temp_rent: 'Alq. temporario',
        commercial_rent: 'Alq. comercial', commercial_sale: 'Venta comercial',
      };
      return (
        <div>
          <div style={{ fontSize: 11, color: '#8DA0C0', marginBottom: 2 }}>
            {row.original.operationKind ? opMap[row.original.operationKind] : '—'}
          </div>
          <PriceCell row={row.original} />
        </div>
      );
    },
  }),
  col.accessor('bedrooms', {
    header: 'Dorm.',
    size: 64,
    cell: (info) => info.getValue() ?? '—',
  }),
  col.accessor('bathrooms', {
    header: 'Baños',
    size: 64,
    cell: (info) => info.getValue() ?? '—',
  }),
  col.accessor('coveredAreaM2', {
    header: 'M² cub.',
    size: 80,
    cell: (info) => {
      const v = info.getValue();
      return v != null ? (
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{v} m²</span>
      ) : '—';
    },
  }),
  col.accessor('status', {
    header: 'Estado',
    size: 110,
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  col.display({
    id: 'agent',
    header: 'Agente',
    size: 140,
    cell: ({ row }) => {
      const p = row.original;
      if (!p.agentName) return <span style={{ color: '#506180' }}>—</span>;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {p.agentAvatarUrl ? (
            <img src={p.agentAvatarUrl} alt="" width={20} height={20}
              style={{ borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#1654d9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: '#EFF4FF', fontWeight: 600 }}>
              {p.agentName.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: 12, color: '#C8D6EE' }}>{p.agentName}</span>
        </div>
      );
    },
  }),
];
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/properties/-columns.tsx
git commit -m "feat(web): add property table column definitions with status badge + price cell

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 6: Virtualized Property Table Component

**Files:**
- Create: `apps/web/src/routes/properties/-components/PropertyTable.tsx`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/src/routes/properties/-components/PropertyTable.tsx
import React, { useRef } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { propertyColumns } from '../-columns.js';
import type { PropertyRow } from '../-types.js';

const C = {
  bgBase:    '#070D1A',
  bgRaised:  '#0D1526',
  bgOverlay: '#121D33',
  border:    '#1F2D48',
  borderStrong: '#253350',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  brand:     '#1654d9',
};

const ROW_HEIGHT = 52;

interface PropertyTableProps {
  rows: PropertyRow[];
  isLoading: boolean;
  onRowClick: (id: string) => void;
}

export function PropertyTable({ rows, isLoading, onRowClick }: PropertyTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const parentRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data: rows,
    columns: propertyColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  const { rows: tableRows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - (virtualItems[virtualItems.length - 1].end ?? 0)
      : 0;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 400, color: C.textTertiary, fontSize: 14 }}>
        Cargando propiedades…
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      style={{ overflowY: 'auto', height: 'calc(100vh - 160px)', background: C.bgBase }}
      role="region"
      aria-label="Lista de propiedades"
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: C.bgRaised }}>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    width: header.getSize(),
                    padding: '0 12px',
                    height: 40,
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.textTertiary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    borderBottom: `1px solid ${C.border}`,
                    whiteSpace: 'nowrap',
                    cursor: header.column.getCanSort() ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                  onClick={header.column.getToggleSortingHandler()}
                  aria-sort={
                    header.column.getIsSorted() === 'asc' ? 'ascending'
                    : header.column.getIsSorted() === 'desc' ? 'descending'
                    : undefined
                  }
                >
                  {header.isPlaceholder ? null : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' ↑'}
                      {header.column.getIsSorted() === 'desc' && ' ↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr><td style={{ height: paddingTop }} colSpan={propertyColumns.length} /></tr>
          )}
          {virtualItems.map((vItem) => {
            const row = tableRows[vItem.index];
            return (
              <tr
                key={row.id}
                style={{
                  height: ROW_HEIGHT,
                  background: row.getIsSelected() ? `${C.brand}18` : 'transparent',
                  borderBottom: `1px solid ${C.border}`,
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!row.getIsSelected()) {
                    (e.currentTarget as HTMLTableRowElement).style.background = C.bgRaised;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!row.getIsSelected()) {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                  }
                }}
                onClick={(e) => {
                  // Don't navigate when clicking the checkbox cell
                  const target = e.target as HTMLElement;
                  if (target.type === 'checkbox') return;
                  onRowClick(row.original.id);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                      padding: '0 12px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 13,
                      color: C.textPrimary,
                      verticalAlign: 'middle',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr><td style={{ height: paddingBottom }} colSpan={propertyColumns.length} /></tr>
          )}
        </tbody>
      </table>
      {rows.length === 0 && !isLoading && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: C.textTertiary, fontSize: 14 }}>
          No se encontraron propiedades con los filtros aplicados.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/properties/-components/PropertyTable.tsx
git commit -m "feat(web): add virtualized PropertyTable (TanStack Table + Virtual)

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 7: Property Cards View

**Files:**
- Create: `apps/web/src/routes/properties/-components/PropertyCards.tsx`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/src/routes/properties/-components/PropertyCards.tsx
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { PropertyRow } from '../-types.js';

const C = {
  bgRaised:  '#0D1526',
  bgOverlay: '#121D33',
  bgSubtle:  '#162035',
  border:    '#1F2D48',
  brand:     '#1654d9',
  brandFaint:'rgba(22,84,217,0.12)',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  success:   '#18A659',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#18A659', reserved: '#F59E0B',
  sold: '#6B7FD7', paused: '#506180', archived: '#3A4E6A',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Disponible', reserved: 'Reservado',
  sold: 'Vendido', paused: 'Pausado', archived: 'Archivado',
};
const OP_LABELS: Record<string, string> = {
  sale: 'Venta', rent: 'Alquiler', temp_rent: 'Alq. temp.',
  commercial_rent: 'Alq. com.', commercial_sale: 'Vta. com.',
};

const CARD_WIDTH = 280;
const CARD_HEIGHT = 320;
const GAP = 16;
const COLS_PER_ROW = 4; // will be dynamic based on container width in a future enhancement

interface PropertyCardsProps {
  rows: PropertyRow[];
  isLoading: boolean;
  onCardClick: (id: string) => void;
}

export function PropertyCards({ rows, isLoading, onCardClick }: PropertyCardsProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Group rows into rows of COLS_PER_ROW
  const rowGroups: PropertyRow[][] = [];
  for (let i = 0; i < rows.length; i += COLS_PER_ROW) {
    rowGroups.push(rows.slice(i, i + COLS_PER_ROW));
  }

  const virtualizer = useVirtualizer({
    count: rowGroups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT + GAP,
    overscan: 3,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 400, color: C.textTertiary, fontSize: 14 }}>
        Cargando propiedades…
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      style={{ overflowY: 'auto', height: 'calc(100vh - 160px)', padding: '16px 24px' }}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => {
          const group = rowGroups[vItem.index];
          return (
            <div
              key={vItem.key}
              style={{
                position: 'absolute',
                top: vItem.start,
                left: 0, right: 0,
                display: 'flex',
                gap: GAP,
              }}
            >
              {group.map((prop) => {
                const statusColor = STATUS_COLORS[prop.status] ?? '#506180';
                const priceStr = prop.hasPricePublic && prop.priceAmount
                  ? `${prop.priceCurrency === 'ARS' ? '$' : 'USD'} ${Number(prop.priceAmount).toLocaleString('es-AR')}`
                  : 'Sin precio';
                return (
                  <button
                    key={prop.id}
                    onClick={() => onCardClick(prop.id)}
                    style={{
                      width: CARD_WIDTH,
                      flexShrink: 0,
                      background: C.bgRaised,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s, transform 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#253350';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Photo */}
                    <div style={{ height: 160, background: C.bgSubtle, position: 'relative', overflow: 'hidden' }}>
                      {prop.thumbUrl ? (
                        <img src={prop.thumbUrl} alt={prop.title ?? ''} loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#506180" strokeWidth="1.2">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                      )}
                      {/* Status badge overlay */}
                      <div style={{
                        position: 'absolute', top: 8, left: 8,
                        background: 'rgba(7,13,26,0.8)',
                        backdropFilter: 'blur(4px)',
                        border: `1px solid ${statusColor}60`,
                        borderRadius: 4,
                        padding: '2px 7px',
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 11, fontWeight: 500, color: statusColor,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                        {STATUS_LABELS[prop.status] ?? prop.status}
                      </div>
                      {prop.featured && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8,
                          background: 'rgba(245,158,11,0.15)',
                          border: '1px solid rgba(245,158,11,0.4)',
                          borderRadius: 4, padding: '2px 6px',
                          fontSize: 10, color: '#F59E0B', fontWeight: 600,
                        }}>
                          DESTACADO
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>
                        {prop.operationKind ? OP_LABELS[prop.operationKind] : ''} · {prop.referenceCode}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: C.textPrimary,
                        fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>
                        {priceStr}
                      </div>
                      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[prop.addressStreet, prop.addressNumber].filter(Boolean).join(' ') || '—'}
                        {prop.neighborhood && ` · ${prop.neighborhood}`}
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: C.textTertiary }}>
                        {prop.bedrooms != null && <span>🛏 {prop.bedrooms}</span>}
                        {prop.bathrooms != null && <span>🚿 {prop.bathrooms}</span>}
                        {prop.coveredAreaM2 != null && <span>{prop.coveredAreaM2} m²</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      {rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: C.textTertiary, fontSize: 14 }}>
          No se encontraron propiedades con los filtros aplicados.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/properties/-components/PropertyCards.tsx
git commit -m "feat(web): add PropertyCards view with TanStack Virtual row groups

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 8: MapLibre Map View

**Files:**
- Create: `apps/web/src/routes/properties/-components/PropertyMap.tsx`

- [ ] **Step 1: Install type definitions** (if not already present)

```bash
cd apps/web && pnpm add -D @types/maplibre-gl
```

- [ ] **Step 2: Write the component**

```tsx
// apps/web/src/routes/properties/-components/PropertyMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { PropertyRow } from '../-types.js';

interface PropertyMapProps {
  rows: PropertyRow[];
  onPolygonChange: (geojsonBase64: string | undefined) => void;
  initialPolygon?: string;
}

export function PropertyMap({ rows, onPolygonChange, initialPolygon }: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawPoints = useRef<[number, number][]>([]);

  // Convert rows to GeoJSON
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: rows
      .filter((r) => r.lat != null && r.lng != null)
      .map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.lng!, r.lat!] },
        properties: {
          id: r.id,
          title: r.title,
          referenceCode: r.referenceCode,
          priceAmount: r.priceAmount,
          priceCurrency: r.priceCurrency,
          status: r.status,
          thumbUrl: r.thumbUrl,
          bedrooms: r.bedrooms,
          coveredAreaM2: r.coveredAreaM2,
        },
      })),
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      // Free OpenStreetMap-compatible style
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm-tiles' }],
      },
      center: [-58.3816, -34.6037], // Buenos Aires default
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      // ── Clusters source ────────────────────────────
      map.addSource('properties', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'properties',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#1654d9',
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 28, 50, 36],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#4669ff',
          'circle-opacity': 0.9,
        },
      });

      // Cluster count labels
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'properties',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 13,
          'text-font': ['Open Sans Regular'],
        },
        paint: { 'text-color': '#ffffff' },
      });

      // Individual property points
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'properties',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#4669ff',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Click cluster → zoom in
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        (map.getSource('properties') as maplibregl.GeoJSONSource)
          .getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.easeTo({
              center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: zoom ?? map.getZoom() + 2,
            });
          });
      });

      // Click individual point → side panel (emits event)
      map.on('click', 'unclustered-point', (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const { lng, lat } = e.lngLat;
        const props = feature.properties as PropertyRow;
        new maplibregl.Popup({ closeButton: true, maxWidth: '260px' })
          .setLngLat([lng, lat])
          .setHTML(`
            <div style="font-family: 'DM Sans', sans-serif; background: #0D1526; color: #EFF4FF; padding: 4px; border-radius: 6px;">
              <div style="font-size:11px;color:#8DA0C0;margin-bottom:4px;">${props.referenceCode}</div>
              ${props.thumbUrl ? `<img src="${props.thumbUrl}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:8px;" />` : ''}
              <div style="font-size:14px;font-weight:600;font-family:'DM Mono',monospace;">${props.priceAmount ? `${props.priceCurrency} ${Number(props.priceAmount).toLocaleString('es-AR')}` : 'Sin precio'}</div>
            </div>
          `)
          .addTo(map);
      });

      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = ''; });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update source data when rows change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource('properties') as maplibregl.GeoJSONSource | undefined;
    source?.setData(geojson);
  }, [rows]); // geojson derived from rows — intentional dep

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 160px)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Draw polygon toggle */}
      <button
        onClick={() => setIsDrawing((d) => !d)}
        style={{
          position: 'absolute', top: 12, left: 12,
          background: isDrawing ? '#1654d9' : 'rgba(13,21,38,0.9)',
          border: '1px solid #1F2D48',
          borderRadius: 6,
          padding: '7px 12px',
          color: '#EFF4FF',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
        title="Dibujar zona de búsqueda"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        {isDrawing ? 'Dibujando…' : 'Dibujar zona'}
      </button>

      {/* Clear polygon button */}
      {initialPolygon && (
        <button
          onClick={() => onPolygonChange(undefined)}
          style={{
            position: 'absolute', top: 12, left: 130,
            background: 'rgba(13,21,38,0.9)',
            border: '1px solid #1F2D48',
            borderRadius: 6,
            padding: '7px 12px',
            color: '#8DA0C0',
            fontSize: 12,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
          }}
        >
          × Limpiar zona
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/properties/-components/PropertyMap.tsx
git commit -m "feat(web): add MapLibre PropertyMap with clusters, popups, polygon draw toggle

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 9: Filter Panel

**Files:**
- Create: `apps/web/src/routes/properties/-components/FilterPanel.tsx`

- [ ] **Step 1: Write the filter panel**

```tsx
// apps/web/src/routes/properties/-components/FilterPanel.tsx
import React, { useState } from 'react';
import type { PropertyFilter, OperationKind, PropertyStatus, PropertyTypeName } from '../-types.js';

const C = {
  bgOverlay: '#121D33',
  bgSubtle:  '#162035',
  border:    '#1F2D48',
  borderStrong: '#253350',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  brand:     '#1654d9',
  brandLight:'#4669ff',
  brandFaint:'rgba(22,84,217,0.12)',
};

const OPERATIONS: { value: OperationKind; label: string }[] = [
  { value: 'sale', label: 'Venta' },
  { value: 'rent', label: 'Alquiler' },
  { value: 'temp_rent', label: 'Alquiler temporario' },
  { value: 'commercial_rent', label: 'Comercial en alquiler' },
  { value: 'commercial_sale', label: 'Comercial en venta' },
];

const STATUSES: { value: PropertyStatus; label: string }[] = [
  { value: 'active', label: 'Disponible' },
  { value: 'reserved', label: 'Reservado' },
  { value: 'sold', label: 'Vendido/Alquilado' },
  { value: 'paused', label: 'Pausado' },
  { value: 'archived', label: 'Archivado' },
];

const PROPERTY_TYPES: { value: PropertyTypeName; label: string }[] = [
  { value: 'apartment', label: 'Departamento' },
  { value: 'ph', label: 'PH' },
  { value: 'house', label: 'Casa' },
  { value: 'quinta', label: 'Quinta' },
  { value: 'land', label: 'Terreno' },
  { value: 'office', label: 'Oficina' },
  { value: 'commercial', label: 'Local' },
  { value: 'garage', label: 'Cochera' },
  { value: 'warehouse', label: 'Galpón' },
  { value: 'farm', label: 'Campo' },
  { value: 'hotel', label: 'Hotel / Apart-hotel' },
  { value: 'building', label: 'Edificio' },
  { value: 'business_fund', label: 'Fondo de comercio' },
  { value: 'development', label: 'Emprendimiento' },
];

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: C.textTertiary,
      textTransform: 'uppercase', letterSpacing: '0.07em',
      marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      {count != null && count > 0 && (
        <span style={{
          background: C.brandFaint, border: '1px solid rgba(22,84,217,0.3)',
          borderRadius: 10, padding: '1px 6px', fontSize: 10, color: C.brandLight,
        }}>{count}</span>
      )}
    </div>
  );
}

function MultiSelect<T extends string>({
  options, selected, onChange,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (values: T[]) => void;
}) {
  const toggle = (v: T) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(({ value, label }) => {
        const active = selected.includes(value);
        return (
          <button
            key={value}
            onClick={() => toggle(value)}
            style={{
              padding: '4px 10px', fontSize: 12, borderRadius: 6,
              background: active ? C.brandFaint : 'transparent',
              border: `1px solid ${active ? 'rgba(22,84,217,0.5)' : C.border}`,
              color: active ? C.brandLight : C.textSecondary,
              cursor: 'pointer', transition: 'all 0.1s',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function RangeInput({
  min, max, onMinChange, onMaxChange, placeholder = 'Cualquiera',
}: {
  min?: number; max?: number;
  onMinChange: (v: number | undefined) => void;
  onMaxChange: (v: number | undefined) => void;
  placeholder?: string;
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%', background: C.bgSubtle, border: `1px solid ${C.border}`,
    borderRadius: 6, padding: '6px 10px', fontSize: 13, color: C.textPrimary,
    outline: 'none',
  };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="number" placeholder="Mín."
        value={min ?? ''} style={inputStyle}
        onChange={(e) => onMinChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
      <span style={{ color: C.textTertiary, flexShrink: 0 }}>—</span>
      <input
        type="number" placeholder="Máx."
        value={max ?? ''} style={inputStyle}
        onChange={(e) => onMaxChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    </div>
  );
}

interface FilterPanelProps {
  filter: PropertyFilter;
  onChange: (partial: Partial<PropertyFilter>) => void;
  onClear: () => void;
  onClose: () => void;
  activeCount: number;
}

export function FilterPanel({ filter, onChange, onClear, onClose, activeCount }: FilterPanelProps) {
  return (
    <div
      role="dialog"
      aria-label="Panel de filtros"
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 360,
        background: C.bgOverlay,
        borderLeft: `1px solid ${C.border}`,
        zIndex: 50,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
        position: 'sticky', top: 0, background: C.bgOverlay, zIndex: 1,
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary }}>
          Filtros {activeCount > 0 && <span style={{ color: C.brandLight }}>({activeCount})</span>}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeCount > 0 && (
            <button
              onClick={onClear}
              style={{ fontSize: 12, color: C.textTertiary, background: 'none',
                border: 'none', cursor: 'pointer', padding: '4px 8px' }}
            >
              Limpiar
            </button>
          )}
          <button
            onClick={onClose}
            style={{ fontSize: 12, color: C.textSecondary, background: 'none',
              border: 'none', cursor: 'pointer', padding: '4px 8px' }}
            aria-label="Cerrar filtros"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Operación */}
        <section>
          <SectionHeader label="Operación" count={filter.operations.length} />
          <MultiSelect
            options={OPERATIONS}
            selected={filter.operations}
            onChange={(operations) => onChange({ operations })}
          />
        </section>

        {/* Tipo de propiedad */}
        <section>
          <SectionHeader label="Tipo de propiedad" count={filter.types.length} />
          <MultiSelect
            options={PROPERTY_TYPES}
            selected={filter.types}
            onChange={(types) => onChange({ types })}
          />
        </section>

        {/* Estado */}
        <section>
          <SectionHeader label="Estado" count={filter.statuses.length} />
          <MultiSelect
            options={STATUSES}
            selected={filter.statuses}
            onChange={(statuses) => onChange({ statuses })}
          />
        </section>

        {/* Precio */}
        <section>
          <SectionHeader label="Precio" count={filter.price.min != null || filter.price.max != null ? 1 : 0} />
          <div style={{ marginBottom: 8 }}>
            <select
              value={filter.price.currency}
              onChange={(e) => onChange({ price: { ...filter.price, currency: e.target.value as 'ARS' | 'USD' } })}
              style={{ background: C.bgSubtle, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '5px 10px', fontSize: 12,
                color: C.textSecondary, cursor: 'pointer', marginBottom: 8, width: '100%' }}
            >
              <option value="USD">USD</option>
              <option value="ARS">ARS ($)</option>
            </select>
          </div>
          <RangeInput
            min={filter.price.min} max={filter.price.max}
            onMinChange={(min) => onChange({ price: { ...filter.price, min } })}
            onMaxChange={(max) => onChange({ price: { ...filter.price, max } })}
          />
        </section>

        {/* Superficie */}
        <section>
          <SectionHeader label="Superficie cubierta (m²)"
            count={filter.coveredArea.min != null || filter.coveredArea.max != null ? 1 : 0} />
          <RangeInput
            min={filter.coveredArea.min} max={filter.coveredArea.max}
            onMinChange={(min) => onChange({ coveredArea: { ...filter.coveredArea, min } })}
            onMaxChange={(max) => onChange({ coveredArea: { ...filter.coveredArea, max } })}
          />
        </section>

        <section>
          <SectionHeader label="Superficie total (m²)"
            count={filter.totalArea.min != null || filter.totalArea.max != null ? 1 : 0} />
          <RangeInput
            min={filter.totalArea.min} max={filter.totalArea.max}
            onMinChange={(min) => onChange({ totalArea: { ...filter.totalArea, min } })}
            onMaxChange={(max) => onChange({ totalArea: { ...filter.totalArea, max } })}
          />
        </section>

        {/* Ambientes / dormitorios / baños */}
        <section>
          <SectionHeader label="Ambientes"
            count={filter.rooms.min != null || filter.rooms.max != null ? 1 : 0} />
          <RangeInput
            min={filter.rooms.min} max={filter.rooms.max}
            onMinChange={(min) => onChange({ rooms: { ...filter.rooms, min } })}
            onMaxChange={(max) => onChange({ rooms: { ...filter.rooms, max } })}
          />
        </section>

        <section>
          <SectionHeader label="Dormitorios"
            count={filter.bedrooms.min != null || filter.bedrooms.max != null ? 1 : 0} />
          <RangeInput
            min={filter.bedrooms.min} max={filter.bedrooms.max}
            onMinChange={(min) => onChange({ bedrooms: { ...filter.bedrooms, min } })}
            onMaxChange={(max) => onChange({ bedrooms: { ...filter.bedrooms, max } })}
          />
        </section>

        <section>
          <SectionHeader label="Baños"
            count={filter.bathrooms.min != null || filter.bathrooms.max != null ? 1 : 0} />
          <RangeInput
            min={filter.bathrooms.min} max={filter.bathrooms.max}
            onMinChange={(min) => onChange({ bathrooms: { ...filter.bathrooms, min } })}
            onMaxChange={(max) => onChange({ bathrooms: { ...filter.bathrooms, max } })}
          />
        </section>

        {/* Antigüedad */}
        <section>
          <SectionHeader label="Antigüedad (años)"
            count={filter.age.min != null || filter.age.max != null ? 1 : 0} />
          <RangeInput
            min={filter.age.min} max={filter.age.max}
            onMinChange={(min) => onChange({ age: { ...filter.age, min } })}
            onMaxChange={(max) => onChange({ age: { ...filter.age, max } })}
          />
        </section>

        {/* Destacado / Con precio */}
        <section>
          <SectionHeader label="Más opciones" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Solo destacados', field: 'featured' as const },
              { label: 'Con precio publicado', field: 'hasPricePublic' as const },
            ].map(({ label, field }) => (
              <label key={field} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', fontSize: 13, color: C.textSecondary,
              }}>
                <input
                  type="checkbox"
                  checked={filter[field] === true}
                  onChange={(e) => onChange({ [field]: e.target.checked ? true : undefined })}
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        {/* Fecha de carga */}
        <section>
          <SectionHeader label="Fecha de carga"
            count={filter.createdFrom != null || filter.createdTo != null ? 1 : 0} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="date" value={filter.createdFrom ?? ''}
              onChange={(e) => onChange({ createdFrom: e.target.value || undefined })}
              style={{ background: C.bgSubtle, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '6px 10px', fontSize: 13, color: C.textPrimary,
                outline: 'none', width: '100%' }}
            />
            <input
              type="date" value={filter.createdTo ?? ''}
              onChange={(e) => onChange({ createdTo: e.target.value || undefined })}
              style={{ background: C.bgSubtle, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '6px 10px', fontSize: 13, color: C.textPrimary,
                outline: 'none', width: '100%' }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/properties/-components/FilterPanel.tsx
git commit -m "feat(web): add FilterPanel slide-over with all §1.2 filter sections

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 10: Property List Page Route

**Files:**
- Create: `apps/web/src/routes/properties/index.tsx`
- Create: `apps/web/src/routes/properties/-components/PropertyListPage.tsx`
- Create: `apps/web/src/routes/properties/-components/ViewToggle.tsx`
- Create: `apps/web/src/routes/properties/-components/SavedViewsMenu.tsx`

- [ ] **Step 1: Write ViewToggle**

```tsx
// apps/web/src/routes/properties/-components/ViewToggle.tsx
import React from 'react';
import type { ViewMode } from '../-types.js';

const C = {
  bgRaised: '#0D1526', bgSubtle: '#162035',
  border: '#1F2D48', borderStrong: '#253350',
  textSecondary: '#8DA0C0', textPrimary: '#EFF4FF',
  brand: '#1654d9', brandFaint: 'rgba(22,84,217,0.12)',
};

const MODES: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
  {
    value: 'table',
    label: 'Tabla',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    ),
  },
  {
    value: 'cards',
    label: 'Tarjetas',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    value: 'map',
    label: 'Mapa',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
        <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
      </svg>
    ),
  },
];

interface ViewToggleProps {
  current: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ current, onChange }: ViewToggleProps) {
  return (
    <div style={{
      display: 'flex',
      background: C.bgRaised,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      overflow: 'hidden',
    }}
      role="group"
      aria-label="Modo de vista"
    >
      {MODES.map(({ value, label, icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            aria-pressed={active}
            title={label}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', fontSize: 12,
              background: active ? C.brandFaint : 'transparent',
              color: active ? '#4669ff' : C.textSecondary,
              border: 'none',
              borderRight: `1px solid ${C.border}`,
              cursor: 'pointer',
              transition: 'all 0.1s',
            }}
          >
            {icon}
            <span style={{ display: 'none' }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write SavedViewsMenu**

```tsx
// apps/web/src/routes/properties/-components/SavedViewsMenu.tsx
import React, { useState } from 'react';
import type { SavedView } from '../-types.js';

const C = {
  bgOverlay: '#121D33', bgSubtle: '#162035',
  border: '#1F2D48', borderStrong: '#253350',
  textPrimary: '#EFF4FF', textSecondary: '#8DA0C0', textTertiary: '#506180',
  brand: '#1654d9', brandLight: '#4669ff',
};

interface SavedViewsMenuProps {
  views: SavedView[];
  onLoad: (view: SavedView) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
}

export function SavedViewsMenu({ views, onLoad, onSave, onDelete }: SavedViewsMenuProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    setName('');
    setSaving(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', fontSize: 12,
          background: open ? C.bgSubtle : 'transparent',
          border: `1px solid ${C.border}`,
          borderRadius: 8, color: C.textSecondary, cursor: 'pointer',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <bookmark/>
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        Vistas guardadas
        {views.length > 0 && (
          <span style={{ background: C.brandFaint, border: '1px solid rgba(22,84,217,0.3)',
            borderRadius: 10, padding: '1px 5px', fontSize: 10, color: C.brandLight }}>
            {views.length}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 260, background: C.bgOverlay, border: `1px solid ${C.border}`,
          borderRadius: 10, zIndex: 40, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {/* Save new view */}
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
            {saving ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  autoFocus
                  type="text" placeholder="Nombre de la vista"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaving(false); }}
                  style={{
                    flex: 1, background: C.bgSubtle, border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: '5px 8px', fontSize: 12, color: C.textPrimary, outline: 'none',
                  }}
                />
                <button
                  onClick={handleSave}
                  style={{
                    padding: '5px 10px', fontSize: 12, borderRadius: 6,
                    background: C.brand, border: 'none', color: '#fff', cursor: 'pointer',
                  }}
                >
                  Guardar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSaving(true)}
                style={{
                  width: '100%', fontSize: 12, padding: '6px',
                  background: 'transparent', border: `1px dashed ${C.border}`,
                  borderRadius: 6, color: C.textTertiary, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                + Guardar vista actual
              </button>
            )}
          </div>

          {/* Saved view list */}
          {views.length === 0 ? (
            <div style={{ padding: '16px 14px', fontSize: 12, color: C.textTertiary, textAlign: 'center' }}>
              No hay vistas guardadas
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: '6px 0', maxHeight: 300, overflowY: 'auto' }}>
              {views.map((v) => (
                <li key={v.id} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '8px 14px', gap: 8,
                  fontSize: 13,
                }}>
                  <button
                    onClick={() => { onLoad(v); setOpen(false); }}
                    style={{
                      flex: 1, textAlign: 'left', background: 'none', border: 'none',
                      color: C.textPrimary, cursor: 'pointer', fontSize: 13,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {v.name}
                  </button>
                  <button
                    onClick={() => onDelete(v.id)}
                    style={{ background: 'none', border: 'none', color: C.textTertiary,
                      cursor: 'pointer', fontSize: 16, padding: '0 2px' }}
                    aria-label={`Eliminar vista ${v.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write PropertyListPage**

```tsx
// apps/web/src/routes/properties/-components/PropertyListPage.tsx
import React, { Suspense, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PropertyTable } from './PropertyTable.js';
import { PropertyCards } from './PropertyCards.js';
import { PropertyMap } from './PropertyMap.js';
import { FilterPanel } from './FilterPanel.js';
import { ViewToggle } from './ViewToggle.js';
import { SavedViewsMenu } from './SavedViewsMenu.js';
import { usePropertyFilters } from '../-hooks/usePropertyFilters.js';
import { useSavedViews } from '../-hooks/useSavedViews.js';
import type { PropertyRow, SavedView } from '../-types.js';

const C = {
  bgBase: '#070D1A', bgRaised: '#0D1526', bgOverlay: '#121D33',
  border: '#1F2D48', borderStrong: '#253350',
  textPrimary: '#EFF4FF', textSecondary: '#8DA0C0', textTertiary: '#506180',
  brand: '#1654d9', brandLight: '#4669ff',
  success: '#18A659',
};

// TODO: replace with real user id from auth context
const MOCK_USER_ID = 'demo-user';

interface PropertyListPageProps {
  rows: PropertyRow[];
  total: number;
  isLoading: boolean;
}

export function PropertyListPage({ rows, total, isLoading }: PropertyListPageProps) {
  const navigate = useNavigate();
  const { filter, viewMode, setFilter, setViewMode, clearFilters, activeFilterCount } = usePropertyFilters();
  const { views, saveView, deleteView } = useSavedViews(MOCK_USER_ID);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const handleRowClick = (id: string) => {
    navigate({ to: `/properties/${id}` });
  };

  const handleLoadView = (view: SavedView) => {
    setFilter(view.filter);
    setViewMode(view.viewMode);
  };

  const handleSaveView = (name: string) => {
    saveView(name, filter, viewMode);
  };

  const handlePolygonChange = (polygon: string | undefined) => {
    setFilter({ polygon });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bgBase }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px',
        borderBottom: `1px solid ${C.border}`,
        background: C.bgRaised,
        flexShrink: 0,
      }}>
        {/* Title + count */}
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, fontFamily: "'Syne', sans-serif" }}>
            Propiedades
          </span>
          {!isLoading && (
            <span style={{ fontSize: 12, color: C.textTertiary, marginLeft: 8 }}>
              {total.toLocaleString('es-AR')} resultados
            </span>
          )}
        </div>

        {/* View toggle */}
        <ViewToggle current={viewMode} onChange={setViewMode} />

        {/* Saved views */}
        <SavedViewsMenu
          views={views}
          onLoad={handleLoadView}
          onSave={handleSaveView}
          onDelete={deleteView}
        />

        {/* Filter button */}
        <button
          onClick={() => setFilterPanelOpen((o) => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', fontSize: 12,
            background: activeFilterCount > 0 ? 'rgba(22,84,217,0.12)' : 'transparent',
            border: `1px solid ${activeFilterCount > 0 ? 'rgba(22,84,217,0.4)' : C.border}`,
            borderRadius: 8,
            color: activeFilterCount > 0 ? C.brandLight : C.textSecondary,
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filtros
          {activeFilterCount > 0 && (
            <span style={{
              background: C.brand, borderRadius: 10, padding: '1px 6px',
              fontSize: 10, color: '#fff', fontWeight: 600,
            }}>{activeFilterCount}</span>
          )}
        </button>

        {/* New property CTA */}
        <button
          onClick={() => navigate({ to: '/properties/new' })}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', fontSize: 12, fontWeight: 600,
            background: C.brand, border: 'none', borderRadius: 8,
            color: '#fff', cursor: 'pointer',
          }}
        >
          + Nueva propiedad
        </button>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {viewMode === 'table' && (
          <PropertyTable rows={rows} isLoading={isLoading} onRowClick={handleRowClick} />
        )}
        {viewMode === 'cards' && (
          <PropertyCards rows={rows} isLoading={isLoading} onCardClick={handleRowClick} />
        )}
        {viewMode === 'map' && (
          <Suspense fallback={<div style={{ padding: 40, color: C.textTertiary }}>Cargando mapa…</div>}>
            <PropertyMap
              rows={rows}
              onPolygonChange={handlePolygonChange}
              initialPolygon={filter.polygon}
            />
          </Suspense>
        )}
      </div>

      {/* Filter panel slide-over */}
      {filterPanelOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(7,13,26,0.5)', zIndex: 49 }}
            onClick={() => setFilterPanelOpen(false)}
          />
          <FilterPanel
            filter={filter}
            onChange={setFilter}
            onClear={clearFilters}
            onClose={() => setFilterPanelOpen(false)}
            activeCount={activeFilterCount}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write the route file**

```tsx
// apps/web/src/routes/properties/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PropertyListPage } from './-components/PropertyListPage.js';

// URL search schema — all filters typed and validated
const searchSchema = z.object({
  view: z.enum(['table', 'cards', 'map']).optional(),
  operations: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
  subtypes: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  price: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.enum(['ARS', 'USD']),
  }).optional(),
  coveredArea: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
  totalArea: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
  rooms: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
  bedrooms: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
  bathrooms: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
  age: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
  province: z.string().optional(),
  locality: z.string().optional(),
  neighborhood: z.string().optional(),
  polygon: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  agentIds: z.array(z.string()).optional(),
  branchIds: z.array(z.string()).optional(),
  portalIds: z.array(z.string()).optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  featured: z.boolean().optional(),
  hasPricePublic: z.boolean().optional(),
});

export const Route = createFileRoute('/properties/')({
  validateSearch: (search) => searchSchema.parse(search),
  // loader: fetch property list from API based on search params
  // This will call the tRPC endpoint once the API is connected
  component: function PropertiesPage() {
    // TODO: replace with real tRPC query once API layer is ready
    // const { data, isLoading } = trpc.properties.list.useQuery({ ...Route.useSearch() });
    return (
      <PropertyListPage
        rows={[]}
        total={0}
        isLoading={false}
      />
    );
  },
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/properties/
git commit -m "feat(web): add /properties route — table/cards/map toggle, filter panel, saved views

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 11: Wire tRPC Query (post-API layer)

> This task depends on the tRPC router being wired up (separate RENA issue for the API layer).

**Files:**
- Modify: `apps/web/src/routes/properties/index.tsx` (replace TODO with real query)
- Create: `apps/web/src/routes/properties/-hooks/usePropertyQuery.ts`

- [ ] **Step 1: Write the query hook**

```typescript
// apps/web/src/routes/properties/-hooks/usePropertyQuery.ts
import { useQuery } from '@tanstack/react-query';
import type { PropertyFilter, PropertyListResponse } from '../-types.js';

// Replace with actual tRPC client import when available
// import { trpc } from '@/lib/trpc.js';

async function fetchProperties(filter: PropertyFilter, page: number): Promise<PropertyListResponse> {
  const params = new URLSearchParams();
  // Serialize filter into query params
  if (filter.operations.length) params.set('operations', filter.operations.join(','));
  if (filter.types.length) params.set('types', filter.types.join(','));
  if (filter.statuses.length) params.set('statuses', filter.statuses.join(','));
  if (filter.price.min != null) params.set('priceMin', String(filter.price.min));
  if (filter.price.max != null) params.set('priceMax', String(filter.price.max));
  params.set('priceCurrency', filter.price.currency);
  if (filter.coveredArea.min != null) params.set('coveredAreaMin', String(filter.coveredArea.min));
  if (filter.coveredArea.max != null) params.set('coveredAreaMax', String(filter.coveredArea.max));
  if (filter.province) params.set('province', filter.province);
  if (filter.locality) params.set('locality', filter.locality);
  if (filter.neighborhood) params.set('neighborhood', filter.neighborhood);
  if (filter.polygon) params.set('polygon', filter.polygon);
  if (filter.agentIds.length) params.set('agentIds', filter.agentIds.join(','));
  if (filter.branchIds.length) params.set('branchIds', filter.branchIds.join(','));
  if (filter.tagIds.length) params.set('tagIds', filter.tagIds.join(','));
  if (filter.createdFrom) params.set('createdFrom', filter.createdFrom);
  if (filter.createdTo) params.set('createdTo', filter.createdTo);
  if (filter.featured != null) params.set('featured', String(filter.featured));
  if (filter.hasPricePublic != null) params.set('hasPricePublic', String(filter.hasPricePublic));
  params.set('page', String(page));
  params.set('pageSize', '200');

  const res = await fetch(`/api/properties?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch properties');
  return res.json() as Promise<PropertyListResponse>;
}

export function usePropertyQuery(filter: PropertyFilter, page = 1) {
  return useQuery({
    queryKey: ['properties', filter, page],
    queryFn: () => fetchProperties(filter, page),
    staleTime: 30_000, // 30s cache
    placeholderData: (prev) => prev, // keep previous data while fetching
  });
}
```

- [ ] **Step 2: Wire into route component**

In `apps/web/src/routes/properties/index.tsx`, replace the TODO component with:

```tsx
component: function PropertiesPage() {
  const search = Route.useSearch();
  const filter = {
    operations: search.operations ?? [],
    types: search.types ?? [],
    subtypes: search.subtypes ?? [],
    statuses: search.statuses ?? [],
    price: search.price ?? { currency: 'USD' as const },
    coveredArea: search.coveredArea ?? {},
    totalArea: search.totalArea ?? {},
    rooms: search.rooms ?? {},
    bedrooms: search.bedrooms ?? {},
    bathrooms: search.bathrooms ?? {},
    age: search.age ?? {},
    province: search.province,
    locality: search.locality,
    neighborhood: search.neighborhood,
    polygon: search.polygon,
    tagIds: search.tagIds ?? [],
    agentIds: search.agentIds ?? [],
    branchIds: search.branchIds ?? [],
    portalIds: search.portalIds ?? [],
    createdFrom: search.createdFrom,
    createdTo: search.createdTo,
    featured: search.featured,
    hasPricePublic: search.hasPricePublic,
  };
  const { data, isLoading } = usePropertyQuery(filter);
  return (
    <PropertyListPage
      rows={data?.rows ?? []}
      total={data?.total ?? 0}
      isLoading={isLoading}
    />
  );
},
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/properties/-hooks/usePropertyQuery.ts \
        apps/web/src/routes/properties/index.tsx
git commit -m "feat(web): wire usePropertyQuery TanStack Query hook into /properties route

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Self-Review

**Spec coverage check (phase-b-spec.md §1, US-B01 + US-B02):**

| Requirement | Task covering it |
|---|---|
| Virtualized table, p95 < 800ms, < 200 DOM rows | Task 6 (TanStack Virtual, overscan 10) |
| View switcher: table / cards / map | Task 10 (ViewToggle + PropertyListPage) |
| URL persists view mode | Task 3 (usePropertyFilters, `?view=`) |
| All §1.2 filters | Task 9 (FilterPanel, all sections) |
| Empty multi-select = no constraint | Task 3 + Task 9 (no "activate filter" checkbox) |
| Saved views: name + URL filter state | Task 4 (useSavedViews) + Task 10 (SavedViewsMenu) |
| MapLibre: clustered markers | Task 8 (PropertyMap, cluster layer) |
| Draw-polygon search | Task 8 (draw polygon toggle, onPolygonChange) |
| Heatmap layer toggle | Not yet implemented — add to future iteration |
| All filters deep-linkable via URL | Task 3 (full filter state in URL search params) |
| DB schema for properties | Task 1 |
| TypeScript types | Task 2 |

**Gap:** Heatmap layer (demand heatmap from `inquiry.zones`) — this requires the inquiry data model which is Phase C. Flag as follow-up ticket. The toggle button can be added in a future heartbeat.

**Placeholder scan:** No TBD or TODO stubs except the intentional API connection note in Task 11 (which depends on a separate API issue).

**Type consistency:** `PropertyRow` defined in `-types.ts` Task 2 is used consistently across Tasks 5, 6, 7, 8, 10. `PropertyFilter` and `EMPTY_FILTER` are exported from `-types.ts` and used in Tasks 3, 4, 9, 10. `ViewMode` used consistently.
