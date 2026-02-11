import {
  Card,
  Layout,
  Page,
  Text,
  BlockStack,
  FormLayout,
  TextField,
  Box,
  Badge,
  Link,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useEffect } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { authenticate } from "../shopify.server";
import { PLAN_LIMITS } from "../core/constants";
import db from "../db.server";

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
    <Page>
      <TitleBar title="Settings" />
      <BlockStack gap="600">
        {/* Hero Section */}
        <div style={{
          background: "linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%)",
          padding: "40px",
          borderRadius: "16px",
          border: "1px solid #f1f5f9",
          marginBottom: "0px"
        }}>
          <BlockStack gap="200">
            <Text as="h1" variant="heading2xl" fontWeight="bold">
              <span style={{ letterSpacing: "-0.04em", lineHeight: "1.1" }}>General Settings</span>
            </Text>
            <Text as="p" variant="bodyLg" tone="subdued">
              <span style={{ lineHeight: "1.6" }}>
                Configure your app preferences and notification settings.
              </span>
            </Text>
          </BlockStack>
        </div>

        <Layout>
          <Layout.Section>
            <div style={{ height: '100%' }}>
              <Card>
                <BlockStack gap="500">
                  <Text as="h2" variant="headingMd" fontWeight="bold">
                    Notifications
                  </Text>
                  <fetcher.Form method="post">
                    <TextField
                      label="Notification Email"
                      name="notificationEmail"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(value) => setEmail(value)}
                      autoComplete="email"
                      helpText="We will use this email for important updates regarding your scans."
                    />
                    <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <button
                        type="submit"
                        disabled={fetcher.state === "submitting"}
                        style={{
                          padding: '12px 24px',
                          background: fetcher.state === "submitting" ? '#666' : '#1a1a1a',
                          color: 'white',
                          border: '1px solid #1a1a1a',
                          cursor: fetcher.state === "submitting" ? 'wait' : 'pointer',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '14px',
                          transition: 'all 0.2s',
                          flexShrink: 0
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
                        onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                      >
                        {fetcher.state === "submitting" ? "Saving..." : "Save Changes"}
                      </button>
                      {fetcher.data?.success && (
                        <div style={{
                          padding: '10px 16px',
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                          border: '1px solid #86efac',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          animation: 'fadeIn 0.3s ease-in',
                          flexShrink: 0
                        }}>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            background: '#22c55e',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ color: 'white', fontSize: '11px', fontWeight: 'bold' }}>✓</span>
                          </div>
                          <Text as="span" variant="bodySm" fontWeight="medium">
                            <span style={{ color: '#166534' }}>{fetcher.data.message}</span>
                          </Text>
                        </div>
                      )}
                    </div>
                  </fetcher.Form>
                </BlockStack>
              </Card>
            </div>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <div style={{ height: '100%' }}>
              <Card>
                <BlockStack gap="400">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text as="h2" variant="headingMd" fontWeight="bold">
                      Usage & Plan
                    </Text>
                    <Badge tone={planName === "FREE" ? "info" : "success"}>{planName.toUpperCase()}</Badge>
                  </div>

                  <BlockStack gap="400">
                    <BlockStack gap="200">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <Text as="span" variant="bodyMd" fontWeight="bold">Monthly Scans</Text>
                        <Text as="span" variant="bodySm" tone="subdued">{scanCount} / {scanLimit}</Text>
                      </div>
                      {/* Premium Progress Bar */}
                      <div style={{
                        height: "8px",
                        background: "#f1f2f3",
                        borderRadius: "4px",
                        overflow: "hidden",
                        border: "1px solid #f1f5f9"
                      }}>
                        <div style={{
                          width: `${usagePercent}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #1a1a1a 0%, #4a4a4a 100%)",
                          borderRadius: "4px",
                          transition: "width 0.5s ease-out"
                        }} />
                      </div>
                    </BlockStack>

                    <BlockStack gap="200">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Text as="span" variant="bodyMd" tone="subdued">System Status</Text>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%" }} />
                          <Text as="span" variant="bodyMd" fontWeight="bold" tone="success">Active</Text>
                        </div>
                      </div>
                    </BlockStack>
                  </BlockStack>

                  <div style={{ borderTop: "1px solid #f1f2f3", paddingTop: "16px", marginTop: "8px" }}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      You are currently using the <span style={{ fontWeight: "600", color: "#1a1a1a" }}>{planName}</span> plan.
                      <br />
                      {bonusScans > 0 ? (
                        `You have ${bonusScans} bonus scans available.`
                      ) : (
                        <Link url="/app/pricing">
                          <span style={{ textDecoration: "underline" }}>Upgrade to increase your monthly limit.</span>
                        </Link>
                      )}
                    </Text>
                  </div>
                </BlockStack>
              </Card>
            </div>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
