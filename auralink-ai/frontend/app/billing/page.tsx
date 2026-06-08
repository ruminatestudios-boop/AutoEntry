"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

const PLANS: {
  id: "starter" | "pro" | "growth" | "scale";
  name: string;
  price: string;
  blurb: string;
  paid: boolean;
}[] = [
  {
    id: "starter",
    name: "Starter",
    price: "Install free",
    blurb: "Limited scans only. Paid plan required to publish to Shopify.",
    paid: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9.99/mo",
    blurb: "100 scans/month · publish to Shopify.",
    paid: true,
  },
  {
    id: "growth",
    name: "Growth",
    price: "$29.99/mo",
    blurb: "500 scans/month · for active sellers.",
    paid: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: "$79.99/mo",
    blurb: "Unlimited scans (fair use) · high volume.",
    paid: true,
  },
];

type BillingStatus = {
  tier?: string;
  status?: string;
  can_publish?: boolean;
  shopify_connected?: boolean;
  shopify_subscription_id?: string | null;
  shop_domain?: string | null;
  billing_provider?: string;
};

function shopifyAdminAppsUrl(shop?: string | null): string {
  const domain = (shop || "").trim().toLowerCase();
  if (!domain) return "https://admin.shopify.com/settings/apps";
  const handle = domain.replace(/\.myshopify\.com$/i, "");
  if (!handle) return "https://admin.shopify.com/settings/apps";
  return `https://admin.shopify.com/store/${encodeURIComponent(handle)}/settings/apps`;
}

type BillingAuthIssue = "sign_in" | "jwt_misconfigured" | "service_error";

type BillingStatusResult =
  | { ok: true; status: BillingStatus }
  | { ok: false; authIssue: BillingAuthIssue };

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchBillingStatusOnce(): Promise<BillingStatusResult> {
  const res = await fetch("/api/billing/status", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (res.status === 401) {
    let reason = "";
    try {
      const body = (await res.json()) as { reason?: string; error?: string };
      reason = body.reason || body.error || "";
    } catch {
      reason = "";
    }
    if (reason === "jwt_secret_misconfigured" || reason === "publishing_jwt_rejected") {
      return { ok: false, authIssue: "jwt_misconfigured" };
    }
    return { ok: false, authIssue: "sign_in" };
  }
  if (!res.ok) return { ok: false, authIssue: "service_error" };
  return { ok: true, status: (await res.json()) as BillingStatus };
}

/** Clerk client session often appears before server cookies are readable — retry like extension-return. */
async function fetchBillingStatus(clientSignedIn: boolean): Promise<BillingStatusResult> {
  const attempts = clientSignedIn ? 12 : 1;
  let last: BillingStatusResult = { ok: false, authIssue: "sign_in" };
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await wait(Math.min(350 + i * 200, 2200));
    last = await fetchBillingStatusOnce();
    if (last.ok) return last;
    if (last.authIssue === "jwt_misconfigured" || last.authIssue === "service_error") {
      return last;
    }
  }
  return last;
}

function buildBillingPath(sp: URLSearchParams | null): string {
  const q = sp?.toString();
  return q ? `/billing?${q}` : "/billing";
}

function PlanCard({
  name,
  price,
  blurb,
  highlight,
  selected,
  children,
}: {
  name: string;
  price: string;
  blurb: string;
  highlight?: boolean;
  selected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        borderRadius: "14px",
        border: selected || highlight ? "2px solid #0a0a0a" : "1px solid #e5e5e5",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {highlight ? (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: "#0a0a0a",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: "6px",
            }}
          >
            Most popular
          </span>
        </div>
      ) : null}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0a0a0a" }}>{name}</h2>
        <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0a0a0a", whiteSpace: "nowrap" }}>
          {price}
        </p>
      </div>
      <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: "#525252" }}>{blurb}</p>
      <div style={{ marginTop: "4px" }}>{children}</div>
    </article>
  );
}

function PrimaryBtn({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "current" | "muted";
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: "#0a0a0a",
      color: "#fff",
      border: "1px solid #0a0a0a",
    },
    current: {
      background: "#ecfdf5",
      color: "#065f46",
      border: "1px solid rgba(5,150,105,0.3)",
    },
    muted: {
      background: "#f4f4f5",
      color: "#525252",
      border: "1px solid #e5e5e5",
    },
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: "100%",
        padding: "12px 16px",
        borderRadius: "12px",
        fontWeight: 600,
        fontSize: "14px",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}

