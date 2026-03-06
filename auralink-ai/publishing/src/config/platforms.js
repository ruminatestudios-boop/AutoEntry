/**
 * Central config for which platforms are enabled in this deployment.
 * Focus on Shopify first; add more later via ENABLED_PLATFORMS env.
 *
 * Set ENABLED_PLATFORMS=shopify (default) or shopify,tiktok,ebay,etsy,amazon
 */

const ALL_SUPPORTED = ['shopify', 'tiktok', 'ebay', 'etsy', 'amazon'];

function parseEnabledPlatforms() {
  const raw = process.env.ENABLED_PLATFORMS || 'shopify';
  if (!raw || raw.trim() === '') return ['shopify'];
  const list = raw
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => ALL_SUPPORTED.includes(p));
  return list.length > 0 ? list : ['shopify'];
}

let cached = null;

/**
 * @returns {string[]} List of enabled platform ids (e.g. ['shopify'])
 */
export function getEnabledPlatforms() {
  if (!cached) cached = parseEnabledPlatforms();
  return cached;
}

/**
 * @param {string} platform
 * @returns {boolean}
 */
export function isPlatformEnabled(platform) {
  return getEnabledPlatforms().includes(platform);
}

/**
 * For display / API: list of all supported platform ids (for reference).
 * Enabled subset is getEnabledPlatforms().
 */
export function getAllSupportedPlatforms() {
  return [...ALL_SUPPORTED];
}
