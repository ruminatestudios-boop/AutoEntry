import { normalizeMyshopifyDomain } from "@/lib/publishingJwt";

async function supabaseDelete(
  table: string,
  filterQuery: string
): Promise<{ ok: boolean; error?: string }> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ""
  ).trim();

  if (!supabaseUrl || !serviceKey) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const base = supabaseUrl.replace(/\/$/, "");
  const url = `${base}/rest/v1/${table}?${filterQuery}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=minimal",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text || res.statusText };
  }
  return { ok: true };
}

/**
 * Removes Shopify OAuth rows for a shop (platform_tokens + legacy shopify_stores).
 * Used by GDPR app/uninstalled and shop/redact on Vercel.
 */
export async function deleteShopifyPlatformTokens(
  shopDomain: string
): Promise<{ ok: boolean; error?: string }> {
  const domain = normalizeMyshopifyDomain(shopDomain);
  if (!domain) return { ok: false, error: "invalid_shop_domain" };

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ""
  ).trim();

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "[shopify/gdpr] SUPABASE_URL or service role key missing; cannot delete shop data on this host"
    );
    return { ok: false, error: "supabase_not_configured" };
  }

  const encoded = encodeURIComponent(domain);
  const tokenResult = await supabaseDelete(
    "platform_tokens",
    `platform=eq.shopify&shop_domain=eq.${encoded}`
  );
  if (!tokenResult.ok) {
    console.error("[shopify/gdpr] platform_tokens delete failed", tokenResult.error);
    return tokenResult;
  }

  const storeResult = await supabaseDelete("shopify_stores", `shop_domain=eq.${encoded}`);
  if (!storeResult.ok) {
    console.error("[shopify/gdpr] shopify_stores delete failed", storeResult.error);
    return storeResult;
  }

  return { ok: true };
}
