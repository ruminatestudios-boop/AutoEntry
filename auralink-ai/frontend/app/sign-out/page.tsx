import { Suspense } from "react";
import SignOutClient from "./SignOutClient";

const fallback = (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f5f5f5",
      color: "#18181b",
      fontFamily:
        'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}
  >
    <p style={{ fontSize: "0.95rem", color: "#525252" }}>Signing you out...</p>
  </div>
);

export default function SignOutPage() {
  return (
    <Suspense fallback={fallback}>
      <SignOutClient />
    </Suspense>
  );
}
