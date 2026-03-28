import type { NextConfig } from "next";
import path from "path";

/**
 * Vercel often uses AURALINK_BACKEND_URL; the client bundle only sees NEXT_PUBLIC_*.
 * Map backend URL into NEXT_PUBLIC_API_URL when the latter is unset (build time).
 */
const resolvedPublicApiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  process.env.AURALINK_BACKEND_URL?.trim() ||
  "";

const publishingProxyTarget =
  process.env.PUBLISHING_PROXY_TARGET?.trim() || "http://127.0.0.1:8001";

/**
 * Homepage: `/` rewrites to public/landing.html (beforeFiles so it beats app routes).
 *
 * Listing flow — typical user order (single-item, scan path):
 * 1. / (and /landing.html) — marketing; CTA → /scan
 * 2. /scan (aliases: /home.html?mode=scan, /landing.html?mode=scan → redirect) — camera/upload → extraction → continue
 * 3. /reading-product (aliases: /flow-2.html, /flow-2, /flow/processing → redirect) — “Reading your product” / progress
 * 4. /review (aliases: /listing/review; file: flow-3.html) — edit listing, publish; /flow-3.html redirects to /review
 * 5. /listing/published (aliases: /flow/success, /flow-success.html) — final “you’re live” screen
 * — Static hub (public HTML): /dashboard/home (was dashboard-home.html; Next /dashboard stays Clerk app)
 * — Connect Shopify: /connect-store (aliases: /stores-connect-shopify.html → redirect)
 *
 * Platform pick (Etsy/eBay/TikTok/Shopify) often uses /flow-choose-platform.html before step 3
 * or when switching; batch flow uses /flow-batch*.html → review still lands on flow-3?batch=1.
 */
const listingFlowRewrites = [
  /** Static “home” dashboard (listings hub); URL bar stays /dashboard/home */
  { source: "/dashboard/home", destination: "/dashboard-home.html" },
  { source: "/flow/choose-platform", destination: "/flow-choose-platform.html" },
  { source: "/listing/review", destination: "/flow-3.html" },
  { source: "/flow/publish", destination: "/flow-publishing.html" },
  /** Canonical slug for the final success step (maps to public/flow-success.html). */
  { source: "/listing/published", destination: "/flow-success.html" },
  { source: "/flow/success", destination: "/flow-success.html" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  ...(resolvedPublicApiUrl
    ? { env: { NEXT_PUBLIC_API_URL: resolvedPublicApiUrl } }
    : {}),
  async redirects() {
    return [
      /** Prefer semantic URL in the address bar (query string preserved). */
      { source: "/flow-3.html", destination: "/review", permanent: false },
      /** Canonical scan step: was /home.html?mode=scan or /landing.html?mode=scan */
      {
        source: "/home.html",
        has: [{ type: "query", key: "mode", value: "scan" }],
        destination: "/scan",
        permanent: false,
      },
      {
        source: "/landing.html",
        has: [{ type: "query", key: "mode", value: "scan" }],
        destination: "/scan",
        permanent: false,
      },
      /** Canonical “Reading your product” step (was /flow-2.html, /flow-2, /flow/processing). */
      { source: "/flow-2.html", destination: "/reading-product", permanent: false },
      { source: "/flow-2", destination: "/reading-product", permanent: false },
      { source: "/flow/processing", destination: "/reading-product", permanent: false },
      /** Canonical Shopify connect page (was stores-connect-shopify.html). */
      {
        source: "/stores-connect-shopify.html",
        destination: "/connect-store",
        permanent: false,
      },
      /** Canonical dashboard root should always land on the selected hub page. */
      {
        source: "/dashboard",
        destination: "/dashboard/home",
        permanent: false,
      },
      /** Clean slug for static dashboard hub (Next app still uses /dashboard for Clerk). */
      {
        source: "/dashboard-home.html",
        destination: "/dashboard/home",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const pubBase = publishingProxyTarget.replace(/\/$/, "");
    return {
      beforeFiles: [
        /** Marketing homepage at synclyst.app `/` (URL bar stays `/`). */
        { source: "/", destination: "/landing.html" },
      ],
      afterFiles: [
        ...listingFlowRewrites,
        /** Product scan (public/home.html); URL bar stays /scan */
        { source: "/scan", destination: "/home.html" },
        /** “Reading your product” (public/flow-2.html); URL bar stays /reading-product */
        { source: "/reading-product", destination: "/flow-2.html" },
        { source: "/flow-3", destination: "/flow-3.html" },
        { source: "/flow-publishing", destination: "/flow-publishing.html" },
        { source: "/review", destination: "/flow-3.html" },
        /** Shopify OAuth entry (public/stores-connect-shopify.html); URL bar stays /connect-store */
        { source: "/connect-store", destination: "/stores-connect-shopify.html" },
        // Same-origin proxy so flow-3 on :3000 can reach publishing without CORS / mixed-origin quirks
        {
          source: "/__synclyst_publishing/:path*",
          destination: `${pubBase}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
