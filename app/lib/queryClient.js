import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Create a persister
export const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : null,
  key: "postmore-cache", // unique key for your app
  throttleTime: 1000, // 1 second
  serialize: (data) => JSON.stringify(data),
  deserialize: (str) => JSON.parse(str),
});
