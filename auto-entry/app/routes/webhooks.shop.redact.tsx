import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);
    console.log(JSON.stringify(payload, null, 2));

    // Handle shop data deletion: remove all app data for this shop (GDPR).
    try {
        if (shop) {
            const sessions = await db.scanSession.findMany({ where: { shop }, select: { id: true } });
            const sessionIds = sessions.map((s) => s.id);
            if (sessionIds.length > 0) {
                await db.scannedProduct.deleteMany({ where: { sessionId: { in: sessionIds } } });
            }
            await db.scanSession.deleteMany({ where: { shop } });
            await db.shopSettings.deleteMany({ where: { shop } });
            console.log(`Deleted all data for shop: ${shop}`);
        }
    } catch (e) {
        console.error("shop/redact cleanup error:", e);
        // Still return 200 so Shopify does not retry; we acknowledged receipt.
    }

    return new Response(null, { status: 200 });
};
