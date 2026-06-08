/** Active Cloud Run publishing service (billing + OAuth + publish). */
export const CANONICAL_PUBLISHING_URL =
  "https://synclyst-publishing-299567386855.us-central1.run.app";

/** Retired hosts that 404 on /api/billing — ignore stale Vercel env values. */
const STALE_PUBLISHING_HOST_PATTERNS = [/110592968788/i];

export function isStalePublishingUrl(url: string): boolean {
  const u = (url || "").trim();
  if (!u) return false;
  return STALE_PUBLISHING_HOST_PATTERNS.some((p) => p.test(u));
}

/** Pick first non-stale candidate, else canonical publishing URL. */
export function resolvePublishingBaseUrl(
  ...candidates: Array<string | undefined | null>
): string {
  for (const raw of candidates) {
    const u = (raw ?? "").trim().replace(/\/$/, "");
    if (!u || isStalePublishingUrl(u)) continue;
    return u;
  }
  return CANONICAL_PUBLISHING_URL;
}
