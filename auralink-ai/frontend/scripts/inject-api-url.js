#!/usr/bin/env node
/**
 * Injects NEXT_PUBLIC_API_URL into static HTML screens before dev/build.
 *
 * Why: Avoid hardcoding localhost backend ports into checked-in HTML. One env var
 * controls the backend URL for all flow pages (scan → flow-2 → flow-3).
 *
 * Replaces __AURALINK_API_URL__ with env var or http://localhost:8000.
 */
const fs = require('fs');
const path = require('path');

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
/** When marketing HTML is on a different host than Next (e.g. static synclyst.app + app on *.vercel.app). No trailing slash. */
let appOrigin = (process.env.NEXT_PUBLIC_SYNCLYST_APP_ORIGIN || '').trim().replace(/\/$/, '');
// Never inject a literal placeholder (common Vercel mistake: pasting the token name instead of a real URL)
if (appOrigin && /SYNCLYST_APP_ORIGIN/.test(appOrigin)) appOrigin = '';
const publicDir = path.join(__dirname, '../public');
const targets = [
  'landing.html',
  'home.html',
  'flow-2.html',
].map((f) => path.join(publicDir, f));

targets.forEach((p) => {
  if (!fs.existsSync(p)) return;
  let html = fs.readFileSync(p, 'utf8');
  html = html.replace(/__AURALINK_API_URL__/g, apiUrl);
  html = html.replace(/__SYNCLYST_APP_ORIGIN__/g, appOrigin);
  fs.writeFileSync(p, html);
});

console.log('[inject-api-url] API URL set to:', apiUrl);
if (appOrigin) console.log('[inject-api-url] SYNCLYST app origin:', appOrigin);
