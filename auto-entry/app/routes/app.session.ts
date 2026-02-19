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
    // This could be used for polling or status updates
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
        return json({ error: "Missing sessionId" }, { status: 400 });
    }

    const scanSession = await db.scanSession.findUnique({
        where: { id: sessionId },
        include: { products: true }
    });

    const product = scanSession?.products?.length ? scanSession.products.slice(-1)[0] : null;
    return json({ status: scanSession?.status, product });
};
