import {
    BlockStack,
    Text,
    Box,
    Card,
    InlineGrid,
} from "@shopify/polaris";
import { Link } from "@remix-run/react";
import { DashboardPageLayout } from "../components/DashboardPageLayout";

const accentGreen = "#6be575";
const darkTeal = "#004c46";

export default function SupportPage() {
    return (
        <DashboardPageLayout
            title="Support"
            headerTitle="Support & Help"
            subtitle="Need help with Auto Entry? We're here for you."
        >
            <BlockStack gap="600">
                <InlineGrid columns={['twoThirds', 'oneThird']} gap="400">
                    <Card>
                        <Box padding="500">
                            <BlockStack gap="400">
                                <Text as="h3" variant="headingMd" fontWeight="bold" style={{ color: darkTeal }}>
                                    Contact Us
                                </Text>
                                <BlockStack gap="300">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                                        <Text as="span" variant="bodyMd" tone="subdued">Email Support</Text>
                                        <Text as="span" variant="bodyMd" fontWeight="bold" style={{ color: darkTeal }}>infoautoentry@gmail.com</Text>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                                        <Text as="span" variant="bodyMd" tone="subdued">Operating Hours</Text>
                                        <Text as="span" variant="bodyMd" fontWeight="bold" style={{ color: darkTeal }}>Mon-Fri, 9AM-5PM EST</Text>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                                        <Text as="span" variant="bodyMd" tone="subdued">Typical Response</Text>
                                        <Text as="span" variant="bodyMd" fontWeight="bold" style={{ color: darkTeal }}>&lt; 12 hours</Text>
                                    </div>
                                </BlockStack>
                                <Text as="p" variant="bodyMd" tone="subdued" style={{ color: "#1a1a1a" }}>
                                    We're dedicated to helping you scale your business with speed and accuracy.
                                    <br />
                                    Drop us a line and we'll get back to you as soon as possible.
                                </Text>
                            </BlockStack>
                        </Box>
                    </Card>

                    <Card>
                        <Box padding="500">
                            <BlockStack gap="400">
                                <Text as="h3" variant="headingMd" fontWeight="bold" style={{ color: darkTeal }}>
                                    Quick Links
                                </Text>
                                <BlockStack gap="200">
                                    {[
                                        { label: "Documentation", to: "/app/docs" },
                                        { label: "Pricing Plans", to: "/app/pricing" },
                                        { label: "Privacy Policy", to: "/app/privacy" },
                                        { label: "Terms of Service", to: "/app/terms" }
                                    ].map((link) => (
                                        <div key={link.label}>
                                            <Link
                                                to={link.to}
                                                style={{ fontWeight: 500, color: "#1a1a1a", textDecoration: "underline" }}
                                            >
                                                {link.label}
                                            </Link>
                                        </div>
                                    ))}
                                </BlockStack>
                            </BlockStack>
                        </Box>
                    </Card>
                </InlineGrid>
            </BlockStack>
        </DashboardPageLayout>
    );
}
