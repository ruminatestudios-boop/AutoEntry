"use client";

import { useState } from "react";

export default function DashboardLoader() {
  const [Dashboard, setDashboard] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDashboard = () => {
    if (typeof window === "undefined") return;
    setLoading(true);
    import("./DashboardGuest").then((mod) => {
      setDashboard(() => mod.default);
      setLoading(false);
    });
  };

  if (Dashboard) {
    return <Dashboard />;
  }

  return (
    <div style={{ minHeight: "100vh", padding: "2rem", fontFamily: "system-ui" }}>
      <a href="/landing.html" style={{ display: "inline-block", marginBottom: "1rem", color: "#18181b" }}>← SyncLyst<sup style={{ fontSize: "0.5em", opacity: 0.8 }}>®</sup></a>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Dashboard</h1>
      <p style={{ color: "#71717a", marginTop: "0.5rem" }}>If you see this, the server is working.</p>
      <p style={{ marginTop: "1.5rem" }}>
        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            background: "#18181b",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.875rem",
            cursor: loading ? "wait" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Loading…" : "Load full dashboard"}
        </button>
      </p>
    </div>
  );
}
