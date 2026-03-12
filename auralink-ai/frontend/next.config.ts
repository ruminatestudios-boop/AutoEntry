import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
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
