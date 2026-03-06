"use client";

import dynamic from "next/dynamic";

const ReviewListingScreen = dynamic(
  () => import("@/app/components/ReviewListingScreen"),
  { ssr: false, loading: () => <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-zinc-500">Loading review…</div> }
);

export default function ReviewPage() {
  return <ReviewListingScreen />;
}
