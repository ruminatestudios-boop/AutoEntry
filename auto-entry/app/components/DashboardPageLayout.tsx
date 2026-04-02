import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  /**
   * `home` — dashboard only: tight main, no page hero (content supplies the unified panel).
   * `page` — all other screens: light gray canvas + hero strip + body (default).
   */
  variant?: "home" | "page";
  /** Match home dashboard hero: mint gradient band at top of the page title card */
  heroAccent?: "none" | "dashboard";
  /** Main page name shown in the hero (falls back to `title`) */
  headerTitle?: string;
  /** Optional second line under the subtitle */
  subtitleDetail?: string;
  headerRight?: ReactNode;
  children: ReactNode;
};

export function DashboardPageLayout({
  title,
  subtitle,
  variant = "page",
  heroAccent = "none",
  headerTitle,
  subtitleDetail,
  headerRight,
  children,
}: Props) {
  const pageLabel = headerTitle ?? title;

  if (variant === "home") {
    return (
      <Page>
        <div className="dashboard-home dashboard-marketing">
          <TitleBar title={title} />
          <main className="marketing-main marketing-main--tight">{children}</main>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="dashboard-home dashboard-marketing">
        <TitleBar title={title} />
        <main className="marketing-main marketing-main--page">
          <div className="app-page-stack">
            <header
              className={
                heroAccent === "dashboard"
                  ? "app-page-hero-card app-page-hero-card--dashboard"
                  : "app-page-hero-card"
              }
            >
              {heroAccent === "dashboard" ? (
                <div className="app-page-hero-card__dashboard-top">
                  <div className="app-page-hero-card__row">
                    <div className="app-page-hero-card__copy">
                      <p className="app-page-hero-card__eyebrow">Auto Entry · {pageLabel}</p>
                      <h1 className="app-page-hero-card__title">{pageLabel}</h1>
                      <p className="app-page-hero-card__subtitle">{subtitle}</p>
                      {subtitleDetail != null ? (
                        <p className="app-page-hero-card__detail">{subtitleDetail}</p>
                      ) : null}
                    </div>
                    {headerRight != null ? (
                      <div className="app-page-hero-card__actions">{headerRight}</div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="app-page-hero-card__row">
                  <div className="app-page-hero-card__copy">
                    <p className="app-page-hero-card__eyebrow">Auto Entry · {pageLabel}</p>
                    <h1 className="app-page-hero-card__title">{pageLabel}</h1>
                    <p className="app-page-hero-card__subtitle">{subtitle}</p>
                    {subtitleDetail != null ? (
                      <p className="app-page-hero-card__detail">{subtitleDetail}</p>
                    ) : null}
                  </div>
                  {headerRight != null ? (
                    <div className="app-page-hero-card__actions">{headerRight}</div>
                  ) : null}
                </div>
              )}
            </header>
            <div className="app-page-body">{children}</div>
          </div>
        </main>
      </div>
    </Page>
  );
}
