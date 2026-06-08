import { NextRequest, NextResponse } from "next/server";
import { mintPublishingJwtForRequest } from "@/lib/publishingServerAuth";
import { publishingServerBaseUrl } from "@/lib/publishingServerUrl";

export const runtime = "nodejs";

/** Server-side proxy → publishing POST /api/billing/subscribe (avoids stale browser JWT). */
export async function POST(request: NextRequest) {
  const auth = await mintPublishingJwtForRequest();
  if (!auth) {
    return NextResponse.json(
      {
        error: "unauthorized",
        message: "Sign in required — you'll return to billing after signing in.",
        sign_in: true,
      },
      { status: 401 }
    );
  }

  const pub = publishingServerBaseUrl();
  if (!pub) {
    return NextResponse.json(
      { error: "misconfigured", message: "Publishing URL not configured." },
      { status: 500 }
    );
  }

  let body: { tier?: string; return_url?: string };
  try {
    body = (await request.json()) as { tier?: string; return_url?: string };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const tier = (body.tier || "").trim().toLowerCase();
  const returnUrl = (body.return_url || "").trim();
  if (!tier || !["pro", "growth", "scale"].includes(tier)) {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }
  if (!returnUrl) {
    return NextResponse.json({ error: "missing_return_url" }, { status: 400 });
  }

  const upstream = await fetch(`${pub}/api/billing/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ tier, return_url: returnUrl }),
    cache: "no-store",
  });

  const text = await upstream.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    const hint =
      upstream.status === 404
        ? "Publishing API not found — check PUBLISHING_APP_URL points at the active Cloud Run service."
        : `Billing service error (HTTP ${upstream.status}).`;
    return NextResponse.json(
      { error: "upstream_error", message: hint },
      { status: upstream.status >= 400 ? upstream.status : 502 }
    );
  }

  return NextResponse.json(data, { status: upstream.status });
}
