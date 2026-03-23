/**
 * Clerk UI theme aligned with SyncLyst landing / globals.css.
 * Keep `variables` to known scalar keys only — nested `fontWeight` / invalid
 * color keys can crash Clerk’s theme merge and cause a 500 on auth routes.
 */
export const synclystClerkAppearance = {
  layout: {
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#18181b",
    colorDanger: "#b91c1c",
    colorSuccess: "#15803d",
    colorWarning: "#a16207",
    colorNeutral: "#e4e4e7",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#18181b",
    colorText: "#18181b",
    colorTextSecondary: "#71717a",
    borderRadius: "0.75rem",
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: "0.875rem",
  },
  elements: {
    card: "shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-zinc-200",
    headerTitle: "text-xl font-semibold tracking-tight text-zinc-900",
    headerSubtitle: "text-zinc-500 text-sm",
    socialButtonsBlockButton: "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800",
    formButtonPrimary: "bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold",
    formFieldInput:
      "border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400",
    formFieldLabel: "text-zinc-700 text-sm font-medium",
    footerActionLink: "text-zinc-900 font-medium",
    dividerLine: "bg-zinc-200",
    dividerText: "text-zinc-400 text-xs",
  },
};
