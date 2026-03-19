"use client";

import React from "react";
import { ClerkProvider as ClerkProviderBase } from "@clerk/nextjs";

const publishableKey = String(
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) ?? ""
);

/**
 * When Clerk is disabled (no NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY), just render children.
 * When the key is set, wrap with ClerkProvider so useSession and other Clerk hooks work.
 * Uses a single top-level import so SignIn/useSession share the same context (avoids "useSession can only be used within ClerkProvider").
 */
export default function OptionalClerkProvider({ children }: { children: React.ReactNode }) {
  if (!publishableKey.trim()) return <>{children}</>;
  return <ClerkProviderBase publishableKey={publishableKey}>{children}</ClerkProviderBase>;
}
