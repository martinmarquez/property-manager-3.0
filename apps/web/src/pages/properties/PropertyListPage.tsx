import React, { Suspense, useMemo, useCallback, useState } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { useNavigate } from '@tanstack/react-router';
import { PropertyTable } from './PropertyTable.js';
import { PropertyCards } from './PropertyCards.js';
import { ViewToggle } from './ViewToggle.js';
import { FilterPanel } from './FilterPanel.js';
import { SavedViewsMenu } from './SavedViewsMenu.js';
import { usePropertyFilters } from './usePropertyFilters.js';
import { useSavedViews } from './useSavedViews.js';
import type { PropertyRow, PropertyFilter } from '../../routes/properties/-types.js';

/* ── MapLibre is large — only load when map view is active ── */
const PropertyMap = React.lazy(() =>
  import('./PropertyMap.js').then((m) => ({ default: m.PropertyMap })),
);

/* ─────────────────────────────────────────────────────────
   PropertyListPage
   Phase B main view for /properties.

   Toolbar: ViewToggle | SavedViewsMenu | Filter button | count | + Nueva propiedad
   Content: PropertyTable / PropertyCards / PropertyMap
   Filter panel: slide-over (FilterPanel)

   Data is stubbed with mock rows until the API is ready.
   ───────────────────────────────────────────────────────── */

