#!/usr/bin/env node
/**
 * Replaces the placeholder Cloud Run host in shopify TOMLs and related docs.
 *
 * Usage (after you have the URL from Cloud Run console or:
 *   gcloud run services describe SERVICE --region REGION --format='value(status.url)'
 * ):
 *
 *   node scripts/set-cloud-run-host.cjs https://auto-entry-abc123-uc.a.run.app
 *   node scripts/set-cloud-run-host.cjs auto-entry-abc123-uc.a.run.app
 *
 * Optional second arg = hostname to replace (default: placeholder below). Use when changing URL again.
 *
 * Then set SHOPIFY_APP_URL on Cloud Run and run: npm run deploy:partners
 */
const fs = require("fs");
const path = require("path");

const PLACEHOLDER_HOST = "auto-entry-pending-uc.a.run.app";

const files = [
  "shopify.app.auto-entry.toml",
  "shopify.app.toml",
  "shopify.app.auto-entryauto-entry-live.toml",
  "shopify.app.auto-entryauto-entry-2.toml",
  "shopify.app.auto-entryauto-entry-3.toml",
  "COMPLIANCE-WEBHOOKS.md",
  "DEPLOY-TO-PRODUCTION.md",
  "DEPLOY-CLOUD-RUN.md",
];

const raw = process.argv[2];
const oldHostArg = process.argv[3];

if (!raw) {
  console.error("Usage: node scripts/set-cloud-run-host.cjs <https://HOST | HOST> [old-host-to-replace]");
  console.error("Example: node scripts/set-cloud-run-host.cjs https://auto-entry-xxxxx-uc.a.run.app");
  process.exit(1);
}

let newHost = raw.trim().replace(/\/$/, "");
if (newHost.startsWith("https://")) {
  newHost = newHost.slice("https://".length);
}
if (newHost.includes("/")) {
  console.error("Pass only the hostname or origin, not a path. Got:", raw);
  process.exit(1);
}

const oldHost = (oldHostArg || PLACEHOLDER_HOST).trim();
if (oldHostArg && oldHostArg.startsWith("https://")) {
  console.error("old-host-to-replace must be a hostname only, not a URL");
  process.exit(1);
}
if (newHost === oldHost) {
  console.error("New host must differ from the host being replaced.");
  process.exit(1);
}

const root = path.resolve(__dirname, "..");
let changed = 0;
for (const rel of files) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    console.warn("Skip (missing):", rel);
    continue;
  }
  const before = fs.readFileSync(fp, "utf8");
  if (!before.includes(oldHost)) {
    console.warn("Skip (no match for old host):", rel);
    continue;
  }
  const after = before.split(oldHost).join(newHost);
  fs.writeFileSync(fp, after, "utf8");
  changed++;
  console.log("Updated:", rel);
}

console.log(`\nDone. ${changed} file(s) updated. Replaced "${oldHost}" → "${newHost}"`);
console.log("\nNext:");
console.log("  1. Cloud Run → set env SHOPIFY_APP_URL=https://" + newHost);
console.log("     gcloud run services update SERVICE --region REGION \\");
console.log("       --set-env-vars SHOPIFY_APP_URL=https://" + newHost);
console.log("  2. cd auto-entry && npm run deploy:partners");
