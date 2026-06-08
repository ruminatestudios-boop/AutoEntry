import { NextRequest, NextResponse } from "next/server";
import { resolveShopFromLaunchSearchParams } from "@/lib/shopifyLaunchParams";

/**
 * Explicit Route Handler so `/shopify/launch` always exists in the App Router build output
 * (avoids relying only on redirects/rewrites on some hosts).
 * Preserves query string via `request.nextUrl` search params.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const shop = resolveShopFromLaunchSearchParams(params);

  if (!shop) {
    const list = new URL("/list", request.url);
    const res = NextResponse.redirect(list, 307);
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return res;
  }

  const u = new URL("/api/shopify/oauth-start", request.url);
  params.forEach((v, k) => u.searchParams.set(k, v));
  if (!u.searchParams.has("shop")) u.searchParams.set("shop", shop);
  if (!u.searchParams.has("return_to")) u.searchParams.set("return_to", "list");
  const res = NextResponse.redirect(u, 307);
  res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  return res;
}
