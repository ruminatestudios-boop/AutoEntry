import { Page, Layout, Card, BlockStack, Text, Scrollable, AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
    return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function PublicTermsOfService() {
    const { apiKey } = useLoaderData<typeof loader>();

    return (
        <AppProvider i18n={enTranslations}>
            <Page title="Terms of Service">
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

                                <BlockStack gap="400">
                                    <BlockStack gap="200">
                                        <Text as="h2" variant="headingMd">1. Acceptance of Terms</Text>
                                        <Text as="p">
                                            By installing and using Auto Entry, you agree to be bound by these Terms of Service and all applicable laws and regulations.
                                        </Text>
                                    </BlockStack>

                                    <BlockStack gap="200">
                                        <Text as="h2" variant="headingMd">2. Service Description</Text>
                                        <Text as="p">
                                            Auto Entry provides an AI-powered product scanning tool for Shopify merchants. We do not guarantee 100% accuracy of AI-extracted data; users should review all drafts before publishing.
                                        </Text>
                                    </BlockStack>

                                    <BlockStack gap="200">
                                        <Text as="h2" variant="headingMd">3. Subscription and Billing</Text>
                                        <Text as="p">
                                            Billing is handled via Shopify. Subscriptions are billed every 30 days. One-time top-ups are billed immediately. No refunds are provided for partial months of service.
                                        </Text>
                                    </BlockStack>

                                    <BlockStack gap="200">
                                        <Text as="h2" variant="headingMd">4. User Responsibilities</Text>
                                        <Text as="p">
                                            Users are responsible for the content of products listed using Auto Entry. You must have the rights to use any images uploaded to the service.
                                        </Text>
                                    </BlockStack>

                                    <BlockStack gap="200">
                                        <Text as="h2" variant="headingMd">5. Limitation of Liability</Text>
                                        <Text as="p">
                                            Auto Entry and Ruminate Studios shall not be liable for any damages arising from the use or inability to use our services.
                                        </Text>
                                    </BlockStack>

                                    <BlockStack gap="200">
                                        <Text as="h2" variant="headingMd">6. Changes to Terms</Text>
                                        <Text as="p">
                                            We reserve the right to modify these terms at any time. Continued use of the app constitutes acceptance of the new terms.
                                        </Text>
                                    </BlockStack>

                                    <BlockStack gap="200">
                                        <Text as="h2" variant="headingMd">7. Contact</Text>
                                        <Text as="p">
                                            For questions regarding these terms, contact us at infoautoentry@gmail.com.
                                        </Text>
                                    </BlockStack>
                                </BlockStack>
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                </Layout>
            </Page>
        </AppProvider>
    );
}
