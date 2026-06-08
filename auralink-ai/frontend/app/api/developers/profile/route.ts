/**
 * GET /api/developers/profile — dashboard summary (usage + keys + plan).
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getClerkServerToken } from "@/lib/clerk-server-token";
import {
  FREE_MONTHLY_CALLS,
  highestPlan,
  MAX_ACTIVE_KEYS,
  METERED_RATES_GBP,
  PLAN_LIMITS,
} from "@/lib/developer-plans";
import { resolveSupabaseProjectUrl, resolveSupabaseServiceKey } from "@/lib/supabase-env";

export const runtime = "nodejs";

const BACKEND = (
  process.env.AURALINK_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://auralink-api-299567386855.us-central1.run.app"
).replace(/\/$/, "");

const PAID_PLANS = new Set(["starter", "pro", "enterprise"]);

async function developerSchemaReady(): Promise<boolean> {
  const url = resolveSupabaseProjectUrl();
  const key = resolveSupabaseServiceKey();
  if (!url || !key) return true;

  try {
    const res = await fetch(`${url}/rest/v1/developer_api_keys?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) return true;
    const text = await res.text();
    return !text.includes("developer_api_keys") && !text.includes("PGRST205");
  } catch {
    return true;
  }
}

async function backendGet(path: string, token: string) {
  const res = await fetch(`${BACKEND}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { ok: res.ok, status: res.status, data, text };
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const token = await getClerkServerToken();
    if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

    const [usageRes, keysRes] = await Promise.all([
      backendGet("/v1/developers/keys/usage", token),
      backendGet("/v1/developers/keys", token),
    ]);

    if (!usageRes.ok) {
      const detail =
        usageRes.data && typeof usageRes.data === "object" && usageRes.data !== null && "detail" in usageRes.data
          ? String((usageRes.data as { detail: unknown }).detail)
          : usageRes.text.slice(0, 400);
      return NextResponse.json({ detail }, { status: usageRes.status });
    }
    if (!keysRes.ok) {
      const detail =
        keysRes.data && typeof keysRes.data === "object" && keysRes.data !== null && "detail" in keysRes.data
          ? String((keysRes.data as { detail: unknown }).detail)
          : keysRes.text.slice(0, 400);
      return NextResponse.json({ detail }, { status: keysRes.status });
    }

    const usage = usageRes.data as {
      total_calls_this_month?: number;
      total_overage_calls_this_month?: number;
      metered_billing_enabled?: boolean;
      free_calls_included?: number;
      metered_rates_gbp?: Record<string, number>;
      keys?: Array<{ plan?: string }>;
    };
    const keys = Array.isArray(keysRes.data) ? keysRes.data : [];

    const plan = highestPlan([
      ...keys.map((k: { plan?: string }) => k.plan || "free"),
      ...(usage.keys || []).map((k) => k.plan || "free"),
    ]);
    const callsLimit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
    const callsUsed = Number(usage.total_calls_this_month ?? 0);

    const schemaReady = await developerSchemaReady();

    const freeIncluded = usage.free_calls_included ?? FREE_MONTHLY_CALLS;
    const overageCalls = Number(usage.total_overage_calls_this_month ?? 0);
    const meteredEnabled = Boolean(usage.metered_billing_enabled);

    return NextResponse.json({
      developer_id: userId,
      schema_ready: schemaReady,
      plan,
      metered_billing_enabled: meteredEnabled,
      free_calls_included: freeIncluded,
      overage_calls_this_month: overageCalls,
      metered_rates_gbp: usage.metered_rates_gbp ?? METERED_RATES_GBP,
      usage: {
        calls_used: callsUsed,
        calls_limit: callsLimit,
        calls_remaining: Math.max(0, callsLimit - callsUsed),
        month_key: new Date().toISOString().slice(0, 7),
        billing_enabled: PAID_PLANS.has(plan),
        overage_calls: overageCalls,
      },
      keys_count: keys.length,
      keys_limit: MAX_ACTIVE_KEYS,
      plan_limits: PLAN_LIMITS,
    });
  } catch (e) {
    return NextResponse.json({ detail: String(e) }, { status: 500 });
  }
}
