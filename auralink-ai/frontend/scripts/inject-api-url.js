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
  fs.writeFileSync(p, html);
});

console.log('[inject-api-url] API URL set to:', apiUrl);
