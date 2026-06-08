/**
 * Vercel often uses AURALINK_BACKEND_URL; the client bundle only sees NEXT_PUBLIC_*.
 * Map backend URL into NEXT_PUBLIC_API_URL when the latter is unset (build time).
 */
const resolvedPublicApiUrl =
  (process.env.NEXT_PUBLIC_API_URL || "").trim() ||
  (process.env.AURALINK_BACKEND_URL || "").trim() ||
  "";

/**
 * Rewrite `/__synclyst_publishing/*` → this base URL (must be set for production Vercel builds).
 * If unset on Vercel, Next defaulted to 127.0.0.1:8001 and the proxy 404’d on synclyst.app.
 * Override with PUBLISHING_PROXY_TARGET in Vercel → Environment Variables (Production).
 */
const defaultPublishingProxyForVercel =
  "https://synclyst-publishing-299567386855.us-central1.run.app";
const stalePublishingHost = /110592968788/i;
function resolvePublishingProxyTarget() {
  const fromEnv = (process.env.PUBLISHING_PROXY_TARGET || "").trim();
  const fromPublic = (process.env.NEXT_PUBLIC_PUBLISHING_API_URL || "").trim();
  const pick = [fromEnv, fromPublic].find((u) => u && !stalePublishingHost.test(u));
  if (pick) return pick.replace(/\/$/, "");
  if (process.env.VERCEL === "1") return defaultPublishingProxyForVercel;
  return fromEnv.replace(/\/$/, "") || "http://127.0.0.1:8001";
}
const publishingProxyTarget = resolvePublishingProxyTarget();

/** Root `/` serves the marketing landing page. Scan entry point is /list. */

const listingFlowRewrites = [
  { source: "/dashboard/home", destination: "/dashboard-home.html" },
  { source: "/flow/choose-platform", destination: "/flow-choose-platform.html" },
  { source: "/flow/choose-listing", destination: "/flow-choose-listing.html" },
  { source: "/listing/review", destination: "/flow-3.html" },
  { source: "/flow/publish", destination: "/flow-publishing.html" },
  { source: "/listing/published", destination: "/flow-success.html" },
  { source: "/flow/success", destination: "/flow-success.html" },
];

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(resolvedPublicApiUrl ? { env: { NEXT_PUBLIC_API_URL: resolvedPublicApiUrl } } : {}),
  async headers() {
    return [
      {
        // Never CDN-cache these app pages — they contain inline JS that must stay fresh
        source: "/(scan|list|reading-product|reseller-results|reseller-library|reseller-listing-draft)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Permissions-Policy", value: "camera=*, microphone=()" },
        ],
      },
      {
        // Broad allow for all pages so iframes / subdomain variations don't block camera
        source: "/:path*",
        headers: [
          { key: "Permissions-Policy", value: "camera=*, microphone=()" },
          // Allow Shopify Admin to load the app URL. Safe even when embedded=false
          // (Shopify may still attempt to frame the app during install/open flows).
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com https://*.shopify.com;",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // scan.synclyst.app root → scanner (so old links to scan.synclyst.app still work)
      {
        source: "/",
        has: [{ type: "host", value: "scan.synclyst.app" }],
        destination: "/scan",
        permanent: false,
      },
      { source: "/flow-3.html", destination: "/review", permanent: false },
      // Legacy App URL / bookmarks — App Router route app/home.html/route.ts also handles this
      {
        source: "/home.html",
        has: [{ type: "query", key: "hmac" }],
        destination: "/shopify/launch",
        permanent: false,
      },
      {
        source: "/home.html",
        has: [{ type: "query", key: "shop" }],
        destination: "/shopify/launch",
        permanent: false,
      },
      {
        source: "/home.html",
        has: [{ type: "query", key: "mode", value: "scan" }],
        destination: "/scan",
        permanent: false,
      },
      {
        source: "/home.html",
        has: [{ type: "query", key: "flow", value: "listing" }],
        destination: "/list",
        permanent: false,
      },
      { source: "/home.html", destination: "/list", permanent: false },
      { source: "/flow-2.html", destination: "/reading-product", permanent: false },
      { source: "/flow-2", destination: "/reading-product", permanent: false },
      { source: "/flow/processing", destination: "/reading-product", permanent: false },
      { source: "/stores-connect-shopify.html", destination: "/connect-store", permanent: false },
      { source: "/dashboard-home.html", destination: "/dashboard/home", permanent: false },
    ];
  },
  async rewrites() {
    const pubBase = String(publishingProxyTarget || "").replace(/\/$/, "");
    const apiBase = String(resolvedPublicApiUrl || "").replace(/\/$/, "");
    return {
      // beforeFiles: run before App Router / public checks so static `public/*.html` wins.
      // This avoids Vercel NOT_FOUND when the `/snap` App route is missing or not bundled.
      beforeFiles: [
        { source: "/demo", destination: "/demo.html" },
        { source: "/snap", destination: "/snap.html" },
        { source: "/snap/", destination: "/snap.html" },
        { source: "/extension-review", destination: "/extension-review.html" },
        { source: "/extension-review/", destination: "/extension-review.html" },
      ],
      afterFiles: [
        ...listingFlowRewrites,
        { source: "/scan", destination: "/home.html" },
        { source: "/list", destination: "/home.html" },
        { source: "/reseller-results", destination: "/reseller-results.html" },
        { source: "/reseller-listing-draft", destination: "/reseller-listing-draft.html" },
        { source: "/reseller-library", destination: "/reseller-library.html" },
        { source: "/reading-product", destination: "/flow-2.html" },
        { source: "/flow-3", destination: "/flow-3.html" },
        { source: "/flow-publishing", destination: "/flow-publishing.html" },
        { source: "/review", destination: "/flow-3.html" },
        { source: "/connect-store", destination: "/stores-connect-shopify.html" },
        // NOTE: Do NOT add a catch-all /api/v1/:path* rewrite here.
        // On Vercel the Edge rewrites fire before serverless functions, so a
        // generic /api/v1/* rewrite would bypass pages/api/v1/vision/*.js proxy
        // handlers (reseller-scan, extract) and send requests straight to Cloud
        // Run without the per-route headers, timeout config, and error handling.
        {
          source: "/__synclyst_publishing/:path*",
          destination: `${pubBase}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;

