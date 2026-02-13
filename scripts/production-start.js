#!/usr/bin/env node
/**
 * Production startup: vision credentials, prisma setup, then server.
 * Used by Fly, Railway, Render, or any Docker/Node host.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const appDir = path.resolve(__dirname, "..");

const env = { ...process.env, HOST: "0.0.0.0", PORT: process.env.PORT || "3000" };

console.log("[start] DATABASE_URL:", process.env.DATABASE_URL ? "set" : "NOT SET (prisma will fail)");
console.log("[start] PORT:", env.PORT);

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

run("Vision credentials", "node scripts/write-vision-credentials.js");
run("Setup (prisma generate + migrate)", "npm run setup");
console.log("[start] Starting server...");
run("Server", "npx remix-serve ./build/server/index.js");
