/**
 * Single endpoint for all mandatory compliance webhooks (per Shopify docs).
 * https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance
 * Handles: customers/data_request, customers/redact, shop/redact
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`[compliance] ${topic} for ${shop}`);

    if (topic === "customers/data_request") {
        return new Response(JSON.stringify({ customers: {} }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (topic === "customers/redact") {
        return new Response(null, { status: 200 });
    }

    if (topic === "shop/redact") {
        try {
            if (shop) {
                const sessions = await db.scanSession.findMany({ where: { shop }, select: { id: true } });
                const sessionIds = sessions.map((s) => s.id);
                if (sessionIds.length > 0) {
                    await db.scannedProduct.deleteMany({ where: { sessionId: { in: sessionIds } } });
                }
                await db.scanSession.deleteMany({ where: { shop } });
                await db.shopSettings.deleteMany({ where: { shop } });
                console.log(`[compliance] Deleted all data for shop: ${shop}`);
            }
        } catch (e) {
            console.error("[compliance] shop/redact error:", e);
        }
        return new Response(null, { status: 200 });
    }

    return new Response(null, { status: 200 });
};
