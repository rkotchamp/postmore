"use client";

import { createContext, useContext, useState, useMemo } from "react";

const MediaTextFlowContext = createContext();

export const MediaTextFlowProvider = ({ children }) => {
  const [behavior, setBehavior] = useState({
    isMediaAvailable: false,
    isUserTyping: false,
    postType: "media",
    showPreviews: false,
    temporaryText: "",
  });

  const value = useMemo(() => ({ behavior, setBehavior }), [behavior]);

  return (
    <MediaTextFlowContext.Provider value={value}>
      {children}
    </MediaTextFlowContext.Provider>
  );
};

export const useMediaTextFlow = () => {
  const context = useContext(MediaTextFlowContext);
  if (!context) {
    throw new Error(
      "useMediaTextFlow must be used within a MediaTextFlowProvider"
    );
  }
  return context;
};
