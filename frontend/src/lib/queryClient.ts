import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

// gcTime must be >= the persist maxAge or entries get garbage-collected before they're
// restored. We persist for 24h so reloads paint instantly from the last good data.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 24 * 60 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'gridspot-rq-cache',
});

// Only persist the small, high-value, public datasets (calendar / standings / news). Heavy
// session history (laps, telemetry, strategy) and user-specific forum data stay memory-only
// so we never blow the ~5MB localStorage quota or leak per-user content.
const PERSIST_ROOTS = new Set(['calendar', 'standings', 'news']);

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: 24 * 60 * 60_000,
  buster: 'v1',
  dehydrateOptions: {
    shouldDehydrateQuery: (q) => {
      const root = Array.isArray(q.queryKey) ? q.queryKey[0] : undefined;
      return q.state.status === 'success' && typeof root === 'string' && PERSIST_ROOTS.has(root);
    },
  },
};
