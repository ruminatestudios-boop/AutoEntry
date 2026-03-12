#!/usr/bin/env node
/**
 * Start Next dev server and open http://localhost:3000 in the browser when ready.
 * Usage: npm run dev  (or node scripts/dev-open.js)
 */
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

const DEV_URL = "http://127.0.0.1:3000";
const MAX_WAIT_MS = 20000;
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
        reject(new Error("Server did not become ready in time"));
        return;
      }
      const req = http.get(DEV_URL, (res) => {
        if (res.statusCode > 0) {
          resolve();
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      });
      req.on("error", () => setTimeout(poll, POLL_INTERVAL_MS));
    }
    poll();
  });
}

function openBrowser() {
  return require("open")(DEV_URL);
}

runInjectApiUrl();

const child = spawn("npx", ["next", "dev", "--hostname", "0.0.0.0"], {
  stdio: "inherit",
  shell: true,
  cwd: path.join(__dirname, ".."),
  env: process.env,
});

(async () => {
  try {
    await waitForServer();
    await openBrowser();
    console.log("[dev-open] Opened", DEV_URL);
  } catch (e) {
    console.warn("[dev-open]", e.message || e);
  }
})();

child.on("exit", (code) => process.exit(code != null ? code : 0));
