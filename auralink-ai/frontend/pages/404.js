/**
 * Pages Router 404 fallback so Next.js always has a not-found page to load.
 * Prevents "missing required error components, refreshing..." in dev.
 */
export default function Custom404() {
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
        href="/"
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
        ← Back to AuraLink AI
      </a>
    </div>
  );
}
