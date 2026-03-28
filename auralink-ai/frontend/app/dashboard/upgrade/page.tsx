"use client";

import Link from "next/link";

export default function UpgradePage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header
        className="glass-nav"
        style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <Link href="/landing.html" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text)" }}>
          SyncLyst
        </Link>
        <Link href="/dashboard" style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted)" }}>
          ← Dashboard
        </Link>
      </header>
      <main style={{ padding: "2rem", maxWidth: "32rem", margin: "0 auto", textAlign: "center" }}>
        <div className="glass-card" style={{ padding: "2rem" }}>
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--muted)",
              marginBottom: "0.5rem",
            }}
          >
            Pricing paused
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem" }}>
            Upgrades are temporarily unavailable
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            We are onboarding merchants through a waitlist right now.
          </p>
          <Link
            href="/landing.html#waitlist"
            className="glass-cta"
            style={{ display: "inline-block", padding: "0.65rem 1rem", borderRadius: 10, color: "#fff", fontWeight: 600 }}
          >
            Join waitlist
          </Link>
        </div>
      </main>
    </div>
  );
}
