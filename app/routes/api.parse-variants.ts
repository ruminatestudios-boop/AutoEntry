import { json, type ActionFunctionArgs } from "@remix-run/node";
import { AIService } from "../core/services/ai.service";
import db from "../db.server";

/** Parse "small 6, medium 6, large 2" or "S 4, M 5, L 7" into one option with values + quantities. Returns null if not this pattern. */
function parseVariantsDeterministic(transcript: string): { options: { name: string; values: string[]; quantities: number[] }[] } | null {
    const t = transcript.trim();
    if (!t) return null;
    const parts = t.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
    const values: string[] = [];
    const quantities: number[] = [];
    for (const part of parts) {
        const tokens = part.split(/\s+/).filter(Boolean);
        if (tokens.length >= 2) {
            const last = tokens[tokens.length - 1]!;
            const num = Number(last);
            if (Number.isInteger(num) && num >= 0) {
                values.push(tokens.slice(0, -1).join(" "));
                quantities.push(num);
                continue;
            }
        }
        if (tokens.length >= 1) {
            values.push(tokens.join(" "));
            quantities.push(1);
        }
    }
    if (values.length === 0) return null;
    return {
        options: [{ name: "Size", values, quantities }],
    };
}

export const action = async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const transcript = formData.get("transcript") as string;
    const productId = formData.get("productId") as string | null;
    const sessionId = formData.get("sessionId") as string | null;

    if (!transcript?.trim()) {
        return json({ error: "Missing transcript" }, { status: 400 });
    }
    if (!productId && !sessionId) {
        return json({ error: "Missing productId or sessionId" }, { status: 400 });
    }

    // Try deterministic parse first for "small 6, medium 6, large 2" so all variants are always captured
    const deterministic = parseVariantsDeterministic(transcript);
    let data: { options?: any[] };
    if (deterministic?.options?.length) {
        data = deterministic;
    } else {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            return json({ error: "AI API Key missing" }, { status: 500 });
        }
        const aiService = new AIService(apiKey);
        const result = await aiService.parseVariants(transcript);
        if (!result.success || !result.data) {
            return json({ error: result.error || "Failed to parse variants" }, { status: 500 });
        }
        data = result.data as { options?: any[] };
    }

    // Normalize to { options: [...] } (each option: name, values, optional quantities)
    const raw = Array.isArray(data?.options) ? data.options : [];
    const options = raw.map((o: any) => ({
      name: o?.name ?? "Option",
      values: Array.isArray(o?.values) ? o.values.map((v: any) => String(v)) : [],
      ...(Array.isArray(o?.quantities) && o.quantities.length === (o.values?.length || 0)
        ? { quantities: o.quantities.map((q: any) => Number(q)) }
        : {}),
    })).filter((o: any) => o.values.length > 0);
    const variantsPayload = { options };
    const variantsJson = JSON.stringify(variantsPayload);

    try {
        if (productId) {
            await db.scannedProduct.update({
                where: { id: productId },
                data: { variants: variantsJson }
            });
        } else if (sessionId) {
            const product = await db.scannedProduct.findFirst({
                where: { sessionId },
                orderBy: { id: "desc" }
            });
            if (!product) {
                return json({ error: "Product not found for this session" }, { status: 404 });
            }
            await db.scannedProduct.update({
                where: { id: product.id },
                data: { variants: variantsJson }
            });
        }
    } catch (error) {
        console.error("Failed to update product variants:", error);
        return json({ error: "Product not found or database error" }, { status: 500 });
    }

    return json({ success: true, variants: variantsPayload });
};
