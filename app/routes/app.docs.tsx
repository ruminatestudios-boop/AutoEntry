import {
    Page,
    Layout,
    Card,
    BlockStack,
    Text,
    List,
    Box,
    Banner,
    Badge,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function DocumentationPage() {
    return (
        <Page>
            <TitleBar title="Documentation" />
            <BlockStack gap="600">
                {/* Hero Section */}
                <div style={{
                    background: "linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 100%)",
                    padding: "40px",
                    borderRadius: "16px",
                    border: "1px solid #dcfce7",
                    marginBottom: "0px"
                }}>
                    <BlockStack gap="200">
                        <Text as="h1" variant="heading2xl" fontWeight="bold">
                            <span style={{ letterSpacing: "-0.04em", lineHeight: "1.1" }}>Documentation & Compliance</span>
                        </Text>
                        <Text as="p" variant="bodyLg" tone="subdued">
                            <span style={{ lineHeight: "1.6" }}>
                                Learn how Auto Entry transforms your product listing workflow and explore our Shopify compliance checklist.
                            </span>
                        </Text>
                    </BlockStack>
                </div>

                <Layout>
                    <Layout.Section>
                        <BlockStack gap="500">
                            {/* What is Auto Entry? */}
                            <Card>
                                <BlockStack gap="400">
                                    <Text as="h2" variant="headingMd" fontWeight="bold">
                                        What is Auto Entry?
                                    </Text>
                                    <Text as="p" tone="subdued">
                                        Auto Entry is an AI-powered product listing assistant designed to help Shopify merchants add inventory with lightning speed. By combining advanced computer vision with Shopify's robust API, we eliminate the manual data entry that slows down your business.
                                    </Text>
                                    <Text as="p" tone="subdued">
                                        Whether you're scanning in a warehouse, a retail store, or at home, Auto Entry captures product details directly from packaging and barcodes using nothing but your mobile phone's camera.
                                    </Text>
                                </BlockStack>
                            </Card>

                            {/* Detailed User Guide */}
                            <Card>
                                <BlockStack gap="400">
                                    <Text as="h2" variant="headingMd" fontWeight="bold">
                                        How Auto Entry Works
                                    </Text>

                                    <BlockStack gap="400">
                                        <BlockStack gap="200">
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <Badge tone="info">Step 1</Badge>
                                                <Text as="h3" variant="headingSm" fontWeight="bold">Initiate & Scan</Text>
                                            </div>
                                            <Text as="p" tone="subdued">
                                                Start by clicking the <strong>"Generate New Scan"</strong> button on your dashboard. This creates a secure, unique scanning session.
                                            </Text>
                                            <List type="bullet">
                                                <List.Item>Scan the QR code with your mobile phone to open the mobile capture interface.</List.Item>
                                                <List.Item>Point your camera at a product barcode or its retail packaging.</List.Item>
                                                <List.Item>Our system instantly processes the image using <strong>Google Gemini Pro Vision</strong> AI to identify the product.</List.Item>
                                            </List>
                                        </BlockStack>

                                        <BlockStack gap="200">
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <Badge tone="info">Step 2</Badge>
                                                <Text as="h3" variant="headingSm" fontWeight="bold">AI Data Extraction & Parsing</Text>
                                            </div>
                                            <Text as="p" tone="subdued">
                                                Once scanned, the AI performs deep parsing to extract structured data. This isn't just OCR; the AI understands what it's looking at.
                                            </Text>
                                            <List type="bullet">
                                                <List.Item><strong>Title & Description:</strong> Extracted directly from marketing text on the box.</List.Item>
                                                <List.Item><strong>Pricing:</strong> Identified from price tags or suggested retail markings.</List.Item>
                                                <List.Item><strong>Variants:</strong> Sizes, colors, and SKU details are intelligently categorized.</List.Item>
                                            </List>
                                        </BlockStack>

                                        <BlockStack gap="200">
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <Badge tone="info">Step 3</Badge>
                                                <Text as="h3" variant="headingSm" fontWeight="bold">Review & Refine</Text>
                                            </div>
                                            <Text as="p" tone="subdued">
                                                The parsed data appears back on your primary Shopify screen in a clean review modal. This is your "Quality Control" stage.
                                            </Text>
                                            <List type="bullet">
                                                <List.Item>Modify any AI-extracted text to match your store’s brand voice.</List.Item>
                                                <List.Item>Adjust prices or add custom SKU prefixes.</List.Item>
                                                <List.Item>Select which extracted images to include in the final listing.</List.Item>
                                            </List>
                                        </BlockStack>

                                        <BlockStack gap="200">
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <Badge tone="info">Step 4</Badge>
                                                <Text as="h3" variant="headingSm" fontWeight="bold">Sync to Shopify</Text>
                                            </div>
                                            <Text as="p" tone="subdued">
                                                With a single click on <strong>"Review in Shopify"</strong>, the app creates a new product draft in your store.
                                            </Text>
                                            <List type="bullet">
                                                <List.Item>All data is synced via secure GraphQL requests.</List.Item>
                                                <List.Item>Images are uploaded directly to Shopify's CDN.</List.Item>
                                                <List.Item>The product is saved as a <strong>Draft</strong>, allowing you to perform one last check in the Shopify Admin before going live.</List.Item>
                                            </List>
                                        </BlockStack>
                                    </BlockStack>
                                </BlockStack>
                            </Card>

                            {/* Compliance Checklist */}
                            <Card>
                                <BlockStack gap="400">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <Text as="h2" variant="headingMd" fontWeight="bold">
                                            Shopify Compliance Checklist
                                        </Text>
                                        <Badge tone="success">Ready for Review</Badge>
                                    </div>

                                    <Banner tone="info">
                                        <p>This app has been pre-configured to meet all Shopify App Store requirements for 2026.</p>
                                    </Banner>

                                    <BlockStack gap="400">
                                        <BlockStack gap="200">
                                            <Text as="h3" variant="headingSm">1. Data Privacy & GDPR</Text>
                                            <List>
                                                <List.Item>Mandatory Public Privacy Policy at <code>/privacy</code>.</List.Item>
                                                <List.Item>Mandatory Public Terms of Service at <code>/terms</code>.</List.Item>
                                                <List.Item>GDPR Webhooks implemented: <code>customers/data_request</code>, <code>customers/redact</code>, <code>shop/redact</code>.</List.Item>
                                            </List>
                                        </BlockStack>

                                        <BlockStack gap="200">
                                            <Text as="h3" variant="headingSm">2. App Functionality</Text>
                                            <List>
                                                <List.Item>Uses Shopify App Bridge for navigation and UI consistency.</List.Item>
                                                <List.Item>Uses Polaris design system for all user interfaces.</List.Item>
                                                <List.Item>Embedded app architecture (Iframe compatible).</List.Item>
                                            </List>
                                        </BlockStack>

                                        <BlockStack gap="200">
                                            <Text as="h3" variant="headingSm">3. Billing & Subscriptions</Text>
                                            <List>
                                                <List.Item>Native Shopify Billing API integration (No external 3rd party payments).</List.Item>
                                                <List.Item>Tiered subscriptions (Starter, Growth, Power) correctly configured.</List.Item>
                                                <List.Item>Usage limits enforced in real-time scan workflows.</List.Item>
                                            </List>
                                        </BlockStack>
                                    </BlockStack>
                                </BlockStack>
                            </Card>
                        </BlockStack>
                    </Layout.Section>

                    <Layout.Section variant="oneThird">
                        <BlockStack gap="500">
                            <Card>
                                <BlockStack gap="300">
                                    <Text as="h2" variant="headingMd" fontWeight="bold">
                                        Quick Contacts
                                    </Text>
                                    <BlockStack gap="100">
                                        <Text as="p" variant="bodyMd">Support Email:</Text>
                                        <Text as="p" variant="bodyMd" fontWeight="bold">infoautoentry@gmail.com</Text>
                                    </BlockStack>
                                    <BlockStack gap="100">
                                        <Text as="p" variant="bodyMd">Response Time:</Text>
                                        <Text as="p" variant="bodyMd" fontWeight="bold">&lt; 12 Hours</Text>
                                    </BlockStack>
                                </BlockStack>
                            </Card>

                            <Card>
                                <BlockStack gap="300">
                                    <Text as="h2" variant="headingMd" fontWeight="bold">
                                        API Status
                                    </Text>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <div style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%" }}></div>
                                        <Text as="p" variant="bodyMd">Shopify API: 2025-01</Text>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <div style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%" }}></div>
                                        <Text as="p" variant="bodyMd">Gemini AI Engine: Active</Text>
                                    </div>
                                </BlockStack>
                            </Card>
                        </BlockStack>
                    </Layout.Section>
                </Layout>
            </BlockStack>
        </Page>
    );
}
