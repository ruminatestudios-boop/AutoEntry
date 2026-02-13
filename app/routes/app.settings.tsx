import {
  Card,
  Text,
  BlockStack,
  TextField,
  Badge,
  Link,
  Box,
  InlineGrid,
} from "@shopify/polaris";
import { DashboardPageLayout } from "../components/DashboardPageLayout";
import { useState, useEffect } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { authenticate } from "../shopify.server";
import { PLAN_LIMITS } from "../core/constants";
import db from "../db.server";

const accentGreen = "#6be575";
const darkTeal = "#004c46";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const shopSettings = await db.shopSettings.findUnique({
    where: { shop },
  });

  return json({
    shopSettings: shopSettings || {
      plan: "FREE",
      scanCount: 0,
      bonusScans: 0,
      notificationEmail: null,
    },
  });
};

export const action = async ({ request }: any) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const notificationEmail = formData.get("notificationEmail") as string;

  // Update the shopSettings with the notification email
  await db.shopSettings.upsert({
    where: { shop },
    update: { notificationEmail },
    create: {
      shop,
      plan: "FREE",
      notificationEmail,
      billingCycleStart: new Date(),
    },
  });

  return json({ success: true, message: "Settings saved successfully!" });
};

export default function SettingsPage() {
  const { shopSettings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ success: boolean; message: string }>();
  const [email, setEmail] = useState(shopSettings.notificationEmail || "");

  // Update email when shopSettings changes
  useEffect(() => {
    if (shopSettings.notificationEmail) {
      setEmail(shopSettings.notificationEmail);
    }
  }, [shopSettings.notificationEmail]);

  const planName = shopSettings.plan || "FREE";
  const scanLimit = PLAN_LIMITS[planName as keyof typeof PLAN_LIMITS] || 3;
  const scanCount = shopSettings.scanCount || 0;
  const bonusScans = shopSettings.bonusScans || 0;
  const usagePercent = Math.min(100, (scanCount / scanLimit) * 100);

  return (
    <DashboardPageLayout
      title="Settings"
      headerTitle="Settings"
      subtitle="Manage your app preferences and notifications."
    >
      <BlockStack gap="600">
        <InlineGrid columns={["twoThirds", "oneThird"]} gap="400">
          <Card>
            <Box padding="500">
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd" fontWeight="bold" style={{ color: darkTeal }}>
                  Notifications
                </Text>
                <fetcher.Form method="post">
                  <BlockStack gap="300">
                    <TextField
                      label="Notification Email"
                      name="notificationEmail"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(value) => setEmail(value)}
                      autoComplete="email"
                      helpText="We will use this email for important updates regarding your scans."
                    />
                  </BlockStack>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                      marginTop: "24px",
                    }}
                  >
                    <button
                      type="submit"
                      disabled={fetcher.state === "submitting"}
                      style={{
                        padding: "12px 24px",
                        background: fetcher.state === "submitting" ? "#666" : darkTeal,
                        color: "white",
                        border: "none",
                        cursor: fetcher.state === "submitting" ? "wait" : "pointer",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "14px",
                        transition: "all 0.2s",
                        flexShrink: 0,
                      }}
                      onMouseOver={(e) => {
                        if (fetcher.state !== "submitting") e.currentTarget.style.background = "#004c46";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = fetcher.state === "submitting" ? "#666" : darkTeal;
                      }}
                    >
                      {fetcher.state === "submitting" ? "Saving..." : "Save Changes"}
                    </button>
                    {fetcher.data?.success && (
                      <div
                        style={{
                          padding: "10px 16px",
                          background: "rgba(107, 229, 117, 0.15)",
                          border: "1px solid rgba(107, 229, 117, 0.4)",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ color: darkTeal, fontSize: "14px" }}>✓</span>
                        <Text as="span" variant="bodySm" fontWeight="medium" style={{ color: darkTeal }}>
                          {fetcher.data.message}
                        </Text>
                      </div>
                    )}
                  </div>
                </fetcher.Form>
              </BlockStack>
            </Box>
          </Card>

          <Card>
            <Box padding="500">
              <BlockStack gap="400">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text as="h3" variant="headingMd" fontWeight="bold" style={{ color: darkTeal }}>
                    Usage & Plan
                  </Text>
                  <Badge tone="success">{planName.toUpperCase()}</Badge>
                </div>
                <BlockStack gap="300">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <Text as="span" variant="bodyMd" tone="subdued">
                      Monthly Scans
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="bold" style={{ color: darkTeal }}>
                      {scanCount} / {scanLimit}
                    </Text>
                  </div>
                  <div
                    style={{
                      height: "8px",
                      background: "#e5e7eb",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${usagePercent}%`,
                        height: "100%",
                        background: accentGreen,
                        borderRadius: "4px",
                        transition: "width 0.5s ease-out",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text as="span" variant="bodyMd" tone="subdued">
                      System Status
                    </Text>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          background: accentGreen,
                          borderRadius: "50%",
                        }}
                      />
                      <Text as="span" variant="bodyMd" fontWeight="bold" style={{ color: darkTeal }}>
                        Active
                      </Text>
                    </div>
                  </div>
                </BlockStack>
                <Text as="p" variant="bodyMd" tone="subdued" style={{ color: "#1a1a1a" }}>
                  You are currently using the <span style={{ fontWeight: "600", color: darkTeal }}>{planName}</span> plan.
                  {bonusScans > 0 ? (
                    <> You have {bonusScans} bonus scans available.</>
                  ) : (
                    <>
                      <br />
                      <Link url="/app/pricing">
                        <span style={{ fontWeight: "500", color: "#1a1a1a" }}>Upgrade to increase your monthly limit.</span>
                      </Link>
                    </>
                  )}
                </Text>
              </BlockStack>
            </Box>
          </Card>
        </InlineGrid>
      </BlockStack>
    </DashboardPageLayout>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
