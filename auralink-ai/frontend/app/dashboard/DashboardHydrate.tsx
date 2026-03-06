"use client";

import { useState, useEffect } from "react";

export default function DashboardHydrate() {
  const [mounted, setMounted] = useState(false);
  const [Guest, setGuest] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    import("./DashboardGuest").then((mod) => setGuest(() => mod.default));
  }, [mounted]);

  if (!mounted || !Guest) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#71717a", fontSize: "0.875rem" }}>Loading dashboard…</p>
      </div>
    );
  }

  return <Guest />;
}
