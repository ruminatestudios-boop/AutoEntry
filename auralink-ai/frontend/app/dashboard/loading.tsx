export default function DashboardLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "system-ui",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #f8fafc)",
        color: "var(--text, #18181b)",
      }}
    >
      <a href="/landing.html" style={{ display: "inline-block", marginBottom: "1rem", color: "#18181b" }}>
        ← SyncLyst
      </a>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Dashboard</h1>
      <p style={{ color: "#71717a", marginTop: "0.5rem" }}>Loading…</p>
      <p style={{ marginTop: "1.5rem", fontSize: "0.875rem" }}>
        <a href="/dashboard" style={{ color: "#2563eb", fontWeight: 600 }}>Open dashboard</a>
        {" · "}
        <a href="/landing.html" style={{ color: "#2563eb", fontWeight: 600 }}>Home</a>
      </p>
    </div>
  );
}
