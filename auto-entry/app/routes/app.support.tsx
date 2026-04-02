import { BlockStack, Text, Box, Card } from "@shopify/polaris";
import { Link } from "@remix-run/react";
import { DashboardPageLayout } from "../components/DashboardPageLayout";

export default function SupportPage() {
  return (
    <DashboardPageLayout
      heroAccent="dashboard"
      title="Support"
      headerTitle="Support & Help"
      subtitle="Need help with Auto Entry? We're here for you."
    >
      <div className="support-page">
        <div className="support-page__grid">
          <div className="support-panel">
            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <p className="marketing-unified-capture-label">Contact</p>
                  <Text as="h3" variant="headingLg" fontWeight="bold" className="support-panel__title">
                    We&apos;re here to help
                  </Text>
                  <BlockStack gap="300">
                    <div className="support-contact-row">
                      <Text as="span" variant="bodyMd" tone="subdued">
                        Email support
                      </Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold" className="app-section-heading">
                        infoautoentry@gmail.com
                      </Text>
                    </div>
                    <div className="support-contact-row">
                      <Text as="span" variant="bodyMd" tone="subdued">
                        Operating hours
                      </Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold" className="app-section-heading">
                        Mon–Fri, 9AM–5PM EST
                      </Text>
                    </div>
                    <div className="support-contact-row">
                      <Text as="span" variant="bodyMd" tone="subdued">
                        Typical response
                      </Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold" className="app-section-heading">
                        &lt; 12 hours
                      </Text>
                    </div>
                  </BlockStack>
                  <p className="support-body-text">
                    We&apos;re dedicated to helping you scale your business with speed and accuracy. Drop us a line and
                    we&apos;ll get back to you as soon as possible.
                  </p>
                </BlockStack>
              </Box>
            </Card>
          </div>

          <div className="support-panel">
            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <p className="marketing-unified-capture-label">Resources</p>
                  <Text as="h3" variant="headingLg" fontWeight="bold" className="support-panel__title">
                    Quick links
                  </Text>
                  <nav className="support-links-stack" aria-label="Quick links">
                    {[
                      { label: "Documentation", to: "/app/docs" },
                      { label: "Pricing plans", to: "/app/pricing" },
                      { label: "Privacy policy", to: "/app/privacy" },
                      { label: "Terms of service", to: "/app/terms" },
                    ].map((link) => (
                      <Link key={link.to} to={link.to} className="support-link-pill">
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </BlockStack>
              </Box>
            </Card>
          </div>
        </div>
      </div>
    </DashboardPageLayout>
  );
}
