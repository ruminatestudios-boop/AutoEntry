import axios from 'axios';
import crypto from 'crypto';
import dns from 'dns';
import { getSupabase } from '../db/client.js';
import { upsertToken } from '../db/tokens.js';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:8001';
const SHOPIFY_REDIRECT_URI = (process.env.SHOPIFY_REDIRECT_URI || '').trim();

function normalizeHostOrEmpty(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  let s = raw.split('#')[0].split('?')[0].trim();
  s = s.replace(/^https?:\/\//i, '');
  if (s.includes('/')) s = s.split('/')[0];
  s = s.replace(/\.+$/, '').toLowerCase();
  s = s.replace(/^www\./, '');
  // Basic host safety: letters/numbers/dash/dot only
  if (!/^[a-z0-9.-]+$/.test(s)) return '';
  if (!s || s.length > 253) return '';
  return s;
}

function normalizeMyshopifyDomainOrEmpty(input) {
  const host = normalizeHostOrEmpty(input);
  if (!host) return '';
  if (host === 'admin' || host === 'admin.myshopify.com') return '';
  if (host.endsWith('.myshopify.com')) return host;
  // Accept handle only (shop name) and convert to myshopify
  if (!host.includes('.') && /^[a-z0-9][a-z0-9-]{0,60}[a-z0-9]?$/.test(host)) {
    return `${host}.myshopify.com`;
  }
  return '';
}

function isSpecificMyshopifyDomain(domain) {
  const d = String(domain || '').toLowerCase().replace(/\.+$/, '');
  if (!d.endsWith('.myshopify.com')) return false;
  // Generic Shopify infrastructure hosts are not shop domains.
  if (d === 'shops.myshopify.com' || d === 'myshopify.com' || d === 'admin.myshopify.com') return false;
  const label = d.replace(/\.myshopify\.com$/i, '');
  if (!label || label === 'shops' || label === 'admin') return false;
  return true;
}

async function resolveCnameChainToMyshopify(host, debug) {
  const resolver = dns.promises;
  const seen = new Set();
  let cur = host;
  for (let i = 0; i < 6; i++) {
    if (!cur || seen.has(cur)) return debug ? { value: null, error: 'cname_loop_or_empty' } : null;
    seen.add(cur);
    let cnames = [];
    try {
      cnames = await resolver.resolveCname(cur);
    } catch (_) {
      return debug ? { value: null, error: `resolveCname_failed:${cur}` } : null;
    }
    if (!Array.isArray(cnames) || cnames.length === 0) return debug ? { value: null, error: `no_cname:${cur}` } : null;
    // Prefer direct myshopify target if present
    const direct = cnames.find((c) => String(c || '').toLowerCase().endsWith('.myshopify.com'));
    if (direct) {
      const v = String(direct).toLowerCase().replace(/\.+$/, '');
      return debug ? { value: v, error: null } : v;
    }
    cur = String(cnames[0]).toLowerCase().replace(/\.+$/, '');
  }
  return debug ? { value: null, error: 'cname_depth_exceeded' } : null;
}

async function sniffMyshopifyFromHtml(host, debug) {
  const urls = [`https://${host}/`, `https://www.${host}/`].filter((u, idx, arr) => arr.indexOf(u) === idx);
  for (const url of urls) {
    try {
      const res = await axios.get(url, {
        timeout: 6500,
        maxRedirects: 5,
        responseType: 'text',
        maxContentLength: 1024 * 1024,
        validateStatus: (s) => s >= 200 && s < 400,
        headers: {
          'User-Agent': 'SyncLyst/1.0 (Shopify domain resolver)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      const html = typeof res.data === 'string' ? res.data : String(res.data || '');
      const m = html.match(/([a-z0-9][a-z0-9-]*\.myshopify\.com)/i);
      if (m && m[1]) {
        const v = String(m[1]).toLowerCase();
        return debug ? { value: v, error: null } : v;
      }
    } catch (e) {
      if (debug) return { value: null, error: `html_fetch_failed:${url}:${e?.message || 'error'}` };
    }
  }
  return debug ? { value: null, error: 'no_myshopify_in_html' } : null;
}

async function resolveFromMetaJson(host, debug) {
  const urls = [`https://${host}/meta.json`, `https://www.${host}/meta.json`].filter((u, idx, arr) => arr.indexOf(u) === idx);
  for (const url of urls) {
    try {
      const res = await axios.get(url, {
        timeout: 6500,
        maxRedirects: 5,
        responseType: 'json',
        validateStatus: (s) => s >= 200 && s < 400,
        headers: {
          'User-Agent': 'SyncLyst/1.0 (Shopify domain resolver)',
          Accept: 'application/json,text/plain;q=0.8,*/*;q=0.5',
        },
      });
      const myshopify = String(res?.data?.myshopify_domain || '').toLowerCase().trim();
      if (myshopify && myshopify.endsWith('.myshopify.com')) {
        return debug ? { value: myshopify, error: null } : myshopify;
      }
      if (debug) return { value: null, error: `meta_json_missing_myshopify_domain:${url}` };
    } catch (e) {
      if (debug) return { value: null, error: `meta_json_fetch_failed:${url}:${e?.message || 'error'}` };
    }
  }
  return debug ? { value: null, error: 'meta_json_unavailable' } : null;
}

/**
 * Resolve a user-facing storefront domain (custom domain) into the canonical
 * `{handle}.myshopify.com` domain used for OAuth.
 *
 * Best-effort strategy:
 * 1) Accept myshopify domain or handle directly
 * 2) Try DNS CNAME chain (common for custom domains)
 * 3) Query Shopify storefront meta.json (myshopify_domain)
 * 4) Fetch storefront HTML and regex-scan for `*.myshopify.com`
 */
export async function resolveShopifyShopDomain(input, opts) {
  const debug = !!opts?.debug;
  const trace = debug ? {} : null;
  // Accept full Shopify admin URL too
  const raw = String(input || '').trim();
  const lower = raw.toLowerCase();
  if (lower.includes('admin.shopify.com/store/')) {
    const cleaned = lower.replace(/^https?:\/\//, '');
    const parts = cleaned.split('/store/');
    const tail = parts[1] || '';
    const handle = tail.split('/')[0].trim();
    const direct = normalizeMyshopifyDomainOrEmpty(handle);
    if (direct) return { shop_domain: direct, strategy: 'admin_url', ...(debug ? { trace: { strategy: 'admin_url' } } : {}) };
  }

  const direct = normalizeMyshopifyDomainOrEmpty(input);
  if (direct) return { shop_domain: direct, strategy: 'direct', ...(debug ? { trace: { strategy: 'direct' } } : {}) };

  const host = normalizeHostOrEmpty(input);
  if (debug) trace.host = host;
  if (!host) return debug ? { error: 'invalid_host', trace } : null;

  // DNS CNAME (try root then www)
  let byDns = null;
  let dnsErr = null;
  const dns1 = await resolveCnameChainToMyshopify(host, debug);
  if (debug) {
    byDns = dns1?.value || null;
    dnsErr = dns1?.error || null;
  } else {
    byDns = dns1;
  }
  if (!byDns && !host.startsWith('www.')) {
    const dns2 = await resolveCnameChainToMyshopify(`www.${host}`, debug);
    if (debug) {
      byDns = byDns || dns2?.value || null;
      dnsErr = dnsErr || dns2?.error || null;
    } else {
      byDns = byDns || dns2;
    }
  }
  if (debug) {
    trace.dns = { value: byDns, error: dnsErr };
  }
  if (isSpecificMyshopifyDomain(byDns)) {
    return { shop_domain: byDns, strategy: 'dns_cname', trace };
  }

  // Shopify storefront metadata
  const meta = await resolveFromMetaJson(host, debug);
  const byMeta = debug ? meta?.value : meta;
  if (debug) trace.meta_json = { value: byMeta || null, error: meta?.error || null };
  if (isSpecificMyshopifyDomain(byMeta)) {
    return { shop_domain: byMeta, strategy: 'meta_json', trace };
  }

  // HTML sniff
  const html = await sniffMyshopifyFromHtml(host, debug);
  const byHtml = debug ? html?.value : html;
  if (debug) trace.html = { value: byHtml || null, error: html?.error || null };
  if (isSpecificMyshopifyDomain(byHtml)) {
    return { shop_domain: byHtml, strategy: 'html_sniff', trace };
  }

  return debug ? { error: 'not_found', trace } : null;
}

function base64urlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecodeToString(input) {
  if (!input) return '';
  const s = String(input).replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s + pad, 'base64').toString('utf8');
}

function hmacSha256Hex(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function safeEqualHex(a, b) {
  try {
    const ab = Buffer.from(String(a || ''), 'hex');
    const bb = Buffer.from(String(b || ''), 'hex');
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/**
 * Shopify callback HMAC verification:
 * - Sort query params by key
 * - Exclude hmac and signature
 * - Join as k=v pairs with '&'
 * - Compare to received hmac (hex)
 */
export function verifyShopifyCallbackHmac(query, secret) {
  const received = String(query?.hmac || '');
  if (!received) return false;
  const pairs = [];
  Object.keys(query || {})
    .filter((k) => k !== 'hmac' && k !== 'signature' && query[k] !== undefined && query[k] !== null)
    .sort()
    .forEach((k) => {
      pairs.push(`${k}=${Array.isArray(query[k]) ? query[k].join(',') : String(query[k])}`);
    });
  const msg = pairs.join('&');
  const computed = hmacSha256Hex(secret, msg);
  return safeEqualHex(computed, received);
}

/** Signed state so userId/returnTo can't be tampered with. */
export function signShopifyState(payload) {
  if (!SHOPIFY_API_SECRET) throw new Error('Shopify app not configured');
  const body = base64urlEncode(JSON.stringify(payload || {}));
  const sig = hmacSha256Hex(SHOPIFY_API_SECRET, body);
  return `${body}.${sig}`;
}

export function parseShopifyState(stateStr) {
  if (!SHOPIFY_API_SECRET) throw new Error('Shopify app not configured');
  const raw = String(stateStr || '');
  const parts = raw.split('.');
  if (parts.length === 2 && parts[0] && parts[1]) {
    const [body, sig] = parts;
    const expected = hmacSha256Hex(SHOPIFY_API_SECRET, body);
    if (!safeEqualHex(expected, sig)) throw new Error('Invalid state');
    const decoded = base64urlDecodeToString(body);
    return JSON.parse(decoded || '{}');
  }
  // Backwards-compat: old plain JSON
  if (raw.trim().startsWith('{')) return JSON.parse(raw);
  // Or legacy: user id string
  return { userId: raw };
}

function getRedirectUri() {
  if (SHOPIFY_REDIRECT_URI) return SHOPIFY_REDIRECT_URI;
  return `${APP_URL}/auth/shopify/callback`;
}

/** Build Shopify OAuth authorize URL. Accepts (shop, stateStr) or legacy (stateJsonString). */
export function getShopifyAuthUrl(shopOrState, stateStr) {
  const scopes = 'write_products,read_products,write_inventory';
  let shop = '';
  let stateStrOut = stateStr;
  if (typeof shopOrState === 'string' && shopOrState.trim() !== '') {
    const trimmed = shopOrState.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed.shop === 'string' && parsed.shop.trim()) {
          shop = parsed.shop.trim().toLowerCase();
          stateStrOut = stateStrOut || trimmed;
        }
      } catch (_) {}
    }
    if (!shop) shop = trimmed.toLowerCase();
  }
  if (!shop) return null;
  const shopNorm = shop.replace(/\.myshopify\.com$/i, '') + '.myshopify.com';
  if (!/\.myshopify\.com$/i.test(shopNorm) || shopNorm.length < 10) return null;
  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) return null;
  return `https://${shopNorm}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${encodeURIComponent(getRedirectUri())}&state=${encodeURIComponent(stateStrOut || '{}')}`;
}

export async function handleShopifyCallback(query) {
  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) throw new Error('Shopify app not configured');
  if (!verifyShopifyCallbackHmac(query, SHOPIFY_API_SECRET)) throw new Error('Invalid Shopify HMAC');

  const code = query?.code;
  const shop = query?.shop || '';
  const stateStr = query?.state;

  let userId = null;
  let returnTo = null;
  try {
    const state = parseShopifyState(stateStr);
    userId = state?.userId || state?.sub || state;
    returnTo = state?.returnTo || state?.return_to;
  } catch (_) {
    userId = stateStr;
  }
  // When user installs via Partner Dashboard "Generate link" (Custom app), state may be missing.
  // Default to dev-local so the token is stored for the same user flow-3 / dev-token uses.
  if (!userId) {
    userId = process.env.SHOPIFY_FALLBACK_USER_ID || 'dev-local';
  }
  const cleanShop = shop.replace(/\.myshopify\.com$/, '') + '.myshopify.com';
  const { data } = await axios.post(
    `https://${cleanShop}/admin/oauth/access_token`,
    {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    },
    { headers: { 'Content-Type': 'application/json' } }
  );
  await upsertToken({
    user_id: userId,
    platform: 'shopify',
    access_token: data.access_token,
    refresh_token: null,
    expires_at: null,
    shop_domain: cleanShop,
    shop_id: cleanShop,
    status: 'connected',
  });
  return { shop_domain: cleanShop, returnTo };
}

export async function refreshShopify() {
  return Promise.resolve(null);
}
