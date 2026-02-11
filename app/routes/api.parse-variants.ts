import { json, type ActionFunctionArgs } from "@remix-run/node";
import { AIService } from "../core/services/ai.service";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const transcript = formData.get("transcript") as string;
    const sessionId = formData.get("sessionId") as string;

    if (!transcript || !sessionId) {
        return json({ error: "Missing transcript or sessionId" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        return json({ error: "AI API Key missing" }, { status: 500 });
    }

    const aiService = new AIService(apiKey);
    const result = await aiService.parseVariants(transcript);

    if (!result.success || !result.data) {
        return json({ error: result.error || "Failed to parse variants" }, { status: 500 });
    }

    // Update the product with variants
    try {
        await db.scannedProduct.update({
            where: { sessionId: sessionId },
            data: {
                variants: JSON.stringify(result.data)
            }
        });
    } catch (error) {
        console.error("Failed to update product variants:", error);
        return json({ error: "Product not found or database error" }, { status: 500 });
    }

    return json({ success: true, variants: result.data });
};
