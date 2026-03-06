"use client";

import { useEffect } from "react";

/**
 * Error boundary for /review so Next.js has required error components for this segment.
 * Prevents "missing required error components, refreshing..." on this route.
 */
export default function ReviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Review error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui",
        background: "#f8fafc",
        color: "#18181b",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Something went wrong
      </h1>
      <p style={{ color: "#71717a", marginBottom: "1rem", maxWidth: "28rem", textAlign: "center" }}>
        {error.message || "Could not load the review screen."}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={reset}
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
          Dashboard
        </a>
        <a href="/" style={{ padding: "0.5rem 1rem", color: "#2563eb", fontWeight: 600 }}>
          Home
        </a>
      </div>
    </div>
  );
}
