"use client";

import dynamic from "next/dynamic";
import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/nextjs";

const DashboardGuest = dynamic(() => import("./DashboardGuest"), {
  loading: () => (
    <div style={{ minHeight: "100vh", padding: "2rem", fontFamily: "system-ui", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#18181b" }}>
      <a href="/" style={{ marginBottom: "1rem", color: "#18181b" }}>← SyncLyst<sup style={{ fontSize: "0.5em", opacity: 0.8 }}>®</sup></a>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Dashboard</h1>
      <p style={{ color: "#71717a", marginTop: "0.5rem" }}>Loading…</p>
      <p style={{ marginTop: "1.5rem", fontSize: "0.875rem" }}>
        <a href="/dashboard" style={{ color: "#2563eb", fontWeight: 600 }}>Refresh</a>
        {" · "}
        <a href="/" style={{ color: "#2563eb", fontWeight: 600 }}>Home</a>
      </p>
    </div>
  ),
  ssr: false,
});

const DashboardClient = dynamic(() => import("./DashboardClient"), {
  loading: () => (
    <div style={{ minHeight: "100vh", padding: "2rem", fontFamily: "system-ui", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#18181b" }}>
      <a href="/" style={{ marginBottom: "1rem", color: "#18181b" }}>← SyncLyst<sup style={{ fontSize: "0.5em", opacity: 0.8 }}>®</sup></a>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Dashboard</h1>
      <p style={{ color: "#71717a", marginTop: "0.5rem" }}>Loading…</p>
    </div>
  ),
  ssr: false,
});

export default function DashboardPage() {
  return (
    <>
      <SignedIn>
        <DashboardClient />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/dashboard" />
      </SignedOut>
    </>
  );
}
