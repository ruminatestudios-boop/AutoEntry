import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getPublishingJwtSecret,
  normalizeMyshopifyDomain,
  signPublishingJwt,
} from "@/lib/publishingJwt";

export const runtime = "nodejs";

/** Same default host as `next.config.ts` publishing proxy when running on Vercel. */
const defaultPublishingUrlOnVercel =
  "https://synclyst-publishing-299567386855.us-central1.run.app";

function publishingBaseUrl(): string {
  const u =
    process.env.PUBLISHING_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_PUBLISHING_API_URL?.trim() ||
    (process.env.VERCEL === "1" ? defaultPublishingUrlOnVercel : "");
  return u.replace(/\/$/, "");
}

/**
 * Starts Shopify OAuth on the publishing API with a signed start_token (binds Clerk user → shop).
 * Use from connect UI: GET /api/shopify/oauth-start?shop=…&return_to=…
 * App Store "App URL" can point to /shopify/launch which forwards here.
 */
export async function GET(request: NextRequest) {
  const shopRaw = request.nextUrl.searchParams.get("shop")?.trim() || "";
  const returnTo =
    request.nextUrl.searchParams.get("return_to")?.trim() || "dashboard/home";

  if (!shopRaw) {
    return NextResponse.json(
      { error: "Missing shop", hint: "Add ?shop=your-store.myshopify.com" },
      { status: 400 }
    );
  }

  const shopNorm = normalizeMyshopifyDomain(shopRaw);
  if (!shopNorm.endsWith(".myshopify.com")) {
    return NextResponse.json(
      { error: "Invalid shop", hint: "Use your-store or your-store.myshopify.com" },
      { status: 400 }
    );
  }

  let { userId } = await auth();
  if (!userId && process.env.NODE_ENV !== "production") {
    userId = "dev-local";
  }
  if (!userId) {
    const origin = request.nextUrl.origin;
    const resume = new URL("/api/shopify/oauth-start", origin);
    resume.searchParams.set("shop", shopNorm);
    resume.searchParams.set("return_to", returnTo);
    const signIn = new URL("/sign-in", origin);
    signIn.searchParams.set("redirect_url", resume.pathname + resume.search);
    return NextResponse.redirect(signIn);
  }

  const secret = getPublishingJwtSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Server misconfigured", hint: "Set PUBLISHING_JWT_SECRET" },
      { status: 500 }
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const startToken = signPublishingJwt(
    {
      sub: userId,
      userId,
      purpose: "shopify_oauth_start",
      shop: shopNorm,
      return_to: returnTo,
      iat: now,
      exp: now + 600,
    },
    secret
  );

  const pub = publishingBaseUrl();
  if (!pub) {
    return NextResponse.json(
      {
        error: "Publishing URL not configured",
        hint: "Set PUBLISHING_APP_URL or NEXT_PUBLIC_PUBLISHING_API_URL",
      },
      { status: 500 }
    );
  }

  const target = new URL(`${pub}/auth/shopify`);
  target.searchParams.set("shop", shopNorm);
  target.searchParams.set("start_token", startToken);
  target.searchParams.set("return_to", returnTo);

  return NextResponse.redirect(target.toString());
}
