/**
 * Per-platform required and optional fields from the universal listing.
 * Used to validate before publish and to avoid generic fallbacks in translators.
 * Aligned with each platform's dashboard/API requirements.
 */

import { getEnabledPlatforms } from './platforms.js';

/** @typedef {'shopify'|'tiktok'|'ebay'|'etsy'|'amazon'} Platform */

/**
 * Required universal fields per platform. All must be present and non-empty for publish.
 * Based on each platform's Add product / listing form.
 * TikTok: https://seller-us.tiktok.com/university/essay?knowledge_id=6581713858676522 (Basic info: images, name, category; Product details: description; Sales: price, quantity; Confirm details: condition).
 */
export const PLATFORM_REQUIRED_FIELDS = {
  shopify: ['title', 'description', 'price', 'photos'],
  etsy: ['title', 'description', 'price', 'photos', 'tags', 'category'],
  ebay: ['title', 'description', 'price', 'photos', 'condition'],
  amazon: ['title', 'description', 'price', 'photos', 'brand'],
  tiktok: ['title', 'description', 'price', 'photos', 'category', 'condition'],
};

/**
 * Optional universal fields per platform. Used if present; omitted when missing.
 */
export const PLATFORM_OPTIONAL_FIELDS = {
  shopify: ['brand', 'category', 'tags', 'weight_kg', 'dimensions', 'sku', 'condition', 'condition_notes', 'size', 'quantity', 'metafields', 'variants'],
  etsy: ['condition', 'brand', 'quantity'],
  ebay: ['brand', 'category', 'weight_kg', 'dimensions', 'condition_notes', 'size', 'colour', 'quantity'],
  amazon: ['category', 'condition', 'tags', 'upc', 'ean', 'quantity'],
  tiktok: ['brand', 'tags', 'sku', 'quantity', 'upc', 'ean'],
};

/** Universal listing field names (for reference / UI). */
export const UNIVERSAL_FIELDS = [
  'title', 'description', 'brand', 'category', 'condition', 'price',
  'tags', 'photos', 'weight_kg', 'dimensions', 'material', 'colour',
  'upc', 'ean', 'asin', 'sku', 'condition_notes', 'size', 'quantity',
  'metafields', 'variants',
];

/**
 * Check if a universal listing has all required fields for a given platform.
 * @param {object} listing - Universal listing (or listing.universal_data)
 * @param {Platform} platform
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateListingForPlatform(listing, platform) {
  const required = PLATFORM_REQUIRED_FIELDS[platform];
  if (!required || !Array.isArray(required)) {
    return { valid: true, missing: [] };
  }
  const u = listing?.universal_data || listing || {};
  const missing = [];
  for (const field of required) {
    const value = u[field];
    if (value == null) {
      missing.push(field);
      continue;
    }
    if (typeof value === 'string' && !value.trim()) {
      missing.push(field);
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      missing.push(field);
      continue;
    }
    if (typeof value === 'number' && (Number.isNaN(value) || value < 0)) {
      missing.push(field);
    }
  }
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get required and optional field lists for enabled platforms only (for API/UI).
 * @returns {Record<string, { required: string[], optional: string[] }>}
 */
export function getPlatformFieldsSummary() {
  const enabled = getEnabledPlatforms();
  const summary = {};
  for (const platform of enabled) {
    if (PLATFORM_REQUIRED_FIELDS[platform]) {
      summary[platform] = {
        required: PLATFORM_REQUIRED_FIELDS[platform] || [],
        optional: PLATFORM_OPTIONAL_FIELDS[platform] || [],
      };
    }
  }
  return summary;
}
