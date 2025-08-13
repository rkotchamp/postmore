"use client";

import { DashboardLayout } from "@/app/dashboard/components/dashboard-layout";
import ClipperStudio from "./components/ClipperStudio";
import { Suspense } from "react";

export default function ClipperStudioPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <ClipperStudio />
      </Suspense>
    </DashboardLayout>
  );
}
