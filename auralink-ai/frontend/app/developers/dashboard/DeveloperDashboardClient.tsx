"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import DeveloperShell from "../DeveloperShell";
import styles from "../developers.module.css";
import {
  API_BASE_URL,
  API_PLANS,
  effectivePerCallGbp,
  FREE_MONTHLY_CALLS,
  MAX_ACTIVE_KEYS,
  nextMonthResetLabel,
} from "@/lib/developer-plans";

type ApiKey = {
  id: string;
  key_prefix?: string;
  label?: string;
  plan?: string;
  last_used_at?: string | null;
  calls_used?: number;
};

type Profile = {
  developer_id: string;
  schema_ready?: boolean;
  plan: string;
  metered_billing_enabled?: boolean;
  free_calls_included?: number;
  overage_calls_this_month?: number;
  metered_rates_gbp?: Record<string, number>;
  usage: {
    calls_used: number;
    calls_limit: number;
    calls_remaining: number;
    month_key: string;
    billing_enabled?: boolean;
    overage_calls?: number;
  };
  keys_count: number;
  keys_limit: number;
};

type RevealedKey = {
  key: string;
  label: string;
};

type UsagePayload = {
  total_calls_this_month?: number;
  daily_usage?: Record<string, number>;
  keys?: Array<{
    key_id: string;
    label: string;
    endpoint_breakdown?: Record<string, number>;
  }>;
};

