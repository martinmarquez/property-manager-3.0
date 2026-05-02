import { useState, useEffect } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { trpc } from '../trpc.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export type EntityType = 'property' | 'contact' | 'lead' | 'document';

export interface SearchResult {
  entityType: EntityType;
  entityId: string;
  title: string;
  subtitle: string | null;
  snippet: string;
  relevanceScore: number;
  matchedOn: string;
}

export interface AutocompleteResult {
  label: string;
  entityType: EntityType;
  entityId: string;
  secondaryLabel: string | null;
}

// ─── Entity display config ──────────────────────────────────────────────────

export const ENTITY_DISPLAY: Record<EntityType, { icon: string; label: string; color: string }> = {
  property: { icon: '🏠', label: 'Propiedades', color: '#1654d9' },
  contact:  { icon: '👤', label: 'Contactos',   color: '#18A659' },
  lead:     { icon: '📋', label: 'Operaciones', color: '#E88A14' },
  document: { icon: '📄', label: 'Documentos',  color: '#7E3AF2' },
};

export const ENTITY_HREF: Record<EntityType, (id: string) => string> = {
  property: (id) => `/properties/${id}/edit`,
  contact:  (id) => `/contacts/${id}`,
  lead:     (id) => `/pipelines/${id}`,
  document: (id) => `/documents/${id}`,
};

// ─── Recent searches (localStorage) ────────────────────────────────────────

const RECENT_KEY = 'corredor:recent-searches';
const MAX_RECENT = 10;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const existing = getRecentSearches().filter(s => s !== trimmed);
  const updated = [trimmed, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

export function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
}

// ─── useDebounce ────────────────────────────────────────────────────────────

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// ─── useSearchQuery (two-phase: keyword first, then semantic merges in) ────

interface UseSearchQueryOptions {
  query: string;
  entityType?: EntityType;
  limit?: number;
  cursor?: number;
  enabled?: boolean;
  debounceMs?: number;
}

interface UseSearchQueryResult {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  cursor: number;
  isLoading: boolean;
  isFetching: boolean;
  phase: 'idle' | 'keyword' | 'complete';
}

export function useSearchQuery({
  query,
  entityType,
  limit = 20,
  cursor = 0,
  enabled = true,
  debounceMs = 300,
}: UseSearchQueryOptions): UseSearchQueryResult {
  const debouncedQuery = useDebounce(query, debounceMs);
  const shouldFetch = enabled && debouncedQuery.trim().length >= 1;

  const { data, isLoading, isFetching } = trpc.search.query.useQuery(
    { q: debouncedQuery, entityType, limit, cursor },
    {
      enabled: shouldFetch,
      staleTime: 60_000,
      placeholderData: keepPreviousData,
    },
  );

  return {
    results: data?.results ?? [],
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    cursor: data?.cursor ?? 0,
    isLoading: shouldFetch && isLoading,
    isFetching,
    phase: !shouldFetch ? 'idle' : isLoading ? 'keyword' : 'complete',
  };
}

// ─── useAutocomplete ────────────────────────────────────────────────────────

interface UseAutocompleteOptions {
  query: string;
  entityType?: EntityType;
  enabled?: boolean;
}

export function useAutocomplete({
  query,
  entityType,
  enabled = true,
}: UseAutocompleteOptions) {
  const debouncedQuery = useDebounce(query, 150);
  const shouldFetch = enabled && debouncedQuery.trim().length >= 2;

  const { data, isLoading } = trpc.search.autocomplete.useQuery(
    { q: debouncedQuery, entityType },
    {
      enabled: shouldFetch,
      staleTime: 30_000,
    },
  );

  return {
    suggestions: data?.suggestions ?? [],
    isLoading: shouldFetch && isLoading,
  };
}

// ─── useEntityCounts (parallel per-type queries for sidebar badges) ─────────

const ALL_ENTITY_TYPES: EntityType[] = ['property', 'contact', 'lead', 'document'];

export function useEntityCounts(query: string, debounceMs = 300): Record<EntityType, number | undefined> {
  const debouncedQuery = useDebounce(query, debounceMs);
  const shouldFetch = debouncedQuery.trim().length >= 1;

  const property = trpc.search.query.useQuery(
    { q: debouncedQuery, entityType: 'property' as const, limit: 1, cursor: 0 },
    { enabled: shouldFetch, staleTime: 60_000 },
  );
  const contact = trpc.search.query.useQuery(
    { q: debouncedQuery, entityType: 'contact' as const, limit: 1, cursor: 0 },
    { enabled: shouldFetch, staleTime: 60_000 },
  );
  const lead = trpc.search.query.useQuery(
    { q: debouncedQuery, entityType: 'lead' as const, limit: 1, cursor: 0 },
    { enabled: shouldFetch, staleTime: 60_000 },
  );
  const document = trpc.search.query.useQuery(
    { q: debouncedQuery, entityType: 'document' as const, limit: 1, cursor: 0 },
    { enabled: shouldFetch, staleTime: 60_000 },
  );

  return {
    property: property.data?.total,
    contact: contact.data?.total,
    lead: lead.data?.total,
    document: document.data?.total,
  };
}

// ─── usePaletteSearch (optimized for command palette with two-phase) ────────

interface UsePaletteSearchResult {
  results: SearchResult[];
  suggestions: AutocompleteResult[];
  isLoading: boolean;
  phase: 'idle' | 'keyword' | 'complete';
}

export function usePaletteSearch(query: string, enabled: boolean): UsePaletteSearchResult {
  const searchResult = useSearchQuery({
    query,
    limit: 12,
    enabled,
    debounceMs: 180,
  });

  const { suggestions } = useAutocomplete({
    query,
    enabled: enabled && query.length >= 2,
  });

  return {
    results: searchResult.results,
    suggestions,
    isLoading: searchResult.isLoading,
    phase: searchResult.phase,
  };
}
