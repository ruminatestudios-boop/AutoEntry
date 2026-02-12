import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { BlockStack, Text, InlineGrid } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { DashboardPageLayout } from "../components/DashboardPageLayout";
import { useEffect, useRef } from "react";
import { useActionData, useLoaderData, useSubmit, useSearchParams } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const accentGreen = "#6be575";
const darkTeal = "#004c46";

const greenBoxStyle = {
  background: "rgba(107, 229, 117, 0.1)",
  padding: "16px 18px",
  borderRadius: "12px",
  border: "1px solid rgba(107, 229, 117, 0.35)",
} as const;

const cardBase = {
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  transition: "box-shadow 0.2s ease, border-color 0.2s ease",
} as const;

const cardRecommended = {
  ...cardBase,
  border: "2px solid rgba(107, 229, 117, 0.5)",
  boxShadow: "0 4px 20px rgba(0, 76, 70, 0.08)",
} as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const shopSettings = await db.shopSettings.findUnique({ where: { shop } });
  return json({ shopSettings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request) as any;
  const shop = session.shop;
  const formData = await request.formData();
  const plan = formData.get("plan") as any;
  const isTest = true;

  if (plan === "FREE") {
    const billingCheck = await billing.check({
      plans: ["Starter", "Growth", "Power"] as const,
      isTest,
    });

    if (billingCheck.hasActivePayment) {
      for (const subscription of billingCheck.appSubscriptions) {
        await billing.cancel({
          subscriptionId: subscription.id,
          isTest,
          prorate: true,
        });
      }
    }

    await db.shopSettings.upsert({
      where: { shop },
      update: { plan: "FREE" },
      create: { shop, plan: "FREE" }
    });

    return json({ success: true });
  }

  if (plan?.startsWith("TopUp")) {
    const topupMap: Record<string, number> = {
      "TopUp100": 100,
      "TopUp500": 500,
      "TopUp1000": 1000
    };

    const bonusScans = topupMap[plan];
    const appUrl = process.env.SHOPIFY_APP_URL || new URL(request.url).origin;
    const returnUrl = `${appUrl}/app/topup-success?scans=${bonusScans}`;

    try {
      await billing.request({
        plan: plan as any,
        isTest,
        returnUrl,
      });
    } catch (e: any) {
      if (e instanceof Response) throw e;
      console.error("PRICING ACTION: TopUp request failed:", e);
      return json({ error: "Failed to initiate purchase. Please try again." });
    }
    return null;
  }

  if (plan) {
    const appUrl = process.env.SHOPIFY_APP_URL || new URL(request.url).origin;
    const returnUrl = `${appUrl}/app`;

    try {
      await billing.request({
        plan: plan as any,
        isTest,
        returnUrl,
      });
    } catch (e: any) {
      if (e instanceof Response) throw e;

      if (request.url.includes("localhost") || process.env.NODE_ENV === "development") {
        await db.shopSettings.upsert({
          where: { shop },
          update: { plan },
          create: { shop, plan }
        });
        return json({ success: true, bypassed: true });
      }

      console.error("PRICING ACTION ERROR:", e);
      return json({ error: "Failed to initiate subscription. Please try again." });
    }
  }
  return null;
};

