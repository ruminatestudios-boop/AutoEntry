import { NextResponse } from "next/server";
import { getPublishingJwtSecret, signPublishingJwt } from "@/lib/publishingJwt";
import { publishingServerBaseUrl } from "@/lib/publishingServerUrl";

export const runtime = "nodejs";

/** Deploy probe — verifies publishing JWT secret matches Cloud Run. */
export async function GET() {
  const secret = getPublishingJwtSecret();
  if (secret.length < 32) {
    return NextResponse.json({ ok: false, secret_len: secret.length, publishing_status: null });
  }

  const now = Math.floor(Date.now() / 1000);
  const token = signPublishingJwt(
    { sub: "jwt-probe", userId: "jwt-probe", iat: now, exp: now + 120, source: "clerk" },
    secret
  );

  const pub = publishingServerBaseUrl();
  let publishingStatus: number | null = null;
  try {
    const res = await fetch(`${pub}/api/billing/status`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    publishingStatus = res.status;
  } catch {
    publishingStatus = null;
  }

  return NextResponse.json({
    ok: publishingStatus !== 401,
    secret_len: secret.length,
    publishing_status: publishingStatus,
  });
}
