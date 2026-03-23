import { SignUpForm } from "./sign-up-form";

function safeRedirectPath(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v !== "string" || !v.startsWith("/") || v.startsWith("//")) {
    return "/dashboard";
  }
  return v;
}

type PageProps = {
  searchParams: Promise<{ redirect_url?: string | string[] }>;
};

export default async function SignUpPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const redirect = safeRedirectPath(params.redirect_url);
  const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(redirect)}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "#f8fafc",
      }}
    >
      <SignUpForm forceRedirectUrl={redirect} signInUrl={signInUrl} />
    </div>
  );
}
