import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);

    // Create a new session for the handshake
    const scanSession = await db.scanSession.create({
        data: {
            shop: session.shop,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minute expiry for batch scanning
        }
    });

    return json({ sessionId: scanSession.id, shop: session.shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
        return json({ error: "Missing sessionId" }, { status: 400 });
    }

    const scanSession = await db.scanSession.findUnique({
        where: { id: sessionId },
        include: { products: true }
    });

    // For single-product flow: one product; for batch: take the most recently added (last in list)
    const product = scanSession?.products?.length ? (scanSession.products as any[]).slice(-1)[0] : null;
    if (product) {
        console.log(`[SessionAPI] Product found. ID: ${product.id}`);

        // Use either imageUrls (if it existed) or the bridged imageUrl field
        const rawImages = product.imageUrls || product.imageUrl;

        if (typeof rawImages === 'string' && rawImages.startsWith('[')) {
            try {
                product.imageUrls = JSON.parse(rawImages);
            } catch (e) {
                product.imageUrls = [rawImages];
            }
        } else if (rawImages) {
            product.imageUrls = [rawImages];
        } else {
            product.imageUrls = [];
        }
    }

    return json({ status: scanSession?.status, product });
};
