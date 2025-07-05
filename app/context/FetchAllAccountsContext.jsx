"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

// Rename context
const FetchAllAccountsContext = createContext();

/**
 * Custom hook to fetch and manage ALL social accounts
 * Uses React Query for efficient caching and preventing duplicate fetches
 */

const useFetchAllAccounts = () => {
  // React Query hook for fetching ALL social accounts
  const {
    data: accounts = [], // Keep variable name generic
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["allSocialAccounts"], // Update query key
    queryFn: async () => {
      // Update fetch URL to the correct endpoint for all accounts
      const response = await fetch("/api/social-accounts");
      if (!response.ok) {
        // Update error message
        throw new Error("Failed to fetch social accounts");
      }
      // Assuming the API returns { accounts: [...] } structure
      const data = await response.json();
      return data.accounts || []; // Extract the accounts array
    },
    // Configure caching and refetching behavior
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep data in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  return {
    accounts,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Provider component for ALL social accounts data
 * Manages the global state of social accounts using React Query
 */
// Rename provider
export function FetchAllAccountsProvider({ children }) {
  // Use the renamed hook
  const accountsData = useFetchAllAccounts();

  return (
    // Use the renamed context
    <FetchAllAccountsContext.Provider value={accountsData}>
      {children}
    </FetchAllAccountsContext.Provider>
  );
}

/**
 * Custom hook to use ALL social accounts context
 * @returns {Object} Social accounts data and methods
 */
// Rename context hook accessor
export function useFetchAllAccountsContext() {
  // Use the renamed context
  const context = useContext(FetchAllAccountsContext);
  if (!context) {
    // Update error message
    throw new Error(
      "useFetchAllAccountsContext must be used within a FetchAllAccountsProvider"
    );
  }
  return context;
}
