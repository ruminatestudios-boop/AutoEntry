"use client";

import React, { useState, useEffect } from "react";

const key = String((typeof process !== "undefined" && process.env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) ?? "");

/**
 * When Clerk is disabled (no NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY), just render children.
 * When the key is set, wrap with ClerkProvider so Clerk hooks work.
 * Clerk is loaded only when the key is set to avoid "missing components" / "missing publishable key" errors in dummy runs.
 */
export default function OptionalClerkProvider({ children }: { children: React.ReactNode }) {
  const [ClerkProvider, setClerkProvider] = useState<React.ComponentType<{ publishableKey: string; children: React.ReactNode }> | null>(null);

  useEffect(() => {
    if (!key.trim()) return;
    import("@clerk/nextjs").then((mod) => setClerkProvider(() => mod.ClerkProvider));
  }, []);

  if (!key.trim()) return <>{children}</>;
  if (!ClerkProvider) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "system-ui" }}>
        <span style={{ color: "#71717a" }}>Loading…</span>
      </div>
    );
  }
  return <ClerkProvider publishableKey={key}>{children}</ClerkProvider>;
}
