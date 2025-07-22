"use client";

import { useState } from "react";
import { useSubscriptionStore } from "@/app/lib/store/subscriptionStore";
import { Badge } from "@/app/components/ui/badge";

export function BillingToggle() {
  const { billingPeriod, setBillingPeriod } = useSubscriptionStore();
  
  const handleToggle = (period) => {
    setBillingPeriod(period);
  };

  return (
    <div className="flex items-center justify-center mb-8">
      <div className="relative bg-muted rounded-lg p-1 flex">
        {/* Bouncing Badge for Yearly Discount */}
        <div className="absolute -top-3 right-2 z-10">
          <Badge 
            variant="secondary" 
            className="bg-primary text-primary-foreground text-xs font-semibold animate-bounce shadow-lg"
          >
            15% OFF
          </Badge>
        </div>

        {/* Monthly Option */}
        <button
          onClick={() => handleToggle("monthly")}
          className={`
            relative px-6 py-2 rounded-md text-sm font-medium transition-all duration-200
            ${billingPeriod === "monthly" 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
            }
          `}
        >
          Monthly
        </button>
        
        {/* Yearly Option */}
        <button
          onClick={() => handleToggle("yearly")}
          className={`
            relative px-6 py-2 rounded-md text-sm font-medium transition-all duration-200
            ${billingPeriod === "yearly" 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
            }
          `}
        >
          Yearly
        </button>
      </div>
    </div>
  );
}