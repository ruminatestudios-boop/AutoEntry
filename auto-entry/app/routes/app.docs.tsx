import {
  Card,
  BlockStack,
  Text,
  List,
  Box,
  Badge,
} from "@shopify/polaris";
import { Link } from "@remix-run/react";
import { DashboardPageLayout } from "../components/DashboardPageLayout";

const greenBoxStyle = {
  background: "rgba(107, 229, 117, 0.08)",
  padding: "20px",
  borderRadius: "12px",
  border: "1px solid rgba(107, 229, 117, 0.3)",
} as const;

export default function DocumentationPage() {
  return (
    <DashboardPageLayout
      heroAccent="dashboard"
      title="Documentation"
      headerTitle="Documentation"
      subtitle="Learn how to use Auto Entry and get the most out of your scans."
    >
      <div className="support-page">
        <div className="docs-grid">
          <div className="docs-grid__item">
            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <p className="marketing-unified-capture-label">Overview</p>
                  <Text as="h3" variant="headingLg" fontWeight="bold" className="support-panel__title">
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
          </div>

          <div className="docs-grid__item">
            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <p className="marketing-unified-capture-label">Help</p>
                  <Text as="h3" variant="headingLg" fontWeight="bold" className="support-panel__title">
                    Quick contacts
                  </Text>
                  <BlockStack gap="300">
                    <div className="support-contact-row">
                      <Text as="span" variant="bodyMd" tone="subdued">Support email</Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold" className="app-section-heading">infoautoentry@gmail.com</Text>
                    </div>
                    <div className="support-contact-row">
                      <Text as="span" variant="bodyMd" tone="subdued">Response time</Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold" className="app-section-heading">&lt; 12 hours</Text>
                    </div>
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>
          </div>

          <div className="docs-grid__item">
            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <p className="marketing-unified-capture-label">Workflow</p>
                  <Text as="h3" variant="headingLg" fontWeight="bold" className="support-panel__title">
                    How Auto Entry Works
                  </Text>

                  <BlockStack gap="400">
                    <BlockStack gap="200">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Badge tone="success">Step 1</Badge>
                        <Text as="h3" variant="headingSm" fontWeight="bold" className="app-section-heading">
                          Initiate & Scan
                        </Text>
                      </div>
                      <Text as="p" variant="bodyMd" style={{ color: "#1a1a1a" }}>
                        Start by clicking the <strong>"Generate New Scan"</strong> button on your dashboard. This creates a secure, unique scanning session.
                      </Text>
                      <List type="bullet">
                        <List.Item>Scan the QR code with your mobile phone to open the mobile capture interface.</List.Item>
                        <List.Item>Point your camera at a product barcode or its retail packaging.</List.Item>
                        <List.Item>Our system instantly processes the image with <strong>AI</strong> to identify the product.</List.Item>
                      </List>
                    </BlockStack>

                    <BlockStack gap="200">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Badge tone="success">Step 2</Badge>
                        <Text as="h3" variant="headingSm" fontWeight="bold" className="app-section-heading">
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
                        <Text as="h3" variant="headingSm" fontWeight="bold" className="app-section-heading">
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
                        <Text as="h3" variant="headingSm" fontWeight="bold" className="app-section-heading">
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
          </div>

          <div className="docs-grid__item">
            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <p className="marketing-unified-capture-label">Setup</p>
                  <Text as="h3" variant="headingLg" fontWeight="bold" className="support-panel__title">
                    Requirements
                  </Text>
                  <BlockStack gap="400">
                    <List type="bullet">
                      <List.Item>Mobile: Safari or Chrome</List.Item>
                      <List.Item>Grant camera permission</List.Item>
                      <List.Item>Products save as drafts in Admin</List.Item>
                    </List>
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm" fontWeight="bold" className="app-section-heading">
                        Before you scan
                      </Text>
                      <List type="bullet">
                        <List.Item>Use bright, even lighting so labels and barcodes are easy to read.</List.Item>
                        <List.Item>Hold steady and fill the frame with the packaging or barcode.</List.Item>
                        <List.Item>Scan one product at a time for the clearest AI results.</List.Item>
                      </List>
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm" fontWeight="bold" className="app-section-heading">
                        What gets created in Shopify
                      </Text>
                      <List type="bullet">
                        <List.Item>A <strong>draft</strong> product in Admin—you publish when you are ready.</List.Item>
                        <List.Item>Title, description, price, and variants when the AI can detect them.</List.Item>
                        <List.Item>Images you choose in review are uploaded to Shopify&apos;s CDN with the draft.</List.Item>
                      </List>
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm" fontWeight="bold" className="app-section-heading">
                        Troubleshooting
                      </Text>
                      <List type="bullet">
                        <List.Item>Camera blocked: allow camera access for your browser in system or site settings.</List.Item>
                        <List.Item>Wrong browser: open the scan link in Safari or Chrome on your phone.</List.Item>
                        <List.Item>QR won&apos;t open: copy the link below the QR on the dashboard and paste it into the address bar.</List.Item>
                        <List.Item>Scan failed: retry with better lighting; if it keeps failing, use Support below.</List.Item>
                      </List>
                      <Text as="p" variant="bodyMd" style={{ color: "#1a1a1a", margin: 0 }}>
                        Need more help?{" "}
                        <Link to="/app/support" className="app-page-inline-link">
                          Open Support
                        </Link>
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <Card>
            <Box padding="500">
              <BlockStack gap="400">
                <p className="marketing-unified-capture-label">Compliance</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                  <Text as="h3" variant="headingLg" fontWeight="bold" className="support-panel__title">
                    Shopify compliance checklist
                  </Text>
                  <Badge tone="success">Ready for review</Badge>
                </div>

                <div style={greenBoxStyle}>
                  <Text as="p" variant="bodyMd" style={{ color: "#1a1a1a", margin: 0 }}>
                    This app has been pre-configured to meet all Shopify App Store requirements for 2026.
                  </Text>
                </div>

                <BlockStack gap="400">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm" fontWeight="bold" className="app-section-heading">
                      1. Data Privacy & GDPR
                    </Text>
                    <List>
                      <List.Item>Mandatory Public Privacy Policy at <code>/privacy</code>.</List.Item>
                      <List.Item>Mandatory Public Terms of Service at <code>/terms</code>.</List.Item>
                      <List.Item>GDPR Webhooks implemented: <code>customers/data_request</code>, <code>customers/redact</code>, <code>shop/redact</code>.</List.Item>
                    </List>
                  </BlockStack>

                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm" fontWeight="bold" className="app-section-heading">
                      2. App Functionality
                    </Text>
                    <List>
                      <List.Item>Uses Shopify App Bridge for navigation and UI consistency.</List.Item>
                      <List.Item>Uses Polaris design system for all user interfaces.</List.Item>
                      <List.Item>Embedded app architecture (Iframe compatible).</List.Item>
                    </List>
                  </BlockStack>

                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm" fontWeight="bold" className="app-section-heading">
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
        </div>
      </div>
    </DashboardPageLayout>
  );
}
