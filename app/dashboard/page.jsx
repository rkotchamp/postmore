"use client";

import { DashboardLayout } from "@/app/dashboard/components/dashboard-layout";
import { DashboardContent } from "@/app/dashboard/components/dashboard-content";
import { CheckoutSuccess } from "@/app/components/checkout/CheckoutSuccess";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <Suspense fallback={<DashboardContent />}>
        <DashboardWrapper />
      </Suspense>
    </DashboardLayout>
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
