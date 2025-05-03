"use client";

import { createContext, useContext, useState, useMemo } from "react";

const ProgressCountContext = createContext();

export const ProgressCountProvider = ({ children }) => {
  const [progressCount, setProgressCount] = useState({
    currentStep: 0,
  });

  // Memoize the context value
  const value = useMemo(
    () => ({ progressCount, setProgressCount }),
    [progressCount]
  ); // setProgressCount is stable

  return (
    // Use the memoized value
    <ProgressCountContext.Provider value={value}>
      {children}
    </ProgressCountContext.Provider>
  );
};

export const useProgressCount = () => {
  const context = useContext(ProgressCountContext);
  if (!context) {
    throw new Error(
      "useProgressCount must be used within a ProgressCountProvider"
    );
  }
  return context;
};
