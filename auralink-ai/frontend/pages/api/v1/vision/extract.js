/**
 * Proxies POST /api/v1/vision/extract to the SyncLyst backend.
 * Pages API fallback so /api/v1/vision/extract always responds on localhost.
 */
const BACKEND =
  process.env.NEXT_PUBLIC_SYNCLYST_BACKEND_URL ||
  process.env.SYNCLYST_BACKEND_URL ||
  "https://auralink-api-299567386855.us-central1.run.app";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, message: "POST image_base64 to extract" });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Method not allowed" });
  }
  const url = `${BACKEND.replace(/\/$/, "")}/api/v1/vision/extract`;
  try {
    const headers = { "Content-Type": "application/json" };
    if (req.headers.authorization) headers["Authorization"] = req.headers.authorization;
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(req.body || {}),
    });
    const data = await r.json().catch(() => ({}));
    res.status(r.status).json(data);
  } catch (e) {
    console.error("[vision/extract proxy]", e);
    res.status(502).json({ detail: "Extraction service unavailable. Try again later." });
  }
}
