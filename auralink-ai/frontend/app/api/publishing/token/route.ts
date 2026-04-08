import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPublishingJwtSecret, signPublishingJwt } from "@/lib/publishingJwt";

export const runtime = "nodejs";

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

  const secret = getPublishingJwtSecret();
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  // Dev/guest fallback: allow local flows without Clerk.
  // Publishing service already treats this as "dev-local".
  if (!userId && process.env.NODE_ENV !== "production") userId = "dev-local";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = Math.floor(Date.now() / 1000);
  const token = signPublishingJwt(
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

