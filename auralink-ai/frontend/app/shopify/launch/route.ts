import { NextRequest, NextResponse } from "next/server";

/**
 * Explicit Route Handler so `/shopify/launch` always exists in the App Router build output
 * (avoids relying only on redirects/rewrites on some hosts).
 * Preserves query string via `request.nextUrl` search params.
 */
export function GET(request: NextRequest) {
  const u = new URL("/api/shopify/oauth-start", request.url);
  request.nextUrl.searchParams.forEach((v, k) => u.searchParams.set(k, v));
  if (!u.searchParams.has("return_to")) u.searchParams.set("return_to", "dashboard/home");
  const res = NextResponse.redirect(u, 307);
  res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  return res;
}
