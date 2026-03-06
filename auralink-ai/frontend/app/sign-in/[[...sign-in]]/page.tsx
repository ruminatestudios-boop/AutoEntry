import { redirect } from "next/navigation";

// Clerk paused for testing — redirect to dashboard so you can test the flow without login.
export default function SignInPage() {
  redirect("/dashboard");
}
