"use client";

import { useState, useEffect } from "react";
import DashboardGuest from "./DashboardGuest";

export default function DashboardWrapper() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "2rem",
          fontFamily: "system-ui",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#18181b",
        }}
      >
        <a href="/landing.html" style={{ marginBottom: "1rem", color: "#18181b" }}>
          ← SyncLyst
        </a>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Dashboard</h1>
        <p style={{ color: "#71717a", marginTop: "0.5rem" }}>Loading…</p>
      </div>
    );
  }
  return <DashboardGuest />;
}
