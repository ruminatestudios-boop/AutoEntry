import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import type { ReactNode } from "react";

const PRIMARY_TEAL = "#1a514d";

type Props = {
  title: string;
  subtitle: string;
  /** Optional main banner heading (defaults to "Auto Entry") */
  headerTitle?: string;
  /** Optional second line under the subtitle (e.g. for Support page tagline) */
  subtitleDetail?: string;
  headerRight?: ReactNode;
  children: ReactNode;
};

export function DashboardPageLayout({ title, subtitle, headerTitle = "Auto Entry", subtitleDetail, headerRight, children }: Props) {
  return (
    <Page>
      <div className="dashboard-home">
        <TitleBar title={title} />
        <div
          className="dashboard-header"
          style={{
            background: PRIMARY_TEAL,
            color: "white",
            padding: "20px 24px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em" }}>
              {headerTitle}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: "14px", opacity: 0.92 }}>{subtitle}</p>
            {subtitleDetail != null && (
              <p style={{ margin: "4px 0 0", fontSize: "14px", opacity: 0.85 }}>{subtitleDetail}</p>
            )}
          </div>
          {headerRight != null ? headerRight : null}
        </div>
        {children}
      </div>
    </Page>
  );
}
