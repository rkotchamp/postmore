"use client";

import { DashboardLayout } from "@/app/dashboard/components/dashboard-layout";
import { DashboardContent } from "@/app/dashboard/components/dashboard-content";
import { DashboardSkeleton } from "@/app/dashboard/components/dashboard-skeleton";
import { CheckoutSuccess } from "@/app/components/checkout/CheckoutSuccess";
import { SubscriptionGuard } from "@/app/components/guards/SubscriptionGuard";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function Dashboard() {
  return (
    <SubscriptionGuard>
      <DashboardLayout>
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardWrapper />
        </Suspense>
      </DashboardLayout>
    </SubscriptionGuard>
  );
}

function DashboardWrapper() {
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

  if (checkoutStatus === "success") {
    return <CheckoutSuccess />;
  }

  return <DashboardContent />;
}
