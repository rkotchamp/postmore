"use client";

import React from "react";

/**
 * A simple loading spinner component using DaisyUI infinity style,
 * themed with foreground color and custom size.
 */
const Spinner = () => {
  return (
    <span
      className="loading loading-infinity text-foreground w-24 h-24"
      role="status"
      aria-label="Loading..."
    ></span>
  );
};

export default Spinner;
