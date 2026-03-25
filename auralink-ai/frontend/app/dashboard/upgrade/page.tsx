"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import { useState, useRef, useEffect } from "react";

const CLERK_JWT_TEMPLATE = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE?.trim();
const PENDING_UPGRADE_TIER_KEY = "synclyst_pending_upgrade_tier";

const clerkPublishableKey =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string"
    ? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.trim()
    : "";

function getTierFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const t = new URLSearchParams(window.location.search).get("tier")?.toLowerCase();
  return t === "pro" || t === "growth" || t === "scale" ? t : null;
}

function shouldAutoStartFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  const v = new URLSearchParams(window.location.search).get("autostart");
  return v === "1" || v === "true";
}

function getPendingTierFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  const t = window.sessionStorage.getItem(PENDING_UPGRADE_TIER_KEY)?.toLowerCase();
  return t === "pro" || t === "growth" || t === "scale" ? t : null;
}

function setPendingTierInStorage(tier: "pro" | "growth" | "scale") {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_UPGRADE_TIER_KEY, tier);
}

function clearPendingTierFromStorage() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_UPGRADE_TIER_KEY);
}

function UpgradePageNoClerk() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header className="glass-nav" style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/landing.html" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text)" }}>
          SyncLyst
        </Link>
        <Link href="/dashboard" style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted)" }}>
          ← Dashboard
        </Link>
      </header>
      <main style={{ padding: "2rem", maxWidth: "28rem", margin: "0 auto", textAlign: "center" }}>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
          Upgrades use Stripe checkout and require Clerk to be configured. Add your Clerk keys to{" "}
          <code style={{ fontSize: "0.75rem", background: "var(--border)", padding: "0.15rem 0.35rem", borderRadius: 6 }}>
            .env.local
          </code>{" "}
          and restart the dev server, or continue on the dashboard in guest mode.
        </p>
        <Link
          href="/dashboard"
          style={{ display: "inline-block", marginTop: "1.25rem", fontWeight: 600, color: "var(--text)" }}
        >
          Go to dashboard →
        </Link>
      </main>
    </div>
  );
}

function UpgradePageWithClerk() {
  const { isLoaded, getToken, userId } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const didAutoStart = useRef(false);

  const redirectToSignIn = () => {
    if (typeof window === "undefined") return;
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/sign-in?redirect_url=${redirect}`;
  };

  const startCheckout = async (tier: "pro" | "growth" | "scale") => {
    if (!getToken) return;
    setLoadingTier(tier);
    try {
      setPendingTierInStorage(tier);
      if (!userId) {
        redirectToSignIn();
        return;
      }
      let token: string | null = null;
      if (CLERK_JWT_TEMPLATE) {
        try {
          token = await getToken({ template: CLERK_JWT_TEMPLATE });
        } catch {
          token = null;
        }
      }
      if (!token) token = await getToken();
      if (!token) {
        redirectToSignIn();
        return;
      }
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      const res = await apiFetch("/api/v1/billing/checkout-session", {
        method: "POST",
        token,
        body: JSON.stringify({ tier }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("Missing checkout URL");
      clearPendingTierFromStorage();
      window.location.href = data.url;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        window.alert("Checkout request timed out. Please try again.");
      } else {
        window.alert(e instanceof Error ? e.message : "Could not start checkout");
      }
    } finally {
      setLoadingTier(null);
    }
  };

  useEffect(() => {
    if (didAutoStart.current || !isLoaded) return;
    const fromStorage = getPendingTierFromStorage();
    const fromUrl = shouldAutoStartFromUrl() ? getTierFromUrl() : null;
    const t = fromStorage || fromUrl;
    if (!t || !userId || !getToken) return;
    didAutoStart.current = true;
    startCheckout(t as "pro" | "growth" | "scale");
  }, [isLoaded, userId, getToken]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header className="glass-nav" style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/landing.html" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text)" }}>
          SyncLyst
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
            You&apos;ve hit your scan limit
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            Upgrade to keep scanning and syncing to your marketplaces.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "12px", textAlign: "left" }}>
              <p style={{ fontWeight: 700, color: "var(--text)" }}>Pro — £9/mo</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>100 scans/month</p>
              <button
                type="button"
                disabled={loadingTier !== null}
                className="glass-cta"
                style={{ marginTop: "0.75rem", padding: "0.6rem 1rem", borderRadius: "10px", fontWeight: 600, cursor: loadingTier !== null ? "not-allowed" : "pointer", color: "#fff", width: "100%" }}
                onClick={() => startCheckout("pro")}
              >
                {loadingTier === "pro" ? "Redirecting…" : "Upgrade to Pro"}
              </button>
            </div>
            <div style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "12px", textAlign: "left" }}>
              <p style={{ fontWeight: 700, color: "var(--text)" }}>Growth — £29/mo</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>500 scans/month</p>
              <button
                type="button"
                disabled={loadingTier !== null}
                className="glass-cta"
                style={{ marginTop: "0.75rem", padding: "0.6rem 1rem", borderRadius: "10px", fontWeight: 600, cursor: loadingTier !== null ? "not-allowed" : "pointer", color: "#fff", width: "100%" }}
                onClick={() => startCheckout("growth")}
              >
                {loadingTier === "growth" ? "Redirecting…" : "Upgrade to Growth"}
              </button>
            </div>
            <div style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "12px", textAlign: "left" }}>
              <p style={{ fontWeight: 700, color: "var(--text)" }}>Scale — £79/mo</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Unlimited scans</p>
              <button
                type="button"
                disabled={loadingTier !== null}
                className="glass-cta"
                style={{ marginTop: "0.75rem", padding: "0.6rem 1rem", borderRadius: "10px", fontWeight: 600, cursor: loadingTier !== null ? "not-allowed" : "pointer", color: "#fff", width: "100%" }}
                onClick={() => startCheckout("scale")}
              >
                {loadingTier === "scale" ? "Redirecting…" : "Upgrade to Scale"}
              </button>
            </div>
          </div>
          <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--muted)" }}>
            Payment powered by Stripe. Cancel anytime.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function UpgradePage() {
  if (!clerkPublishableKey) {
    return <UpgradePageNoClerk />;
  }
  return <UpgradePageWithClerk />;
}
