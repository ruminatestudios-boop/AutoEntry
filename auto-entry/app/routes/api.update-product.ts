import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    await authenticate.admin(request);
    const formData = await request.formData();
    const productJson = formData.get("product") as string;

    if (!productJson) {
        return json({ error: "No product data provided" }, { status: 400 });
    }

    try {
        const productData = JSON.parse(productJson);

        if (!productData.id) {
            return json({ error: "Missing product ID" }, { status: 400 });
        }

        // Prepare data for update - ensure we're saving the current state
        await db.scannedProduct.update({
            where: { id: productData.id },
            data: {
                title: productData.title,
                descriptionHtml: productData.descriptionHtml,
                productType: productData.productType,
                tags: productData.tags,
                price: productData.price,
                estimatedWeight: productData.estimatedWeight != null ? Number(productData.estimatedWeight) : undefined,
                imageUrls: Array.isArray(productData.imageUrls) ? JSON.stringify(productData.imageUrls) : productData.imageUrls,
                variants: typeof productData.variants === 'object' ? JSON.stringify(productData.variants) : productData.variants
            }
        });

        return json({ success: true });
    } catch (error) {
        console.error("Update Error:", error);
        return json({ error: error instanceof Error ? error.message : "Failed to update product" }, { status: 500 });
    }
};
