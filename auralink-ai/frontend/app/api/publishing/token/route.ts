import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

export const runtime = "nodejs";

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signHs256(payload: Record<string, unknown>, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const encHeader = base64url(JSON.stringify(header));
  const encPayload = base64url(JSON.stringify(payload));
  const data = `${encHeader}.${encPayload}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

// Exchanges a Clerk session for a Synclyst publishing JWT (HS256).
// Static HTML flows use this to call the publishing service without a shared dev token.
export async function GET() {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch {
    userId = null;
  }

  const secret =
    process.env.PUBLISHING_JWT_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    (process.env.NODE_ENV !== "production" ? "dev-secret-change-in-production" : "");
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  // Dev/guest fallback: allow local flows without Clerk.
  // Publishing service already treats this as "dev-local".
  if (!userId && process.env.NODE_ENV !== "production") userId = "dev-local";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = Math.floor(Date.now() / 1000);
  const token = signHs256(
    {
      sub: userId,
      userId,
      iat: now,
      exp: now + 60 * 60 * 24 * 7,
      source: "clerk",
    },
    secret
  );
  return NextResponse.json({ token, user_id: userId });
}

