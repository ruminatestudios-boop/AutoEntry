import {
    Page,
    Layout,
    Card,
    BlockStack,
    Text,
    List,
    Link,
    Box,
    InlineGrid,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function SupportPage() {
    return (
        <Page>
            <TitleBar title="Support" />
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
                            <span style={{ letterSpacing: "-0.04em", lineHeight: "1.1" }}>Support & Help</span>
                        </Text>
                        <Text as="p" variant="bodyLg" tone="subdued">
                            <span style={{ lineHeight: "1.6" }}>
                                Need help with Auto Entry? Our team is here to support you.
                            </span>
                        </Text>
                    </BlockStack>
                </div>

                <InlineGrid columns={['twoThirds', 'oneThird']} gap="400">
                    <div style={{
                        background: "white",
                        borderRadius: "16px",
                        border: "1px solid #e2e8f0",
                        padding: "24px",
                        height: "100%",
                        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)"
                    }}>
                        <BlockStack gap="500">
                            <Text as="h2" variant="headingMd" fontWeight="bold">
                                Contact Us
                            </Text>
                            <BlockStack gap="400">
                                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                                    <BlockStack gap="200">
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <Text as="span" variant="bodyMd" tone="subdued">Email Support</Text>
                                            <Text as="span" variant="bodyMd" fontWeight="bold">infoautoentry@gmail.com</Text>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <Text as="span" variant="bodyMd" tone="subdued">Operating Hours</Text>
                                            <Text as="span" variant="bodyMd" fontWeight="bold">Mon-Fri, 9AM-5PM EST</Text>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <Text as="span" variant="bodyMd" tone="subdued">Typical Response</Text>
                                            <Text as="span" variant="bodyMd" fontWeight="bold">&lt; 12 hours</Text>
                                        </div>
                                    </BlockStack>
                                </div>
                                <Text as="p" variant="bodyMd" tone="subdued">
                                    We're dedicated to helping you scale your business with speed and accuracy.<br />
                                    Drop us a line and we'll get back to you as soon as possible.
                                </Text>
                            </BlockStack>
                        </BlockStack>
                    </div>

                    <div style={{
                        background: "white",
                        borderRadius: "16px",
                        border: "1px solid #e2e8f0",
                        padding: "24px",
                        height: "100%",
                        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)"
                    }}>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd" fontWeight="bold">
                                Quick Links
                            </Text>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {[
                                    { label: "Documentation", url: "/app/docs", external: false },
                                    { label: "Pricing Plans", url: "/app/pricing", external: false },
                                    { label: "Privacy Policy", url: "/app/privacy", external: false },
                                    { label: "Terms of Service", url: "/app/terms", external: false }
                                ].map((link, index, array) => (
                                    <div key={link.label} style={{
                                        borderBottom: index === array.length - 1 ? "none" : "1px solid #f1f2f3",
                                        paddingBottom: index === array.length - 1 ? "0" : "8px"
                                    }}>
                                        <Link url={link.url} target={link.external ? "_blank" : undefined}>
                                            <span style={{ fontWeight: "500", color: "#1a1a1a" }}>{link.label}</span>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </BlockStack>
                    </div>
                </InlineGrid>
            </BlockStack>
        </Page>
    );
}
