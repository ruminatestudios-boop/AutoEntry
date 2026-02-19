import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { ShopifyProductAdapter } from "../adapters/shopify/product.adapter";
import type { ScannedProduct } from "../core/types/product";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);
    const formData = await request.formData();
    const productJson = formData.get("product") as string;

    if (!productJson) {
        return json({ error: "No product data provided" }, { status: 400 });
    }

    try {
        const productData = JSON.parse(productJson);

        const rawVariants = typeof productData.variants === "string" ? JSON.parse(productData.variants) : productData.variants;
        // Ensure variants.options have full values arrays (no truncation) so all variants are created on Shopify
        const variants = rawVariants && Array.isArray(rawVariants.options)
            ? {
                options: rawVariants.options.map((o: any) => ({
                    name: o?.name ?? "Option",
                    values: Array.isArray(o?.values) ? o.values.map((v: any) => String(v)) : [],
                    ...(Array.isArray(o?.quantities) && o.quantities.length === (o.values?.length ?? 0)
                        ? { quantities: o.quantities.map((q: any) => Number(q)) }
                        : {}),
                })).filter((o: any) => o.values.length > 0),
            }
            : undefined;

        const scannedProduct: ScannedProduct = {
            title: productData.title,
            descriptionHtml: productData.descriptionHtml,
            productType: productData.productType,
            tags: typeof productData.tags === "string" ? productData.tags.split(",").map((s: string) => s.trim()) : productData.tags,
            estimatedWeight: parseFloat(productData.estimatedWeight) || 0,
            imageUrls: productData.imageUrls || [],
            price: productData.price,
            status: "DRAFT", // Create as draft on Shopify for final review
            // Inventory fields
            sku: productData.sku,
            inventoryQuantity: productData.inventoryQuantity,
            trackInventory: productData.trackInventory,
            variants
        };

        const adapter = new ShopifyProductAdapter(admin, session?.shop);
        const result = await adapter.createProduct(scannedProduct);

        // Mark as published in our local database so it disappears from the draft list
        if (productData.id) {
            await db.scannedProduct.update({
                where: { id: productData.id },
                data: { status: "PUBLISHED" }
            });
        }

        return json({ success: true, productId: result.id, url: result.url });
    } catch (error) {
        console.error("Listing Error:", error);
        return json({ error: error instanceof Error ? error.message : "Failed to list product" }, { status: 500 });
    }
};
