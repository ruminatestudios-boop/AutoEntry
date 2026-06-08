import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

/**
 * Legacy Shopify App URL and old bookmarks use /home.html?flow=listing&hmac=…
 * Next.js App Router does not always serve public/home.html on Vercel — this route fixes 404s.
 * `/list` and `/scan` rewrite here; serve the static page (do not redirect back to /list).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const flow = (url.searchParams.get("flow") || "").toLowerCase();
  const mode = (url.searchParams.get("mode") || "").toLowerCase();
  const hmac = url.searchParams.get("hmac");
  const shop = url.searchParams.get("shop");
  const host = url.searchParams.get("host");

  // Shopify Admin app open (shop, host, hmac, timestamp, etc.)
  if (hmac || shop || host) {
    const launch = new URL("/shopify/launch", url.origin);
    url.searchParams.forEach((v, k) => launch.searchParams.set(k, v));
    if (!launch.searchParams.has("return_to")) {
      launch.searchParams.set("return_to", flow === "listing" || mode !== "scan" ? "list" : "scan");
    }
    const res = NextResponse.redirect(launch, 307);
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return res;
  }

  if (mode === "scan") {
    const dest = new URL("/scan", url.origin);
    url.searchParams.forEach((v, k) => dest.searchParams.set(k, v));
    const res = NextResponse.redirect(dest, 307);
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return res;
  }

  const filePath = path.join(process.cwd(), "public", "home.html");
  const html = await readFile(filePath, "utf8");
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Permissions-Policy": "camera=*, microphone=()",
    },
  });
}
