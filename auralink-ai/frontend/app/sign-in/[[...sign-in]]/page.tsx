import { SignInForm } from "./sign-in-form";

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

export default async function SignInPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const redirect = safeRedirectPath(params.redirect_url);
  const signUpUrl = `/sign-up?redirect_url=${encodeURIComponent(redirect)}`;

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
      <SignInForm forceRedirectUrl={redirect} signUpUrl={signUpUrl} />
    </div>
  );
}
