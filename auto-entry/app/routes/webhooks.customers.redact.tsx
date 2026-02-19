import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);
    console.log(JSON.stringify(payload, null, 2));

    // Handle customer data deletion here
    // Since we don't store customer personal data (only product/shop data), 
    // we just acknowledge receipt.

    return new Response(null, { status: 200 });
};
