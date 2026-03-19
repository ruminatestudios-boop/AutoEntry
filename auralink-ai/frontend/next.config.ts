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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  ...(resolvedPublicApiUrl
    ? { env: { NEXT_PUBLIC_API_URL: resolvedPublicApiUrl } }
    : {}),
  async redirects() {
    return [];
  },
  async rewrites() {
    return [
      { source: "/flow-2", destination: "/flow-2.html" },
      { source: "/flow-3", destination: "/flow-3.html" },
      { source: "/review", destination: "/flow-3.html" },
    ];
  },
};

export default nextConfig;
