#!/usr/bin/env node
/**
 * Fly.io startup: run vision credentials, setup, then server.
 * Logs each step so fly logs shows where any failure happens.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const appDir = path.resolve(__dirname, "..");

const env = { ...process.env, HOST: "0.0.0.0", PORT: process.env.PORT || "3000" };

// So Fly logs show whether DB is configured (value is secret, so only presence)
console.log("[fly-start] DATABASE_URL:", process.env.DATABASE_URL ? "set" : "NOT SET (prisma will fail)");
console.log("[fly-start] PORT:", env.PORT);
if (process.stdout.write) process.stdout.write("");

function run(name, cmd) {
  console.log(`[fly-start] ${name}...`);
  const r = spawnSync(cmd, [], {
    cwd: appDir,
    stdio: "inherit",
    shell: true,
    env,
  });
  if (r.status !== 0) {
    console.error(`[fly-start] ${name} failed with code ${r.status}`);
    process.exit(r.status);
  }
}

run("Vision credentials", "node scripts/write-vision-credentials.cjs");
run("Setup (prisma generate + migrate)", "npm run setup");
console.log("[fly-start] Starting server...");
run("Server", "npx remix-serve ./build/server/index.js");
