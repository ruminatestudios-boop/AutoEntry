#!/usr/bin/env node
/**
 * Start Next dev with TLS (self-signed) and open https://localhost:3000.
 * Use for camera on LAN devices and stricter browser contexts; set publishing FRONTEND_URL=https://localhost:3000
 */
const { spawn } = require("child_process");
const path = require("path");
const https = require("https");

const DEV_HTTPS_URL = "https://127.0.0.1:3000";
const MAX_WAIT_MS = 25000;
const POLL_INTERVAL_MS = 500;

function runInjectApiUrl() {
  const { execSync } = require("child_process");
  execSync("node scripts/inject-api-url.js", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function poll() {
      if (Date.now() - start > MAX_WAIT_MS) {
        reject(new Error("HTTPS dev server did not become ready in time"));
        return;
      }
      const req = https.get(
        DEV_HTTPS_URL,
        { rejectUnauthorized: false, timeout: 3000 },
        (res) => {
          req.destroy();
          if (res.statusCode && res.statusCode > 0) {
            resolve();
            return;
          }
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      );
      req.on("error", () => setTimeout(poll, POLL_INTERVAL_MS));
    }
    poll();
  });
}

async function openBrowser() {
  const { default: open } = await import("open");
  return open("https://localhost:3000");
}

runInjectApiUrl();

const nextDevEnv = {
  ...process.env,
  ...(process.env.WATCHPACK_POLLING === undefined ? { WATCHPACK_POLLING: "true" } : {}),
  ...(process.env.CHOKIDAR_USEPOLLING === undefined ? { CHOKIDAR_USEPOLLING: "1" } : {}),
};

const child = spawn(
  "npx",
  ["next", "dev", "--hostname", "0.0.0.0", "--experimental-https"],
  {
    stdio: "inherit",
    shell: true,
    cwd: path.join(__dirname, ".."),
    env: nextDevEnv,
  }
);

(async () => {
  try {
    await waitForServer();
    await openBrowser();
    console.log("[dev-open-https] Opened https://localhost:3000 (trust the self-signed cert in your browser if prompted)");
  } catch (e) {
    console.warn("[dev-open-https]", e.message || e);
  }
})();

child.on("exit", (code) => process.exit(code != null ? code : 0));
