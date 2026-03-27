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
    rootBox: "w-full max-w-md",
    cardBox: "shadow-none border-0 bg-transparent",
    card: "shadow-none border border-[#e5e5e5] rounded-2xl bg-white",
    headerTitle: "text-xl font-bold tracking-tight text-[#0a0a0a]",
    headerSubtitle: "text-sm text-[#525252]",
    socialButtonsBlockButton:
      "border border-[#0a0a0a] bg-white hover:bg-zinc-50 text-[#0a0a0a] rounded-xl shadow-none font-medium",
    socialButtonsBlockButtonText: "text-[#0a0a0a] font-medium",
    formButtonPrimary:
      "bg-[#0a0a0a] hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl border border-[#0a0a0a] shadow-none",
    formFieldInput:
      "border border-[#e5e5e5] rounded-xl text-[#0a0a0a] placeholder:text-zinc-400 shadow-none",
    formFieldLabel: "text-[#525252] text-sm font-medium",
    footerActionLink: "text-[#0a0a0a] font-medium",
    dividerLine: "bg-[#e5e5e5]",
    dividerText: "text-[#71717a] text-xs",
    footer: "shadow-none border-t border-[#e5e5e5]",
  },
};
