"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data fresh for 5 minutes (matches current staleTime in hooks)
        staleTime: 5 * 60 * 1000,
        // Cache data for 10 minutes before garbage collection
        gcTime: 10 * 60 * 1000,
      },
    },
  }));

  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      // Use sessionStorage for security - data cleared when browser closes
      // This is safer than localStorage as it limits the persistence window
      const persister = createSyncStoragePersister({
        storage: window.sessionStorage,
        // Add a prefix to avoid conflicts with other apps
        key: 'FLIGHT_DESK_PRO_QUERY_CACHE',
      });

      persistQueryClient({
        queryClient,
        persister,
        // Only persist user role data (for sidebar performance)
        // Don't persist sensitive data like full user profiles or financial info
        dehydrateOptions: {
          shouldDehydrateQuery: (query: { queryKey: readonly unknown[] }) => {
            // Only persist the current user roles query (used by sidebar)
            return query.queryKey[0] === 'current-user-roles';
          },
        },
      });
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
} 