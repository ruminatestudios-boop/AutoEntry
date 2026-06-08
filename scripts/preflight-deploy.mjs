#!/usr/bin/env node
/**
 * Block accidental full-site deploys when locked marketing / SyncIQ / developer files changed.
 * Usage: node scripts/preflight-deploy.mjs [frontend|shopify-api|all]
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FRONTEND = path.join(ROOT, "auralink-ai/frontend");

const LOCKED_PREFIXES = [
  "auralink-ai/frontend/public/landing.html",
  "auralink-ai/frontend/public/landing-old.html",
  "auralink-ai/frontend/public/home.html",
  "auralink-ai/frontend/public/snap.html",
  "auralink-ai/frontend/public/reseller-",
  "auralink-ai/frontend/public/js/synclyst-home-reseller-intel.js",
  "auralink-ai/frontend/public/js/synclyst-quota-modal.js",
  "auralink-ai/frontend/app/developers/",
  "auralink-ai/frontend/lib/developer-plans.ts",
  "auralink-ai/frontend/lib/synclyst-clerk-appearance.ts",
  "auralink-ai/frontend/lib/clerk-server-token.ts",
  "auralink-ai/frontend/scripts/sync-root-index-from-landing.js",
];

const SHOPIFY_SAFE_PREFIXES = [
  "auralink-ai/frontend/public/flow-2.html",
  "auralink-ai/frontend/public/flow-3.html",
  "auralink-ai/frontend/public/flow-",
  "auralink-ai/frontend/public/stores-connect-shopify.html",
  "auralink-ai/frontend/app/billing/",
  "auralink-ai/frontend/app/shopify/",
  "auralink-ai/frontend/app/api/billing/",
  "auralink-ai/frontend/app/api/shopify/",
  "auralink-ai/frontend/app/api/publishing/",
  "auralink-ai/publishing/",
  "auralink-ai/frontend/middleware.ts",
  "auralink-ai/frontend/next.config.mjs",
];

const mode = (process.argv[2] || "frontend").toLowerCase();

function gitLines(args) {
  try {
    return execSync(`git ${args}`, { cwd: ROOT, encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function matchesPrefix(file, prefix) {
  if (prefix.endsWith("/")) return file.startsWith(prefix);
  if (prefix.endsWith("-")) return file.startsWith(prefix);
  return file === prefix || file.startsWith(prefix + "/");
}

const changed = [
  ...gitLines("diff --name-only HEAD"),
  ...gitLines("diff --name-only --cached"),
  ...gitLines("ls-files --others --exclude-standard"),
];

const uniqueChanged = [...new Set(changed)];

const lockedTouched = uniqueChanged.filter((f) =>
  LOCKED_PREFIXES.some((p) => matchesPrefix(f, p))
);

const shopifyTouched = uniqueChanged.filter((f) =>
  SHOPIFY_SAFE_PREFIXES.some((p) => matchesPrefix(f, p))
);

console.log(`[preflight] mode=${mode} changed_files=${uniqueChanged.length}`);

if (mode === "shopify-api") {
  const nonPublishing = uniqueChanged.filter(
    (f) => !f.startsWith("auralink-ai/publishing/")
  );
  if (nonPublishing.length > 0) {
    console.warn(
      "[preflight] warn: you have uncommitted non-publishing changes (frontend deploy not run):"
    );
    nonPublishing.slice(0, 15).forEach((f) => console.warn(`  - ${f}`));
  }
  console.log("[preflight] OK — safe to deploy publishing API only.");
  process.exit(0);
}

if (mode === "frontend" || mode === "all") {
  if (lockedTouched.length > 0) {
    console.error("[preflight] BLOCKED — locked files changed:");
    lockedTouched.forEach((f) => console.error(`  ✗ ${f}`));
    console.error(
      "\nRestore locked files before vercel --prod:\n  git restore <file>\n"
    );
    process.exit(1);
  }
  if (shopifyTouched.length === 0 && uniqueChanged.length > 0) {
    console.warn("[preflight] warn: no shopify-safe paths in changeset — review before deploy.");
  }
  console.log("[preflight] OK — no locked marketing/SyncIQ/developer files changed.");
}

if (mode === "all") {
  console.log("[preflight] Proceed: publishing API then frontend.");
}

process.exit(0);
