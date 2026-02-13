import { json, type LoaderFunctionArgs } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
  });
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {apiKey ? (
          <meta name="shopify-api-key" content={apiKey} />
        ) : null}
        <script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          async
        />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Error</title>
      </head>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "24px", textAlign: "center", maxWidth: "400px", margin: "60px auto 0" }}>
        <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>Something went wrong</h1>
        <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "24px" }}>{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ padding: "12px 20px", background: "#004c46", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
        >
          Try again
        </button>
        <Scripts />
      </body>
    </html>
  );
}
