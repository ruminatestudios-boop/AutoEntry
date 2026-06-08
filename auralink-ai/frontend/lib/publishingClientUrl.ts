import { CANONICAL_PUBLISHING_URL } from "@/lib/canonicalPublishingUrl";

/** Same-origin proxy path (Next rewrites → Cloud Run). */
export const PUBLISHING_PROXY_PATH = "/__synclyst_publishing";

/**
 * Base URL for browser calls to the publishing API.
 * Prefer same-origin proxy on Vercel / app host to avoid CORS and :8001 mistakes.
 */
export function publishingClientBaseUrl(): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin.replace(/\/$/, "");
  const host = window.location.hostname;
  const port = window.location.port || (window.location.protocol === "https:" ? "443" : "80");

  if ((host === "localhost" || host === "127.0.0.1") && (port === "3000" || port === "3001")) {
    return `${origin}${PUBLISHING_PROXY_PATH}`;
  }

  if (
    host === "app.synclyst.app" ||
    host.endsWith(".vercel.app") ||
    host === "scan.synclyst.app"
  ) {
    return `${origin}${PUBLISHING_PROXY_PATH}`;
  }

  if (host === "synclyst.app" || host === "www.synclyst.app") {
    return CANONICAL_PUBLISHING_URL;
  }

  return `${window.location.protocol}//${host}:8001`;
}
