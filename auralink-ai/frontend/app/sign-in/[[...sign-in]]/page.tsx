import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "#f8fafc" }}>
      <SignIn />
    </div>
  );
}
