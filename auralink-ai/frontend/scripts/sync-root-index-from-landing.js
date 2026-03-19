#!/usr/bin/env node
/**
 * Copy public/landing.html → repo root index.html
 *
 * Why: synclyst.app may be deployed from the Git repo root (static hosting).
 * The canonical landing is auralink-ai/frontend/public/landing.html.
 * Run after changing landing.html before push, or wire into CI.
 */
const fs = require("fs");
const path = require("path");

const landing = path.join(__dirname, "../public/landing.html");
const rootIndex = path.join(__dirname, "../../../index.html");

if (!fs.existsSync(landing)) {
  console.error("[sync-root-index] Missing", landing);
  process.exit(1);
}
fs.copyFileSync(landing, rootIndex);
console.log("[sync-root-index] Wrote", rootIndex);
