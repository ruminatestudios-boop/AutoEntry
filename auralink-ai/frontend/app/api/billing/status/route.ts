import { NextResponse } from "next/server";
import { mintPublishingJwtForRequest } from "@/lib/publishingServerAuth";
import { publishingServerBaseUrl } from "@/lib/publishingServerUrl";

export const runtime = "nodejs";

/** Server-side proxy: billing status + Shopify connection for /billing page. */
export async function GET() {
  const auth = await mintPublishingJwtForRequest();
  if (!auth) {
    const secret = (process.env.PUBLISHING_JWT_SECRET || process.env.JWT_SECRET || "").trim();
    return NextResponse.json(
      {
        error: "unauthorized",
        reason: secret.length < 32 ? "jwt_secret_misconfigured" : "clerk_session_missing",
      },
      { status: 401 }
    );
  }

  const pub = publishingServerBaseUrl();
  if (!pub) {
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const headers = { Authorization: `Bearer ${auth.token}` };
  const [statusRes, storesRes] = await Promise.all([
    fetch(`${pub}/api/billing/status`, { headers, cache: "no-store" }),
    fetch(`${pub}/api/user/connected-stores`, { headers, cache: "no-store" }),
  ]);

  const statusText = await statusRes.text();
  const storesText = await storesRes.text();

  let status: Record<string, unknown> = { tier: "starter", can_publish: false };
  let shopifyConnected = false;

  try {
    if (statusRes.ok && statusText) {
      status = JSON.parse(statusText) as Record<string, unknown>;
    }
  } catch {
    /* keep defaults */
  }

  try {
    if (storesRes.ok && storesText) {
      const stores = JSON.parse(storesText) as { shopify?: { status?: string } };
      shopifyConnected = stores.shopify?.status === "connected";
    }
  } catch {
    /* ignore */
  }

  if (!statusRes.ok && statusRes.status === 401) {
    return NextResponse.json(
      { error: "invalid_token", reason: "publishing_jwt_rejected" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ...status,
    shopify_connected: shopifyConnected,
  });
}
