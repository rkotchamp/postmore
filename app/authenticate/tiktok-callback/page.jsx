import { Suspense } from "react";
import { TikTokCallbackHandler } from "../components/TikTokCallbackHandler";

export const metadata = {
  title: "TikTok Authentication - PostMoore",
  description: "Processing TikTok authentication",
};

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading TikTok authentication...</p>
      </div>
    </div>
  );
}

export default function TikTokCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TikTokCallbackHandler />
    </Suspense>
  );
}