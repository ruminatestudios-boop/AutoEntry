import Link from "next/link";

/**
 * Simple home page so the app loads at /. No redirect — avoids app-router errors.
 */
export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui",
        background: "linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%)",
        color: "#18181b",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        AuraLink AI
      </h1>
      <p style={{ color: "#71717a", marginBottom: "2rem" }}>
        Product photo → listing → multi-channel sync
      </p>
      <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1.5rem", maxWidth: "28rem", textAlign: "center" }}>
        For local dev: start the backend on port 8000, then open Dashboard or use the static flows below.
      </p>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/dashboard"
          style={{
            padding: "0.75rem 1.5rem",
            background: "#18181b",
            color: "#fff",
            borderRadius: "8px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Open Dashboard
        </Link>
        <Link
          href="/review"
          style={{
            padding: "0.75rem 1.5rem",
            background: "#095739",
            color: "#fff",
            borderRadius: "8px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Shopify flow — Review & publish
        </Link>
        <a
          href="/landing.html"
          style={{
            padding: "0.75rem 1.5rem",
            border: "1px solid #e4e4e7",
            borderRadius: "8px",
            color: "#18181b",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Landing page
        </a>
      </div>
    </div>
  );
}
