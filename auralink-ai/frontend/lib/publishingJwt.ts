import crypto from "crypto";

export function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** HS256 JWT — must match publishing `jsonwebtoken` verification (same secret). */
export function signPublishingJwt(
  payload: Record<string, unknown>,
  secret: string
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encHeader = base64url(JSON.stringify(header));
  const encPayload = base64url(JSON.stringify(payload));
  const data = `${encHeader}.${encPayload}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

export function getPublishingJwtSecret(): string {
  return (
    process.env.PUBLISHING_JWT_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    (process.env.NODE_ENV !== "production" ? "dev-secret-change-in-production" : "")
  );
}

/** Normalize to `{handle}.myshopify.com` for comparison. */
export function normalizeMyshopifyDomain(input: string): string {
  const raw = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/\.+$/, "");
  if (!raw) return "";
  const sub = raw.replace(/\.myshopify\.com$/i, "").replace(/[^a-z0-9-]/g, "");
  if (!sub || sub.length > 60) return "";
  return `${sub}.myshopify.com`;
}
