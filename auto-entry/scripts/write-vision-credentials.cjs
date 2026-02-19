#!/usr/bin/env node
/**
 * Writes Google Cloud Vision credentials from env secret to a file so
 * @google-cloud/vision can use GOOGLE_APPLICATION_CREDENTIALS in production.
 * No-op if GOOGLE_APPLICATION_CREDENTIALS_JSON is not set.
 * (.cjs so require() works when package.json has "type": "module")
 */
const fs = require("fs");
const path = "/tmp/vision-credentials.json";

const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
if (!raw || typeof raw !== "string") {
  process.exit(0);
}

let json = raw.trim();
if (json[0] !== "{") {
  try {
    json = Buffer.from(json, "base64").toString("utf8");
  } catch {
    // Not base64; use as-is (might be invalid)
  }
}

try {
  fs.writeFileSync(path, json, "utf8");
} catch (err) {
  console.error("Failed to write Vision credentials:", err.message);
  process.exit(1);
}

process.exit(0);
