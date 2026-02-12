import { Layout, Card, BlockStack, Text, Scrollable } from "@shopify/polaris";
import { Link } from "@remix-run/react";
import { DashboardPageLayout } from "../components/DashboardPageLayout";

const backToSupportButton = (
    <Link
        to="/app/support"
        aria-label="Back to Support"
        style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
            fontSize: "20px",
            lineHeight: 1,
            textDecoration: "none",
        }}
    >
        ×
    </Link>
);

export default function TermsOfService() {
    return (
        <DashboardPageLayout title="Terms of Service" subtitle="Terms of Service" headerRight={backToSupportButton}>
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text as="h1" variant="headingLg">
                                Terms of Service for Auto Entry
                            </Text>
                            <Text as="p" tone="subdued">
                                Last Updated: February 9, 2026
                            </Text>

                            <Scrollable shadow style={{ height: '400px' }} focusable>
                                <BlockStack gap="400">
                                    <Text as="h2" variant="headingMd">1. Acceptance of Terms</Text>
                                    <Text as="p">
                                        By installing and using Auto Entry, you agree to be bound by these Terms of Service and all applicable laws and regulations.
                                    </Text>

                                    <Text as="h2" variant="headingMd">2. Service Description</Text>
                                    <Text as="p">
                                        Auto Entry provides an AI-powered product scanning tool for Shopify merchants. We do not guarantee 100% accuracy of AI-extracted data; users should review all drafts before publishing.
                                    </Text>

                                    <Text as="h2" variant="headingMd">3. Subscription and Billing</Text>
                                    <Text as="p">
                                        Billing is handled via Shopify. Subscriptions are billed every 30 days. One-time top-ups are billed immediately. No refunds are provided for partial months of service.
                                    </Text>

                                    <Text as="h2" variant="headingMd">4. User Responsibilities</Text>
                                    <Text as="p">
                                        Users are responsible for the content of products listed using Auto Entry. You must have the rights to use any images uploaded to the service.
                                    </Text>

                                    <Text as="h2" variant="headingMd">5. Limitation of Liability</Text>
                                    <Text as="p">
                                        Auto Entry and Ruminate Studios shall not be liable for any damages arising from the use or inability to use our services.
                                    </Text>

                                    <Text as="h2" variant="headingMd">6. Changes to Terms</Text>
                                    <Text as="p">
                                        We reserve the right to modify these terms at any time. Continued use of the app constitutes acceptance of the new terms.
                                    </Text>
                                </BlockStack>
                            </Scrollable>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </DashboardPageLayout>
    );
}
