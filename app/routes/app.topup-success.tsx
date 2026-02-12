import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Card, BlockStack, Text, Button } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { DashboardPageLayout } from "../components/DashboardPageLayout";
import db from "../db.server";
import { useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    const url = new URL(request.url);
    const scansParam = url.searchParams.get("scans");
    const scans = scansParam ? parseInt(scansParam) : 0;

    if (scans > 0) {
        // Add bonus scans to the shop
        await db.shopSettings.upsert({
            where: { shop },
            update: {
                bonusScans: { increment: scans }
            },
            create: {
                shop,
                bonusScans: scans
            }
        });
    }

    return json({ scans });
};

export default function TopUpSuccess() {
    const { scans } = useLoaderData<typeof loader>();
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate("/app");
        }, 3000);
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <DashboardPageLayout title="Success" subtitle="Success">
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "60vh"
            }}>
                <Card>
                    <BlockStack gap="400" align="center">
                        <div style={{ fontSize: "64px" }}>🎉</div>
                        <Text as="h1" variant="heading2xl" alignment="center">
                            Top-Up Successful!
                        </Text>
                        <Text as="p" variant="bodyLg" alignment="center">
                            {scans} bonus scans have been added to your account.
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                            These scans never expire and can be used anytime.
                        </Text>
                        <Button variant="primary" onClick={() => navigate("/app")}>
                            Back to Dashboard
                        </Button>
                    </BlockStack>
                </Card>
            </div>
        </DashboardPageLayout>
    );
}