async function devFetch(path: string, init?: RequestInit) {
  const res = await fetch(`/api/developers/${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: unknown; error?: unknown };
      const raw = extractApiDetail(body.detail) || extractApiDetail(body.error);
      if (raw.startsWith("{")) {
        try {
          const inner = JSON.parse(raw) as { detail?: unknown };
          msg = extractApiDetail(inner.detail) || raw;
        } catch {
          msg = raw;
        }
      } else if (raw) {
        msg = raw;
      }
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }
  return res.json();
}

function formatErrorMessage(err: unknown): string {
  if (err instanceof Error) return parseApiErrorText(err.message);
  return "Something went wrong";
}

function formatMonthKey(key?: string): string | null {
  if (!key || !/^\d{4}-\d{2}$/.test(key)) return null;
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatLastUsed(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return null;
  }
}

function extractApiDetail(detail: unknown): string {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg?: string }).msg || "");
        }
        return "";
      })
      .filter(Boolean)
      .join(". ");
  }
  if (typeof detail === "object" && detail !== null && "msg" in detail) {
    return String((detail as { msg?: string }).msg || "");
  }
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function parseApiErrorText(raw: string): string {
  const marker = "Stripe error: ";
  if (raw.includes(marker)) {
    try {
      const jsonStart = raw.indexOf("{");
      if (jsonStart >= 0) {
        const parsed = JSON.parse(raw.slice(jsonStart)) as { error?: { message?: string } };
        if (parsed.error?.message) return parsed.error.message;
      }
    } catch {
      /* keep raw */
    }
  }
  return raw;
}

function UsageChart({ daily }: { daily: Record<string, number> }) {
  const points = useMemo(() => {
    const entries = Object.entries(daily).sort(([a], [b]) => a.localeCompare(b));
    return entries.slice(-30);
  }, [daily]);

  if (!points.length) return null;
  const max = Math.max(...points.map(([, c]) => c), 1);

  return (
    <div className={styles.chartWrap}>
      <p className={styles.cardHeaderSub} style={{ margin: "0 0 0.5rem" }}>
        Last 30 days
      </p>
      <div className={styles.chartBars}>
        {points.map(([date, calls], i) => (
          <div
            key={date}
            className={`${styles.chartBar} ${i === points.length - 1 ? styles.chartBarActive : ""}`}
            style={{ height: `${Math.max((calls / max) * 100, 4)}%` }}
            title={`${date}: ${calls} calls`}
          />
        ))}
      </div>
      <p className={styles.chartLabel}>Hover bars for daily call counts</p>
    </div>
  );
}

export default function DeveloperDashboardClient() {
  const { isSignedIn } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<RevealedKey | null>(null);
  const [newTestKey, setNewTestKey] = useState<RevealedKey | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [copiedKeyKind, setCopiedKeyKind] = useState<"live" | "test" | null>(null);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyLabel, setKeyLabel] = useState("My API Key");
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    try {
      const [profileData, keysData, usageData] = await Promise.all([
        devFetch("profile") as Promise<Profile>,
        devFetch("keys") as Promise<ApiKey[] | { keys?: ApiKey[] }>,
        devFetch("usage") as Promise<UsagePayload>,
      ]);
      setProfile(profileData);
      setKeys(Array.isArray(keysData) ? keysData : keysData.keys || []);
      setUsage(usageData);
    } catch (e) {
      setError(formatErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isSignedIn) load();
    else setLoading(false);
  }, [isSignedIn, load]);

  useEffect(() => {
    if (!isSignedIn || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const billing = (params.get("billing") || "").toLowerCase();
    const sessionId = params.get("session_id") || "";

    if (billing === "cancel") {
      setBillingNotice("Checkout cancelled — no changes were made.");
      const cleaned = new URL(window.location.href);
      cleaned.searchParams.delete("billing");
      window.history.replaceState({}, "", cleaned.toString());
      return;
    }

    if ((billing !== "success" && billing !== "metered_success") || !sessionId) return;

    (async () => {
      try {
        const res = await fetch("/api/developers/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        if (res.ok) {
          const data = (await res.json()) as { billing_type?: string };
          setBillingNotice(
            data.billing_type === "metered"
              ? "Pay-as-you-go billing enabled — calls after your free 100 are billed per use."
              : "Payment confirmed — your plan is now active.",
          );
          await load();
        } else {
          setBillingNotice("Payment received. Your billing will update shortly via webhook.");
        }
      } catch {
        setBillingNotice("Payment received. Your plan will update shortly.");
      } finally {
        const cleaned = new URL(window.location.href);
        cleaned.searchParams.delete("billing");
        cleaned.searchParams.delete("session_id");
        window.history.replaceState({}, "", cleaned.toString());
      }
    })();
  }, [isSignedIn, load]);

  async function copyKey(text: string, kind: "live" | "test") {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyKind(kind);
      window.setTimeout(() => setCopiedKeyKind(null), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  async function createKey() {
    setCreating(true);
    setError(null);
    setNewKey(null);
    setCopiedKeyKind(null);
    try {
      const label = keyLabel.trim() || "My API Key";
      const data = (await devFetch("keys", {
        method: "POST",
        body: JSON.stringify({ label }),
      })) as { key?: string; api_key?: string; label?: string };
      const raw = data.key || data.api_key;
      setNewKey(raw ? { key: raw, label: data.label || label } : null);
      setShowCreateModal(false);
      await load();
    } catch (e) {
      setError(formatErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  async function createTestKey() {
    setCreatingTest(true);
    setError(null);
    setNewTestKey(null);
    setCopiedKeyKind(null);
    try {
      const res = await fetch("/api/developers/keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Sandbox test key" }),
      });
      const data = (await res.json()) as { key?: string; label?: string; detail?: string };
      if (!res.ok) throw new Error(data.detail || "Failed to create test key");
      setNewTestKey(
        data.key
          ? { key: data.key, label: data.label || "Sandbox test key" }
          : null,
      );
      await load();
    } catch (e) {
      setError(formatErrorMessage(e));
    } finally {
      setCreatingTest(false);
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await devFetch(`keys/${revokeTarget.id}`, { method: "DELETE" });
      setRevokeTarget(null);
      await load();
    } catch (e) {
      setError(formatErrorMessage(e));
    } finally {
      setRevoking(false);
    }
  }

  async function startCheckout(plan: "starter" | "pro") {
    const origin = window.location.origin;
    const res = await fetch("/api/developers/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
        success_url: `${origin}/developers/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/developers/dashboard?billing=cancel`,
      }),
    });
    const data = (await res.json()) as { url?: string; checkout_url?: string; detail?: string; error?: string };
    if (!res.ok) throw new Error(parseApiErrorText(data.detail || data.error || "Checkout failed"));
    const checkoutUrl = data.url || data.checkout_url;
    if (!checkoutUrl) throw new Error("Checkout did not return a payment URL.");
    window.location.href = checkoutUrl;
  }

  async function enablePayAsYouGo() {
    setBillingLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const res = await fetch("/api/developers/enable-metered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success_url: `${origin}/developers/dashboard?billing=metered_success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/developers/dashboard?billing=cancel`,
        }),
      });
      const text = await res.text();
      let data: { url?: string; detail?: unknown; error?: unknown } = {};
      try {
        data = text ? (JSON.parse(text) as typeof data) : {};
      } catch {
        throw new Error(text.slice(0, 200) || "Checkout failed");
      }
      if (!res.ok) {
        const msg =
          extractApiDetail(data.detail) ||
          extractApiDetail(data.error) ||
          text ||
          "Checkout failed";
        throw new Error(parseApiErrorText(msg));
      }
      if (!data.url) throw new Error("Checkout did not return a payment URL.");
      window.location.href = data.url;
    } catch (e) {
      setError(formatErrorMessage(e));
    } finally {
      setBillingLoading(false);
    }
  }

  async function upgrade(plan: "starter" | "pro") {
    setCheckoutPlan(plan);
    setError(null);
    setBillingNotice(null);
    try {
      await startCheckout(plan);
    } catch (e) {
      setError(formatErrorMessage(e));
    } finally {
      setCheckoutPlan(null);
    }
  }

  const firstPrefix = keys[0]?.key_prefix || "sk_live_XXXXXXXX";
  const curlExample = `curl -X POST \\
  ${API_BASE_URL}/v1/extract \\
  -H "Authorization: Bearer sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"image_url":"https://example.com/product.jpg","use_case":"reseller"}'`;

  const endpointRows = useMemo(() => {
    const merged: Record<string, number> = {};
    for (const k of usage?.keys || []) {
      for (const [ep, count] of Object.entries(k.endpoint_breakdown || {})) {
        merged[ep] = (merged[ep] || 0) + count;
      }
    }
    return Object.entries(merged).sort((a, b) => b[1] - a[1]);
  }, [usage]);

  if (!isSignedIn) {
    return (
      <DeveloperShell active="dashboard">
        <div className={styles.hero}>
          <span className={styles.eyebrow}>Developer API</span>
          <h1 className={styles.heroTitle}>Your API dashboard</h1>
          <p className={styles.heroSub}>Sign in to create keys, track usage, and manage billing.</p>
        </div>
        <div className={`${styles.card} ${styles.signInCard}`}>
          <p className={styles.cardSub}>Use the same SyncLyst account as the Chrome extension and mobile app.</p>
          <Link href="/sign-in?redirect_url=/developers/dashboard" className={styles.btnPrimary}>
            Sign in to continue
          </Link>
        </div>
      </DeveloperShell>
    );
  }

  if (loading) {
    return (
      <DeveloperShell active="dashboard">
        <div className={styles.loading}>
          <div className={styles.spinner} aria-hidden />
          <p>Loading your dashboard…</p>
        </div>
      </DeveloperShell>
    );
  }

  const callsUsed = profile?.usage.calls_used ?? 0;
  const freeIncluded = profile?.free_calls_included ?? FREE_MONTHLY_CALLS;
  const callsLimit = profile?.usage.calls_limit ?? freeIncluded;
  const overageCalls = profile?.overage_calls_this_month ?? profile?.usage.overage_calls ?? 0;
  const callsRemaining = profile?.usage.calls_remaining ?? Math.max(0, callsLimit - callsUsed);
  const usagePct = profile ? Math.min(100, Math.round((callsUsed / callsLimit) * 100)) : 0;
  const monthLabel = formatMonthKey(profile?.usage.month_key);
  const keysLimit = profile?.keys_limit ?? MAX_ACTIVE_KEYS;

  return (
    <DeveloperShell active="dashboard">
      {showCreateModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Create API key</h2>
            <p className={styles.modalSub}>Name your key so you can tell environments apart later.</p>
            <input
              className={styles.modalInput}
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              placeholder="e.g. Production server"
              maxLength={80}
            />
            {error && <div className={`${styles.notice} ${styles.noticeErr}`}>{error}</div>}
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button type="button" className={styles.btnPrimary} onClick={createKey} disabled={creating}>
                {creating ? "Creating…" : "Create key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {revokeTarget && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Revoke API key?</h2>
            <p className={styles.modalSub}>
              Revoke <strong>{revokeTarget.label || revokeTarget.key_prefix}</strong>? Apps using it will stop
              working immediately.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setRevokeTarget(null)}>
                Cancel
              </button>
              <button type="button" className={styles.btnDanger} onClick={confirmRevoke} disabled={revoking}>
                {revoking ? "Revoking…" : "Revoke key"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`${styles.hero} ${styles.heroCompact}`}>
        <span className={styles.eyebrow}>Developer API</span>
        <h1 className={styles.heroTitle}>Dashboard</h1>
        <p className={styles.heroSub}>
          Manage API keys, monitor usage, and upgrade your plan for higher monthly volume.
        </p>
        <div className={styles.quickLinks}>
          <Link href="/developers" className={styles.quickLink}>
            API documentation
          </Link>
          <a href="mailto:synclyst@gmail.com" className={styles.quickLink}>
            Get support
          </a>
        </div>
      </div>

      {profile?.schema_ready === false && (
        <div className={styles.alertStack}>
          <div className={`${styles.notice} ${styles.noticeErr}`}>
            API key storage is not set up yet. In{" "}
            <a
              href="https://supabase.com/dashboard/project/jjqwcgbpwapamulsgekk/sql/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              Supabase SQL Editor
            </a>
            , run section 7 from supabase/RUN_IN_SUPABASE_DASHBOARD.sql (creates developer_api_keys).
            Then refresh this page.
          </div>
        </div>
      )}

      {(error || billingNotice) && !showCreateModal && (
        <div className={styles.alertStack}>
          {error && <div className={`${styles.notice} ${styles.noticeErr}`}>{error}</div>}
          {billingNotice && <div className={`${styles.notice} ${styles.noticeOk}`}>{billingNotice}</div>}
        </div>
      )}

      <div className={styles.dashboardStack}>
        <section className={`${styles.card} ${styles.cardFeatured}`}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardHeaderTitle}>Usage this month</h2>
              {monthLabel && <p className={styles.cardHeaderSub}>{monthLabel}</p>}
            </div>
            <span className={styles.planBadge}>{profile?.plan || "free"} plan</span>
          </div>

          <div className={styles.usageGrid}>
            <div className={`${styles.usageStat} ${styles.usageStatHighlight}`}>
              <span className={styles.usageStatLabel}>Used</span>
              <span className={styles.usageStatValue}>{callsUsed}</span>
            </div>
            <div className={styles.usageStat}>
              <span className={styles.usageStatLabel}>Remaining</span>
              <span className={styles.usageStatValue}>{callsRemaining}</span>
            </div>
            <div className={styles.usageStat}>
              <span className={styles.usageStatLabel}>Limit</span>
              <span className={styles.usageStatValue}>{callsLimit.toLocaleString()}</span>
            </div>
          </div>

          <div className={styles.progressWrap}>
            <div className={styles.progressMeta}>
              <span className={styles.progressMetaLabel}>
                {callsUsed}/{callsLimit} calls
              </span>
              <span className={styles.progressMetaPct}>{usagePct}%</span>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-valuenow={usagePct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={styles.progressFill} style={{ width: `${usagePct}%` }} />
            </div>
          </div>

          <p className={styles.cardFootnote}>
            Resets {nextMonthResetLabel()}.{" "}
            {profile?.usage.billing_enabled
              ? "Paid plan active — higher monthly quota applied."
              : `${freeIncluded} free calls/month included on the Free plan.`}
            {(profile?.plan || "free") === "free" && (
              <>
                {" "}
                {profile?.metered_billing_enabled
                  ? `Pay-as-you-go active — ${overageCalls} billed call${overageCalls === 1 ? "" : "s"} this month after your free ${freeIncluded}.`
                  : `After ${freeIncluded} calls, enable pay-as-you-go to keep calling.`}
              </>
            )}
          </p>
          {usage?.daily_usage && Object.keys(usage.daily_usage).length > 0 && (
            <UsageChart daily={usage.daily_usage} />
          )}

          {endpointRows.length > 0 && (
            <table className={styles.endpointTable}>
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Calls (30d)</th>
                </tr>
              </thead>
              <tbody>
                {endpointRows.map(([ep, count]) => (
                  <tr key={ep}>
                    <td>
                      <code>{ep}</code>
                    </td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardHeaderTitle}>API keys</h2>
              <p className={styles.cardHeaderSub}>
                {profile?.keys_count ?? 0} of {keysLimit} active
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                disabled={(profile?.keys_count ?? 0) >= keysLimit}
                className={styles.btnPrimary}
              >
                Create key
              </button>
              <button
                type="button"
                onClick={createTestKey}
                disabled={creatingTest}
                className={styles.btnSecondary}
              >
                {creatingTest ? "Creating…" : "Sandbox key"}
              </button>
            </div>
          </div>

          {newKey && (
            <div className={styles.keyReveal}>
              <p className={styles.keyRevealLabel}>{newKey.label}</p>
              <strong>Copy your new live key now — it won&apos;t be shown again.</strong>
              <button
                type="button"
                className={`${styles.keyCopyCode} ${copiedKeyKind === "live" ? styles.keyCopyCodeDone : ""}`}
                onClick={() => copyKey(newKey.key, "live")}
              >
                <code>{newKey.key}</code>
                <span className={styles.keyCopyHint}>
                  {copiedKeyKind === "live" ? "Copied!" : "Click to copy"}
                </span>
              </button>
            </div>
          )}

          {newTestKey && (
            <div className={`${styles.keyReveal} ${styles.keyRevealSandbox}`}>
              <p className={styles.keyRevealLabel}>{newTestKey.label}</p>
              <strong>Sandbox test key (sk_test_) — returns fake data, no quota charge.</strong>
              <button
                type="button"
                className={`${styles.keyCopyCode} ${styles.keyCopyCodeSandbox} ${
                  copiedKeyKind === "test" ? styles.keyCopyCodeSandboxDone : ""
                }`}
                onClick={() => copyKey(newTestKey.key, "test")}
              >
                <code>{newTestKey.key}</code>
                <span className={styles.keyCopyHint}>
                  {copiedKeyKind === "test" ? "Copied!" : "Click to copy"}
                </span>
              </button>
            </div>
          )}

          {keys.length === 0 ? (
            <div className={styles.emptyKeys}>
              <span className={styles.emptyKeysIcon} aria-hidden>
                sk
              </span>
              <p className={styles.emptyKeysTitle}>No API keys yet</p>
              <p className={styles.emptyKeysSub}>
                Create a key to call <code>/v1/extract</code> from Zapier, scripts, or your backend.
              </p>
            </div>
          ) : (
            <ul className={styles.keyList}>
              {keys.map((k) => {
                const lastUsed = formatLastUsed(k.last_used_at);
                return (
                  <li key={k.id} className={styles.keyItem}>
                    <div>
                      <p className={styles.keyPrefix}>{k.key_prefix || "sk_live_…"}…</p>
                      <p className={styles.keyMeta}>
                        {k.label || "API key"}
                        {k.plan ? ` · ${k.plan}` : ""}
                        {lastUsed ? ` · Last used ${lastUsed}` : ""}
                      </p>
                    </div>
                    <button type="button" onClick={() => setRevokeTarget(k)} className={styles.btnDanger}>
                      Revoke
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardHeaderTitle}>Quick start</h2>
              <p className={styles.cardHeaderSub}>Your key prefix: {firstPrefix}</p>
            </div>
          </div>
          <pre className={styles.curlBlock}>{curlExample}</pre>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardHeaderTitle}>Upgrade plan</h2>
              <p className={styles.cardHeaderSub}>Higher monthly volume for production workloads</p>
            </div>
          </div>
          <div className={styles.plansGrid}>
            {API_PLANS.map((p) => {
              const isCurrent =
                p.id === "free" ? (profile?.plan || "free") === "free" : profile?.plan === p.id;
              const isPopular = p.id === "starter";
              return (
                <div
                  key={p.id}
                  className={`${styles.planCard} ${isCurrent ? styles.planCardCurrent : ""} ${isPopular ? styles.planCardPopular : ""}`}
                >
                  {isPopular && !isCurrent && <span className={styles.planRibbon}>Popular</span>}
                  <p className={styles.planName}>{p.name}</p>
                  <p className={styles.planCalls}>{p.calls.toLocaleString()} calls/mo</p>
                  <p className={styles.planPrice}>{p.price}</p>
                  {p.id !== "free" && effectivePerCallGbp(p.id) != null && (
                    <p className={styles.planEffective}>
                      ~£{effectivePerCallGbp(p.id)!.toFixed(2)}/call at full usage
                    </p>
                  )}
                  <div className={styles.planFoot}>
                    {p.id === "free" ? (
                      <span className={styles.planStatus}>{isCurrent ? "Current plan" : "Included"}</span>
                    ) : isCurrent ? (
                      <span className={styles.planStatus}>Current plan</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => upgrade(p.id as "starter" | "pro")}
                        disabled={checkoutPlan === p.id}
                        className={styles.planLink}
                      >
                        {checkoutPlan === p.id ? "Redirecting…" : "Upgrade"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {(profile?.plan || "free") === "free" && !profile?.metered_billing_enabled && (
            <div className={styles.paygBtnWrap}>
              <button
                type="button"
                onClick={enablePayAsYouGo}
                disabled={billingLoading}
                className={`${styles.btnPrimary} ${styles.btnPrimaryLg}`}
              >
                {billingLoading ? "Redirecting to Stripe…" : "Enable pay-as-you-go billing"}
              </button>
            </div>
          )}
          {(profile?.plan || "free") === "free" && profile?.metered_billing_enabled && (
            <p className={styles.cardFootnote} style={{ marginTop: "1rem" }}>
              Pay-as-you-go billing is active. Calls {freeIncluded + 1}+ this month are metered and appear on your
              Stripe invoice.
            </p>
          )}
        </section>
      </div>
    </DeveloperShell>
  );
}
