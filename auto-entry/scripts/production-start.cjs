#!/usr/bin/env node
/**
 * Production startup: vision credentials, prisma setup, then server.
 * Used by Fly, Railway, Render, or any Docker/Node host.
 * (.cjs so require() works when package.json has "type": "module")
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const appDir = path.resolve(__dirname, "..");

// Set DATABASE_URL if not provided: use Railway volume path, or fallback to /app/data (created below).
if (!process.env.DATABASE_URL) {
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    const mount = process.env.RAILWAY_VOLUME_MOUNT_PATH.replace(/\/$/, "");
    process.env.DATABASE_URL = `file:${mount}/sqlite.db`;
    console.log("[start] DATABASE_URL from RAILWAY_VOLUME_MOUNT_PATH:", process.env.DATABASE_URL);
  } else {
    const fallbackDir = "/app/data";
    try {
      fs.mkdirSync(fallbackDir, { recursive: true });
    } catch (e) {
      console.warn("[start] Could not create", fallbackDir, e.message);
    }
    process.env.DATABASE_URL = `file:${fallbackDir}/sqlite.db`;
    console.log("[start] DATABASE_URL fallback (no volume):", process.env.DATABASE_URL, "- data will not persist across redeploys; add a volume or set DATABASE_URL to persist.");
  }
}

// Use Railway/injected PORT at runtime; fallback for local Docker.
const port = process.env.PORT || "3000";
const env = { ...process.env, HOST: "0.0.0.0", PORT: port };

console.log("[start] DATABASE_URL:", process.env.DATABASE_URL ? "set" : "NOT SET (prisma will fail)");
console.log("[start] SHOPIFY_APP_URL:", process.env.SHOPIFY_APP_URL ? "set" : "NOT SET (Shopify app will crash - set to your public URL e.g. https://your-app.up.railway.app)");
console.log("[start] SHOPIFY_API_KEY:", process.env.SHOPIFY_API_KEY ? "set" : "NOT SET (Shopify will crash - add in Railway Variables)");
console.log("[start] SHOPIFY_API_SECRET:", process.env.SHOPIFY_API_SECRET ? "set" : "NOT SET (Shopify will crash - add in Railway Variables)");
console.log("[start] PORT:", port, "(listen on 0.0.0.0:" + port + ")");

function run(name, cmd) {
  console.log(`[start] ${name}...`);
  const r = spawnSync(cmd, [], {
    cwd: appDir,
    stdio: "inherit",
    shell: true,
    env,
  });
  if (r.status !== 0) {
    console.error(`[start] ${name} failed with code ${r.status}`);
    process.exit(r.status);
  }
}

run("Vision credentials", "node scripts/write-vision-credentials.cjs");
run("Setup (prisma generate + migrate)", "npm run setup");
console.log("[start] Starting server...");
run("Server", "npx remix-serve ./build/server/index.js");
