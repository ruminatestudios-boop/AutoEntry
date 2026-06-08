/** Pay-as-you-go setup → FastAPI /v1/developers/keys/enable-metered */
import { NextResponse } from "next/server";
import { getClerkServerToken } from "@/lib/clerk-server-token";

export const runtime = "nodejs";

const BACKEND = (
  process.env.AURALINK_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://auralink-api-299567386855.us-central1.run.app"
).replace(/\/$/, "");

export async function POST(req: Request) {
  try {
    const token = await getClerkServerToken();
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    let body: { success_url?: string; cancel_url?: string } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      body = {};
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.synclyst.app").replace(/\/$/, "");
    const successUrl =
      (body.success_url || "").trim() ||
      `${appUrl}/developers/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = (body.cancel_url || "").trim() || `${appUrl}/developers/dashboard?billing=cancel`;

    const upstream = await fetch(`${BACKEND}/v1/developers/keys/enable-metered`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ success_url: successUrl, cancel_url: cancelUrl }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "upstream_error", detail: text.slice(0, 400) },
        { status: upstream.status }
      );
    }

    let data: { url?: string } = {};
    try {
      data = text ? (JSON.parse(text) as { url?: string }) : {};
    } catch {
      data = {};
    }

    if (!data.url) {
      return NextResponse.json({ error: "missing_checkout_url" }, { status: 502 });
    }

    return NextResponse.json({ url: data.url });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
