/**
 * Corredor CRM — tRPC client
 *
 * Usage:
 *   import { trpc } from './trpc.js';
 *   const { data } = trpc.system.health.useQuery();
 *
 * Wrap your app root with <TRPCProvider /> (see main.tsx).
 */
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact, type CreateTRPCReact } from '@trpc/react-query';
import { QueryClient } from '@tanstack/react-query';
import type { AppRouter } from '../../api/src/router.js';

export type { AppRouter };

// ─── Singleton QueryClient ────────────────────────────────────────────────────
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep fresh for 30s, background refetch after
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const API_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/trpc`;

function makeBatchLink() {
  return httpBatchLink({
    url: API_URL,
    // Pass cookies for session-based auth (same-origin or CORS with credentials)
    fetch: (url, options) =>
      fetch(url, { ...options, credentials: 'include' }),
  });
}

// ─── tRPC React hooks ────────────────────────────────────────────────────────
// Explicit type annotation avoids "inferred type cannot be named" TS error
// caused by deep tRPC internal types not being portable across packages.
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();

// ─── Vanilla tRPC client (for use outside React, e.g. prefetching) ───────────
export const trpcClient = createTRPCClient<AppRouter>({
  links: [makeBatchLink()],
});

// ─── tRPC React client (passed to <trpc.Provider />) ─────────────────────────
export function makeTRPCReactClient() {
  return trpc.createClient({ links: [makeBatchLink()] });
}
