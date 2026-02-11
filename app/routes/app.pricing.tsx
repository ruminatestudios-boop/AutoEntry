import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { Page, Layout, Card, BlockStack, Text, Button, Box, InlineStack, Badge, List } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useEffect, useRef } from "react";
import { useActionData, useLoaderData, useSubmit, useSearchParams } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

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

    // Handle scan top-ups
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
        console.log(`PRICING ACTION: Requesting plan ${plan}.`);

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

            // DEVELOPMENT BYPASS: If billing fails (usually due to distribution settings)
            // and we are on localhost, manually upate the DB so the user can keep testing.
            if (request.url.includes("localhost") || process.env.NODE_ENV === "development") {
                console.log("PRICING ACTION: Billing failed but detected local environment. Applying manual upgrade bypass.");
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
        console.log("Upgrading to plan:", plan);
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
            scans: "1,000 Scans / mo",
            description: "Test the app",
            features: [
                "AI product scanning",
                "Auto SKU generation",
                "Inventory tracking",
                "Draft creation",
                "1,000 monthly scans"
            ],
            action: currentPlan === "FREE" ? "Current" : "Downgrade",
            value: "FREE",
            disabled: currentPlan === "FREE"
        },
        {
            name: "Starter",
            price: "$19.99",
            scans: "100 Scans / mo",
            description: "Small boutiques",
            features: [
                "Everything in Free",
                "100 monthly scans",
                "Batch scanning",
                "Priority support",
                "Shopify export"
            ],
            action: currentPlan === "Starter" ? "Current" : "Upgrade",
            value: "Starter",
            disabled: currentPlan === "Starter"
        },
        {
            name: "Growth",
            price: "$49.99",
            scans: "500 Scans / mo",
            description: "Growing stores",
            features: [
                "Everything in Starter",
                "500 monthly scans",
                "Voice variants",
                "Advanced analytics",
                "Bulk operations"
            ],
            action: currentPlan === "Growth" ? "Current" : "Upgrade",
            value: "Growth",
            disabled: currentPlan === "Growth",
            popular: true
        },
        {
            name: "Power",
            price: "$99.99",
            scans: "1,000 Scans / mo",
            description: "High-volume",
            features: [
                "Everything in Growth",
                "1,000 monthly scans",
                "API access",
                "Custom integrations",
                "Dedicated support"
            ],
            action: currentPlan === "Power" ? "Current" : "Upgrade",
            value: "Power",
            disabled: currentPlan === "Power"
        }
    ];

    return (
        <Page>
            <TitleBar title="Pricing" />
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
                            <span style={{ letterSpacing: "-0.04em", lineHeight: "1.1" }}>Plans & Pricing</span>
                        </Text>
                        <Text as="p" variant="bodyLg" tone="subdued">
                            <span style={{ lineHeight: "1.6" }}>
                                Choose the perfect plan for your business needs. Upgrade or downgrade at any time.
                            </span>
                        </Text>
                    </BlockStack>
                </div>

                <Layout>
                    <Layout.Section>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                            {plans.map((plan) => (
                                <div key={plan.name} style={{
                                    border: plan.popular ? "2px solid #1a1a1a" : "1px solid #e1e3e5",
                                    borderRadius: "16px",
                                    padding: "24px",
                                    background: "white",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "16px",
                                    position: "relative",
                                    height: "100%"
                                }}>
                                    {plan.popular && (
                                        <div style={{
                                            position: "absolute",
                                            top: "12px",
                                            right: "12px",
                                            background: "#dcfce7",
                                            color: "#166534",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            padding: "4px 12px",
                                            borderRadius: "100px"
                                        }}>
                                            Most Popular
                                        </div>
                                    )}
                                    <div>
                                        <Text as="h3" variant="headingSm" fontWeight="medium">{plan.name}</Text>
                                        <div style={{ marginTop: "8px", marginBottom: "4px" }}>
                                            <Text as="h1" variant="heading3xl" fontWeight="bold">{plan.price}</Text>
                                        </div>
                                        <Text as="p" variant="bodySm" tone="subdued">per month</Text>
                                    </div>

                                    <div style={{
                                        background: "#eff6ff",
                                        color: "#1e40af",
                                        padding: "6px 12px",
                                        borderRadius: "8px",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        display: "inline-block",
                                        width: "fit-content"
                                    }}>
                                        {plan.scans}
                                    </div>

                                    <Text as="p" variant="bodySm" tone="subdued">{plan.description}</Text>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                                            {plan.features.map((feature, idx) => (
                                                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <div style={{ width: "4px", height: "4px", background: "#475569", borderRadius: "50%" }} />
                                                    <Text as="span" variant="bodySm" tone="subdued">{feature}</Text>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleUpgrade(plan.value)}
                                        disabled={plan.disabled}
                                        variant={plan.popular ? "primary" : "secondary"}
                                        fullWidth
                                    >
                                        {plan.action}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Layout.Section>

                    {/* Scan Top-Ups Section */}
                    <Layout.Section>
                        <div style={{ marginTop: "40px" }}>
                            <BlockStack gap="400">
                                <BlockStack gap="200">
                                    <Text as="h2" variant="heading2xl">Scan Top-Ups</Text>
                                    <Text as="p" variant="bodyLg" tone="subdued">
                                        Need more scans this month? Purchase one-time top-ups that never expire.
                                    </Text>
                                </BlockStack>

                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                                    {[
                                        { scans: "100", price: "$9.99", value: "TopUp100", perScan: "$0.10/scan" },
                                        { scans: "500", price: "$39.99", value: "TopUp500", perScan: "$0.08/scan", popular: true },
                                        { scans: "1,000", price: "$69.99", value: "TopUp1000", perScan: "$0.07/scan" }
                                    ].map((topup) => (
                                        <div key={topup.value} style={{
                                            border: topup.popular ? "2px solid #1a1a1a" : "1px solid #e1e3e5",
                                            borderRadius: "16px",
                                            padding: "24px",
                                            background: "white",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "12px",
                                            position: "relative"
                                        }}>
                                            {topup.popular && (
                                                <div style={{
                                                    position: "absolute",
                                                    top: "-12px",
                                                    left: "50%",
                                                    transform: "translateX(-50%)",
                                                    background: "#1a1a1a",
                                                    color: "white",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    padding: "4px 12px",
                                                    borderRadius: "100px"
                                                }}>
                                                    Best Value
                                                </div>
                                            )}
                                            <div style={{ textAlign: "center" }}>
                                                <Text as="h3" variant="headingLg" fontWeight="bold">{topup.scans} Scans</Text>
                                            </div>
                                            <div style={{ textAlign: "center" }}>
                                                <Text as="p" variant="heading2xl" fontWeight="bold">{topup.price}</Text>
                                                <Text as="p" variant="bodySm" tone="subdued">{topup.perScan}</Text>
                                            </div>
                                            <Button
                                                onClick={() => handleUpgrade(topup.value)}
                                                variant={topup.popular ? "primary" : "secondary"}
                                                fullWidth
                                            >
                                                Buy Now
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </BlockStack>
                        </div>
                    </Layout.Section>
                </Layout>
            </BlockStack>
        </Page>
    );
}
