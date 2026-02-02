"use client";

import { DashboardLayout } from "@/app/dashboard/components/dashboard-layout";
import { SubscriptionGuard } from "@/app/components/guards/SubscriptionGuard";
import ClipperStudio from "./components/ClipperStudio";
import { Suspense } from "react";

export default function ClipperStudioPage() {
  return (
    <SubscriptionGuard>
      <DashboardLayout>
        <Suspense fallback={<div>Loading...</div>}>
          <ClipperStudio />
        </Suspense>
      </DashboardLayout>
    </SubscriptionGuard>
  );
}
