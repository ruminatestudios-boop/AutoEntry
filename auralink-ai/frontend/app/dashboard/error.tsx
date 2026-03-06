"use client";

import { useEffect } from "react";

/**
 * Dashboard segment error boundary. Catches errors in /dashboard and below.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui",
        background: "var(--bg, #f8fafc)",
        color: "var(--text, #18181b)",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Dashboard error
      </h2>
      <p style={{ color: "#71717a", marginBottom: "1.5rem", maxWidth: "28rem", textAlign: "center" }}>
        {error?.message || "Something went wrong on this page."}
      </p>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "0.5rem 1rem",
            background: "#18181b",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <a
          href="/dashboard"
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #e4e4e7",
            borderRadius: "8px",
            color: "#18181b",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Reload dashboard
        </a>
      </div>
    </div>
  );
}
