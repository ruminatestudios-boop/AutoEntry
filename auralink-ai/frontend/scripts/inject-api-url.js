#!/usr/bin/env node
/**
 * Injects local backend URL into static HTML before dev/build.
 *
 * Sets meta[name=auralink-api-url] and replaces __AURALINK_API_URL__ placeholders
 * so scan → reading-product → review hit localhost (via Next proxy or :8000).
 */
const fs = require('fs');
const path = require('path');

const CANONICAL_API_URL =
  'https://auralink-api-299567386855.us-central1.run.app';

function resolveApiUrl() {
  for (const raw of [process.env.NEXT_PUBLIC_API_URL, process.env.AURALINK_BACKEND_URL]) {
    const u = (raw || '').trim().replace(/\/$/, '');
    if (u && !/localhost|127\.0\.0\.1/i.test(u)) return u;
  }
  if (process.env.VERCEL === '1') return CANONICAL_API_URL;
  return 'http://localhost:8000';
}

const apiUrl = resolveApiUrl();

const CANONICAL_PUBLISHING_URL =
  'https://synclyst-publishing-299567386855.us-central1.run.app';
const STALE_PUBLISHING = /110592968788/i;
function resolvePublishingUrl() {
  const candidates = [
    process.env.PUBLISHING_APP_URL,
    process.env.PUBLISHING_PROXY_TARGET,
    process.env.NEXT_PUBLIC_PUBLISHING_API_URL,
  ];
  for (const raw of candidates) {
    const u = (raw || '').trim().replace(/\/$/, '');
    if (u && !STALE_PUBLISHING.test(u)) return u;
  }
  if (process.env.VERCEL === '1') return CANONICAL_PUBLISHING_URL;
  return 'http://localhost:8001';
}
const publishingUrl = resolvePublishingUrl();

const reviewCtaRaw = (process.env.NEXT_PUBLIC_SYNCLYST_REVIEW_CTA || '').trim().toLowerCase();
const reviewCta = reviewCtaRaw || (process.env.VERCEL === '1' ? 'publish' : 'copy');

/** When marketing HTML is on a different host than Next. No trailing slash. */
let appOrigin = (process.env.NEXT_PUBLIC_SYNCLYST_APP_ORIGIN || '').trim().replace(/\/$/, '');
if (appOrigin && /SYNCLYST_APP_ORIGIN/.test(appOrigin)) appOrigin = '';

const publicDir = path.join(__dirname, '../public');
const targets = [
  // landing.html — marketing + SyncIQ + Stripe checkout; do not patch on build
  'home.html',
  'flow-2.html',
  'flow-3.html',
  'flow-batch.html',
  'stores-connect-shopify.html',
  'flow-success.html',
  'flow-publishing.html',
].map((f) => path.join(publicDir, f));

function patchMeta(html, name, value) {
  const re = new RegExp(
    '(<meta\\s+name="' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s+content=")[^"]*(")',
    'gi'
  );
  if (re.test(html)) {
    return html.replace(re, `$1${value}$2`);
  }
  return html;
}

targets.forEach((p) => {
  if (!fs.existsSync(p)) return;
  let html = fs.readFileSync(p, 'utf8');
  html = html.replace(/__AURALINK_API_URL__/g, apiUrl);
  html = html.replace(/__SYNCLYST_APP_ORIGIN__/g, appOrigin);
  html = patchMeta(html, 'auralink-api-url', apiUrl);
  html = patchMeta(html, 'synclyst-backend-url', apiUrl);
  html = patchMeta(html, 'auralink-publishing-url', publishingUrl);
  html = patchMeta(html, 'synclyst-publishing-url', publishingUrl);
  html = patchMeta(html, 'synclyst-review-cta', reviewCta === 'publish' ? 'publish' : 'copy');
  fs.writeFileSync(p, html);
});

console.log('[inject-api-url] API URL:', apiUrl);
console.log('[inject-api-url] Publishing URL:', publishingUrl);
console.log('[inject-api-url] Review CTA:', reviewCta === 'publish' ? 'publish' : 'copy');
if (appOrigin) console.log('[inject-api-url] App origin:', appOrigin);
