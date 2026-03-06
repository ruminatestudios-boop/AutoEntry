/**
 * Pages Router fallback so Next.js always has an error page to load.
 * Prevents "missing required error components, refreshing..." in dev.
 */
function Error({ statusCode }) {
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
      <h1 style={{ fontSize: "3rem", fontWeight: 700, margin: 0 }}>
        {statusCode || "Error"}
      </h1>
      <p style={{ color: "#71717a", marginTop: "0.5rem" }}>
        {statusCode === 404
          ? "This page could not be found."
          : "Something went wrong."}
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

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
