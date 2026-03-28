"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function ProductsPage() {
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [list, setList] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const highlightRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setHighlightId(params.get("highlight"));
    }
  }, []);

  useEffect(() => {
    apiFetch("/api/v1/products", {})
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!highlightId || !list.length) return;
    highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, list]);

  if (loading) return <p style={{ padding: "2rem" }}>Loading products…</p>;
  if (error) return <p style={{ padding: "2rem", color: "#f87171" }}>Error: {error}</p>;
  if (!Array.isArray(list) || list.length === 0) {
    return (
      <div style={{ padding: "2rem" }}>
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>No products yet. Create one from the Upload flow.</p>
        <Link href="/dashboard/upload" style={{ color: "var(--accent)" }}>Upload photo → Draft</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2>Master Products</h2>
        <Link href="/dashboard" style={{ color: "var(--muted)", fontSize: "0.875rem" }}>← Dashboard</Link>
      </div>
      {highlightId && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.875rem",
          }}
        >
          Draft saved. Push to marketplaces below to send as draft, then review on each platform and go live.
        </div>
      )}
      <ul style={{ listStyle: "none" }}>
        {(list as Record<string, unknown>[]).map((p, i) => {
          const id = String(p.id ?? i);
          const isHighlight = highlightId !== null && id === highlightId;
          return (
          <li
            key={id}
            ref={isHighlight ? highlightRef : undefined}
            style={{
              padding: "1rem",
              marginBottom: "0.5rem",
              background: "var(--surface)",
              borderRadius: "8px",
              border: isHighlight ? "2px solid var(--accent)" : "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div>
              <strong>{String(p.copy_seo_title ?? p.id ?? "—")}</strong>
              {p.attributes_brand != null && p.attributes_brand !== "" && (
                <span style={{ color: "var(--muted)", marginLeft: "0.5rem" }}> · {String(p.attributes_brand)}</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <Link
                href={`/dashboard?push_product=${id}`}
                style={{
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.875rem",
                  background: "var(--accent)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Push to marketplaces
              </Link>
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
