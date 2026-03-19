"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch, API_BASE } from "@/lib/api";

// Clerk paused for testing — no token passed; backend allows guest usage.
export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  const [stores, setStores] = useState<{ shop_domain: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/v1/shopify/stores", {})
      .then((r) => (r.ok ? r.json() : { stores: [] }))
      .then((d) => setStores(d.stores || []))
      .catch(() => setStores([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buf).reduce((acc, byte) => acc + String.fromCharCode(byte), "")
      );
      const res = await apiFetch("/api/v1/vision/extract", {
        method: "POST",
        body: JSON.stringify({
          image_base64: base64,
          mime_type: file.type || "image/jpeg",
          include_ocr: true,
        }),
      });
      if (res.status === 402) {
        setError("Scan limit reached. Upgrade to continue.");
        window.location.href = "/dashboard/upgrade";
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setSavedProductId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Photo → Draft Listing</h2>
        <Link href="/dashboard" style={{ fontSize: "0.875rem", color: "var(--muted)" }}>← Dashboard</Link>
      </div>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Upload a product image. Extraction runs in &lt;3s and returns attributes, copy, and tags.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ marginBottom: "1rem", color: "var(--text)" }}
        />
        <button
          type="submit"
          disabled={!file || loading}
          style={{
            padding: "0.5rem 1rem",
            background: "var(--accent)",
            color: "var(--bg)",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Extracting…" : "Extract"}
        </button>
      </form>
      {error && <p style={{ color: "#f87171", marginTop: "1rem" }}>{error}</p>}
      {result && (
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={async () => {
                try {
                  setError(null);
                  const res = await apiFetch("/api/v1/products/from-extraction", {
                    method: "POST",
                    body: JSON.stringify(result),
                  });
                  if (!res.ok) throw new Error(await res.text());
                  const { id } = await res.json();
                  setSavedProductId(id);
                  setError(null);
                  alert(`Draft saved! Product ID: ${id}`);
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
              }}
              style={{
                padding: "0.5rem 1rem",
                background: "var(--accent)",
                color: "var(--bg)",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Save as draft
            </button>
            {savedProductId && stores.length === 0 && (
              <span style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
                <Link href="/dashboard" style={{ color: "var(--accent)" }}>Connect Shopify</Link> to sync
              </span>
            )}
            {savedProductId && stores.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                try {
                  setError(null);
                  setSyncing(true);
                  const res = await apiFetch(`/api/v1/products/${savedProductId}/sync/shopify`, {
                    method: "POST",
                    body: JSON.stringify({ shop_domain: stores[0].shop_domain }),
                  });
                    if (!res.ok) throw new Error(await res.text());
                    const data = await res.json();
                    alert(`Sync queued! Task: ${data.task_id}`);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : String(err));
                  } finally {
                    setSyncing(false);
                  }
                }}
                disabled={syncing}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: syncing ? "not-allowed" : "pointer",
                }}
              >
                {syncing ? "Syncing…" : "Sync to Shopify (live)"}
              </button>
            )}
            {savedProductId && (
              <Link
                href={`/dashboard?push_product=${savedProductId}`}
                style={{
                  padding: "0.5rem 1rem",
                  background: "var(--accent)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Push to marketplaces →
              </Link>
            )}
            {result && stores.length > 0 && (
              <a
                href="/review"
                onClick={() => {
                  try {
                    window.sessionStorage.setItem("auralink_primary_channel", "shopify");
                    const ext = result as { extraction_copy?: unknown; attributes?: { price_value?: number } & Record<string, unknown>; tags?: unknown };
                    window.sessionStorage.setItem("auralink_draft_listing", JSON.stringify({
                      extraction: { copy: ext.extraction_copy, extraction_copy: ext.extraction_copy, attributes: ext.attributes, tags: ext.tags },
                      suggested_price: ext.attributes?.price_value,
                    }));
                  } catch (_) {}
                }}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid var(--accent)",
                  borderRadius: "6px",
                  fontWeight: 600,
                  textDecoration: "none",
                  color: "var(--accent)",
                }}
              >
                Confirm listing for Shopify →
              </a>
            )}
            <Link
              href="/dashboard/products"
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontWeight: 600,
                textDecoration: "none",
                color: "var(--text)",
              }}
            >
              View products
            </Link>
          </div>
          <pre style={{ padding: "1rem", background: "var(--surface)", borderRadius: "8px", overflow: "auto", fontSize: "0.875rem" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
