"use client";

import * as React from "react";
import { cn } from "@/app/lib/utils";

const Progress = React.forwardRef(({ className, value = 0, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700",
      className
    )}
    {...props}
  >
    <div
      className="h-full bg-blue-600 transition-all duration-300 ease-in-out rounded-full"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
));

Progress.displayName = "Progress";

export { Progress };