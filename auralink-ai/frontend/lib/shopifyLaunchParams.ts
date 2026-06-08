/** Decode Shopify Admin `host` (base64url) → `handle.myshopify.com`. */
export function decodeShopifyHostParam(hostB64: string | null | undefined): string {
  const raw = (hostB64 ?? "").trim();
  if (!raw) return "";
  try {
    const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = Buffer.from(normalized + pad, "base64").toString("utf8");
    const m = decoded.match(/admin\.shopify\.com\/store\/([^/?#]+)/i);
    if (m?.[1]) {
      const handle = m[1].trim().toLowerCase();
      if (handle && handle !== "admin") return `${handle}.myshopify.com`;
    }
  } catch {
    /* ignore */
  }
  return "";
}

/** `shop` query param, or shop handle extracted from Shopify `host`. */
export function resolveShopFromLaunchSearchParams(params: URLSearchParams): string {
  const shop = (params.get("shop") ?? "").trim();
  if (shop) return shop;
  return decodeShopifyHostParam(params.get("host"));
}
