"use client";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient, persister } from "../lib/queryClient";

/**
 * Provider component for React Query
 * Initializes and provides QueryClient to the app
 */
export function QueryProvider({ children }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Only persist specific queries
            const persistedQueries = ["media", "carousel", "text", "preview"];
            return persistedQueries.includes(query.queryKey[0]);
          },
        },
      }}
    >
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </PersistQueryClientProvider>
  );
}
