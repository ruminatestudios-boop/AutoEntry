import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);
    console.log(JSON.stringify(payload, null, 2));

    // We do not store customer PII; return empty JSON per Shopify GDPR requirements.
    return new Response(JSON.stringify({ customers: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
