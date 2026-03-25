/**
 * App Router not-found page. Must be a Server Component so Next.js generates .next/server/app/_not-found/page.js
 */
export default function NotFound() {
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
        background: "#f8fafc",
        color: "#18181b",
      }}
    >
      <h1 style={{ fontSize: "6rem", fontWeight: 700, margin: 0 }}>404</h1>
      <p style={{ fontSize: "1.25rem", color: "#71717a", marginTop: "0.5rem" }}>
        This page could not be found.
      </p>
      <a
        href="/landing.html"
        style={{
          display: "inline-block",
          marginTop: "1.5rem",
          padding: "0.5rem 1rem",
          background: "#18181b",
          color: "#fff",
          borderRadius: "8px",
          fontWeight: 600,
        }}
      >
        ← Back to SyncLyst AI
      </a>
    </div>
  );
}
