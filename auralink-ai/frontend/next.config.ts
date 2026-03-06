import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // So Next uses this app as root when multiple lockfiles exist (avoids 404 for /dashboard in dev)
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
