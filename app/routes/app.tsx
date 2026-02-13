import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import enTranslations from "@shopify/polaris/locales/en.json";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import "../styles/dashboard.css";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);

  // Sync Plan with Shopify
  try {
    const billingCheck = await billing.check({
      plans: ["Starter", "Growth", "Power"] as const,
      isTest: process.env.NODE_ENV !== "production",
    });

    let activePlan = "FREE";
    if (billingCheck.hasActivePayment && billingCheck.appSubscriptions.length > 0) {
      activePlan = billingCheck.appSubscriptions[0].name;
    }

    const shop = session.shop;
    await db.shopSettings.upsert({
      where: { shop },
      update: { plan: activePlan },
      create: {
        shop,
        plan: activePlan,
        billingCycleStart: new Date()
      }
    });
  } catch (error) {
    console.error("Failed to sync billing:", error);
  }

  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey} i18n={enTranslations}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/pricing">Pricing</Link>
        <Link to="/app/docs">Documentation</Link>
        <Link to="/app/settings">Settings</Link>
        <Link to="/app/support">Support</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