const C = {
  bgBase:       '#070D1A',
  bgRaised:     '#0D1526',
  border:       '#1F2D48',
  brand:        '#1654d9',
  textPrimary:  '#EFF4FF',
  textSecondary:'#8DA0C0',
  textTertiary: '#506180',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

const messages = defineMessages({
  title:       { id: 'pages.properties.title' },
  filterBtn:   { id: 'properties.list.filters.btn' },
  filtersActive: { id: 'properties.list.filters.active' },
  filtersClear:{ id: 'properties.list.filters.clear' },
  addNew:      { id: 'properties.list.addNew' },
  loadingMap:  { id: 'properties.list.loadingMap' },
});

/* ── Mock data — replace with real API hook ── */
function useMockRows(filter: PropertyFilter): { rows: PropertyRow[]; total: number; isLoading: boolean } {
  const MOCK: PropertyRow[] = useMemo(() => [
    {
      id: '1', referenceCode: 'A-001', title: 'Departamento en Palermo',
      thumbUrl: null, addressStreet: 'Av. Santa Fe', addressNumber: '3500',
      neighborhood: 'Palermo', locality: 'Buenos Aires', province: 'CABA',
      lat: -34.5840, lng: -58.4269,
      propertyType: 'apartment', subtype: null,
      status: 'active', featured: true, hasPricePublic: true,
      bedrooms: 2, bathrooms: 1, coveredAreaM2: 65, totalAreaM2: 65,
      operationKind: 'sale', priceAmount: '185000', priceCurrency: 'USD',
      updatedAt: new Date().toISOString(), agentName: 'Ana García', agentAvatarUrl: null,
    },
    {
      id: '2', referenceCode: 'A-002', title: 'Casa en Belgrano',
      thumbUrl: null, addressStreet: 'Juramento', addressNumber: '2100',
      neighborhood: 'Belgrano', locality: 'Buenos Aires', province: 'CABA',
      lat: -34.5590, lng: -58.4562,
      propertyType: 'house', subtype: null,
      status: 'reserved', featured: false, hasPricePublic: true,
      bedrooms: 4, bathrooms: 3, coveredAreaM2: 250, totalAreaM2: 300,
      operationKind: 'sale', priceAmount: '450000', priceCurrency: 'USD',
      updatedAt: new Date().toISOString(), agentName: 'Carlos López', agentAvatarUrl: null,
    },
    {
      id: '3', referenceCode: 'B-010', title: 'Oficina en Microcentro',
      thumbUrl: null, addressStreet: 'Florida', addressNumber: '800',
      neighborhood: 'Microcentro', locality: 'Buenos Aires', province: 'CABA',
      lat: -34.6037, lng: -58.3816,
      propertyType: 'office', subtype: null,
      status: 'active', featured: false, hasPricePublic: false,
      bedrooms: null, bathrooms: 2, coveredAreaM2: 120, totalAreaM2: 120,
      operationKind: 'commercial_rent', priceAmount: null, priceCurrency: null,
      updatedAt: new Date().toISOString(), agentName: 'Martín Pérez', agentAvatarUrl: null,
    },
    {
      id: '4', referenceCode: 'C-003', title: 'PH en Villa Crespo',
      thumbUrl: null, addressStreet: 'Thames', addressNumber: '650',
      neighborhood: 'Villa Crespo', locality: 'Buenos Aires', province: 'CABA',
      lat: -34.5982, lng: -58.4380,
      propertyType: 'ph', subtype: null,
      status: 'active', featured: true, hasPricePublic: true,
      bedrooms: 3, bathrooms: 2, coveredAreaM2: 110, totalAreaM2: 140,
      operationKind: 'rent', priceAmount: '1800', priceCurrency: 'USD',
      updatedAt: new Date().toISOString(), agentName: 'Ana García', agentAvatarUrl: null,
    },
  ], []);

  /* Basic client-side filter for mock data */
  const rows = useMemo(() => {
    return MOCK.filter((r) => {
      if (filter.operations.length > 0 && r.operationKind && !filter.operations.includes(r.operationKind)) return false;
      if (filter.statuses.length > 0 && !filter.statuses.includes(r.status)) return false;
      if (filter.types.length > 0 && !filter.types.includes(r.propertyType)) return false;
      if (filter.hasPricePublic != null && r.hasPricePublic !== filter.hasPricePublic) return false;
      if (filter.featured != null && r.featured !== filter.featured) return false;
      return true;
    });
  }, [MOCK, filter]);

  return { rows, total: rows.length, isLoading: false };
}

/* ── Polygon codec (base64 ↔ Coord[]) ── */
type Coord = { lng: number; lat: number };

function decodePolygon(b64: string | undefined): Coord[] | undefined {
  if (!b64) return undefined;
  try { return JSON.parse(atob(b64)) as Coord[]; }
  catch { return undefined; }
}
function encodePolygon(poly: Coord[] | undefined): string | undefined {
  if (!poly) return undefined;
  return btoa(JSON.stringify(poly));
}

/* ── MOCK user ── */
const MOCK_USER_ID = 'mock-user-1';

/* ── Page ── */
export function PropertyListPage() {
  const intl = useIntl();
  const navigate = useNavigate();
  const { filter, viewMode, setFilter, setViewMode, clearFilters, activeFilterCount } = usePropertyFilters();
  const { views, saveView, deleteView } = useSavedViews(MOCK_USER_ID);
  const [filterOpen, setFilterOpen] = useState(false);

  const { rows, total, isLoading } = useMockRows(filter);

  const polygon = decodePolygon(filter.polygon);

  const handlePolygonChange = useCallback((poly: Coord[] | undefined) => {
    setFilter({ polygon: encodePolygon(poly) });
  }, [setFilter]);

  const handleRowClick = useCallback((id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (navigate as any)({ to: `/properties/${id}` });
  }, [navigate]);

  const handleSaveView = useCallback((name: string) => {
    saveView(name, filter, viewMode);
  }, [saveView, filter, viewMode]);

  const handleApplyView = useCallback((savedFilter: PropertyFilter, savedViewMode: typeof viewMode) => {
    setFilter(savedFilter);
    setViewMode(savedViewMode);
  }, [setFilter, setViewMode]);

  return (
    <div style={{ minHeight: '100%', fontFamily: F.body, background: C.bgBase }}>

      {/* ── Page header ── */}
      <div style={{
        padding: '18px 20px 0',
        borderBottom: `1px solid ${C.border}`,
        background: C.bgBase,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: 14,
        }}>
          {/* Left: title + count */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h1 style={{
              fontFamily: F.display, fontSize: '1.25rem', fontWeight: 700,
              color: C.textPrimary, letterSpacing: '-0.02em', margin: 0,
            }}>
              {intl.formatMessage(messages.title)}
            </h1>
            {!isLoading && (
              <span style={{ fontSize: 13, color: C.textTertiary }}>
                {intl.formatNumber(total)}
              </span>
            )}
          </div>

          {/* Right: toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ViewToggle current={viewMode} onChange={setViewMode} />

            <SavedViewsMenu
              views={views}
              onSave={handleSaveView}
              onApply={handleApplyView}
              onDelete={deleteView}
              activeFilterCount={activeFilterCount}
            />

            {/* Filter button */}
            <button
              onClick={() => setFilterOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                background: activeFilterCount > 0 ? `${C.brand}20` : C.bgRaised,
                border: `1px solid ${activeFilterCount > 0 ? C.brand : C.border}`,
                color: activeFilterCount > 0 ? '#4669ff' : C.textSecondary,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              {intl.formatMessage(messages.filterBtn)}
              {activeFilterCount > 0 && (
                <span style={{
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: C.brand, color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Divider */}
            <div style={{ width: 1, height: 24, background: C.border }} />

            {/* + Nueva propiedad */}
            <button
              type="button"
              onClick={() => void navigate({ to: '/properties/new' })}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: C.brand, border: 'none', color: '#fff',
                cursor: 'pointer', transition: 'background 0.15s',
                fontFamily: F.body,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1244b8'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.brand; }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <line x1="8" y1="2" x2="8" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="2" y1="8" x2="14" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {intl.formatMessage(messages.addNew)}
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div style={{ paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: C.textTertiary }}>
              {intl.formatMessage(messages.filtersActive, { count: activeFilterCount })}
            </span>
            <button
              onClick={clearFilters}
              style={{
                fontSize: 11, color: '#EF4444',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              {intl.formatMessage(messages.filtersClear)}
            </button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {viewMode === 'table' && (
        <PropertyTable rows={rows} isLoading={isLoading} onRowClick={handleRowClick} />
      )}

      {viewMode === 'cards' && (
        <PropertyCards rows={rows} isLoading={isLoading} onCardClick={handleRowClick} />
      )}

      {viewMode === 'map' && (
        <Suspense fallback={
          <div style={{
            height: 'calc(100vh - 110px)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: C.textTertiary, fontSize: 14,
          }}>
            {intl.formatMessage(messages.loadingMap)}
          </div>
        }>
          <PropertyMap
            rows={rows}
            isLoading={isLoading}
            polygon={polygon}
            onPolygonChange={handlePolygonChange}
            onCardClick={handleRowClick}
          />
        </Suspense>
      )}

      {/* ── Filter panel ── */}
      <FilterPanel
        open={filterOpen}
        filter={filter}
        onChange={setFilter}
        onClear={clearFilters}
        onClose={() => setFilterOpen(false)}
      />
    </div>
  );
}
