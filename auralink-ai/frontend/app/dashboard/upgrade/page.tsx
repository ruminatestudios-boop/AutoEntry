"use client";

import Link from "next/link";

export default function UpgradePage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header className="glass-nav" style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text)" }}>
          AuraLink AI
        </Link>
        <Link href="/dashboard" style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted)" }}>
          ← Dashboard
        </Link>
      </header>
      <main style={{ padding: "2rem", maxWidth: "32rem", margin: "0 auto", textAlign: "center" }}>
        <div className="glass-card" style={{ padding: "2rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: "0.5rem" }}>
            Upgrade
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem" }}>
            You&apos;ve used all 3 free scans!
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            Upgrade to keep scanning and syncing to your marketplaces.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "12px", textAlign: "left" }}>
              <p style={{ fontWeight: 700, color: "var(--text)" }}>⭐ $9/mo — 50 scans</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Perfect for small batches</p>
            </div>
            <div style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "12px", textAlign: "left" }}>
              <p style={{ fontWeight: 700, color: "var(--text)" }}>⭐ $19/mo — Unlimited</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Best value for power sellers</p>
            </div>
          </div>
          <button
            type="button"
            className="glass-cta"
            style={{ padding: "0.75rem 1.5rem", borderRadius: "10px", fontWeight: 600, cursor: "pointer", color: "#fff", width: "100%" }}
            onClick={() => window.alert("Stripe checkout coming soon. For now you can continue using the app — we'll add payment here.")}
          >
            Upgrade now
          </button>
          <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--muted)" }}>
            Payment powered by Stripe. Cancel anytime.
          </p>
        </div>
      </main>
    </div>
  );
}
