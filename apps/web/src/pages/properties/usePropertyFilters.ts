import { useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { EMPTY_FILTER } from '../../routes/properties/-types.js';
import type { PropertyFilter, ViewMode } from '../../routes/properties/-types.js';

// Used inside the /properties route.
// strict: false lets us read search params without requiring an exact from path,
// since main.tsx uses code-based routing without validateSearch on this route yet.
export function usePropertyFilters() {
  const search = useSearch({ strict: false }) as Partial<PropertyFilter> & { view?: ViewMode };
  const navigate = useNavigate();

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigate as (opts: any) => void;

  const setFilter = useCallback(
    (partial: Partial<PropertyFilter>) => {
      void nav({
        search: (prev: Record<string, unknown>) => ({ ...prev, ...partial }),
        replace: true,
      });
    },
    [nav],
  );

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      void nav({
        search: (prev: Record<string, unknown>) => ({ ...prev, view: mode }),
        replace: true,
      });
    },
    [nav],
  );

  const clearFilters = useCallback(() => {
    void nav({
      search: (_prev: Record<string, unknown>) => ({ view: viewMode, ...EMPTY_FILTER }),
      replace: true,
    });
  }, [nav, viewMode]);

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