export default function Pricing() {
  const submit = useSubmit();
  const actionData = useActionData<any>();
  const shopify = useAppBridge();
  const { shopSettings } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const hasAutoSubmitted = useRef(false);

  const currentPlan = shopSettings?.plan || "FREE";

  useEffect(() => {
    if (actionData?.error) {
      shopify.toast.show(actionData.error, { isError: true });
    } else if (actionData?.success) {
      shopify.toast.show("Plan updated successfully");
    }
  }, [actionData, shopify]);

  const handleUpgrade = (plan: string) => {
    submit({ plan }, { method: "POST" });
  };

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      handleUpgrade(plan);
    }
  }, [searchParams]);

  const plans = [
    {
      name: "Free",
      price: "$0",
      scans: "5 FREE Scans",
      description: "Test the app",
      features: ["AI product scanning", "Auto SKU generation", "5 free scans"],
      action: currentPlan === "FREE" ? "Current" : "Downgrade",
      value: "FREE",
      disabled: currentPlan === "FREE"
    },
    {
      name: "Starter",
      price: "$19.99",
      scans: "100 Scans / mo",
      description: "Small boutiques",
      features: ["Everything in Free", "100 monthly scans", "Priority support"],
      action: currentPlan === "Starter" ? "Current" : "Upgrade",
      value: "Starter",
      disabled: currentPlan === "Starter"
    },
    {
      name: "Growth",
      price: "$49.99",
      scans: "500 Scans / mo",
      description: "Growing stores",
      features: ["Everything in Starter", "500 monthly scans", "Voice variants"],
      action: currentPlan === "Growth" ? "Current" : "Upgrade",
      value: "Growth",
      disabled: currentPlan === "Growth",
    },
    {
      name: "Power",
      price: "$99.99",
      scans: "1,000 Scans / mo",
      description: "High-volume",
      features: ["Everything in Growth", "1,000 monthly scans", "API access"],
      action: currentPlan === "Power" ? "Current" : "Upgrade",
      value: "Power",
      disabled: currentPlan === "Power"
    }
  ];

  const topups = [
    { scans: "100", price: "$9.99", value: "TopUp100", perScan: "$0.10/scan" },
    { scans: "500", price: "$39.99", value: "TopUp500", perScan: "$0.08/scan", popular: true },
    { scans: "1,000", price: "$69.99", value: "TopUp1000", perScan: "$0.07/scan" }
  ];

  return (
    <DashboardPageLayout
      title="Pricing"
      headerTitle="Pricing"
      subtitle="Choose a plan that fits your store"
    >
      <BlockStack gap="600">
        <BlockStack gap="300">
          <Text as="h2" variant="headingLg" fontWeight="bold" style={{ color: darkTeal }}>
            Plans
          </Text>
          <InlineGrid columns={4} gap="400">
            {plans.map((plan) => {
              const isRecommended = plan.name === "Growth";
              return (
                <div
                  key={plan.name}
                  className="pricing-plan-card"
                  style={{
                    ...(isRecommended ? cardRecommended : cardBase),
                    background: "white",
                    padding: "24px",
                    minHeight: "320px",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                  }}
                >
                  {isRecommended && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      background: darkTeal,
                      color: "white",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "6px 14px",
                      borderRadius: "999px",
                      letterSpacing: "0.03em",
                      whiteSpace: "nowrap",
                    }}>
                      Recommended
                    </div>
                  )}
                  <BlockStack gap="300">
                    <div style={{ marginTop: isRecommended ? "8px" : 0 }}>
                      <Text as="h3" variant="headingLg" fontWeight="bold" style={{ color: darkTeal, margin: 0 }}>
                        {plan.name}
                      </Text>
                    </div>
                    <div style={greenBoxStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                        <Text as="span" variant="bodySm" tone="subdued" style={{ color: "#64748b" }}>Price</Text>
                        <Text as="span" variant="headingMd" fontWeight="bold" style={{ color: darkTeal }}>{plan.price}</Text>
                      </div>
                    </div>
                    <Text as="p" variant="bodyMd" style={{ color: "#475569", margin: 0, fontWeight: 500 }}>
                      {plan.description}
                    </Text>
                    <BlockStack gap="200">
                      {plan.features.slice(0, 3).map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            background: "rgba(107, 229, 117, 0.25)",
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" style={{ flexShrink: 0 }}>
                              <path d="M1 4l2.5 2.5L9 1" stroke={darkTeal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <Text as="span" variant="bodySm" style={{ color: "#1e293b" }}>{f}</Text>
                        </div>
                      ))}
                    </BlockStack>
                    <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                      <button
                        type="button"
                        onClick={() => handleUpgrade(plan.value)}
                        disabled={plan.disabled}
                        className="pricing-card-btn"
                        style={{
                          width: "100%",
                          padding: "12px 20px",
                          background: plan.disabled ? "#f1f5f9" : darkTeal,
                          color: plan.disabled ? "#94a3b8" : "white",
                          border: plan.disabled ? "1px solid #e2e8f0" : "none",
                          borderRadius: "12px",
                          fontSize: "14px",
                          fontWeight: 600,
                          cursor: plan.disabled ? "not-allowed" : "pointer",
                        }}
                      >
                        {plan.action}
                      </button>
                    </div>
                  </BlockStack>
                </div>
              );
            })}
          </InlineGrid>
        </BlockStack>

        <BlockStack gap="300">
          <Text as="h2" variant="headingLg" fontWeight="bold" style={{ color: darkTeal }}>
            Scan Top-Ups
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued" style={{ color: "#1a1a1a" }}>
            Need more scans this month?
          </Text>
          <InlineGrid columns={3} gap="400">
            {topups.map((topup) => (
              <div
                key={topup.value}
                className="pricing-plan-card"
                style={{
                  ...cardBase,
                  background: "white",
                  padding: "24px",
                  minHeight: "260px",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                }}
              >
                <div style={{ position: "relative", marginBottom: "4px" }}>
                  <Text as="h3" variant="headingLg" fontWeight="bold" style={{ color: darkTeal, margin: 0 }}>
                    {topup.scans} Scans
                  </Text>
                  {topup.popular && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-4px",
                        right: 0,
                        background: darkTeal,
                        color: "white",
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: "999px",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Best Value
                    </span>
                  )}
                </div>
                <div style={greenBoxStyle}>
                  <BlockStack gap="200">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Text as="span" variant="bodySm" tone="subdued" style={{ color: "#64748b" }}>Price</Text>
                      <Text as="span" variant="headingMd" fontWeight="bold" style={{ color: darkTeal }}>{topup.price}</Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Text as="span" variant="bodySm" tone="subdued" style={{ color: "#64748b" }}>Per scan</Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold" style={{ color: darkTeal }}>{topup.perScan}</Text>
                    </div>
                  </BlockStack>
                </div>
                <div style={{ marginTop: "auto", paddingTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => handleUpgrade(topup.value)}
                    className="pricing-card-btn"
                    style={{
                      width: "100%",
                      padding: "12px 20px",
                      background: darkTeal,
                      color: "white",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </InlineGrid>
        </BlockStack>
      </BlockStack>
    </DashboardPageLayout>
  );
}
