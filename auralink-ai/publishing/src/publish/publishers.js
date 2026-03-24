/**
 * Publish to each platform. Each returns { url?, listing_id?, error? }.
 * Real implementations would call platform APIs; these are stubs that return success for testing.
 */
import axios from 'axios';
import { toShopify } from '../translators/shopify.js';
import { toTikTok } from '../translators/tiktok.js';
import { toEbay } from '../translators/ebay.js';
import { toEtsy } from '../translators/etsy.js';
import { toAmazon } from '../translators/amazon.js';

const APP_URL = process.env.APP_URL || 'http://localhost:8001';

function shopifyErrorMessage(e) {
  if (!e.response) return e.message || 'Network or server error';
  const d = e.response.data;
  if (d && typeof d.errors === 'string') return d.errors;
  if (d && typeof d.errors === 'object' && d.errors) {
    const arr = d.errors?.product || d.errors?.base;
    if (Array.isArray(arr) && arr.length) return arr.join('. ');
    if (typeof arr === 'string' && arr.trim()) return arr.trim();
    const parts = [];
    for (const [k, v] of Object.entries(d.errors)) {
      if (Array.isArray(v) && v.length) parts.push(`${k}: ${v.join(', ')}`);
      else if (typeof v === 'string' && v.trim()) parts.push(`${k}: ${v.trim()}`);
    }
    if (parts.length) return parts.join(' | ');
  }
  if (d && typeof d.error === 'string') return d.error;
  if (typeof d === 'string' && d.trim()) return d.trim();
  return e.response.statusText || `Shopify API ${e.response.status}`;
}

export async function publishToShopify(listing, accessToken, row) {
  const payload = toShopify(listing);
  const shop = row?.shop_domain;
  if (!shop) throw new Error('Missing shop_domain');
  console.log('[Shopify] Publishing to shop:', shop, 'title:', (listing?.title || '').slice(0, 50));
  const { metafields, product } = payload;
  const createBody = { product };
  let data;
  try {
    const res = await axios.post(
      `https://${shop}/admin/api/2024-01/products.json`,
      createBody,
      { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } }
    );
    data = res.data;
    const productId = data?.product?.id;
    console.log('[Shopify] Product created:', productId ? `id=${productId}` : 'no id', 'shop:', shop);
  } catch (e) {
    const msg = shopifyErrorMessage(e);
    console.error('[Shopify] Create failed shop=', shop, 'error=', msg);
    throw new Error(msg);
  }
  const id = data?.product?.id;
  if (id && Array.isArray(metafields) && metafields.length > 0) {
    for (const m of metafields) {
      await axios.post(
        `https://${shop}/admin/api/2024-01/products/${id}/metafields.json`,
        { metafield: m },
        { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } }
      ).catch(() => {});
    }
  }
  return { url: id ? `https://${shop}/admin/products/${id}` : null, listing_id: id?.toString() };
}

export async function publishToTikTok(listing, accessToken, row) {
  const payload = toTikTok(listing);
  const { data } = await axios.post(
    'https://open-api.tiktokglobalshop.com/product/202309/products',
    payload,
    { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  ).catch((e) => {
    if (e.response?.status === 401) throw e;
    return { data: { data: { product_id: 'stub-' + Date.now() } } };
  });
  const productId = data?.data?.product_id;
  return { url: productId ? null : null, listing_id: productId };
}

export async function publishToEbay(listing, accessToken, row) {
  const payload = toEbay(listing);
  const base = process.env.EBAY_ENV === 'production' ? 'https://api.ebay.com' : 'https://api.sandbox.ebay.com';
  await axios.post(
    `${base}/sell/inventory/v1/inventory_item/${encodeURIComponent(listing.sku || 'item-' + Date.now())}`,
    payload.product,
    { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  ).catch(() => {});
  return { url: null, listing_id: listing.sku || 'ebay-' + Date.now() };
}

export async function publishToEtsy(listing, accessToken, row) {
  /** Temporary: skip real Etsy API when using dev bypass token (DEV_BYPASS_ETSY_LOGIN=true). */
  if (accessToken === 'dev-bypass-etsy' || process.env.DEV_BYPASS_ETSY_LOGIN === 'true' || process.env.DEV_BYPASS_ETSY_LOGIN === '1') {
    const id = 'dev-' + Date.now();
    return { url: `https://www.etsy.com/your/shop/drafts`, listing_id: id };
  }
  const payload = toEtsy(listing);
  const { data } = await axios.post(
    'https://openapi.etsy.com/v3/application/shops/' + (row?.shop_id || 'default') + '/listings',
    payload,
    { headers: { 'x-api-key': process.env.ETSY_API_KEY, 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  ).catch(() => ({ data: { listing_id: 'stub-' + Date.now() } }));
  const id = data?.listing_id;
  return { url: id ? `https://www.etsy.com/listing/${id}` : null, listing_id: id?.toString() };
}

export async function publishToAmazon(listing, accessToken, row) {
  const payload = toAmazon(listing);
  const sku = listing.sku || listing.asin || 'sku-' + Date.now();
  const marketplaceId = 'A1F83G8C2ARO7P';
  await axios.put(
    `https://sellingpartnerapi-eu.amazon.com/listings/2021-08-01/items/${process.env.AMAZON_SELLER_ID || 'default'}/${encodeURIComponent(sku)}?marketplaceIds=${marketplaceId}`,
    payload,
    { headers: { 'x-amz-access-token': accessToken, 'Content-Type': 'application/json' } }
  ).catch(() => {});
  return { url: null, listing_id: sku };
}
