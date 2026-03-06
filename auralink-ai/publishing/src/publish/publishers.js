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

export async function publishToShopify(listing, accessToken, row) {
  const payload = toShopify(listing);
  const shop = row?.shop_domain;
  if (!shop) throw new Error('Missing shop_domain');
  const { metafields, product } = payload;
  const createBody = { product };
  const { data } = await axios.post(
    `https://${shop}/admin/api/2024-01/products.json`,
    createBody,
    { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } }
  );
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
