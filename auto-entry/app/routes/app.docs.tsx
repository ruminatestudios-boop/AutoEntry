import {
  Card,
  BlockStack,
  Text,
  List,
  Box,
  InlineGrid,
  Badge,
} from "@shopify/polaris";
import { DashboardPageLayout } from "../components/DashboardPageLayout";

const accentGreen = "#6be575";
const darkTeal = "#004c46";

const greenBoxStyle = {
  background: "rgba(107, 229, 117, 0.08)",
  padding: "20px",
  borderRadius: "12px",
  border: "1px solid rgba(107, 229, 117, 0.3)",
} as const;

export default function DocumentationPage() {
  return (
    <DashboardPageLayout
      title="Documentation"
      headerTitle="Documentation"
      subtitle="Learn how to use Auto Entry and get the most out of your scans."
    >
      <BlockStack gap="600">
        <InlineGrid columns={["twoThirds", "oneThird"]} gap="400">
          <BlockStack gap="400">
            {/* What is Auto Entry? */}
            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd" fontWeight="bold" style={{ color: darkTeal }}>
                    What is Auto Entry?
                  </Text>
                  <Text as="p" variant="bodyMd" style={{ color: "#1a1a1a" }}>
                    Auto Entry is an AI-powered product listing assistant designed to help Shopify merchants add inventory with lightning speed. We help eliminate the manual data entry that slows down your business.
                  </Text>
                  <Text as="p" variant="bodyMd" style={{ color: "#1a1a1a" }}>
                    Whether you're scanning in a warehouse, a retail store, or at home, Auto Entry captures product details directly from packaging and barcodes using nothing but your mobile phone's camera.
                  </Text>
                </BlockStack>
              </Box>
            </Card>

            {/* How Auto Entry Works */}
            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd" fontWeight="bold" style={{ color: darkTeal }}>
                    How Auto Entry Works
                  </Text>

                  <BlockStack gap="400">
                    <BlockStack gap="200">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Badge tone="success">Step 1</Badge>
                          <Text as="h3" variant="headingSm" fontWeight="bold" style={{ color: darkTeal }}>
                            Initiate & Scan
                          </Text>
                        </div>
                        <Text as="p" variant="bodyMd" style={{ color: "#1a1a1a" }}>
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
                          <Badge tone="success">Step 2</Badge>
                          <Text as="h3" variant="headingSm" fontWeight="bold" style={{ color: darkTeal }}>
                            AI Data Extraction & Parsing
                          </Text>
                        </div>
                        <Text as="p" variant="bodyMd" style={{ color: "#1a1a1a" }}>
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
                          <Badge tone="success">Step 3</Badge>
                          <Text as="h3" variant="headingSm" fontWeight="bold" style={{ color: darkTeal }}>
                            Review & Refine
                          </Text>
                        </div>
                        <Text as="p" variant="bodyMd" style={{ color: "#1a1a1a" }}>
                          The parsed data appears back on your primary Shopify screen in a clean review modal. This is your "Quality Control" stage.
                        </Text>
                        <List type="bullet">
                          <List.Item>Modify any AI-extracted text to match your store's brand voice.</List.Item>
                          <List.Item>Adjust prices or add custom SKU prefixes.</List.Item>
                          <List.Item>Select which extracted images to include in the final listing.</List.Item>
                        </List>
                      </BlockStack>

                    <BlockStack gap="200">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Badge tone="success">Step 4</Badge>
                          <Text as="h3" variant="headingSm" fontWeight="bold" style={{ color: darkTeal }}>
                            Sync to Shopify
                          </Text>
                        </div>
                        <Text as="p" variant="bodyMd" style={{ color: "#1a1a1a" }}>
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
              </Box>
            </Card>

            {/* Compliance Checklist */}
            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text as="h3" variant="headingMd" fontWeight="bold" style={{ color: darkTeal }}>
                      Shopify Compliance Checklist
                    </Text>
                    <Badge tone="success">Ready for Review</Badge>
                  </div>

                  <div style={greenBoxStyle}>
                    <Text as="p" variant="bodyMd" style={{ color: "#1a1a1a", margin: 0 }}>
                      This app has been pre-configured to meet all Shopify App Store requirements for 2026.
                    </Text>
                  </div>

                  <BlockStack gap="400">
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" fontWeight="bold" style={{ color: darkTeal }}>
                        1. Data Privacy & GDPR
                      </Text>
                      <List>
                        <List.Item>Mandatory Public Privacy Policy at <code>/privacy</code>.</List.Item>
                        <List.Item>Mandatory Public Terms of Service at <code>/terms</code>.</List.Item>
                        <List.Item>GDPR Webhooks implemented: <code>customers/data_request</code>, <code>customers/redact</code>, <code>shop/redact</code>.</List.Item>
                      </List>
                    </BlockStack>

                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" fontWeight="bold" style={{ color: darkTeal }}>
                        2. App Functionality
                      </Text>
                      <List>
                        <List.Item>Uses Shopify App Bridge for navigation and UI consistency.</List.Item>
                        <List.Item>Uses Polaris design system for all user interfaces.</List.Item>
                        <List.Item>Embedded app architecture (Iframe compatible).</List.Item>
                      </List>
                    </BlockStack>

                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" fontWeight="bold" style={{ color: darkTeal }}>
                        3. Billing & Subscriptions
                      </Text>
                      <List>
                        <List.Item>Native Shopify Billing API integration (No external 3rd party payments).</List.Item>
                        <List.Item>Tiered subscriptions (Starter, Growth, Power) correctly configured.</List.Item>
                        <List.Item>Usage limits enforced in real-time scan workflows.</List.Item>
                      </List>
                    </BlockStack>
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>
          </BlockStack>

          {/* Sidebar: Quick Contacts & API Status */}
          <BlockStack gap="400">
            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd" fontWeight="bold" style={{ color: darkTeal }}>
                    Quick Contacts
                  </Text>
                  <BlockStack gap="300">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                      <Text as="span" variant="bodyMd" tone="subdued">Support Email</Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold" style={{ color: darkTeal }}>infoautoentry@gmail.com</Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                      <Text as="span" variant="bodyMd" tone="subdued">Response Time</Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold" style={{ color: darkTeal }}>&lt; 12 Hours</Text>
                    </div>
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>

            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd" fontWeight="bold" style={{ color: darkTeal }}>
                    API Status
                  </Text>
                  <BlockStack gap="300">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Text as="span" variant="bodyMd" tone="subdued">Shopify API</Text>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "8px", height: "8px", background: accentGreen, borderRadius: "50%" }} />
                        <Text as="span" variant="bodyMd" fontWeight="bold" style={{ color: darkTeal }}>2026-01</Text>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Text as="span" variant="bodyMd" tone="subdued">Gemini AI Engine</Text>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "8px", height: "8px", background: accentGreen, borderRadius: "50%" }} />
                        <Text as="span" variant="bodyMd" fontWeight="bold" style={{ color: darkTeal }}>Active</Text>
                      </div>
                    </div>
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>
          </BlockStack>
        </InlineGrid>
      </BlockStack>
    </DashboardPageLayout>
  );
}
