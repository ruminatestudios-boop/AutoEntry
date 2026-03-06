"use client";

import { useEffect } from "react";

/**
 * Root error boundary: catches unhandled errors and shows a friendly 500 message
 * instead of the default Next.js error screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
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
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Something went wrong
      </h1>
      <p style={{ color: "#71717a", marginBottom: "1.5rem", maxWidth: "28rem", textAlign: "center" }}>
        {error.message || "An unexpected error occurred."}
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
          href="/"
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #e4e4e7",
            borderRadius: "8px",
            color: "#18181b",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Go home
        </a>
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
      </div>
    </div>
  );
}
