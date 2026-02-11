import { json, type ActionFunctionArgs } from "@remix-run/node";
import db from "../db.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    await authenticate.admin(request);

    if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, { status: 405 });
    }

    try {
        const formData = await request.formData();
        const productId = formData.get("productId") as string;

        if (!productId) {
            return json({ error: "Product ID is required" }, { status: 400 });
        }

        // Delete the scanned product
        await db.scannedProduct.delete({
            where: { id: productId }
        });

        return json({ success: true });
    } catch (error) {
        console.error("Error deleting product:", error);
        return json({ error: "Failed to delete product" }, { status: 500 });
    }
};
