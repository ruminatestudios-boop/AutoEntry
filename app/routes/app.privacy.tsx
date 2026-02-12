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

export default function PrivacyPolicy() {
    return (
        <DashboardPageLayout title="Privacy Policy" subtitle="Privacy Policy" headerRight={backToSupportButton}>
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text as="h1" variant="headingLg">
                                Privacy Policy for Auto Entry
                            </Text>
                            <Text as="p" tone="subdued">
                                Last Updated: February 9, 2026
                            </Text>

                            <Scrollable shadow style={{ height: '400px' }} focusable>
                                <BlockStack gap="400">
                                    <Text as="h2" variant="headingMd">1. Information We Collect</Text>
                                    <Text as="p">
                                        Auto Entry collects information necessary to provide product scanning and Shopify listing services. This includes:
                                    </Text>
                                    <ul>
                                        <li><Text as="p">Shopify store information (URL, access tokens).</Text></li>
                                        <li><Text as="p">Images uploaded for scanning.</Text></li>
                                        <li><Text as="p">Product data extracted from images.</Text></li>
                                    </ul>

                                    <Text as="h2" variant="headingMd">2. How We Use Information</Text>
                                    <Text as="p">
                                        We use the collected information to:
                                    </Text>
                                    <ul>
                                        <li><Text as="p">Analyze images using AI models (Gemini Flash).</Text></li>
                                        <li><Text as="p">Create and manage product drafts in your Shopify store.</Text></li>
                                        <li><Text as="p">Manage your subscription and usage limits.</Text></li>
                                    </ul>

                                    <Text as="h2" variant="headingMd">3. Data Sharing</Text>
                                    <Text as="p">
                                        We share image data with Google (via Gemini API) for the sole purpose of AI analysis. We do not sell your data to third parties.
                                    </Text>

                                    <Text as="h2" variant="headingMd">4. Data Retention</Text>
                                    <Text as="p">
                                        We retain your product scan history as long as the app is installed. Upon uninstallation, your data is marked for deletion in accordance with Shopify's GDPR requirements.
                                    </Text>

                                    <Text as="h2" variant="headingMd">5. Contact Us</Text>
                                    <Text as="p">
                                        If you have questions about this policy, contact us at infoautoentry@gmail.com.
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
