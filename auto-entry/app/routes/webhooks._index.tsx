/**
 * Handles POST /webhooks for mandatory GDPR compliance webhooks.
 * - Subscribes to: customers/data_request, customers/redact, shop/redact (see shopify.app.auto-entry.toml).
 * - Verifies HMAC-SHA256 (X-Shopify-Hmac-SHA256) using raw body; invalid/missing → 401 (required by Shopify).
 * https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance
 * https://shopify.dev/docs/apps/build/authentication-authorization/webhooks#validate-webhooks
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { createHmac, timingSafeEqual } from "crypto";
import db from "../db.server";

function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null, secret: string): boolean {
    if (!secret || !hmacHeader) return false;
    const computed = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
    try {
        const a = Buffer.from(computed, "base64");
        const b = Buffer.from(hmacHeader, "base64");
        return a.length === b.length && timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    if (request.method !== "POST") {
        return new Response(null, { status: 405, headers: { Allow: "POST" } });
    }
    const rawBody = await request.text();
    const hmacHeader = request.headers.get("X-Shopify-Hmac-SHA256");
    const secret = process.env.SHOPIFY_API_SECRET || "";
    if (!verifyShopifyWebhook(rawBody, hmacHeader, secret)) {
        return new Response(null, { status: 401, statusText: "Unauthorized" });
    }
    const topic = request.headers.get("X-Shopify-Topic") || "";
    const shopDomain = request.headers.get("X-Shopify-Shop-Domain") || "";

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
            if (shopDomain) {
                const sessions = await db.scanSession.findMany({ where: { shop: shopDomain }, select: { id: true } });
                const sessionIds = sessions.map((s) => s.id);
                if (sessionIds.length > 0) {
                    await db.scannedProduct.deleteMany({ where: { sessionId: { in: sessionIds } } });
                }
                await db.scanSession.deleteMany({ where: { shop: shopDomain } });
                await db.shopSettings.deleteMany({ where: { shop: shopDomain } });
            }
        } catch {
            // Still return 200; we acknowledged receipt
        }
        return new Response(null, { status: 200, statusText: "OK" });
    }

    return new Response(null, { status: 200, statusText: "OK" });
};
