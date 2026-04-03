import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Waitlist signups from demo.html / flow-3 (same-origin; avoids relying on Cloud Run
 * POST /auth/waitlist, which may be missing on older publishing deploys).
 * Inserts into Supabase `waitlist_signups` — same table as publishing POST /auth/waitlist.
 *
 * Vercel: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const source = String(body?.source || "web").trim();
    const note = body?.note != null ? String(body.note).trim() : "";
    const storeDomain = body?.store_domain != null ? String(body.store_domain).trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const serviceKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      ""
    ).trim();

    if (!supabaseUrl || !serviceKey) {
      console.error("[api/waitlist] Missing SUPABASE_URL or service role key");
      return NextResponse.json(
        { error: "Waitlist is not configured on this deployment" },
        { status: 503 },
      );
    }

    const restUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/waitlist_signups`;
    const upstream = await fetch(restUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        email,
        platform: "shopify",
        store_domain: storeDomain || null,
        source,
        note: note || null,
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("[api/waitlist] Supabase error", upstream.status, text);
      return NextResponse.json({ error: "Could not save signup" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/waitlist]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
