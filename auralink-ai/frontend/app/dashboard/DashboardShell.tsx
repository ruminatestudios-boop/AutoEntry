"use client";

import { useState } from "react";

export default function DashboardShell() {
  const [Guest, setGuest] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDashboard = () => {
    if (typeof window === "undefined") return;
    setLoading(true);
    import("./DashboardGuest").then((mod) => {
      setGuest(() => mod.default);
      setLoading(false);
    });
  };

  if (Guest) return <Guest />;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Dashboard</h1>
      <p style={{ color: "#71717a", fontSize: "0.875rem", marginBottom: "1.5rem" }}>Click below to load the dashboard.</p>
      <button
        type="button"
        onClick={loadDashboard}
        disabled={loading}
        style={{
          padding: "0.625rem 1.25rem",
          background: "#18181b",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
          fontSize: "0.875rem",
        }}
      >
        {loading ? "Loading…" : "Load dashboard"}
      </button>
    </div>
  );
}
