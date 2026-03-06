#!/usr/bin/env node
/**
 * Injects NEXT_PUBLIC_API_URL into landing.html before dev/build.
 * Replaces __AURALINK_API_URL__ with env var or http://localhost:8000.
 */
const fs = require('fs');
const path = require('path');

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const landingPath = path.join(__dirname, '../public/landing.html');

let html = fs.readFileSync(landingPath, 'utf8');
html = html.replace(/__AURALINK_API_URL__/g, apiUrl);
fs.writeFileSync(landingPath, html);

console.log('[inject-api-url] API URL set to:', apiUrl);
