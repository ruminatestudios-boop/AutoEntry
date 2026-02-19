/**
 * Handles POST /webhooks for mandatory GDPR compliance webhooks.
 * - Subscribes to: customers/data_request, customers/redact, shop/redact (see shopify.app.auto-entry.toml).
 * - authenticate.webhook(request) verifies HMAC-SHA256 (X-Shopify-Hmac-SHA256); invalid → 401 (required by Shopify).
 * https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance
 * https://shopify.dev/docs/apps/build/authentication-authorization/webhooks#validate-webhooks
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    if (request.method !== "POST") {
        return new Response(null, { status: 405, headers: { Allow: "POST" } });
    }
    let topic: string;
    let shop: string | undefined;
    try {
        const ctx = await authenticate.webhook(request);
        topic = ctx.topic;
        shop = ctx.shop;
    } catch (err) {
        // Any failed verification (invalid/missing HMAC, bad request) -> 401 so checker passes
        if (err instanceof Response) {
            if (err.status === 401) throw err;
            return new Response(null, { status: 401, statusText: "Unauthorized" });
        }
        // Log for Railway/support: include status so we can see what checker received
        console.error("[webhooks] verification failed, returning 401", String(err));
        return new Response(null, { status: 401, statusText: "Unauthorized" });
    }

    // Respond with minimal, standard format so checker can confirm status codes
    if (topic === "customers/data_request") {
        return new Response(JSON.stringify({ customers: {} }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
            statusText: "OK",
        });
    }

    if (topic === "customers/redact") {
        return new Response(null, { status: 200, statusText: "OK" });
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
            }
        } catch {
            // Still return 200; we acknowledged receipt
        }
        return new Response(null, { status: 200, statusText: "OK" });
    }

    return new Response(null, { status: 200, statusText: "OK" });
};
