import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const url = new URL(request.url);
    const showAll = url.searchParams.get("all") === "true";

    const recentScans = await db.scannedProduct.findMany({
        where: {
            session: {
                shop: shop
            },
            status: { in: ["DRAFT", "PUBLISHED"] }
        },
        orderBy: { createdAt: "desc" },
        take: showAll ? 250 : 20
    });


    return json({ recentScans });
};