function BillingInner() {
  const sp = useSearchParams();
  const canceled = sp?.get("canceled") === "1";
  const billingSuccess = sp?.get("shopify_billing") === "success";
  const shopifyJustConnected = sp?.get("shopify") === "connected";
  const returnTo = (sp?.get("return") || "").toLowerCase();
  const preselect = ((sp && sp.get("tier")) || "").toLowerCase();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [shopifyConnected, setShopifyConnected] = useState<boolean | null>(null);
  const [serverAuth, setServerAuth] = useState<"unknown" | "ok" | "required" | "jwt_error">("unknown");
  const [statusLoading, setStatusLoading] = useState(true);
  const errRef = useRef<HTMLDivElement | null>(null);

  const billingReturnPath = useMemo(() => buildBillingPath(sp), [sp]);
  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(billingReturnPath)}`;
  const signUpHref = `/sign-up?redirect_url=${encodeURIComponent(billingReturnPath)}&after_sign_up_url=${encodeURIComponent(billingReturnPath)}`;

  const backHref = returnTo === "review" ? "/review?publish=1" : "/list";
  const backLabel = returnTo === "review" ? "Review" : "Scan";
  const connectHref = useMemo(() => {
    const billingQ = sp?.toString();
    const back = billingQ ? `billing?${billingQ}` : "billing";
    return `/connect-store?return=${encodeURIComponent(back)}`;
  }, [sp]);

  const needsShopifyConnect =
    isLoaded && isSignedIn && serverAuth === "ok" && shopifyConnected === false;
  const canSubscribe =
    isLoaded && isSignedIn && serverAuth === "ok" && shopifyConnected === true;

  const refreshBilling = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setServerAuth("required");
      setStatus(null);
      setShopifyConnected(null);
      setStatusLoading(false);
      return;
    }
    setStatusLoading(true);
    const result = await fetchBillingStatus(true);
    if (!result.ok) {
      if (result.authIssue === "sign_in") {
        setServerAuth("required");
        setStatus(null);
        setShopifyConnected(null);
      } else if (result.authIssue === "jwt_misconfigured") {
        setServerAuth("jwt_error");
      } else {
        setServerAuth("unknown");
      }
      setStatusLoading(false);
      return;
    }
    setServerAuth("ok");
    setStatus(result.status);
    if (typeof result.status.shopify_connected === "boolean") {
      setShopifyConnected(result.status.shopify_connected);
    }
    setStatusLoading(false);
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    refreshBilling().catch(() => setStatusLoading(false));
  }, [refreshBilling, billingSuccess, sp?.get("shopify")]);

  useEffect(() => {
    if (!billingSuccess || returnTo !== "review") return;
    let cancelled = false;
    (async () => {
      const result = await fetchBillingStatus(true);
      if (cancelled || !result.ok) return;
      setStatus(result.status);
      setServerAuth("ok");
      if (typeof result.status.shopify_connected === "boolean") {
        setShopifyConnected(result.status.shopify_connected);
      }
      if (result.status.can_publish) window.location.href = "/review?publish=1";
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [billingSuccess, returnTo]);

  function goToSignIn() {
    window.location.href = signInHref;
  }

  function goToConnectShopify() {
    window.location.href = connectHref;
  }

  function showError(message: string) {
    setErr(message);
    requestAnimationFrame(() => {
      errRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  async function startShopifySubscribe(tier: "pro" | "growth" | "scale") {
    setErr(null);
    if (!isLoaded) return;
    if (!isSignedIn || serverAuth === "required") {
      goToSignIn();
      return;
    }
    if (shopifyConnected === false) {
      goToConnectShopify();
      return;
    }

    setLoading(tier);
    try {
      const origin = window.location.origin;
      const returnQ = returnTo === "review" ? "&return=review" : "";
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          tier,
          return_url: `${origin}/billing?shopify_billing=success&tier=${encodeURIComponent(tier)}${returnQ}`,
        }),
      });

      const text = await res.text();
      let data: {
        confirmationUrl?: string;
        error?: string;
        message?: string;
        hint?: string;
      } = {};
      try {
        data = text ? (JSON.parse(text) as typeof data) : {};
      } catch {
        showError(`Subscription failed (HTTP ${res.status}).`);
        return;
      }

      if (res.status === 401) {
        setServerAuth("required");
        goToSignIn();
        return;
      }

      if (!res.ok) {
        if (data.error === "shopify_not_connected") {
          setShopifyConnected(false);
          showError("Connect your Shopify store first, then return here to subscribe.");
        } else {
          showError(data.message || data.hint || data.error || "Subscription failed.");
        }
        return;
      }

      if (data.confirmationUrl) {
        window.location.assign(data.confirmationUrl);
        return;
      }

      showError("Shopify did not return a confirmation URL.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error — could not reach billing API.");
    } finally {
      setLoading(null);
    }
  }

  const currentTier = (status?.tier || "starter").toLowerCase();

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background: "#f5f5f5",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    color: "#0a0a0a",
    WebkitFontSmoothing: "antialiased",
  };

  const card: React.CSSProperties = {
    maxWidth: "28rem",
    margin: "0 auto",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };

  return (
    <div style={shell}>
      <div style={card}>
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid #e5e5e5",
            paddingTop: "max(12px, env(safe-area-inset-top))",
          }}
        >
          <Link
            href={backHref}
            style={{
              fontSize: "12px",
              color: "#525252",
              textDecoration: "none",
              justifySelf: "start",
            }}
          >
            ← {backLabel}
          </Link>
          <Link
            href="/list"
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#0a0a0a",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              justifySelf: "center",
            }}
          >
            Synclyst<sup style={{ fontSize: "0.55em", fontWeight: 400 }}>®</sup>
          </Link>
          <span style={{ justifySelf: "end", width: "1px" }} />
        </header>

        <main style={{ flex: 1, padding: "24px 20px 32px", overflow: "auto" }}>
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: "20px",
              fontWeight: 700,
              textAlign: "center",
              letterSpacing: "-0.025em",
            }}
          >
            Plans &amp; billing
          </h1>
          <p
            style={{
              margin: "0 0 20px",
              fontSize: "14px",
              lineHeight: 1.55,
              color: "#525252",
              textAlign: "center",
            }}
          >
            Billed through <strong style={{ color: "#0a0a0a" }}>Shopify App Billing</strong> on your connected store.
          </p>

          {shopifyJustConnected ? (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid #059669",
                background: "#ecfdf5",
                color: "#065f46",
                fontSize: "14px",
              }}
            >
              Shopify connected — you can subscribe below.
            </div>
          ) : null}
          {billingSuccess ? (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid #059669",
                background: "#ecfdf5",
                color: "#065f46",
                fontSize: "14px",
              }}
            >
              Subscription updated. Refresh if your plan hasn&apos;t changed yet.
            </div>
          ) : null}
          {canceled ? (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid #fcd34d",
                background: "#fffbeb",
                color: "#92400e",
                fontSize: "14px",
              }}
            >
              Subscription canceled — pick a plan when you&apos;re ready.
            </div>
          ) : null}
          {err ? (
            <div
              ref={errRef}
              role="alert"
              style={{
                marginBottom: "16px",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                fontSize: "14px",
                lineHeight: 1.45,
              }}
            >
              {err}
            </div>
          ) : null}

          <div style={{ marginBottom: "20px" }}>
            {!isLoaded || statusLoading ? (
              <p style={{ margin: 0, fontSize: "13px", color: "#71717a", textAlign: "center" }}>
                Checking your account…
              </p>
            ) : !isSignedIn ? (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  border: "1px solid #e5e5e5",
                  background: "#fafafa",
                }}
              >
                <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: "#0a0a0a" }}>
                  Sign in to subscribe
                </p>
                <p style={{ margin: "0 0 14px", fontSize: "13px", lineHeight: 1.5, color: "#525252" }}>
                  Use the same email you use in Shopify Admin. You&apos;ll return here after sign-in.
                </p>
                <PrimaryBtn onClick={goToSignIn}>Continue to sign in</PrimaryBtn>
                <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#71717a", textAlign: "center" }}>
                  New here?{" "}
                  <Link href={signUpHref} style={{ color: "#0a0a0a", fontWeight: 600 }}>
                    Create account
                  </Link>
                </p>
              </div>
            ) : serverAuth === "jwt_error" ? (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                }}
              >
                <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: "#991b1b" }}>
                  Billing connection issue
                </p>
                <p style={{ margin: "0 0 14px", fontSize: "13px", lineHeight: 1.5, color: "#7f1d1d" }}>
                  You&apos;re signed in, but the app can&apos;t reach billing yet. Refresh in a minute — if this
                  persists, contact support.
                </p>
                <PrimaryBtn onClick={() => window.location.reload()}>Refresh</PrimaryBtn>
              </div>
            ) : serverAuth === "required" ? (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  border: "1px solid #fcd34d",
                  background: "#fffbeb",
                }}
              >
                <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: "#92400e" }}>
                  Session expired
                </p>
                <p style={{ margin: "0 0 14px", fontSize: "13px", lineHeight: 1.5, color: "#78350f" }}>
                  {user?.primaryEmailAddress?.emailAddress
                    ? `Sign in again as ${user.primaryEmailAddress.emailAddress} to continue.`
                    : "Sign in again to subscribe — you'll return to this page."}
                </p>
                <PrimaryBtn onClick={goToSignIn}>Sign in again</PrimaryBtn>
              </div>
            ) : (
              <>
                <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#525252", textAlign: "center" }}>
                  Signed in as{" "}
                  <strong style={{ color: "#0a0a0a" }}>
                    {user?.primaryEmailAddress?.emailAddress || "your account"}
                  </strong>
                </p>
                {status ? (
                  <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#525252", textAlign: "center" }}>
                    Plan: <strong style={{ color: "#0a0a0a", textTransform: "capitalize" }}>{currentTier}</strong>
                    {status.can_publish ? " · publish enabled" : " · upgrade to publish"}
                  </p>
                ) : null}
                {shopifyConnected === false ? (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(149,191,71,0.4)",
                      background: "#f4faf0",
                      fontSize: "14px",
                    }}
                  >
                    <Link href={connectHref} style={{ fontWeight: 600, color: "#0a0a0a" }}>
                      Connect Shopify
                    </Link>{" "}
                    before subscribing — billing runs on your store.
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {PLANS.map((p) => {
              const highlight = p.id === "growth";
              const selected = preselect === p.id;
              const isCurrent = currentTier === p.id && p.id !== "starter";
              const isStarterCurrent = p.id === "starter" && currentTier === "starter";

              return (
                <PlanCard
                  key={p.id}
                  name={p.name}
                  price={p.price}
                  blurb={p.blurb}
                  highlight={highlight}
                  selected={selected}
                >
                  {p.paid ? (
                    <PrimaryBtn
                      disabled={!isLoaded || loading !== null || isCurrent}
                      variant={
                        isCurrent ? "current" : canSubscribe || needsShopifyConnect ? "primary" : "muted"
                      }
                      onClick={() => {
                        if (isCurrent) return;
                        if (!isLoaded || statusLoading) return;
                        if (!isSignedIn || serverAuth === "required") {
                          goToSignIn();
                          return;
                        }
                        if (shopifyConnected === false) {
                          goToConnectShopify();
                          return;
                        }
                        if (p.id === "pro" || p.id === "growth" || p.id === "scale") {
                          startShopifySubscribe(p.id);
                        }
                      }}
                    >
                      {isCurrent
                        ? "Current plan"
                        : loading === p.id
                          ? "Opening Shopify…"
                          : !isLoaded || statusLoading
                            ? "Loading…"
                            : canSubscribe
                              ? "Subscribe via Shopify"
                              : needsShopifyConnect
                                ? "Connect Shopify"
                                : "Sign in to subscribe"}
                    </PrimaryBtn>
                  ) : (
                    <PrimaryBtn variant={isStarterCurrent ? "muted" : "muted"} disabled>
                      {isStarterCurrent ? "Your plan" : "Install free"}
                    </PrimaryBtn>
                  )}
                </PlanCard>
              );
            })}
          </div>

          {isSignedIn && shopifyConnected !== false && status?.shop_domain ? (
            <p
              style={{
                marginTop: "20px",
                fontSize: "13px",
                lineHeight: 1.55,
                color: "#525252",
                textAlign: "center",
              }}
            >
              Change or cancel your plan anytime in{" "}
              <a
                href={shopifyAdminAppsUrl(status.shop_domain)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#0a0a0a", fontWeight: 600 }}
              >
                Shopify Admin → Settings → Apps
              </a>
              . Upgrades apply immediately; downgrades follow Shopify&apos;s billing cycle.
            </p>
          ) : null}
          <p
            style={{
              marginTop: "16px",
              fontSize: "11px",
              lineHeight: 1.5,
              color: "#a1a1aa",
              textAlign: "center",
            }}
          >
            Pro 100 scans/mo · Growth 500/mo · Scale unlimited (fair use). Charges on your Shopify invoice.
          </p>
        </main>
      </div>
    </div>
  );
}

function BillingLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        color: "#525252",
      }}
    >
      Loading…
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingLoading />}>
      <BillingInner />
    </Suspense>
  );
}
