import { Page, Layout, Card, BlockStack, Text, Scrollable, AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
    return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function PublicPrivacyPolicy() {
    const { apiKey } = useLoaderData<typeof loader>();

    return (
        <AppProvider i18n={enTranslations}>
            <Page title="Privacy Policy">
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

                                <BlockStack gap="400">
                                    <Text as="h2" variant="headingMd">1. Information We Collect</Text>
                                    <Text as="p">
                                        Auto Entry collects information necessary to provide product scanning and Shopify listing services. This includes:
                                    </Text>
                                    <BlockStack gap="200" align="start">
                                        <Text as="p">• Shopify store information (URL, access tokens).</Text>
                                        <Text as="p">• Images uploaded for scanning.</Text>
                                        <Text as="p">• Product data extracted from images.</Text>
                                    </BlockStack>

                                    <Text as="h2" variant="headingMd">2. How We Use Information</Text>
                                    <Text as="p">
                                        We use the collected information to:
                                    </Text>
                                    <BlockStack gap="200" align="start">
                                        <Text as="p">• Analyze images using AI models (Gemini Flash).</Text>
                                        <Text as="p">• Create and manage product drafts in your Shopify store.</Text>
                                        <Text as="p">• Manage your subscription and usage limits.</Text>
                                    </BlockStack>

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
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                </Layout>
            </Page>
        </AppProvider>
    );
}
